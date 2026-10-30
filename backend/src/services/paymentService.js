const Payment = require("../models/Payment");
const Order = require("../models/Order");
const CodCollection = require("../models/CodCollection");
const AuditLog = require("../models/AuditLog");
const ledgerService = require("./ledgerService");
const { verifyPaymentSignature } = require("../config/razorpay");
const cashfreeConfig = require("../config/cashfree");
const { rupeesToPaise, paiseToRupees } = require("../utils/currency");

const generatePaymentNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${timestamp}-${random}`;
};

/**
 * Record a payment received from a reseller (Admin action)
 */
const recordManualPayment = async ({
  resellerId,
  orderId = null,
  amountPaise,
  method,
  transactionReference = "",
  notes = "",
  adminUser,
}) => {
  if (!resellerId || !amountPaise || !method) {
    throw new Error("Missing required payment parameters");
  }

  // Idempotency: Prevent duplicate payment reference
  if (transactionReference) {
    const existingPayment = await Payment.findOne({
      transactionReference,
      status: "PAID",
      isReversed: false,
    });
    if (existingPayment) {
      throw new Error(`A verified payment with reference '${transactionReference}' already exists.`);
    }
  }

  const paymentNumber = generatePaymentNumber();

  // 1. Create Payment record
  const payment = await Payment.create({
    paymentNumber,
    reseller: resellerId,
    order: orderId || null,
    amountPaise,
    method,
    status: "PAID",
    transactionReference,
    notes,
    recordedBy: adminUser._id,
  });

  // 2. Credit the reseller in the ledger (reduces outstanding balance)
  await ledgerService.recordEntry({
    resellerId,
    type: "CREDIT",
    amountPaise,
    referenceType: "PAYMENT",
    referenceId: payment.paymentNumber,
    orderId: orderId || null,
    paymentId: payment._id,
    description: `Payment Received - ${payment.paymentNumber} (${method})`,
    reason: notes || "Direct payment recorded by administrator",
    recordedById: adminUser._id,
  });

  // 3. If an order is attached, update order payment status
  if (orderId) {
    const order = await Order.findById(orderId);
    if (order) {
      const orderPayments = await Payment.find({
        order: order._id,
        status: "PAID",
        isReversed: false,
      });
      const totalPaidForOrder = orderPayments.reduce((s, p) => s + p.amountPaise, 0);

      if (totalPaidForOrder >= order.totalPaise) {
        order.paymentStatus = "PAID";
      } else if (totalPaidForOrder > 0) {
        order.paymentStatus = "PARTIALLY_PAID";
      }
      await order.save();

      // If COD order, also update CodCollection
      if (order.paymentMethod === "COD") {
        await CodCollection.findOneAndUpdate(
          { order: order._id },
          {
            $inc: { collectedAmountPaise: amountPaise, pendingAmountPaise: -amountPaise },
            collectionStatus: totalPaidForOrder >= order.totalPaise ? "COLLECTED" : "PARTIALLY_COLLECTED",
            collectionDate: new Date(),
            collectionReference: transactionReference,
          }
        );
      }
    }
  }

  // 4. Audit Log
  await AuditLog.create({
    user: adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: "PAYMENT_RECORDED",
    targetType: "PAYMENT",
    targetId: payment._id.toString(),
    description: `Payment ${payment.paymentNumber} of ₹${(amountPaise / 100).toFixed(2)} recorded for reseller`,
    changes: {
      amountRupees: paiseToRupees(amountPaise),
      method,
      transactionReference,
      orderId,
    },
  });

  return payment;
};

/**
 * Verify Razorpay payment signature and update order & financial records
 */
const verifyRazorpayPayment = async ({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  user,
}) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  // Idempotency: If order is already paid, return safely
  if (order.paymentStatus === "PAID") {
    return { order, alreadyPaid: true };
  }

  // Verify signature
  const isValid = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  // If not valid signature and not in development test mode, throw error
  if (!isValid && process.env.NODE_ENV === "production") {
    order.paymentStatus = "FAILED";
    await order.save();
    throw new Error("Invalid Razorpay payment signature verification failed");
  }

  // Idempotency check on paymentId
  const existingPayment = await Payment.findOne({
    razorpayPaymentId,
    status: "PAID",
  });
  if (existingPayment) {
    return { order, alreadyPaid: true };
  }

  // 1. Update Order status
  order.paymentStatus = "PAID";
  order.orderStatus = "CONFIRMED";
  order.razorpay = {
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  };
  await order.save();

  // 2. Create Payment record
  const paymentNumber = generatePaymentNumber();
  const payment = await Payment.create({
    paymentNumber,
    reseller: order.reseller,
    order: order._id,
    amountPaise: order.totalPaise,
    method: "RAZORPAY",
    status: "PAID",
    transactionReference: razorpayPaymentId,
    razorpayOrderId,
    razorpayPaymentId,
    notes: `Online payment via Razorpay for order ${order.orderNumber}`,
    recordedBy: user._id,
  });

  // 3. Record DEBIT (for order confirmation) and CREDIT (for payment) in Ledger
  await ledgerService.recordEntry({
    resellerId: order.reseller,
    type: "DEBIT",
    amountPaise: order.totalPaise,
    referenceType: "ORDER",
    referenceId: order.orderNumber,
    orderId: order._id,
    description: `Order Confirmed - ${order.orderNumber}`,
    reason: "Razorpay order payment confirmed",
    recordedById: user._id,
  });

  await ledgerService.recordEntry({
    resellerId: order.reseller,
    type: "CREDIT",
    amountPaise: order.totalPaise,
    referenceType: "PAYMENT",
    referenceId: payment.paymentNumber,
    orderId: order._id,
    paymentId: payment._id,
    description: `Online Payment Verified - ${payment.paymentNumber} (Razorpay: ${razorpayPaymentId})`,
    reason: "Cryptographically verified Razorpay payment",
    recordedById: user._id,
  });

  // 4. Audit Log
  await AuditLog.create({
    user: user._id,
    userName: user.name,
    userRole: user.role,
    action: "RAZORPAY_PAYMENT_VERIFIED",
    targetType: "PAYMENT",
    targetId: payment._id.toString(),
    description: `Razorpay payment ${razorpayPaymentId} of ₹${(order.totalPaise / 100).toFixed(2)} verified for order ${order.orderNumber}`,
  });

  return { order, payment };
};

/**
 * Verify Cashfree Online Payment
 * Queries Cashfree API directly to verify the order payment status
 */
const verifyCashfreePayment = async ({ orderId, user }) => {
  const query = orderId.toString().startsWith("SP-") ? { orderNumber: orderId } : { _id: orderId };
  const order = await Order.findOne(query);

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // Idempotency: if already paid, return existing state
  if (order.paymentStatus === "PAID") {
    const existingPayment = await Payment.findOne({ order: order._id, status: "PAID" });
    return { order, payment: existingPayment, alreadyPaid: true, verified: true };
  }

  // Query Cashfree API to verify order and payments
  let cfOrder = null;
  let cfPayments = [];
  try {
    cfOrder = await cashfreeConfig.getOrder(order.orderNumber);
    try {
      cfPayments = await cashfreeConfig.getOrderPayments(order.orderNumber);
    } catch (e) {
      // payments list fetch is secondary
    }
  } catch (err) {
    console.error("[Cashfree Verification API Error]:", err.message);
    throw new Error(`Cashfree payment verification query failed: ${err.message}`);
  }

  // Check if order is marked PAID on Cashfree or has any SUCCESS payment
  const isPaid =
    cfOrder?.order_status === "PAID" ||
    (Array.isArray(cfPayments) && cfPayments.some((p) => p.payment_status === "SUCCESS"));

  if (!isPaid) {
    if (cfOrder?.order_status === "FAILED") {
      order.paymentStatus = "FAILED";
      order.cashfree.paymentStatus = "FAILED";
      await order.save();
    }
    return {
      order,
      verified: false,
      status: cfOrder?.order_status || "PENDING",
      message: "Payment is pending or not yet completed on Cashfree.",
    };
  }

  // Extract successful payment info from Cashfree
  const successfulPayment =
    (Array.isArray(cfPayments) && cfPayments.find((p) => p.payment_status === "SUCCESS")) || {};
  const cfPaymentId = successfulPayment.cf_payment_id
    ? String(successfulPayment.cf_payment_id)
    : String(cfOrder.cf_order_id || "");
  const paymentMethodUsed =
    successfulPayment.payment_group || successfulPayment.payment_method || "CASHFREE";

  // Check if Payment document already recorded
  const existingPayment = await Payment.findOne({
    cashfreeOrderId: order.orderNumber,
    status: "PAID",
  });
  if (existingPayment) {
    order.paymentStatus = "PAID";
    order.orderStatus = "CONFIRMED";
    await order.save();
    return { order, payment: existingPayment, alreadyPaid: true, verified: true };
  }

  // 1. Update Order status
  order.paymentStatus = "PAID";
  order.orderStatus = "CONFIRMED";
  order.cashfree = {
    orderId: cfOrder.order_id || order.orderNumber,
    cfOrderId: String(cfOrder.cf_order_id || ""),
    paymentSessionId: order.cashfree?.paymentSessionId || "",
    paymentStatus: "PAID",
    cfPaymentId,
    paymentMethod: typeof paymentMethodUsed === "string" ? paymentMethodUsed : JSON.stringify(paymentMethodUsed),
    paymentCompletionTime: successfulPayment.payment_time ? new Date(successfulPayment.payment_time) : new Date(),
  };
  await order.save();

  // 2. Create Payment record
  const paymentNumber = generatePaymentNumber();
  const payment = await Payment.create({
    paymentNumber,
    reseller: order.reseller,
    order: order._id,
    amountPaise: order.totalPaise,
    method: "CASHFREE",
    status: "PAID",
    transactionReference: cfPaymentId,
    cashfreeOrderId: order.orderNumber,
    cashfreePaymentId: cfPaymentId,
    notes: `Online payment via Cashfree Gateway for order ${order.orderNumber} (CF Ref: ${cfPaymentId})`,
    recordedBy: user?._id || order.reseller,
  });

  // 3. Record DEBIT (order confirmation) and CREDIT (payment) in Ledger
  await ledgerService.recordEntry({
    resellerId: order.reseller,
    type: "DEBIT",
    amountPaise: order.totalPaise,
    referenceType: "ORDER",
    referenceId: order.orderNumber,
    orderId: order._id,
    description: `Order Confirmed - ${order.orderNumber}`,
    reason: "Cashfree order payment confirmed",
    recordedById: user?._id || order.reseller,
  });

  await ledgerService.recordEntry({
    resellerId: order.reseller,
    type: "CREDIT",
    amountPaise: order.totalPaise,
    referenceType: "PAYMENT",
    referenceId: payment.paymentNumber,
    orderId: order._id,
    paymentId: payment._id,
    description: `Online Payment Verified - ${payment.paymentNumber} (Cashfree: ${cfPaymentId})`,
    reason: "Verified Cashfree gateway payment",
    recordedById: user?._id || order.reseller,
  });

  // 4. Audit Log
  await AuditLog.create({
    user: user?._id || order.reseller,
    userName: user?.name || "Customer",
    userRole: user?.role || "reseller",
    action: "CASHFREE_PAYMENT_VERIFIED",
    targetType: "PAYMENT",
    targetId: payment._id.toString(),
    description: `Cashfree payment ${cfPaymentId} of ₹${(order.totalPaise / 100).toFixed(2)} verified for order ${order.orderNumber}`,
  });

  return { order, payment, verified: true };
};

/**
 * Reverse an erroneous payment using a compensating DEBIT entry (never silently delete)
 */
const reversePayment = async ({ paymentId, reason, adminUser }) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error("Payment record not found");
  }
  if (payment.isReversed) {
    throw new Error("This payment has already been reversed");
  }

  payment.isReversed = true;
  payment.status = "REVERSED";
  payment.reversalReason = reason;
  payment.reversedAt = new Date();
  payment.reversedBy = adminUser._id;
  await payment.save();

  // Create compensating DEBIT in the ledger
  await ledgerService.recordEntry({
    resellerId: payment.reseller,
    type: "DEBIT",
    amountPaise: payment.amountPaise,
    referenceType: "REVERSAL",
    referenceId: payment.paymentNumber,
    paymentId: payment._id,
    orderId: payment.order,
    description: `Payment Reversal - ${payment.paymentNumber}`,
    reason: reason || "Administrative correction/reversal",
    recordedById: adminUser._id,
  });

  await AuditLog.create({
    user: adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: "PAYMENT_REVERSED",
    targetType: "PAYMENT",
    targetId: payment._id.toString(),
    description: `Payment ${payment.paymentNumber} reversed. Reason: ${reason}`,
    reason,
  });

  return payment;
};

/**
 * Record an approved credit or debit adjustment with a mandatory reason
 */
const recordAdjustment = async ({ resellerId, type, amountPaise, reason, adminUser }) => {
  if (!resellerId || !type || !amountPaise || !reason) {
    throw new Error("Missing required adjustment parameters");
  }

  const entry = await ledgerService.recordEntry({
    resellerId,
    type,
    amountPaise,
    referenceType: "ADJUSTMENT",
    description: `Account Adjustment (${type}): ${reason}`,
    reason,
    recordedById: adminUser._id,
  });

  await AuditLog.create({
    user: adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: "LEDGER_ADJUSTMENT",
    targetType: "LEDGER",
    targetId: entry._id.toString(),
    description: `Manual ledger ${type} adjustment of ₹${(amountPaise / 100).toFixed(2)} for reseller`,
    reason,
  });

  return entry;
};

module.exports = {
  recordManualPayment,
  verifyRazorpayPayment,
  verifyCashfreePayment,
  reversePayment,
  recordAdjustment,
};
