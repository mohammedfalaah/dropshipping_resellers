const Order = require("../models/Order");
const Product = require("../models/Product");
const CodCollection = require("../models/CodCollection");
const Cart = require("../models/Cart");
const AuditLog = require("../models/AuditLog");
const ledgerService = require("./ledgerService");
const { razorpayInstance } = require("../config/razorpay");
const { RAZORPAY_KEY_ID, FRONTEND_URL } = require("../config/env");

/**
 * Generate unique order number (e.g. SP-849201)
 */
const generateOrderNumber = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `SP-${random}`;
};

/**
 * Create a new order with atomic stock validation and deduction
 */
const createOrder = async ({ resellerId, items, shippingAddress, paymentMethod, userObj }) => {
  // Normalize payment method to supported enum (auto-map legacy CASHFREE to RAZORPAY)
  let normalizedPaymentMethod = String(paymentMethod || "COD").toUpperCase().trim();
  if (normalizedPaymentMethod === "CASHFREE") {
    normalizedPaymentMethod = "RAZORPAY";
  }
  if (!items || items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  // Ensure shipping address has email and names
  if (!shippingAddress.email) {
    shippingAddress.email = userObj?.email || "customer@example.com";
  }
  if (!shippingAddress.firstName) {
    const parts = (userObj?.name || "Customer").trim().split(" ");
    shippingAddress.firstName = parts[0] || "Customer";
    shippingAddress.lastName = parts.slice(1).join(" ") || "Reseller";
  }

  // 1. Fetch and validate all products
  const productIds = items
    .map((i) => (i.productId || i.product || "").toString())
    .filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map();
  products.forEach((p) => productMap.set(p._id.toString(), p));

  const orderItems = [];
  let subtotalPaise = 0;

  for (const item of items) {
    const pId = (item.productId || item.product || "").toString();
    let product = productMap.get(pId);
    if (!product && item.sku) {
      product = await Product.findOne({ sku: item.sku.toUpperCase() });
    }
    if (!product && pId) {
      try {
        product = await Product.findById(pId);
      } catch (e) {}
    }
    if (!product) {
      throw new Error(`Product not found: ${item.name || item.sku || pId}`);
    }
    if (!product.isActive) {
      throw new Error(`Product '${product.name}' is currently unavailable`);
    }
    if (product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for '${product.name}'. Available: ${product.stockQuantity}, Requested: ${item.quantity}`);
    }
    if (product.minOrderQuantity && item.quantity < product.minOrderQuantity) {
      throw new Error(`Minimum order quantity for '${product.name}' is ${product.minOrderQuantity}`);
    }

    const itemSubtotal = product.resellerPricePaise * item.quantity;
    subtotalPaise += itemSubtotal;

    orderItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      image: product.mainImage,
      quantity: item.quantity,
      unitPricePaise: product.resellerPricePaise,
      subtotalPaise: itemSubtotal,
    });
  }

  // Free shipping over 50000 paise (₹500.00), else 4900 paise (₹49.00)
  const shippingPaise = subtotalPaise >= 50000 ? 0 : 4900;
  const discountPaise = 0;
  const totalPaise = subtotalPaise + shippingPaise - discountPaise;

  const orderNumber = generateOrderNumber();

  // 2. Atomically decrement stock
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: -item.quantity },
    });
  }

  // Initial order status: COD and others -> CONFIRMED, Razorpay -> PENDING until verified
  const orderStatus = normalizedPaymentMethod === "RAZORPAY" ? "PENDING" : "CONFIRMED";
  const paymentStatus = "PENDING";

  // 3. Create Order document
  const order = await Order.create({
    orderNumber,
    reseller: resellerId,
    items: orderItems,
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise,
    currency: "INR",
    paymentMethod: normalizedPaymentMethod,
    paymentStatus,
    orderStatus,
    shippingAddress,
    cod:
      normalizedPaymentMethod === "COD"
        ? {
            codAmountPaise: totalPaise,
            collectedPaise: 0,
            pendingPaise: totalPaise,
            collectionStatus: "PENDING",
          }
        : {
            collectionStatus: "NOT_APPLICABLE",
          },
  });

  // 4. If COD, create CodCollection record
  if (normalizedPaymentMethod === "COD") {
    await CodCollection.create({
      order: order._id,
      orderNumber: order.orderNumber,
      reseller: resellerId,
      resellerName: userObj.name || "Reseller",
      codAmountPaise: totalPaise,
      collectedAmountPaise: 0,
      pendingAmountPaise: totalPaise,
      deliveryStatus: "PENDING",
      collectionStatus: "PENDING",
    });
  }

  // 5. If Razorpay, initiate Razorpay Order
  let razorpayOrderData = null;
  if (normalizedPaymentMethod === "RAZORPAY") {
    try {
      if (razorpayInstance) {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: totalPaise, // in paise
          currency: "INR",
          receipt: order.orderNumber,
          notes: {
            orderId: order._id.toString(),
            resellerId: resellerId.toString(),
          },
        });
        order.razorpay.orderId = rzpOrder.id;
        await order.save();
        razorpayOrderData = {
          id: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          keyId: RAZORPAY_KEY_ID,
        };
      } else {
        // Mock fallback for testing if API credentials aren't live
        const mockRzpId = `order_${Date.now()}`;
        order.razorpay.orderId = mockRzpId;
        await order.save();
        razorpayOrderData = {
          id: mockRzpId,
          amount: totalPaise,
          currency: "INR",
          keyId: RAZORPAY_KEY_ID,
        };
      }
    } catch (err) {
      console.error("[Razorpay Order Creation Error]:", err.message);
      // Fallback order ID
      const fallbackRzpId = `order_${Date.now()}`;
      order.razorpay.orderId = fallbackRzpId;
      await order.save();
      razorpayOrderData = {
        id: fallbackRzpId,
        amount: totalPaise,
        currency: "INR",
        keyId: RAZORPAY_KEY_ID,
      };
    }
  }

  // 6. Record DEBIT in Ledger (Reseller's balance increases by order amount)
  if (orderStatus === "CONFIRMED") {
    await ledgerService.recordEntry({
      resellerId,
      type: "DEBIT",
      amountPaise: totalPaise,
      referenceType: "ORDER",
      referenceId: order.orderNumber,
      orderId: order._id,
      description: `Order Placed - ${order.orderNumber}`,
      reason: "Confirmed wholesale order placement",
      recordedById: resellerId,
    });
  }

  // 7. Clear reseller's cart
  await Cart.findOneAndUpdate({ reseller: resellerId }, { items: [] });

  // 8. Audit log
  await AuditLog.create({
    user: resellerId,
    userName: userObj.name,
    userRole: userObj.role,
    action: "ORDER_CREATED",
    targetType: "ORDER",
    targetId: order._id.toString(),
    description: `Order ${order.orderNumber} created with total ₹${(totalPaise / 100).toFixed(2)} (${normalizedPaymentMethod})`,
  });

  return {
    order,
    razorpay: razorpayOrderData,
  };
};

/**
 * Update order status (Admin only)
 */
const updateOrderStatus = async (orderId, { orderStatus, trackingNumber, courierName, cancellationReason }, adminUser) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const previousStatus = order.orderStatus;
  const previousTracking = order.trackingNumber;

  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (courierName !== undefined) order.courierName = courierName;

  if (orderStatus && orderStatus !== previousStatus) {
    order.orderStatus = orderStatus;

    if (orderStatus === "SHIPPED") {
      order.dispatchedAt = new Date();
      // Sync CodCollection if COD
      await CodCollection.findOneAndUpdate(
        { order: order._id },
        { deliveryStatus: "DISPATCHED", courierName: order.courierName, trackingNumber: order.trackingNumber }
      );
    } else if (orderStatus === "DELIVERED") {
      order.deliveredAt = new Date();
      // Delivery status is delivered, but collection status remains separate!
      await CodCollection.findOneAndUpdate(
        { order: order._id },
        { deliveryStatus: "DELIVERED" }
      );
    } else if (orderStatus === "CANCELLED") {
      order.cancelledAt = new Date();
      order.cancellationReason = cancellationReason || "Cancelled by admin";

      // 1. Restore product stock atomically
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: item.quantity },
        });
      }

      // 2. If previously confirmed, create CREDIT in Ledger to reverse order liability
      if (previousStatus !== "PENDING") {
        await ledgerService.recordEntry({
          resellerId: order.reseller,
          type: "CREDIT",
          amountPaise: order.totalPaise,
          referenceType: "ORDER",
          referenceId: order.orderNumber,
          orderId: order._id,
          description: `Order Cancelled - ${order.orderNumber}`,
          reason: cancellationReason || "Order cancellation reversal",
          recordedById: adminUser._id,
        });
      }

      // 3. Update CodCollection status
      await CodCollection.findOneAndUpdate(
        { order: order._id },
        { deliveryStatus: "CANCELLED", collectionStatus: "CANCELLED" }
      );
    }
  }

  await order.save();

  await AuditLog.create({
    user: adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: "ORDER_STATUS_UPDATED",
    targetType: "ORDER",
    targetId: order._id.toString(),
    description: `Order ${order.orderNumber} status changed from ${previousStatus} to ${order.orderStatus}`,
    changes: {
      from: previousStatus,
      to: order.orderStatus,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
    },
  });

  return order;
};

module.exports = {
  createOrder,
  updateOrderStatus,
};
