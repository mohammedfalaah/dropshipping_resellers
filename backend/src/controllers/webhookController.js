const Order = require("../models/Order");
const CodCollection = require("../models/CodCollection");
const { mapIndiaPostStatusToStage, normalizeCheckpoint } = require("../services/trackingService");

/**
 * Handle India Post Booking Events Webhook
 */
const handleIndiaPostBooking = async (req, res) => {
  try {
    // If it is a test ping from India Post Developer Portal
    if (!req.body || Object.keys(req.body).length === 0 || req.method === "GET") {
      return res.status(200).json({
        success: true,
        message: "India Post Booking webhook endpoint active.",
        timestamp: new Date().toISOString(),
      });
    }

    const payload = req.body;
    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const articleNumber = (
        item.articleNumber ||
        item.trackingNumber ||
        item.consignmentNumber ||
        item.article_id ||
        ""
      ).trim().toUpperCase();

      if (!articleNumber) continue;

      const order = await Order.findOne({ trackingNumber: articleNumber });
      if (!order) continue;

      const checkpoint = normalizeCheckpoint(item, "Tirur Sorting Hub, Malappuram");
      if (!order.trackingHistory) order.trackingHistory = [];
      order.trackingHistory.push(checkpoint);

      order.deliveryStatus = "BOOKED";
      order.latestTrackingStatus = item.status || "Consignment Booked";
      order.lastTrackedAt = new Date();
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: "Booking event(s) processed successfully.",
    });
  } catch (err) {
    console.error("[IndiaPost Webhook - Booking] Error:", err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
};

/**
 * Handle India Post Journey / Tracking Events Webhook
 */
const handleIndiaPostEvents = async (req, res) => {
  try {
    // If it is a test ping from India Post Developer Portal
    if (!req.body || Object.keys(req.body).length === 0 || req.method === "GET") {
      return res.status(200).json({
        success: true,
        message: "India Post Tracking / Journey webhook endpoint active.",
        timestamp: new Date().toISOString(),
      });
    }

    const payload = req.body;
    const items = Array.isArray(payload) ? payload : (payload.events || payload.data || [payload]);

    for (const item of items) {
      const articleNumber = (
        item.articleNumber ||
        item.trackingNumber ||
        item.consignmentNumber ||
        item.article_id ||
        payload.articleNumber ||
        payload.trackingNumber ||
        ""
      ).trim().toUpperCase();

      if (!articleNumber) continue;

      const order = await Order.findOne({ trackingNumber: articleNumber });
      if (!order) continue;

      const rawStatus = item.status || item.eventDescription || item.event || payload.currentStatus || "";
      const mapped = mapIndiaPostStatusToStage(rawStatus);

      const checkpoint = normalizeCheckpoint(item, order.shippingAddress?.city || "Transit Hub");
      if (!order.trackingHistory) order.trackingHistory = [];

      // Avoid exact duplicate checkpoints
      const isDuplicate = order.trackingHistory.some(
        (h) => h.status === checkpoint.status && h.location === checkpoint.location
      );
      if (!isDuplicate) {
        order.trackingHistory.push(checkpoint);
      }

      order.latestTrackingStatus = rawStatus || mapped.label;
      order.lastTrackedAt = new Date();

      if (mapped.stage === "DELIVERED") {
        order.deliveryStatus = "DELIVERED";
        order.orderStatus = "DELIVERED";
        order.deliveredAt = checkpoint.timestamp ? new Date(checkpoint.timestamp) : new Date();

        if (order.paymentMethod === "COD") {
          await CodCollection.findOneAndUpdate(
            { order: order._id },
            { deliveryStatus: "DELIVERED", trackingNumber: order.trackingNumber }
          );
        }
      } else if (mapped.stage && mapped.stage !== order.deliveryStatus) {
        order.deliveryStatus = mapped.stage;
      }

      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: "Tracking event(s) processed and order status updated dynamically.",
    });
  } catch (err) {
    console.error("[IndiaPost Webhook - Events] Error:", err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
};

module.exports = {
  handleIndiaPostBooking,
  handleIndiaPostEvents,
};
