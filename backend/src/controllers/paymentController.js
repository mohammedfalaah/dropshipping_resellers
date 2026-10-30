const Payment = require("../models/Payment");
const paymentService = require("../services/paymentService");
const cashfreeConfig = require("../config/cashfree");
const { successResponse, errorResponse } = require("../utils/response");
const { rupeesToPaise } = require("../utils/currency");

/**
 * Record Manual Payment (Admin)
 */
const recordPayment = async (req, res, next) => {
  try {
    const { resellerId, orderId, amount, method, transactionReference, notes } = req.body;

    const payment = await paymentService.recordManualPayment({
      resellerId,
      orderId,
      amountPaise: rupeesToPaise(amount),
      method,
      transactionReference,
      notes,
      adminUser: req.user,
    });

    return successResponse(res, `Payment of ₹${amount} recorded successfully.`, { payment }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Get All Payments (Admin)
 */
const getAllPayments = async (req, res, next) => {
  try {
    const { resellerId, method, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (resellerId) query.reseller = resellerId;
    if (method) query.method = method;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("reseller", "name email phone businessInfo")
        .populate("order", "orderNumber totalPaise orderStatus paymentStatus")
        .populate("recordedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    return successResponse(res, "Payments list retrieved.", {
      payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get My Payments (Reseller)
 */
const getMyPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find({ reseller: req.user._id })
        .populate("order", "orderNumber totalPaise orderStatus paymentStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments({ reseller: req.user._id }),
    ]);

    return successResponse(res, "Payment history retrieved.", {
      payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reverse Payment (Admin)
 */
const reversePayment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await paymentService.reversePayment({
      paymentId: req.params.id,
      reason,
      adminUser: req.user,
    });

    return successResponse(res, "Payment reversed successfully with compensating ledger entry.", { payment });
  } catch (err) {
    next(err);
  }
};

/**
 * Record Balance Adjustment (Admin)
 */
const recordAdjustment = async (req, res, next) => {
  try {
    const { resellerId, type, amount, reason } = req.body;
    const entry = await paymentService.recordAdjustment({
      resellerId,
      type,
      amountPaise: rupeesToPaise(amount),
      reason,
      adminUser: req.user,
    });

    return successResponse(res, `Account ${type} adjustment of ₹${amount} recorded successfully.`, { entry }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Cashfree Payment Gateway Webhook
 */
const handleCashfreeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isValid = cashfreeConfig.verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValid && process.env.NODE_ENV === "production") {
      console.warn("[Cashfree Webhook] Invalid signature rejected");
      return res.status(400).json({ status: "FAILED", message: "Invalid signature" });
    }

    const event = req.body;
    console.log("[Cashfree Webhook Event received]:", event?.type, event?.data?.order?.order_id);

    // If order was marked PAID or payment succeeded, verify and confirm order
    const orderId = event?.data?.order?.order_id;
    if (orderId) {
      await paymentService
        .verifyCashfreePayment({
          orderId,
          user: null,
        })
        .catch((err) => console.log("[Cashfree Webhook Processing Error]:", err.message));
    }

    return res.status(200).json({ status: "OK", message: "Webhook processed" });
  } catch (err) {
    console.error("[Cashfree Webhook Error]:", err);
    return res.status(200).json({ status: "ERROR", message: err.message });
  }
};

module.exports = {
  recordPayment,
  getAllPayments,
  getMyPayments,
  reversePayment,
  recordAdjustment,
  handleCashfreeWebhook,
};
