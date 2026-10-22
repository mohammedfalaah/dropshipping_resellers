const LedgerEntry = require("../models/LedgerEntry");
const User = require("../models/User");
const Order = require("../models/Order");
const CodCollection = require("../models/CodCollection");
const { paiseToRupees } = require("../utils/currency");

/**
 * Generate a unique sequential-style ledger entry number
 */
const generateEntryNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LEDG-${timestamp}-${random}`;
};

/**
 * Record an immutable ledger entry and atomically recalculate the reseller's balance
 */
const recordEntry = async ({
  resellerId,
  type, // "DEBIT" (increases receivable) or "CREDIT" (decreases receivable)
  amountPaise,
  referenceType,
  referenceId = "",
  orderId = null,
  paymentId = null,
  description,
  reason = "",
  recordedById,
}) => {
  if (!resellerId || !type || !amountPaise || !referenceType || !description || !recordedById) {
    throw new Error("Missing required ledger fields");
  }

  const user = await User.findById(resellerId);
  if (!user) {
    throw new Error("Reseller not found for ledger entry");
  }

  const currentOutstanding = user.financialSummary?.outstandingBalancePaise || 0;
  let balanceAfterPaise = currentOutstanding;

  if (type === "DEBIT") {
    balanceAfterPaise = currentOutstanding + amountPaise;
  } else if (type === "CREDIT") {
    balanceAfterPaise = currentOutstanding - amountPaise;
  }

  const entry = await LedgerEntry.create({
    entryNumber: generateEntryNumber(),
    reseller: resellerId,
    type,
    amountPaise,
    balanceBeforePaise: currentOutstanding,
    balanceAfterPaise,
    referenceType,
    referenceId,
    order: orderId,
    payment: paymentId,
    description,
    reason,
    recordedBy: recordedById,
  });

  // Re-synchronize and update User's cached financial summary
  await syncResellerFinancialSummary(resellerId);

  return entry;
};

/**
 * Fully reconcile and update the reseller's cached financial summary
 */
const syncResellerFinancialSummary = async (resellerId) => {
  // Aggregate confirmed orders
  const orders = await Order.find({
    reseller: resellerId,
    orderStatus: { $ne: "CANCELLED" },
  });

  const totalOrders = orders.length;
  const totalOrderValuePaise = orders.reduce((sum, o) => sum + (o.totalPaise || 0), 0);

  // Aggregate ledger entries:
  // Net Balance = (Sum of all DEBITs) - (Sum of all CREDITs)
  const ledgerEntries = await LedgerEntry.find({ reseller: resellerId });
  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of ledgerEntries) {
    if (entry.type === "DEBIT") {
      totalDebits += entry.amountPaise;
    } else if (entry.type === "CREDIT") {
      totalCredits += entry.amountPaise;
    }
  }

  const outstandingBalancePaise = totalDebits - totalCredits;

  // Aggregate pending COD amounts
  const pendingCodDocs = await CodCollection.find({
    reseller: resellerId,
    collectionStatus: { $in: ["PENDING", "PARTIALLY_COLLECTED", "OVERDUE"] },
  });
  const codPendingPaise = pendingCodDocs.reduce((sum, c) => sum + (c.pendingAmountPaise || 0), 0);

  await User.findByIdAndUpdate(resellerId, {
    "financialSummary.totalOrders": totalOrders,
    "financialSummary.totalOrderValuePaise": totalOrderValuePaise,
    "financialSummary.totalPaidPaise": totalCredits,
    "financialSummary.outstandingBalancePaise": outstandingBalancePaise,
    "financialSummary.codPendingPaise": codPendingPaise,
  });

  return {
    totalOrders,
    totalOrderValuePaise,
    totalPaidPaise: totalCredits,
    outstandingBalancePaise,
    codPendingPaise,
    totalOrderValueRupees: paiseToRupees(totalOrderValuePaise),
    totalPaidRupees: paiseToRupees(totalCredits),
    outstandingBalanceRupees: paiseToRupees(outstandingBalancePaise),
    codPendingRupees: paiseToRupees(codPendingPaise),
  };
};

/**
 * Get account statement / ledger for a reseller
 */
const getStatement = async (resellerId, { startDate, endDate, page = 1, limit = 20 }) => {
  const query = { reseller: resellerId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    LedgerEntry.find(query)
      .populate("recordedBy", "name email role")
      .populate("order", "orderNumber totalPaise orderStatus paymentStatus")
      .populate("payment", "paymentNumber method status transactionReference")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    LedgerEntry.countDocuments(query),
  ]);

  const summary = await syncResellerFinancialSummary(resellerId);

  return {
    entries,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 1,
    },
    summary,
  };
};

module.exports = {
  recordEntry,
  syncResellerFinancialSummary,
  getStatement,
};
