const Order = require("../models/Order");
const orderService = require("../services/orderService");
const paymentService = require("../services/paymentService");
const { successResponse, errorResponse } = require("../utils/response");
const { paiseToRupees } = require("../utils/currency");

/**
 * Place Order (Approved Reseller only)
 */
const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    const result = await orderService.createOrder({
      resellerId: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      userObj: req.user,
    });

    return successResponse(
      res,
      `Order ${result.order.orderNumber} placed successfully!`,
      {
        order: result.order,
        razorpay: result.razorpay,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get My Orders (Reseller)
 */
const getMyOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { reseller: req.user._id };

    if (status) query.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    return successResponse(res, "Orders retrieved.", {
      orders,
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
 * Get Single Order Details (Reseller own or Admin)
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("reseller", "name email phone businessInfo")
      .populate("items.product", "name sku slug mainImage");

    if (!order) {
      return errorResponse(res, "Order not found", "ORDER_NOT_FOUND", 404);
    }

    // Ownership check: only admin or the order's reseller can view
    if (req.user.role !== "admin" && order.reseller._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, "Access denied to this order.", "FORBIDDEN", 403);
    }

    return successResponse(res, "Order details retrieved.", { order });
  } catch (err) {
    next(err);
  }
};

/**
 * Get All Orders (Admin only)
 */
const getAllOrders = async (req, res, next) => {
  try {
    const { resellerId, orderStatus, paymentStatus, paymentMethod, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};

    if (resellerId) query.reseller = resellerId;
    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.firstName": { $regex: search, $options: "i" } },
        { "shippingAddress.lastName": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } },
        { trackingNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("reseller", "name email phone businessInfo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    return successResponse(res, "All orders retrieved.", {
      orders,
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
 * Update Order Status (Admin only)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, trackingNumber, courierName, cancellationReason } = req.body;
    const order = await orderService.updateOrderStatus(
      req.params.id,
      { orderStatus, trackingNumber, courierName, cancellationReason },
      req.user
    );

    return successResponse(res, `Order status updated to ${order.orderStatus}.`, { order });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify Razorpay Online Payment
 */
const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await paymentService.verifyRazorpayPayment({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      user: req.user,
    });

    return successResponse(res, "Payment verified and order confirmed successfully!", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  verifyRazorpayPayment,
};
