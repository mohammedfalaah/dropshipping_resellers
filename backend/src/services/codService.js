const mongoose = require("mongoose");
const CodCollection = require("../models/CodCollection");
const Order = require("../models/Order");
const paymentService = require("./paymentService");
const AuditLog = require("../models/AuditLog");
const { paiseToRupees } = require("../utils/currency");

/**
 * Helper to find or lazily initialize a CodCollection record by codId, orderId, or orderNumber
 */
const findOrCreateCodRecord = async (identifier) => {
  if (!identifier) return null;
  let codRecord = null;
  if (mongoose.isValidObjectId(identifier)) {
    codRecord = await CodCollection.findById(identifier);
    if (!codRecord) {
      codRecord = await CodCollection.findOne({ order: identifier });
    }
  }
  if (!codRecord) {
    codRecord = await CodCollection.findOne({ orderNumber: identifier });
  }
  if (!codRecord && mongoose.isValidObjectId(identifier)) {
    const order = await Order.findById(identifier).populate("reseller", "name");
    if (order) {
      const totalCod = order.customerSellingTotalPaise || order.totalPaise || 0;
      const collected = order.codCollectedAmountPaise || 0;
      codRecord = await CodCollection.create({
        order: order._id,
        orderNumber: order.orderNumber,
        reseller: order.reseller?._id || order.reseller,
        resellerName: order.reseller?.name || "Reseller",
        wholesaleCostPaise: order.wholesaleCostPaise || 0,
        customerSellingTotalPaise: totalCod,
        expectedResellerProfitPaise: order.expectedResellerProfitPaise || 0,
        deliveryChargePaise: order.deliveryChargePaise || 5000,
        deliveryChargeStatus: order.deliveryChargeStatus || "PENDING",
        amountPayableToVexoraPaise:
          order.amountPayableToVexoraPaise ||
          (order.wholesaleCostPaise || 0) + (order.deliveryChargePaise || 5000),
        codAmountPaise: totalCod,
        collectedAmountPaise: collected,
        pendingAmountPaise: Math.max(0, totalCod - collected),
        deliveryStatus:
          order.orderStatus === "DELIVERED"
            ? "DELIVERED"
            : order.orderStatus === "SHIPPED"
            ? "DISPATCHED"
            : "PENDING",
        collectionStatus:
          order.codCollectionStatus && order.codCollectionStatus !== "NOT_APPLICABLE"
            ? order.codCollectionStatus
            : "PENDING",
      });
    }
  }
  return codRecord;
};

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
  if (collectionStatus && collectionStatus !== "all") {
    query.collectionStatus = collectionStatus.toUpperCase();
  }
  if (deliveryStatus && deliveryStatus !== "all") {
    query.deliveryStatus = deliveryStatus.toUpperCase();
  }

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
 * Record actual cash/collection received from a COD delivery by courier
 */
const recordCodCollection = async (
  codId,
  { collectedAmountPaise, collectionStatus, collectionReference = "", notes = "" },
  adminUser
) => {
  const codRecord = await findOrCreateCodRecord(codId);
  if (!codRecord) {
    throw new Error("COD record not found");
  }

  // Handle collected amount gracefully
  let amountToCollect = collectedAmountPaise;
  if (amountToCollect === undefined || amountToCollect === null) {
    if (collectionStatus === "COLLECTED" || collectionStatus === "RECONCILED") {
      amountToCollect = codRecord.pendingAmountPaise;
    } else {
      amountToCollect = 0;
    }
  }

  if (amountToCollect > codRecord.pendingAmountPaise) {
    // If user entered total collected so far instead of incremental
    if (amountToCollect <= codRecord.codAmountPaise && amountToCollect >= codRecord.collectedAmountPaise) {
      amountToCollect = amountToCollect - codRecord.collectedAmountPaise;
    } else {
      throw new Error(
        `Collected amount (₹${(amountToCollect / 100).toFixed(2)}) cannot exceed pending amount (₹${(codRecord.pendingAmountPaise / 100).toFixed(2)})`
      );
    }
  }

  const newCollectedTotal = codRecord.collectedAmountPaise + amountToCollect;
  const newPendingTotal = Math.max(0, codRecord.codAmountPaise - newCollectedTotal);
  const determinedStatus =
    newPendingTotal === 0
      ? "COLLECTED"
      : newCollectedTotal > 0
      ? "PARTIALLY_COLLECTED"
      : "PENDING";

  codRecord.collectedAmountPaise = newCollectedTotal;
  codRecord.pendingAmountPaise = newPendingTotal;
  codRecord.collectionStatus = collectionStatus || determinedStatus;
  codRecord.collectionDate = new Date();
  codRecord.collectionReference = collectionReference || codRecord.collectionReference;
  codRecord.notes = notes || codRecord.notes;
  codRecord.recordedBy = adminUser?._id;

  await codRecord.save();

  // Sync to Order document
  await Order.findByIdAndUpdate(codRecord.order, {
    codCollectedAmountPaise: newCollectedTotal,
    codCollectionStatus: codRecord.collectionStatus,
    paymentStatus: codRecord.collectionStatus === "COLLECTED" || codRecord.collectionStatus === "RECONCILED" ? "PAID" : "PENDING",
    "cod.collectedPaise": newCollectedTotal,
    "cod.pendingPaise": newPendingTotal,
    "cod.collectionStatus": codRecord.collectionStatus,
    "cod.collectionDate": new Date(),
    "cod.collectionReference": collectionReference || undefined,
  });

  if (adminUser) {
    await AuditLog.create({
      user: adminUser._id,
      userName: adminUser.name || "Admin",
      userRole: adminUser.role || "admin",
      action: "COD_COLLECTED",
      targetType: "COD",
      targetId: codRecord._id.toString(),
      description: `COD courier collection of ₹${(amountToCollect / 100).toFixed(2)} recorded for order ${codRecord.orderNumber}`,
    });
  }

  return codRecord;
};

/**
 * Reconcile courier remittance with VEXORA bank account
 */
const reconcileCodPayment = async (codId, { reconciliationReference = "", notes = "" }, adminUser) => {
  const codRecord = await findOrCreateCodRecord(codId);
  if (!codRecord) {
    throw new Error("COD record not found");
  }

  if (codRecord.collectionStatus === "RECONCILED") {
    return codRecord; // Idempotent
  }

  // Ensure collection is marked complete
  if (codRecord.collectedAmountPaise === 0) {
    codRecord.collectedAmountPaise = codRecord.codAmountPaise;
    codRecord.pendingAmountPaise = 0;
  }

  codRecord.collectionStatus = "RECONCILED";
  codRecord.reconciliationDate = new Date();
  codRecord.reconciliationReference = reconciliationReference || `REMIT-${Date.now().toString().slice(-6)}`;
  codRecord.reconciledBy = adminUser?._id;
  if (notes) codRecord.notes = (codRecord.notes ? codRecord.notes + "\n" : "") + notes;

  await codRecord.save();

  // Sync to Order document: paymentStatus marked PAID upon courier remittance
  await Order.findByIdAndUpdate(codRecord.order, {
    codCollectionStatus: "RECONCILED",
    paymentStatus: "PAID",
    "cod.collectionStatus": "COLLECTED",
    "cod.collectionReference": codRecord.reconciliationReference,
  });

  if (adminUser) {
    await AuditLog.create({
      user: adminUser._id,
      userName: adminUser.name || "Admin",
      userRole: adminUser.role || "admin",
      action: "COD_RECONCILED",
      targetType: "COD",
      targetId: codRecord._id.toString(),
      description: `COD courier remittance reconciled for order ${codRecord.orderNumber} (Ref: ${codRecord.reconciliationReference})`,
    });
  }

  return codRecord;
};

/**
 * Settle reseller profit for reconciled COD orders
 */
const settleResellerProfit = async (codId, { amountPaise, reference = "", notes = "" }, adminUser) => {
  const codRecord = await findOrCreateCodRecord(codId);
  if (!codRecord) {
    throw new Error("COD record not found");
  }

  const expectedProfit = codRecord.expectedResellerProfitPaise || 0;
  const alreadySettled = codRecord.settledProfitPaise || 0;
  const remainingUnsettled = Math.max(0, expectedProfit - alreadySettled);

  if (remainingUnsettled <= 0 && codRecord.resellerSettlementStatus === "SETTLED") {
    throw new Error(`Reseller profit of ₹${(expectedProfit / 100).toFixed(2)} has already been fully settled for order ${codRecord.orderNumber}.`);
  }

  const amountToSettle = amountPaise !== undefined ? Number(amountPaise) : remainingUnsettled;
  if (amountToSettle <= 0) {
    throw new Error("Settlement amount must be greater than zero.");
  }
  if (amountToSettle > remainingUnsettled) {
    throw new Error(`Settlement amount (₹${(amountToSettle / 100).toFixed(2)}) cannot exceed remaining unsettled profit (₹${(remainingUnsettled / 100).toFixed(2)}).`);
  }

  const newSettledTotal = alreadySettled + amountToSettle;
  const isFullySettled = newSettledTotal >= expectedProfit;
  const settlementRef = reference || `SETTLE-${Date.now().toString().slice(-6)}`;

  codRecord.settledProfitPaise = newSettledTotal;
  codRecord.resellerSettlementStatus = isFullySettled ? "SETTLED" : "PARTIALLY_SETTLED";
  codRecord.settlementDate = new Date();
  codRecord.settlementReference = settlementRef;
  codRecord.settlementNotes = notes || "Reseller profit settlement";
  codRecord.settledBy = adminUser._id;

  await codRecord.save();

  // Update Order with settlement history
  await Order.findByIdAndUpdate(codRecord.order, {
    resellerSettlementStatus: codRecord.resellerSettlementStatus,
    settledProfitPaise: newSettledTotal,
    settlementDate: new Date(),
    settlementReference: settlementRef,
    settlementNotes: notes || "Reseller profit settlement",
    $push: {
      settlementHistory: {
        amountPaise: amountToSettle,
        method: "BANK_TRANSFER",
        reference: settlementRef,
        notes: notes || "",
        settledAt: new Date(),
        settledBy: adminUser._id,
      },
    },
  });

  // Credit the reseller's double-entry ledger with earned profit
  const ledgerService = require("./ledgerService");
  await ledgerService.recordEntry({
    resellerId: codRecord.reseller,
    type: "CREDIT",
    amountPaise: amountToSettle,
    referenceType: "COD_COLLECTION",
    referenceId: codRecord.orderNumber,
    orderId: codRecord.order,
    description: `COD Profit Settlement - ${codRecord.orderNumber} (Ref: ${settlementRef})`,
    reason: notes || `Settled ₹${(amountToSettle / 100).toFixed(2)} profit for delivered COD order`,
    recordedById: adminUser._id,
  });

  await AuditLog.create({
    user: adminUser._id,
    userName: adminUser.name,
    userRole: adminUser.role,
    action: "RESELLER_PROFIT_SETTLED",
    targetType: "COD",
    targetId: codRecord._id.toString(),
    description: `Profit settlement of ₹${(amountToSettle / 100).toFixed(2)} paid to reseller for order ${codRecord.orderNumber}`,
  });

  return codRecord;
};

/**
 * Update delivery status for a COD shipment (e.g. dispatched, delivered)
 */
const updateCodDeliveryStatus = async (codId, { deliveryStatus, courierName, trackingNumber }, adminUser) => {
  const codRecord = await findOrCreateCodRecord(codId);
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
  reconcileCodPayment,
  settleResellerProfit,
  updateCodDeliveryStatus,
};
