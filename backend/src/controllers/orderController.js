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
    const { items, shippingAddress, paymentMethod, isFastDelivery, fastDelivery } = req.body;

    const result = await orderService.createOrder({
      resellerId: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      userObj: req.user,
      isFastDelivery: Boolean(isFastDelivery || fastDelivery),
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
    const { status, page = 1, limit = 50 } = req.query;

    // Match either by reseller ObjectId or by user email in shipping address
    const conditions = [{ reseller: req.user._id }];
    if (req.user.email) {
      conditions.push({ "shippingAddress.email": req.user.email.toLowerCase() });
    }
    const query = { $or: conditions };

    if (status && status !== "all") query.orderStatus = status.toUpperCase();

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("reseller", "name email phone businessInfo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
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
    const isOwner =
      (order.reseller && order.reseller._id.toString() === req.user._id.toString()) ||
      (req.user.email && order.shippingAddress?.email?.toLowerCase() === req.user.email.toLowerCase());

    if (req.user.role !== "admin" && !isOwner) {
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
    const { resellerId, orderStatus, paymentStatus, paymentMethod, isFastDelivery, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};

    // If caller is not admin, strictly restrict to caller's own orders
    if (req.user.role !== "admin") {
      const conditions = [{ reseller: req.user._id }];
      if (req.user.email) {
        conditions.push({ "shippingAddress.email": req.user.email.toLowerCase() });
      }
      query.$or = conditions;
    } else if (resellerId) {
      query.reseller = resellerId;
    }
    if (orderStatus && orderStatus !== "all") query.orderStatus = orderStatus.toUpperCase();
    if (paymentStatus && paymentStatus !== "all") query.paymentStatus = paymentStatus.toUpperCase();
    if (paymentMethod && paymentMethod !== "all") query.paymentMethod = paymentMethod.toUpperCase();
    if (isFastDelivery !== undefined && isFastDelivery !== "all") {
      query.isFastDelivery = isFastDelivery === "true" || isFastDelivery === true;
    }

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

    const formattedOrders = orders.map((o) => {
      const obj = o.toObject();
      const wholesaleCostPaise =
        obj.wholesaleCostPaise ||
        (obj.items || []).reduce(
          (s, it) => s + (it.wholesalePricePaise || it.unitPricePaise || 0) * (it.quantity || 1),
          0
        );
      const deliveryChargePaise = obj.deliveryChargePaise !== undefined ? obj.deliveryChargePaise : 5000;
      const amountPayableToVexoraPaise =
        obj.amountPayableToVexoraPaise || wholesaleCostPaise + deliveryChargePaise;
      const customerSellingTotalPaise =
        obj.customerSellingTotalPaise ||
        (obj.items || []).reduce(
          (s, it) =>
            s +
            (it.customerSellingPricePaise || it.wholesalePricePaise || it.unitPricePaise || 0) *
              (it.quantity || 1),
          0
        ) ||
        obj.totalPaise;
      const expectedResellerProfitPaise =
        obj.expectedResellerProfitPaise !== undefined
          ? obj.expectedResellerProfitPaise
          : Math.max(0, customerSellingTotalPaise - amountPayableToVexoraPaise);

      obj.wholesaleCostPaise = wholesaleCostPaise;
      obj.deliveryChargePaise = deliveryChargePaise;
      obj.amountPayableToVexoraPaise = amountPayableToVexoraPaise;
      obj.customerSellingTotalPaise = customerSellingTotalPaise;
      obj.expectedResellerProfitPaise = expectedResellerProfitPaise;
      obj.wholesaleCostRupees = paiseToRupees(wholesaleCostPaise);
      obj.deliveryChargeRupees = paiseToRupees(deliveryChargePaise);
      obj.amountPayableToVexoraRupees = paiseToRupees(amountPayableToVexoraPaise);
      obj.customerSellingTotalRupees = paiseToRupees(customerSellingTotalPaise);
      obj.expectedResellerProfitRupees = paiseToRupees(expectedResellerProfitPaise);
      obj.codCollectedAmountRupees = paiseToRupees(obj.codCollectedAmountPaise || 0);

      return obj;
    });

    return successResponse(res, "All orders retrieved.", {
      orders: formattedOrders,
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
 * Update Order COD Collection & Status (Admin only)
 */
const updateOrderCodCollection = async (req, res, next) => {
  try {
    const {
      collectedAmount,
      collectionStatus,
      collectionReference,
      notes,
      deliveryChargeStatus,
      trackingNumber,
      courierName,
      orderStatus,
    } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse(res, "Order not found", 404);
    }

    const codService = require("../services/codService");
    let codRecord = null;
    try {
      codRecord = await codService.recordCodCollection(
        orderId,
        {
          collectedAmountPaise:
            collectedAmount !== undefined && collectedAmount !== ""
              ? rupeesToPaise(Number(collectedAmount))
              : undefined,
          collectionStatus: collectionStatus ? collectionStatus.toUpperCase() : undefined,
          collectionReference,
          notes,
        },
        req.user
      );
    } catch (e) {
      // Continue to update other order fields if codService threw
    }

    const updates = {};
    if (collectionStatus) {
      const upperStatus = collectionStatus.toUpperCase();
      updates.codCollectionStatus = upperStatus;
      updates["cod.collectionStatus"] = upperStatus;
      if (upperStatus === "COLLECTED" || upperStatus === "RECONCILED") {
        updates.paymentStatus = "PAID";
      }
    }
    if (collectedAmount !== undefined && collectedAmount !== "") {
      const paise = rupeesToPaise(Number(collectedAmount));
      updates.codCollectedAmountPaise = paise;
      updates["cod.collectedPaise"] = paise;
    }
    if (deliveryChargeStatus) {
      updates.deliveryChargeStatus = deliveryChargeStatus.toUpperCase();
    }
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
    if (courierName !== undefined) updates.courierName = courierName;
    if (orderStatus) updates.orderStatus = orderStatus.toUpperCase();

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updates, { new: true }).populate(
      "reseller",
      "name email phone businessInfo"
    );

    return successResponse(res, "Order COD collection status updated successfully.", {
      order: updatedOrder,
      codRecord,
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

/**
 * Update Delivery Progress & Tracking (Admin only)
 */
const updateDeliveryProgress = async (req, res, next) => {
  try {
    const trackingService = require("../services/trackingService");
    const {
      deliveryStatus,
      courierName,
      trackingNumber,
      checkpointLocation,
      checkpointNote,
      estimatedDeliveryDate,
    } = req.body;

    const updatedOrder = await trackingService.updateOrderDeliveryProgress(
      req.params.id,
      {
        deliveryStatus,
        courierName,
        trackingNumber,
        checkpointLocation,
        checkpointNote,
        estimatedDeliveryDate,
      },
      req.user
    );

    return successResponse(res, "Delivery progress and tracking updated successfully.", {
      order: updatedOrder,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public Consignment / Order Tracking
 */
const getPublicTracking = async (req, res, next) => {
  try {
    const trackingService = require("../services/trackingService");
    const trackingData = await trackingService.getTrackingInfo(req.params.trackingNumber);
    return successResponse(res, "Tracking details retrieved.", trackingData);
  } catch (err) {
    next(err);
  }
};

/**
 * Get / Download Shipping Label
 */
const getShippingLabel = async (req, res, next) => {
  try {
    const shippingLabelService = require("../services/shippingLabelService");
    const labelData = await shippingLabelService.getOrCreateShippingLabel(req.params.id);

    // Check ownership if not admin
    if (req.user && req.user.role !== "admin") {
      const isOwner =
        (labelData.order.reseller && labelData.order.reseller._id.toString() === req.user._id.toString()) ||
        (req.user.email && labelData.order.shippingAddress?.email?.toLowerCase() === req.user.email.toLowerCase());
      if (!isOwner) {
        return errorResponse(res, "Access denied to this shipping label.", "FORBIDDEN", 403);
      }
    }

    // If query format is html / view is print / download is 1, return the standalone printable HTML
    if (req.query.format === "html" || req.query.view === "print" || req.query.download === "1") {
      const html = shippingLabelService.generateLabelHtml(labelData.order, {
        barcode: labelData.barcode,
        svg: labelData.barcodeSvg,
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    // Otherwise return JSON API response
    return successResponse(res, "Shipping label retrieved successfully.", {
      orderId: labelData.order._id,
      orderNumber: labelData.order.orderNumber,
      trackingNumber: labelData.barcode,
      barcode: labelData.barcode,
      base64Image: labelData.barcodeDataUri,
      serviceType: labelData.serviceType,
      labelUrl: `/api/orders/${labelData.order._id}/shipping-label?view=print`,
      order: labelData.order,
    });
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
  updateOrderCodCollection,
  updateDeliveryProgress,
  getPublicTracking,
  getShippingLabel,
  verifyRazorpayPayment,
};
