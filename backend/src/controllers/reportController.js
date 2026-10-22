const reportService = require("../services/reportService");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const User = require("../models/User");
const CodCollection = require("../models/CodCollection");
const { successResponse } = require("../utils/response");
const { paiseToRupees } = require("../utils/currency");

/**
 * Get Financial Overview
 */
const getOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const overview = await reportService.getFinancialOverview(startDate, endDate);
    return successResponse(res, "Financial overview retrieved.", overview);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Sales Report
 */
const getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const report = await reportService.getSalesReport({ startDate, endDate, groupBy });
    return successResponse(res, "Sales report retrieved.", { report });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Accounting Balance Sheet
 */
const getBalanceSheet = async (req, res, next) => {
  try {
    const { asOfDate } = req.query;
    const report = await reportService.getBalanceSheetReport(asOfDate);
    return successResponse(res, "Balance sheet report retrieved.", report);
  } catch (err) {
    next(err);
  }
};

/**
 * Export CSV Reports
 * GET /api/admin/reports/export?type=orders|payments|resellers|cod
 */
const exportReport = async (req, res, next) => {
  try {
    const { type = "orders", startDate, endDate } = req.query;

    let csvContent = "";
    let filename = `report-${type}-${Date.now()}.csv`;

    if (type === "orders") {
      const query = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      const orders = await Order.find(query).populate("reseller", "name email");
      const headers = ["Order Number", "Reseller Name", "Reseller Email", "Total (INR)", "Payment Method", "Payment Status", "Order Status", "Created At"];
      const rows = orders.map((o) => [
        o.orderNumber,
        o.reseller?.name || "N/A",
        o.reseller?.email || "N/A",
        paiseToRupees(o.totalPaise),
        o.paymentMethod,
        o.paymentStatus,
        o.orderStatus,
        o.createdAt.toISOString(),
      ]);
      csvContent = reportService.generateCsv(headers, rows);
    } else if (type === "payments") {
      const query = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      const payments = await Payment.find(query).populate("reseller", "name email");
      const headers = ["Payment Number", "Reseller Name", "Amount (INR)", "Method", "Status", "Reference", "Reversed", "Date"];
      const rows = payments.map((p) => [
        p.paymentNumber,
        p.reseller?.name || "N/A",
        paiseToRupees(p.amountPaise),
        p.method,
        p.status,
        p.transactionReference || "",
        p.isReversed ? "Yes" : "No",
        p.createdAt.toISOString(),
      ]);
      csvContent = reportService.generateCsv(headers, rows);
    } else if (type === "resellers") {
      const resellers = await User.find({ role: "reseller" });
      const headers = ["Name", "Email", "Phone", "Business Name", "City", "Approval Status", "Account Status", "Total Orders", "Total Purchases (INR)", "Total Paid (INR)", "Outstanding Balance (INR)", "COD Pending (INR)"];
      const rows = resellers.map((r) => [
        r.name,
        r.email,
        r.phone || "",
        r.businessInfo?.businessName || "",
        r.businessInfo?.city || "",
        r.approvalStatus,
        r.accountStatus,
        r.financialSummary?.totalOrders || 0,
        paiseToRupees(r.financialSummary?.totalOrderValuePaise || 0),
        paiseToRupees(r.financialSummary?.totalPaidPaise || 0),
        paiseToRupees(r.financialSummary?.outstandingBalancePaise || 0),
        paiseToRupees(r.financialSummary?.codPendingPaise || 0),
      ]);
      csvContent = reportService.generateCsv(headers, rows);
    } else if (type === "cod") {
      const codRecords = await CodCollection.find();
      const headers = ["Order Number", "Reseller Name", "COD Amount (INR)", "Collected (INR)", "Pending (INR)", "Delivery Status", "Collection Status", "Courier", "Tracking Number"];
      const rows = codRecords.map((c) => [
        c.orderNumber,
        c.resellerName,
        paiseToRupees(c.codAmountPaise),
        paiseToRupees(c.collectedAmountPaise),
        paiseToRupees(c.pendingAmountPaise),
        c.deliveryStatus,
        c.collectionStatus,
        c.courierName || "",
        c.trackingNumber || "",
      ]);
      csvContent = reportService.generateCsv(headers, rows);
    }

    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getSales,
  getBalanceSheet,
  exportReport,
};
