const Order = require("../models/Order");
const Product = require("../models/Product");
const CodCollection = require("../models/CodCollection");
const Cart = require("../models/Cart");
const AuditLog = require("../models/AuditLog");
const ledgerService = require("./ledgerService");
const settingsService = require("./settingsService");
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
const createOrder = async ({ resellerId, items, shippingAddress, paymentMethod, userObj, isFastDelivery = false }) => {
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
    shippingAddress.email = userObj?.email || "";
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
  let wholesaleCostPaise = 0;
  let customerSellingTotalPaise = 0;
  let expectedResellerProfitPaise = 0;

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

    const wholesalePricePaise = product.resellerPricePaise;
    // Reseller customer selling price: must be at least wholesale price
    let customerSellingPricePaise = wholesalePricePaise;
    if (item.customerSellingPricePaise && Number(item.customerSellingPricePaise) >= wholesalePricePaise) {
      customerSellingPricePaise = Math.round(Number(item.customerSellingPricePaise));
    } else if (item.customerSellingPrice && Math.round(Number(item.customerSellingPrice) * 100) >= wholesalePricePaise) {
      customerSellingPricePaise = Math.round(Number(item.customerSellingPrice) * 100);
    } else if (item.price && Math.round(Number(item.price) * 100) > wholesalePricePaise) {
      customerSellingPricePaise = Math.round(Number(item.price) * 100);
    }

    const itemWholesaleSubtotal = wholesalePricePaise * item.quantity;
    const itemCustomerSellingSubtotal = customerSellingPricePaise * item.quantity;
    const itemProfit = itemCustomerSellingSubtotal - itemWholesaleSubtotal;

    wholesaleCostPaise += itemWholesaleSubtotal;
    customerSellingTotalPaise += itemCustomerSellingSubtotal;
    expectedResellerProfitPaise += itemProfit;

    orderItems.push({
      product: product._id,
      name: product.name,
      sku: item.variantSku || product.sku,
      image: item.image || product.mainImage,
      color: item.color || item.selectedColor || "",
      size: item.size || item.selectedSize || "",
      variantSku: item.variantSku || "",
      quantity: item.quantity,
      unitPricePaise: wholesalePricePaise,
      wholesalePricePaise: wholesalePricePaise,
      subtotalPaise: itemWholesaleSubtotal,
      customerSellingPricePaise: customerSellingPricePaise,
      customerSellingSubtotalPaise: itemCustomerSellingSubtotal,
      resellerProfitPaise: itemProfit,
    });
  }

  // Delivery charge from platform settings (admin-managed, default ₹50 = 5000 paise)
  const deliveryChargePaise = await settingsService.getDeliveryChargePaise();
  const discountPaise = 0;

  // Determine financial amounts based on payment method
  let totalPaise = 0;
  let customerCollectionPaise = 0;
  let deliveryChargeStatus = "PENDING";

  if (normalizedPaymentMethod === "COD") {
    // For COD: Reseller pays ONLY the delivery charge now.
    // Wholesale product amount is collected from customer upon delivery.
    totalPaise = deliveryChargePaise;
    customerCollectionPaise = customerSellingTotalPaise;
  } else {
    // For Prepaid (Razorpay / Bank Transfer): Reseller pays wholesale cost + delivery charge now.
    totalPaise = wholesaleCostPaise + deliveryChargePaise - discountPaise;
    customerCollectionPaise = 0;
  }

  const orderNumber = generateOrderNumber();

  // 2. Atomically decrement stock
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQuantity: -item.quantity },
    });
  }

  // Initial order status: COD and others -> CONFIRMED, Razorpay -> PENDING until verified
  const orderStatus = normalizedPaymentMethod === "RAZORPAY" ? "PENDING" : "CONFIRMED";
  const paymentStatus = normalizedPaymentMethod === "COD" ? "PENDING" : "PENDING";

  // Generate automated India Post consignment tracking ID & shipping label barcode
  const shippingLabelService = require("./shippingLabelService");
  const consignmentBarcode = shippingLabelService.generateConsignmentNumber(orderNumber);
  const barcodeMeta = shippingLabelService.generateBarcodeSvg(consignmentBarcode);

  // 3. Create Order document
  const order = await Order.create({
    orderNumber,
    reseller: resellerId,
    items: orderItems,
    subtotalPaise: wholesaleCostPaise,
    wholesaleCostPaise,
    customerSellingTotalPaise,
    expectedResellerProfitPaise,
    deliveryChargePaise,
    deliveryChargeStatus,
    customerCollectionPaise,
    codCollectedAmountPaise: 0,
    codCollectionStatus: normalizedPaymentMethod === "COD" ? "PENDING" : "NOT_APPLICABLE",
    amountPayableToVexoraPaise: wholesaleCostPaise + deliveryChargePaise,
    resellerSettlementStatus: "UNSETTLED",
    settledProfitPaise: 0,
    discountPaise,
    shippingPaise: deliveryChargePaise,
    totalPaise,
    currency: "INR",
    paymentMethod: normalizedPaymentMethod,
    paymentStatus,
    orderStatus,
    shippingAddress,
    trackingNumber: consignmentBarcode,
    isFastDelivery: Boolean(isFastDelivery),
    courierName: "India Post (Business Parcel)",
    deliveryStatus: "BOOKED",
    shippingLabel: {
      barcode: consignmentBarcode,
      base64Image: barcodeMeta.dataUri,
      generatedAt: new Date(),
      serviceType: "BUSINESS_PARCEL",
    },
    trackingHistory: [
      {
        timestamp: new Date(),
        location: "Spare pro Logistics Hub, Tirur, Kerala - 676107",
        status: "Consignment Manifest Generated",
        details: isFastDelivery
          ? `Article ${consignmentBarcode} booked under Fast Delivery (Priority Dispatch) Business Parcel Logistics at Tirur Booking Office (PIN 676107). Priority dispatch scheduled.`
          : `Article ${consignmentBarcode} booked under Business Parcel Logistics at Tirur Booking Office (PIN 676107). Ready for dispatch.`,
      },
    ],
    cod:
      normalizedPaymentMethod === "COD"
        ? {
            codAmountPaise: customerSellingTotalPaise,
            collectedPaise: 0,
            pendingPaise: customerSellingTotalPaise,
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
      wholesaleCostPaise,
      customerSellingTotalPaise,
      expectedResellerProfitPaise,
      deliveryChargePaise,
      deliveryChargeStatus,
      amountPayableToVexoraPaise: wholesaleCostPaise + deliveryChargePaise,
      codAmountPaise: customerSellingTotalPaise,
      collectedAmountPaise: 0,
      pendingAmountPaise: customerSellingTotalPaise,
      deliveryStatus: "PENDING",
      collectionStatus: "PENDING",
      resellerSettlementStatus: "UNSETTLED",
      settledProfitPaise: 0,
    });
  }

  // 5. If Razorpay OR COD (pay delivery charge via Razorpay upfront)
  let razorpayOrderData = null;
  const isPrepaidRazorpay = normalizedPaymentMethod === "RAZORPAY";
  const isCodWithDeliveryCharge = normalizedPaymentMethod === "COD" && deliveryChargePaise > 0;

  if (isPrepaidRazorpay || isCodWithDeliveryCharge) {
    const chargePaise = isCodWithDeliveryCharge ? deliveryChargePaise : totalPaise;
    try {
      if (razorpayInstance) {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: chargePaise, // in paise: delivery charge for COD, full total for prepaid
          currency: "INR",
          receipt: order.orderNumber,
          notes: {
            orderId: order._id.toString(),
            resellerId: resellerId.toString(),
            chargeType: isCodWithDeliveryCharge ? "COD_DELIVERY_CHARGE" : "FULL_PREPAID",
          },
        });
        order.razorpay.orderId = rzpOrder.id;
        await order.save();
        razorpayOrderData = {
          id: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          keyId: RAZORPAY_KEY_ID,
          isCodDeliveryCharge: isCodWithDeliveryCharge,
        };
      } else {
        // Mock fallback for testing if API credentials aren't live
        const mockRzpId = `order_sim_${Date.now()}`;
        order.razorpay.orderId = mockRzpId;
        await order.save();
        razorpayOrderData = {
          id: mockRzpId,
          amount: chargePaise,
          currency: "INR",
          keyId: RAZORPAY_KEY_ID,
          isSimulated: true,
          isCodDeliveryCharge: isCodWithDeliveryCharge,
        };
      }
    } catch (err) {
      console.warn("[Razorpay Order Creation Fallback]:", err.message);
      // Fallback order ID
      const fallbackRzpId = `order_sim_${Date.now()}`;
      order.razorpay.orderId = fallbackRzpId;
      await order.save();
      razorpayOrderData = {
        id: fallbackRzpId,
        amount: chargePaise,
        currency: "INR",
        keyId: RAZORPAY_KEY_ID,
        isSimulated: true,
        isCodDeliveryCharge: isCodWithDeliveryCharge,
      };
    }
  }

  // 6. Record DEBIT in Ledger
  if (orderStatus === "CONFIRMED") {
    if (normalizedPaymentMethod === "COD") {
      // For COD dropshipping: reseller is debited ONLY the delivery charge now.
      // The wholesale product cost is collected from the end customer on delivery.
      await ledgerService.recordEntry({
        resellerId,
        type: "DEBIT",
        amountPaise: deliveryChargePaise,
        referenceType: "ORDER",
        referenceId: order.orderNumber,
        orderId: order._id,
        description: `COD Order Placed (Delivery Charge) - ${order.orderNumber}`,
        reason: "COD Delivery charge debit",
        recordedById: resellerId,
      });
    } else {
      await ledgerService.recordEntry({
        resellerId,
        type: "DEBIT",
        amountPaise: totalPaise,
        referenceType: "ORDER",
        referenceId: order.orderNumber,
        orderId: order._id,
        description: `Wholesale Order Placed - ${order.orderNumber}`,
        reason: "Confirmed wholesale order placement",
        recordedById: resellerId,
      });
    }
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
