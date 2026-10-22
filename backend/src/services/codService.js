const CodCollection = require("../models/CodCollection");
const Order = require("../models/Order");
const paymentService = require("./paymentService");
const AuditLog = require("../models/AuditLog");
const { paiseToRupees } = require("../utils/currency");

/**
 * Get COD collections list with filters & pagination
 */
const getCodList = async ({
  resellerId,
  collectionStatus,
  deliveryStatus,
  search,
  startDate,
  endDate,
  page = 1,
  limit = 20,
}) => {
  const query = {};

  if (resellerId) query.reseller = resellerId;
  if (collectionStatus) query.collectionStatus = collectionStatus;
  if (deliveryStatus) query.deliveryStatus = deliveryStatus;

  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { resellerName: { $regex: search, $options: "i" } },
      { trackingNumber: { $regex: search, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    CodCollection.find(query)
      .populate("order", "orderNumber totalPaise orderStatus paymentStatus shippingAddress")
      .populate("reseller", "name email phone businessInfo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CodCollection.countDocuments(query),
  ]);

  // Aggregate totals
  const allMatching = await CodCollection.find(query);
  const totalCodPaise = allMatching.reduce((s, r) => s + r.codAmountPaise, 0);
  const totalCollectedPaise = allMatching.reduce((s, r) => s + r.collectedAmountPaise, 0);
  const totalPendingPaise = allMatching.reduce((s, r) => s + r.pendingAmountPaise, 0);

  return {
    records,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 1,
    },
    aggregates: {
      totalCodRupees: paiseToRupees(totalCodPaise),
      totalCollectedRupees: paiseToRupees(totalCollectedPaise),
      totalPendingRupees: paiseToRupees(totalPendingPaise),
    },
  };
};

/**
 * Record actual cash/collection received from a COD delivery
 */
const recordCodCollection = async (
  codId,
  { collectedAmountPaise, collectionStatus, collectionReference = "", notes = "" },
  adminUser
) => {
  const codRecord = await CodCollection.findById(codId);
  if (!codRecord) {
    throw new Error("COD record not found");
  }

  const amountToCollect = collectedAmountPaise;
  if (amountToCollect <= 0) {
    throw new Error("Collected amount must be greater than zero");
  }

  if (amountToCollect > codRecord.pendingAmountPaise) {
    throw new Error(
      `Collected amount (₹${(amountToCollect / 100).toFixed(2)}) cannot exceed pending amount (₹${(codRecord.pendingAmountPaise / 100).toFixed(2)})`
    );
  }

  const newCollectedTotal = codRecord.collectedAmountPaise + amountToCollect;
  const newPendingTotal = codRecord.codAmountPaise - newCollectedTotal;
  const determinedStatus = newPendingTotal === 0 ? "COLLECTED" : "PARTIALLY_COLLECTED";

  codRecord.collectedAmountPaise = newCollectedTotal;
  codRecord.pendingAmountPaise = newPendingTotal;
  codRecord.collectionStatus = collectionStatus || determinedStatus;
  codRecord.collectionDate = new Date();
  codRecord.collectionReference = collectionReference || codRecord.collectionReference;
  codRecord.notes = notes || codRecord.notes;
  codRecord.recordedBy = adminUser._id;

  await codRecord.save();

  // Create official payment and credit ledger entry
  await paymentService.recordManualPayment({
    resellerId: codRecord.reseller,
    orderId: codRecord.order,
    amountPaise: amountToCollect,
    method: "COD",
    transactionReference: collectionReference || `COD-COLLECT-${codRecord.orderNumber}`,
    notes: `COD Collection received. ${notes}`.trim(),
    adminUser,
  });

  await AuditLog.create({
    user: adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: "COD_COLLECTED",
    targetType: "COD",
    targetId: codRecord._id.toString(),
    description: `COD collection of ₹${(amountToCollect / 100).toFixed(2)} recorded for order ${codRecord.orderNumber}`,
  });

  return codRecord;
};

/**
 * Update delivery status for a COD shipment (e.g. dispatched, delivered)
 */
const updateCodDeliveryStatus = async (codId, { deliveryStatus, courierName, trackingNumber }, adminUser) => {
  const codRecord = await CodCollection.findById(codId);
  if (!codRecord) {
    throw new Error("COD record not found");
  }

  if (deliveryStatus) codRecord.deliveryStatus = deliveryStatus;
  if (courierName) codRecord.courierName = courierName;
  if (trackingNumber) codRecord.trackingNumber = trackingNumber;

  await codRecord.save();

  // Also sync on Order
  await Order.findByIdAndUpdate(codRecord.order, {
    orderStatus: deliveryStatus === "DELIVERED" ? "DELIVERED" : deliveryStatus === "DISPATCHED" ? "SHIPPED" : undefined,
    courierName: courierName || undefined,
    trackingNumber: trackingNumber || undefined,
  });

  await AuditLog.create({
    user: adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: "COD_DELIVERY_STATUS_UPDATED",
    targetType: "COD",
    targetId: codRecord._id.toString(),
    description: `COD delivery status updated to ${deliveryStatus} for order ${codRecord.orderNumber}`,
  });

  return codRecord;
};

module.exports = {
  getCodList,
  recordCodCollection,
  updateCodDeliveryStatus,
};
