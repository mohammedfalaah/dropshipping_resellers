const Payment = require("../models/Payment");
const paymentService = require("../services/paymentService");
const { razorpayInstance, verifyPaymentSignature } = require("../config/razorpay");
const { RAZORPAY_KEY_ID } = require("../config/env");
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
 * Create Razorpay Order
 * Endpoint: POST /api/create-order and POST /api/payments/create-order
 * Request: { amount (paise), currency, receipt }
 * Return: { order_id, amount, currency }
 * Minimum amount: 100 paise
 */
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, currency = "INR", receipt, notes = {} } = req.body;

    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount < 100) {
      return res.status(400).json({
        success: false,
        message: "Amount must be at least 100 paise (₹1.00)",
        code: "INVALID_AMOUNT",
      });
    }

    if (!razorpayInstance) {
      return res.status(500).json({
        success: false,
        message: "Razorpay instance is not initialized.",
        code: "RAZORPAY_CONFIG_ERROR",
      });
    }

    const receiptId = receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const rzpOrder = await razorpayInstance.orders.create({
      amount: Math.round(numericAmount),
      currency: String(currency).toUpperCase(),
      receipt: String(receiptId).slice(0, 40),
      notes: typeof notes === "object" ? notes : {},
    });

    return res.status(200).json({
      success: true,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key_id: RAZORPAY_KEY_ID,
      receipt: rzpOrder.receipt,
    });
  } catch (err) {
    console.error("[Razorpay Create Order Error]:", err);
    const statusCode = err.statusCode || (err.error?.code === "BAD_REQUEST_ERROR" ? 400 : 500);
    return res.status(statusCode).json({
      success: false,
      message: err.error?.description || err.message || "Failed to create Razorpay order.",
      code: err.error?.code || "RAZORPAY_ERROR",
    });
  }
};

/**
 * Verify Razorpay Signature
 * Endpoint: POST /api/verify-payment and POST /api/payments/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Compare generated signature with razorpay_signature
 * Return success only if signatures match
 */
const verifyPayment = async (req, res, next) => {
  try {
    const orderId = req.body.order_id || req.body.razorpay_order_id;
    const paymentId = req.body.payment_id || req.body.razorpay_payment_id;
    const signature = req.body.razorpay_signature || req.body.signature;
    const internalOrderId = req.body.orderId;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: order_id, payment_id, and razorpay_signature are required.",
        code: "MISSING_REQUIRED_FIELDS",
        received: {
          order_id: Boolean(orderId),
          payment_id: Boolean(paymentId),
          razorpay_signature: Boolean(signature),
        },
      });
    }

    const isValid = verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed.",
        code: "SIGNATURE_MISMATCH",
        is_valid: false,
      });
    }

    // Optional: If linked to an internal database order, update order status to PAID
    let internalResult = null;
    if (internalOrderId) {
      try {
        internalResult = await paymentService.verifyRazorpayPayment({
          orderId: internalOrderId,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          user: req.user || { _id: null, name: "Customer", role: "customer" },
        });
      } catch (e) {
        console.warn("[Internal Order Sync Notice]:", e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      is_valid: true,
      order_id: orderId,
      payment_id: paymentId,
      order: internalResult?.order || null,
    });
  } catch (err) {
    console.error("[Razorpay Verify Error]:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error during verification.",
      code: "VERIFICATION_ERROR",
    });
  }
};

module.exports = {
  recordPayment,
  getAllPayments,
  getMyPayments,
  reversePayment,
  recordAdjustment,
  createRazorpayOrder,
  verifyPayment,
};
