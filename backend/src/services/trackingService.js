const axios = require("axios");
const Order = require("../models/Order");
const Setting = require("../models/Setting");
const CodCollection = require("../models/CodCollection");
const AuditLog = require("../models/AuditLog");

/**
 * Identify courier and construct official portal tracking URL
 */
const detectCourier = (trackingNumber, preferredCourier = "") => {
  const cleanNumber = (trackingNumber || "").trim().toUpperCase();
  const courier = (preferredCourier || "").toLowerCase();

  // India Post consignments follow UPU S10 format (2 letters, 9 digits, IN)
  // e.g. RM019388105IN, EM123456789IN, SP866991875IN
  if (
    cleanNumber.endsWith("IN") ||
    courier.includes("india post") ||
    courier.includes("speed post") ||
    courier.includes("post") ||
    courier.includes("postal")
  ) {
    return {
      name: "India Post (Business Parcel)",
      code: "INDIAPOST",
      portalUrl: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
    };
  }

  if (courier.includes("delhivery") || cleanNumber.length === 12 || cleanNumber.startsWith("DLHV")) {
    return {
      name: "Delhivery Logistics",
      code: "DELHIVERY",
      portalUrl: `https://www.delhivery.com/track/package/${cleanNumber}`,
    };
  }

  if (courier.includes("bluedart") || cleanNumber.startsWith("BLU")) {
    return {
      name: "Blue Dart Express",
      code: "BLUEDART",
      portalUrl: `https://www.bluedart.com/tracking?track=${cleanNumber}`,
    };
  }

  if (courier.includes("dtdc")) {
    return {
      name: "DTDC Courier",
      code: "DTDC",
      portalUrl: "https://www.dtdc.in/tracking/shipment-tracking.asp",
    };
  }

  if (courier.includes("xpress") || courier.includes("bees")) {
    return {
      name: "XpressBees Logistics",
      code: "XPRESSBEES",
      portalUrl: `https://www.xpressbees.com/track?trackingNumber=${cleanNumber}`,
    };
  }

  return {
    name: preferredCourier || "Standard Express Courier",
    code: "STANDARD",
    portalUrl: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
  };
};

/**
 * Compute progress percentage & stage from order and delivery status
 */
const computeProgress = (deliveryStatus, orderStatus) => {
  const status = (deliveryStatus || orderStatus || "CONFIRMED").toUpperCase();

  switch (status) {
    case "PENDING":
      return { stage: "BOOKED", percent: 20, label: "Booking Manifested" };
    case "CONFIRMED":
    case "BOOKED":
      return { stage: "BOOKED", percent: 30, label: "Consignment Booked" };
    case "PROCESSING":
      return { stage: "PROCESSING", percent: 45, label: "Packed at Sorting Hub" };
    case "DISPATCHED":
    case "SHIPPED":
      return { stage: "DISPATCHED", percent: 60, label: "Dispatched from Origin Hub" };
    case "IN_TRANSIT":
      return { stage: "IN_TRANSIT", percent: 75, label: "In Transit to Destination" };
    case "OUT_FOR_DELIVERY":
      return { stage: "OUT_FOR_DELIVERY", percent: 90, label: "Out for Delivery" };
    case "DELIVERED":
      return { stage: "DELIVERED", percent: 100, label: "Delivered Successfully" };
    case "RETURNED":
      return { stage: "DELIVERED", percent: 100, label: "Delivered (Returned to Sender)" };
    case "CANCELLED":
    case "FAILED":
      return { stage: "FAILED", percent: 100, label: "Delivery Returned / Cancelled" };
    default:
      return { stage: "IN_TRANSIT", percent: 50, label: "Shipment in Transit" };
  }
};

/**
 * Map live India Post status string to canonical stage and progress percent
 */
const mapIndiaPostStatusToStage = (statusStr) => {
  const s = (statusStr || "").toUpperCase();
  if (s.includes("DELIVERED") || s.includes("RETURNED TO SENDER")) {
    return { stage: "DELIVERED", percent: 100, label: statusStr || "Delivered Successfully" };
  }
  if (s.includes("OUT FOR DELIVERY") || s.includes("BEAT") || s.includes("DISPATCH TO POSTMAN") || s.includes("OUT FOR")) {
    return { stage: "OUT_FOR_DELIVERY", percent: 90, label: statusStr || "Out for Delivery" };
  }
  if (s.includes("RECEIVED AT DESTINATION") || s.includes("DESTINATION") || s.includes("REACHED")) {
    return { stage: "IN_TRANSIT", percent: 80, label: statusStr || "Received at Destination Office" };
  }
  if (s.includes("TRANSIT") || s.includes("LINE-HAUL") || s.includes("RECEIVED")) {
    return { stage: "IN_TRANSIT", percent: 70, label: statusStr || "In Transit" };
  }
  if (s.includes("DISPATCH") || s.includes("BAGGED") || s.includes("SORTING") || s.includes("SHIPPED")) {
    return { stage: "DISPATCHED", percent: 50, label: statusStr || "Dispatched from Sorting Hub" };
  }
  if (s.includes("BOOKED") || s.includes("MANIFEST")) {
    return { stage: "BOOKED", percent: 30, label: statusStr || "Consignment Booked" };
  }
  return { stage: "IN_TRANSIT", percent: 65, label: statusStr || "Shipment in Transit" };
};

/**
 * Robust date parser supporting Indian formats DD/MM/YYYY HH:mm:ss, ISO strings, timestamps
 */
const parseIndianOrIsoDate = (dateStr, fallbackTimeStr = "") => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
  if (typeof dateStr === "number") return new Date(dateStr);
  let s = String(dateStr).trim();

  if (fallbackTimeStr && !s.includes(":") && !s.includes("T")) {
    s = `${s} ${String(fallbackTimeStr).trim()}`;
  }

  // Direct ISO/standard parse
  const stdDate = new Date(s);
  if (!isNaN(stdDate.getTime())) return stdDate;

  // Handle DD/MM/YYYY or DD-MM-YYYY [HH:mm[:ss]]
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
};

/**
 * Normalize raw DOP event into standardized checkpoint object
 */
const normalizeCheckpoint = (h, defaultOrigin = "Postal Sorting Hub") => {
  const rawDate = h.timestamp || h.eventDate || h.date || h.dateTime;
  const rawTime = h.eventTime || h.time || "";
  const dateObj = parseIndianOrIsoDate(rawDate, rawTime);

  const location = h.location || h.officeName || h.office || h.hub || h.city || defaultOrigin;
  const status = h.status || h.eventDescription || h.event || h.activity || "Status Scanned";
  const details = h.details || h.remarks || h.description || `${status} at ${location}`;

  return {
    timestamp: dateObj.toISOString(),
    location,
    status,
    details,
  };
};

/**
 * Log in to India Post DOP using Wholesaler credentials:
 * POST /v1/access/login
 * Body: { username, password }
 */
const loginIndiaPost = async (existingSettings = null) => {
  let settings = existingSettings;
  if (!settings) {
    try {
      settings = await Setting.findOne({ key: "platform_settings" });
    } catch (e) {
      // ignore
    }
  }

  const username = settings?.indiapostUsername || process.env.INDIAPOST_USERNAME;
  const password = settings?.indiapostPassword || process.env.INDIAPOST_PASSWORD;
  const apiUrl = settings?.indiapostApiUrl || process.env.INDIAPOST_API_URL || "https://app.indiapost.gov.in/beextcustomer";

  if (!username || !password) {
    return null;
  }

  try {
    const response = await axios.post(
      `${apiUrl}/v1/access/login`,
      { username, password },
      {
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 10000,
      }
    );

    if (response.data?.success && response.data?.data) {
      const { access_token, refresh_token, expires_in } = response.data.data;
      const expiresInSec = Number(expires_in) || 900;
      const expiresAt = new Date(Date.now() + (expiresInSec - 60) * 1000);

      if (settings && access_token) {
        settings.indiapostBearerToken = access_token;
        if (refresh_token) settings.indiapostRefreshToken = refresh_token;
        settings.indiapostTokenExpiresAt = expiresAt;
        settings.indiapostLastTokenRefresh = new Date();
        await settings.save();
      }

      return {
        accessToken: access_token,
        refreshToken: refresh_token || settings?.indiapostRefreshToken,
        expiresIn: expiresInSec,
        expiresAt,
      };
    }
  } catch (err) {
    console.warn("[IndiaPost API]: Failed to login via /v1/access/login:", err.response?.data || err.message);
  }

  return null;
};

/**
 * Refresh access token using India Post refresh token endpoint:
 * POST /v1/access/TokenWithRtoken
 * Header: Authorization: Bearer <refresh_token>
 */
const refreshIndiaPostToken = async (existingSettings = null) => {
  let settings = existingSettings;
  if (!settings) {
    try {
      settings = await Setting.findOne({ key: "platform_settings" });
    } catch (e) {
      // ignore
    }
  }

  const refreshToken = settings?.indiapostRefreshToken || process.env.INDIAPOST_REFRESH_TOKEN;
  const apiUrl = settings?.indiapostApiUrl || process.env.INDIAPOST_API_URL || "https://app.indiapost.gov.in/beextcustomer";

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      `${apiUrl}/v1/access/TokenWithRtoken`,
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          accept: "application/json",
        },
        timeout: 8000,
      }
    );

    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token || refreshToken;
      const expiresIn = Number(data.expires_in) || 900;
      const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);

      if (settings && newAccessToken) {
        settings.indiapostBearerToken = newAccessToken;
        settings.indiapostRefreshToken = newRefreshToken;
        settings.indiapostTokenExpiresAt = expiresAt;
        settings.indiapostLastTokenRefresh = new Date();
        await settings.save();
      }

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        expiresAt,
      };
    }
  } catch (err) {
    console.warn("[IndiaPost API]: Failed to refresh token via TokenWithRtoken:", err.response?.data || err.message);
  }

  return null;
};

/**
 * Get or regenerate a valid India Post Access Token
 * Checks existing token validity -> tries refresh token -> falls back to login credentials
 */
const getValidIndiaPostToken = async (settings) => {
  // 1. Check if existing access token is still unexpired (60s buffer)
  const isTokenValid =
    settings?.indiapostBearerToken &&
    settings?.indiapostTokenExpiresAt &&
    new Date(settings.indiapostTokenExpiresAt).getTime() > Date.now() + 60000;

  if (isTokenValid) {
    return settings.indiapostBearerToken;
  }

  // 2. If token expired, attempt refresh via TokenWithRtoken
  if (settings?.indiapostRefreshToken) {
    const refreshed = await refreshIndiaPostToken(settings);
    if (refreshed?.accessToken) {
      return refreshed.accessToken;
    }
  }

  // 3. Fallback to login with Username and Password
  if (settings?.indiapostUsername && settings?.indiapostPassword) {
    const loggedIn = await loginIndiaPost(settings);
    if (loggedIn?.accessToken) {
      return loggedIn.accessToken;
    }
  }

  return settings?.indiapostBearerToken || process.env.INDIAPOST_BEARER_TOKEN || null;
};

/**
 * Fetch tracking details:
 * - Validates ownership if requesting user is a reseller
 * - Implements smart 15-minute caching and delivered-order caching
 * - Queries live DOP API using wholesaler credentials
 * - Auto-refreshes tokens / auto-relogs in on 401
 * - Syncs live progress to Order in database
 */
const getTrackingInfo = async (trackingIdentifier, requestingUser = null, forceRefresh = false) => {
  const cleanId = (trackingIdentifier || "").trim();
  if (!cleanId) {
    const err = new Error("Tracking number or consignment ID is required");
    err.statusCode = 400;
    throw err;
  }

  // 1. Look up Order in our database by trackingNumber, orderNumber, or _id
  let order = await Order.findOne({ trackingNumber: cleanId }).populate("reseller", "name email phone businessInfo");
  if (!order) {
    order = await Order.findOne({ orderNumber: cleanId }).populate("reseller", "name email phone businessInfo");
  }
  if (!order && cleanId.match(/^[0-9a-fA-F]{24}$/)) {
    order = await Order.findById(cleanId).populate("reseller", "name email phone businessInfo");
  }

  // 2. Security & Ownership Validation
  if (requestingUser && requestingUser.role !== "admin") {
    if (!order) {
      const err = new Error("No order found matching this consignment or order number in your account.");
      err.statusCode = 404;
      throw err;
    }

    const orderResellerId = order.reseller?._id ? order.reseller._id.toString() : order.reseller?.toString();
    const currentUserId = requestingUser._id ? requestingUser._id.toString() : requestingUser.toString();

    if (orderResellerId !== currentUserId) {
      const err = new Error("Access denied: You do not have permission to view tracking for this order.");
      err.statusCode = 403;
      throw err;
    }
  }

  const trackingNumber = order?.trackingNumber || cleanId;
  const courierMeta = detectCourier(trackingNumber, order?.courierName || "");
  const destination = order?.shippingAddress
    ? `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}`
    : "Destination Hub, India";
  const origin = "Tirur Sorting Hub, Malappuram, Kerala - 676107";

  // 3. Smart Caching Rule:
  // If not force-refreshing, return cached DB tracking data if already delivered or tracked within last 15 mins
  if (!forceRefresh && order) {
    const isDelivered =
      (order.deliveryStatus === "DELIVERED" || order.orderStatus === "DELIVERED") &&
      order.trackingHistory &&
      order.trackingHistory.length > 0;

    const isRecentlyTracked =
      order.lastTrackedAt &&
      Date.now() - new Date(order.lastTrackedAt).getTime() < 15 * 60 * 1000 &&
      order.trackingHistory &&
      order.trackingHistory.length > 0;

    if (isDelivered || isRecentlyTracked) {
      const progress = computeProgress(order.deliveryStatus, order.orderStatus);
      const sortedHistory = [...(order.trackingHistory || [])]
        .map((h) => normalizeCheckpoint(h, origin))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return {
        source: isDelivered ? "DELIVERED_CACHE" : "CACHED_15MIN",
        trackingNumber,
        courierName: courierMeta.name,
        courierCode: courierMeta.code,
        currentStatus: order.latestTrackingStatus || sortedHistory[0]?.status || progress.label,
        statusStage: progress.stage,
        progressPercent: progress.percent,
        origin,
        destination,
        estimatedDelivery: order.estimatedDeliveryDate
          ? new Date(order.estimatedDeliveryDate).toISOString().split("T")[0]
          : null,
        officialTrackingUrl: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
        history: sortedHistory,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          resellerId: order.reseller?._id || order.reseller,
          resellerName: order.reseller?.name || "Direct Reseller",
          recipientName:
            order.shippingAddress?.fullName ||
            `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
          recipientPhone: order.shippingAddress?.phone,
          orderStatus: order.orderStatus,
          deliveryStatus: order.deliveryStatus || order.orderStatus,
          paymentMethod: order.paymentMethod,
          isFastDelivery: Boolean(order.isFastDelivery),
          totalAmountPaise: order.totalPaise || order.customerSellingTotalPaise,
        },
      };
    }
  }

  // 4. Fetch Wholesaler India Post settings
  let settings = null;
  try {
    settings = await Setting.findOne({ key: "platform_settings" });
  } catch (err) {
    // ignore
  }

  const indiaPostApiUrl =
    settings?.indiapostApiUrl ||
    process.env.INDIAPOST_API_URL ||
    "https://app.indiapost.gov.in/beextcustomer";

  let indiaPostToken = await getValidIndiaPostToken(settings);

  // 5. Query live India Post Customer Integration API
  if (courierMeta.code === "INDIAPOST" && indiaPostToken) {
    try {
      let response = null;
      try {
        response = await axios.get(`${indiaPostApiUrl}/v1/tracking/${trackingNumber}`, {
          headers: {
            Authorization: `Bearer ${indiaPostToken}`,
            accept: "application/json",
          },
          timeout: 8000,
        });
      } catch (reqErr) {
        // If 401 Unauthorized, re-login once with wholesaler credentials and retry
        if (reqErr.response?.status === 401) {
          console.log("[IndiaPost API]: Token expired (401). Attempting re-authentication with DOP credentials...");
          const freshLogin = await loginIndiaPost(settings);
          if (freshLogin?.accessToken) {
            indiaPostToken = freshLogin.accessToken;
            response = await axios.get(`${indiaPostApiUrl}/v1/tracking/${trackingNumber}`, {
              headers: {
                Authorization: `Bearer ${indiaPostToken}`,
                accept: "application/json",
              },
              timeout: 8000,
            });
          } else {
            throw reqErr;
          }
        } else {
          throw reqErr;
        }
      }

      if (response && response.data?.success && response.data?.data) {
        const liveData = response.data.data;
        const mappedProgress = mapIndiaPostStatusToStage(liveData.currentStatus);

        const rawList = Array.isArray(liveData.history) ? liveData.history : [];
        const liveHistory = rawList.map((h) => normalizeCheckpoint(h, liveData.origin || origin));

        // Sort descending so newest checkpoint is at index 0
        const sortedLiveHistory = [...liveHistory].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        const currentStatus =
          liveData.currentStatus || sortedLiveHistory[0]?.status || mappedProgress.label;

        // Auto-sync with Order in MongoDB
        if (order) {
          const updates = {
            lastTrackedAt: new Date(),
            latestTrackingStatus: currentStatus,
          };

          if (mappedProgress.stage === "DELIVERED") {
            updates.deliveryStatus = "DELIVERED";
            updates.orderStatus = "DELIVERED";
            updates.deliveredAt = sortedLiveHistory[0]?.timestamp
              ? new Date(sortedLiveHistory[0].timestamp)
              : new Date();
          } else if (mappedProgress.stage && mappedProgress.stage !== order.deliveryStatus) {
            updates.deliveryStatus = mappedProgress.stage;
          }

          if (sortedLiveHistory.length > 0) {
            updates.trackingHistory = sortedLiveHistory;
          }

          if (liveData.estimatedDelivery) {
            updates.estimatedDeliveryDate = parseIndianOrIsoDate(liveData.estimatedDelivery);
          }

          await Order.findByIdAndUpdate(order._id, updates);

          // Sync COD collection record if applicable
          if (order.paymentMethod === "COD") {
            await CodCollection.findOneAndUpdate(
              { order: order._id },
              {
                deliveryStatus: updates.deliveryStatus || order.deliveryStatus,
                trackingNumber: order.trackingNumber || trackingNumber,
              }
            );
          }
        }

        return {
          source: "LIVE_API",
          trackingNumber,
          courierName: courierMeta.name,
          courierCode: courierMeta.code,
          currentStatus,
          statusStage: mappedProgress.stage,
          progressPercent: mappedProgress.percent,
          origin: liveData.origin || origin,
          destination: liveData.destination || destination,
          history: sortedLiveHistory,
          estimatedDelivery: liveData.estimatedDelivery || null,
          officialTrackingUrl: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
          order: order
            ? {
                _id: order._id,
                orderNumber: order.orderNumber,
                resellerId: order.reseller?._id || order.reseller,
                resellerName: order.reseller?.name || "Direct Reseller",
                recipientName:
                  order.shippingAddress?.fullName ||
                  `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
                recipientPhone: order.shippingAddress?.phone,
                orderStatus: order.orderStatus,
                deliveryStatus: mappedProgress.stage,
                paymentMethod: order.paymentMethod,
                isFastDelivery: Boolean(order.isFastDelivery),
                totalAmountPaise: order.totalPaise || order.customerSellingTotalPaise,
              }
            : null,
        };
      }
    } catch (e) {
      console.warn(
        `[IndiaPost API]: Live endpoint failed for AWB ${trackingNumber}. Falling back to internal checkpoints:`,
        e.response?.data || e.message
      );
    }
  }

  // 6. Resilient Fallback: Retrieve existing checkpoints or generate progressive timeline
  const progress = computeProgress(order?.deliveryStatus, order?.orderStatus);
  const createdDate = order?.createdAt ? new Date(order.createdAt) : new Date(Date.now() - 86400000 * 2);
  const estDate = order?.estimatedDeliveryDate
    ? new Date(order.estimatedDeliveryDate)
    : new Date(createdDate.getTime() + 86400000 * 4);

  let history = [];
  if (order?.trackingHistory && order.trackingHistory.length > 0) {
    history = order.trackingHistory.map((h) => normalizeCheckpoint(h, origin));
  } else {
    // Generate manifest checkpoint
    history.push({
      timestamp: new Date(createdDate.getTime() + 1000 * 60 * 30).toISOString(),
      location: origin,
      status: "Consignment Manifest Generated",
      details: order?.isFastDelivery
        ? `Article ${trackingNumber} booked under Fast Delivery Priority Business Parcel Logistics at Tirur Booking Office (PIN 676107)`
        : `Article ${trackingNumber} booked under Business Parcel Logistics at Tirur Booking Office (PIN 676107)`,
    });
  }

  // Ensure checkpoints reflect progressive delivery stages if status has advanced
  const existingStatuses = history.map((h) => (h.status || "").toUpperCase());
  const hasStatus = (keyword) => existingStatuses.some((s) => s.includes(keyword));

  if (progress.percent >= 45 && !hasStatus("SORTING") && !hasStatus("PROCESSING")) {
    history.push({
      timestamp: new Date(createdDate.getTime() + 1000 * 60 * 180).toISOString(),
      location: origin,
      status: "Item Received at Sorting Hub",
      details: "Bagged for destination line-haul dispatch from Tirur Sorting Hub",
    });
  }

  if (progress.percent >= 60 && !hasStatus("DISPATCH") && !hasStatus("TRANSIT")) {
    history.push({
      timestamp: new Date(createdDate.getTime() + 1000 * 60 * 600).toISOString(),
      location: "Interstate Transit Hub",
      status: "Item Dispatched in Transit",
      details: "Dispatched towards destination delivery center",
    });
  }

  if (progress.percent >= 75 && !hasStatus("DESTINATION")) {
    history.push({
      timestamp: new Date(createdDate.getTime() + 1000 * 60 * 1440).toISOString(),
      location: destination,
      status: "Item Received at Destination Delivery Office",
      details: "Sorting completed at local Delivery Post Office",
    });
  }

  if (progress.percent >= 90 && !hasStatus("OUT FOR DELIVERY") && !hasStatus("BEAT")) {
    history.push({
      timestamp: new Date(createdDate.getTime() + 1000 * 60 * 1800).toISOString(),
      location: destination,
      status: "Out for Delivery",
      details: "Consignment assigned to delivery agent / beat postman",
    });
  }

  if (progress.percent >= 100 && !hasStatus("DELIVERED")) {
    history.push({
      timestamp: (order?.deliveredAt ? new Date(order.deliveredAt) : new Date(createdDate.getTime() + 1000 * 60 * 2200)).toISOString(),
      location: destination,
      status: "Item Delivered Successfully",
      details: "Delivered to recipient. Signature and acknowledgement captured.",
    });
  }

  // Sort descending so newest checkpoint is at index 0
  const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const currentStatus = order?.latestTrackingStatus || sortedHistory[0]?.status || progress.label;

  return {
    source: "SYSTEM_SYNCED",
    trackingNumber,
    courierName: courierMeta.name,
    courierCode: courierMeta.code,
    currentStatus,
    statusStage: progress.stage,
    progressPercent: progress.percent,
    origin,
    destination,
    estimatedDelivery: estDate.toISOString().split("T")[0],
    officialTrackingUrl: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
    history: sortedHistory,
    order: order
      ? {
          _id: order._id,
          orderNumber: order.orderNumber,
          resellerId: order.reseller?._id || order.reseller,
          resellerName: order.reseller?.name || "Direct Reseller",
          recipientName:
            order.shippingAddress?.fullName ||
            `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
          recipientPhone: order.shippingAddress?.phone,
          orderStatus: order.orderStatus,
          deliveryStatus: order.deliveryStatus || order.orderStatus,
          paymentMethod: order.paymentMethod,
          isFastDelivery: Boolean(order.isFastDelivery),
          totalAmountPaise: order.totalPaise || order.customerSellingTotalPaise,
        }
      : null,
  };
};

/**
 * Force live sync of a specific order by ID
 */
const syncOrderTracking = async (orderId, adminUser = null) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (!order.trackingNumber) {
    const err = new Error("Order does not have a tracking / consignment number assigned yet");
    err.statusCode = 400;
    throw err;
  }

  const result = await getTrackingInfo(order.trackingNumber, adminUser, true);

  if (adminUser) {
    await AuditLog.create({
      user: adminUser._id,
      userName: adminUser.name || "Admin",
      userRole: adminUser.role || "admin",
      action: "DELIVERY_PROGRESS_UPDATED",
      targetType: "ORDER",
      targetId: order._id.toString(),
      description: `Live tracking synced for ${order.orderNumber} (AWB: ${order.trackingNumber}): ${result.currentStatus}`,
    });
  }

  return result;
};

/**
 * Batch sync all active in-transit shipments
 */
const syncAllActiveShipments = async (adminUser = null) => {
  const activeOrders = await Order.find({
    trackingNumber: { $exists: true, $ne: "" },
    deliveryStatus: { $nin: ["DELIVERED", "CANCELLED", "RETURNED", "FAILED"] },
  }).select("_id trackingNumber orderNumber deliveryStatus");

  let syncedCount = 0;
  let failedCount = 0;

  for (const o of activeOrders) {
    try {
      await getTrackingInfo(o.trackingNumber, null, true);
      syncedCount += 1;
      // Gentle 250ms throttle between orders to respect DOP rate limits
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      failedCount += 1;
    }
  }

  try {
    await Setting.findOneAndUpdate(
      { key: "platform_settings" },
      { indiapostLastSyncAt: new Date() }
    );
  } catch (e) {
    // ignore
  }

  if (adminUser) {
    await AuditLog.create({
      user: adminUser._id,
      userName: adminUser.name || "Admin",
      userRole: adminUser.role || "admin",
      action: "DELIVERY_PROGRESS_UPDATED",
      targetType: "SETTING",
      description: `Batch India Post tracking sync executed: ${syncedCount} shipments updated, ${failedCount} errors.`,
    });
  }

  return { total: activeOrders.length, syncedCount, failedCount };
};

/**
 * Update delivery progress on an order and append audit tracking checkpoints
 */
const updateOrderDeliveryProgress = async (
  orderId,
  { deliveryStatus, courierName, trackingNumber, checkpointLocation, checkpointNote, estimatedDeliveryDate },
  adminUser
) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const updates = {};
  if (courierName) updates.courierName = courierName;
  if (trackingNumber) updates.trackingNumber = trackingNumber.trim();
  if (estimatedDeliveryDate) updates.estimatedDeliveryDate = new Date(estimatedDeliveryDate);

  if (deliveryStatus) {
    const upperDelivery = deliveryStatus.toUpperCase();
    updates.deliveryStatus = upperDelivery;

    // Sync orderStatus appropriately
    if (upperDelivery === "DELIVERED") {
      updates.orderStatus = "DELIVERED";
      updates.deliveredAt = new Date();
    } else if (upperDelivery === "DISPATCHED" || upperDelivery === "IN_TRANSIT" || upperDelivery === "OUT_FOR_DELIVERY") {
      if (order.orderStatus === "PENDING" || order.orderStatus === "CONFIRMED" || order.orderStatus === "PROCESSING") {
        updates.orderStatus = "SHIPPED";
      }
      if (!order.dispatchedAt) updates.dispatchedAt = new Date();
    } else if (upperDelivery === "CANCELLED" || upperDelivery === "FAILED" || upperDelivery === "RETURNED") {
      updates.orderStatus = "CANCELLED";
      updates.cancelledAt = new Date();
    }
  }

  // Append new checkpoint to trackingHistory if location or note provided
  if (checkpointLocation || checkpointNote || deliveryStatus) {
    const newCheckpoint = {
      timestamp: new Date(),
      location: checkpointLocation || (order.shippingAddress ? `${order.shippingAddress.city}, India` : "Sorting Hub"),
      status: deliveryStatus ? computeProgress(deliveryStatus, null).label : "Status Updated",
      details: checkpointNote || `Delivery progress updated to ${deliveryStatus || "IN_TRANSIT"} by admin.`,
    };

    if (!order.trackingHistory) order.trackingHistory = [];
    order.trackingHistory.push(newCheckpoint);
    updates.trackingHistory = order.trackingHistory;
  }

  const updatedOrder = await Order.findByIdAndUpdate(orderId, updates, { new: true }).populate(
    "reseller",
    "name email phone businessInfo"
  );

  // Sync to CodCollection record if this is a COD order
  if (order.paymentMethod === "COD") {
    await CodCollection.findOneAndUpdate(
      { order: order._id },
      {
        deliveryStatus: updates.deliveryStatus || updates.orderStatus,
        courierName: updates.courierName || order.courierName,
        trackingNumber: updates.trackingNumber || order.trackingNumber,
      }
    );
  }

  if (adminUser) {
    await AuditLog.create({
      user: adminUser._id,
      userName: adminUser.name || "Admin",
      userRole: adminUser.role || "admin",
      action: "DELIVERY_PROGRESS_UPDATED",
      targetType: "ORDER",
      targetId: order._id.toString(),
      description: `Delivery progress updated for order ${order.orderNumber}: ${deliveryStatus || "Updated"} (AWB: ${trackingNumber || order.trackingNumber || "N/A"})`,
    });
  }

  return updatedOrder;
};

module.exports = {
  detectCourier,
  computeProgress,
  mapIndiaPostStatusToStage,
  parseIndianOrIsoDate,
  normalizeCheckpoint,
  loginIndiaPost,
  refreshIndiaPostToken,
  getValidIndiaPostToken,
  getTrackingInfo,
  syncOrderTracking,
  syncAllActiveShipments,
  updateOrderDeliveryProgress,
};
