const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const CodCollection = require("../models/CodCollection");
const AuditLog = require("../models/AuditLog");
const ledgerService = require("../services/ledgerService");
const reportService = require("../services/reportService");
const { successResponse, errorResponse } = require("../utils/response");
const { paiseToRupees } = require("../utils/currency");

/**
 * Dashboard Statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const overview = await reportService.getFinancialOverview();
    const totalProducts = await Product.countDocuments();

    // Recent orders
    const recentOrders = await Order.find()
      .populate("reseller", "name email businessInfo")
      .sort({ createdAt: -1 })
      .limit(6);

    // Recent activities (audit log)
    const recentActivities = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(8);

    // Monthly sales chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySales = await reportService.getSalesReport({
      startDate: sixMonthsAgo,
      groupBy: "monthly",
    });

    const salesRupees = overview.orders?.totalSalesRupees || 0;
    const companyRupees = overview.orders?.companyAmountRupees || 0;
    const resellerProfitRupees = overview.orders?.resellerProfitRupees || 0;
    const codPendingRupees = overview.receivables?.totalCodPendingRupees || 0;
    const outstandingRupees = overview.receivables?.totalOutstandingRupees || 0;
    const collectedRupees = overview.collections?.totalCollectedRupees || 0;

    return successResponse(res, "Admin dashboard statistics retrieved.", {
      overview: {
        ...overview,
        totalProducts,
        totalResellers: overview.resellers?.total || 0,
        pendingResellers: overview.resellers?.pendingApproval || 0,
        approvedResellers: overview.resellers?.approved || 0,
        blockedResellers: overview.resellers?.blocked || 0,
        totalOrders: overview.orders?.total || 0,
        pendingOrders: overview.orders?.pending || 0,
        deliveredOrders: overview.orders?.delivered || 0,
        totalSalesRupees: salesRupees,
        totalSalesFormatted: `₹${Number(salesRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        companyAmountRupees: companyRupees,
        companyAmountFormatted: `₹${Number(companyRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        resellerProfitRupees: resellerProfitRupees,
        resellerProfitFormatted: `₹${Number(resellerProfitRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalCodPendingRupees: codPendingRupees,
        totalCodPendingFormatted: `₹${Number(codPendingRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalOutstandingRupees: outstandingRupees,
        totalOutstandingFormatted: `₹${Number(outstandingRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalPaymentsCollectedRupees: collectedRupees,
        totalPaymentsCollectedFormatted: `₹${Number(collectedRupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      recentOrders,
      recentActivities,
      monthlySales,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get All Resellers with Search, Filter & Pagination
 */
const getAllResellers = async (req, res, next) => {
  try {
    const { search, approvalStatus, accountStatus, page = 1, limit = 20 } = req.query;

    const query = { role: "reseller" };

    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (accountStatus) query.accountStatus = accountStatus;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { "businessInfo.businessName": { $regex: search, $options: "i" } },
        { "businessInfo.city": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [resellers, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Format response with Rupees values & detailed financial breakdown (Company Amount, Reseller Margin, Paid, Due)
    const formattedResellers = await Promise.all(
      resellers.map(async (r) => {
        const obj = r.toObject();
        const resellerOrders = await Order.find({ reseller: r._id, orderStatus: { $ne: "CANCELLED" } });
        const totalCompanyAmountPaise = resellerOrders.reduce(
          (sum, o) =>
            sum +
            (o.amountPayableToVexoraPaise ||
              (o.wholesaleCostPaise || 0) + (o.deliveryChargePaise !== undefined ? o.deliveryChargePaise : 5000)),
          0
        );
        const totalResellerProfitPaise = resellerOrders.reduce(
          (sum, o) => sum + (o.expectedResellerProfitPaise || 0),
          0
        );
        const totalSellingPaise = resellerOrders.reduce(
          (sum, o) => sum + (o.customerSellingTotalPaise || o.totalPaise || 0),
          0
        );

        const totalPaidPaise = r.financialSummary?.totalPaidPaise || 0;
        const outstandingBalancePaise =
          r.financialSummary?.outstandingBalancePaise !== undefined
            ? r.financialSummary.outstandingBalancePaise
            : Math.max(0, totalCompanyAmountPaise - totalPaidPaise);
        const codPendingPaise = r.financialSummary?.codPendingPaise || 0;

        obj.companyAmountPaise = totalCompanyAmountPaise;
        obj.companyAmountRupees = paiseToRupees(totalCompanyAmountPaise);
        obj.resellerProfitPaise = totalResellerProfitPaise;
        obj.resellerProfitRupees = paiseToRupees(totalResellerProfitPaise);
        obj.customerSellingTotalPaise = totalSellingPaise;
        obj.customerSellingTotalRupees = paiseToRupees(totalSellingPaise);

        obj.financialSummary = {
          totalOrders: r.financialSummary?.totalOrders || resellerOrders.length,
          totalOrderValueRupees: paiseToRupees(r.financialSummary?.totalOrderValuePaise || totalSellingPaise),
          totalOrderValuePaise: r.financialSummary?.totalOrderValuePaise || totalSellingPaise,
          totalPaidRupees: paiseToRupees(totalPaidPaise),
          totalPaidPaise,
          outstandingBalanceRupees: paiseToRupees(outstandingBalancePaise),
          outstandingBalancePaise,
          codPendingRupees: paiseToRupees(codPendingPaise),
          codPendingPaise,
          companyAmountRupees: paiseToRupees(totalCompanyAmountPaise),
          companyAmountPaise: totalCompanyAmountPaise,
          resellerProfitRupees: paiseToRupees(totalResellerProfitPaise),
          resellerProfitPaise: totalResellerProfitPaise,
        };
        return obj;
      })
    );

    return successResponse(res, "Resellers list retrieved.", {
      resellers: formattedResellers,
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
 * Get Single Reseller Details with Complete Financial Overview
 */
const getResellerById = async (req, res, next) => {
  try {
    const reseller = await User.findOne({ _id: req.params.id, role: "reseller" }).select("-password");
    if (!reseller) {
      return errorResponse(res, "Reseller not found", "RESELLER_NOT_FOUND", 404);
    }

    // Sync financial numbers
    const financialSummary = await ledgerService.syncResellerFinancialSummary(reseller._id);

    // Recent orders
    const recentOrders = await Order.find({ reseller: reseller._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Recent payments
    const recentPayments = await Payment.find({ reseller: reseller._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // COD collections
    const codCollections = await CodCollection.find({ reseller: reseller._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return successResponse(res, "Reseller details retrieved.", {
      reseller,
      financialSummary,
      recentOrders,
      recentPayments,
      codCollections,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a Reseller (Admin action)
 */
const createReseller = async (req, res, next) => {
  try {
    const { name, email, password, phone, businessInfo, approvalStatus, accountStatus } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return errorResponse(res, "A user with this email address already exists.", "EMAIL_ALREADY_EXISTS", 409);
    }

    const reseller = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: "reseller",
      approvalStatus: approvalStatus || "approved",
      accountStatus: accountStatus || "active",
      approvedAt: approvalStatus === "approved" ? new Date() : null,
      approvedBy: approvalStatus === "approved" ? req.user._id : null,
      businessInfo: businessInfo || {},
    });

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "ADMIN_CREATED_RESELLER",
      targetType: "USER",
      targetId: reseller._id.toString(),
      description: `Admin created reseller account: ${reseller.name} (${reseller.email})`,
    });

    return successResponse(res, "Reseller account created successfully.", {
      reseller: reseller.toSafeObject(),
    }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update Reseller Details (Admin action)
 */
const updateReseller = async (req, res, next) => {
  try {
    const { name, phone, accountStatus, approvalStatus, businessInfo } = req.body;
    const reseller = await User.findOne({ _id: req.params.id, role: "reseller" });

    if (!reseller) {
      return errorResponse(res, "Reseller not found", "RESELLER_NOT_FOUND", 404);
    }

    if (name) reseller.name = name;
    if (phone) reseller.phone = phone;
    if (accountStatus) reseller.accountStatus = accountStatus;
    if (approvalStatus) reseller.approvalStatus = approvalStatus;
    if (businessInfo) {
      reseller.businessInfo = {
        ...reseller.businessInfo.toObject(),
        ...businessInfo,
      };
    }

    await reseller.save();

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "ADMIN_UPDATED_RESELLER",
      targetType: "USER",
      targetId: reseller._id.toString(),
      description: `Admin updated details for reseller: ${reseller.name}`,
    });

    return successResponse(res, "Reseller profile updated successfully.", {
      reseller: reseller.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Approve Reseller Registration
 * PATCH /api/admin/resellers/:id/approve
 */
const approveReseller = async (req, res, next) => {
  try {
    const reseller = await User.findOne({ _id: req.params.id, role: "reseller" });
    if (!reseller) {
      return errorResponse(res, "Reseller not found", "RESELLER_NOT_FOUND", 404);
    }

    reseller.approvalStatus = "approved";
    reseller.accountStatus = "active";
    reseller.approvedAt = new Date();
    reseller.approvedBy = req.user._id;
    reseller.rejectionReason = "";
    await reseller.save();

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "RESELLER_APPROVED",
      targetType: "USER",
      targetId: reseller._id.toString(),
      description: `Reseller ${reseller.name} (${reseller.email}) approved by admin`,
    });

    return successResponse(res, `Reseller '${reseller.name}' has been approved successfully.`, {
      reseller: reseller.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reject Reseller Registration
 * PATCH /api/admin/resellers/:id/reject
 */
const rejectReseller = async (req, res, next) => {
  try {
    const { reason = "Application did not meet requirements" } = req.body;
    const reseller = await User.findOne({ _id: req.params.id, role: "reseller" });
    if (!reseller) {
      return errorResponse(res, "Reseller not found", "RESELLER_NOT_FOUND", 404);
    }

    reseller.approvalStatus = "rejected";
    reseller.rejectionReason = reason;
    await reseller.save();

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "RESELLER_REJECTED",
      targetType: "USER",
      targetId: reseller._id.toString(),
      description: `Reseller ${reseller.name} rejected. Reason: ${reason}`,
      reason,
    });

    return successResponse(res, `Reseller '${reseller.name}' has been rejected.`, {
      reseller: reseller.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle Reseller Account Status (Active / Blocked)
 */
const toggleAccountStatus = async (req, res, next) => {
  try {
    const reseller = await User.findOne({ _id: req.params.id, role: "reseller" });
    if (!reseller) {
      return errorResponse(res, "Reseller not found", "RESELLER_NOT_FOUND", 404);
    }

    const newStatus = reseller.accountStatus === "active" ? "blocked" : "active";
    reseller.accountStatus = newStatus;
    await reseller.save();

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "RESELLER_STATUS_TOGGLED",
      targetType: "USER",
      targetId: reseller._id.toString(),
      description: `Reseller ${reseller.name} account status changed to ${newStatus}`,
    });

    return successResponse(
      res,
      `Reseller account is now ${newStatus}.`,
      { reseller: reseller.toSafeObject() }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get Reseller Ledger Statement
 */
const getResellerLedger = async (req, res, next) => {
  try {
    const { startDate, endDate, page, limit } = req.query;
    const statement = await ledgerService.getStatement(req.params.id, {
      startDate,
      endDate,
      page,
      limit,
    });

    return successResponse(res, "Reseller ledger retrieved.", statement);
  } catch (err) {
    next(err);
  }
};

/**
 * Get distinct products ordered by a reseller and their performance/delivery stats
 */
const getResellerOrderedProducts = async (req, res, next) => {
  try {
    const resellerId = req.params.id;
    const reseller = await User.findById(resellerId).select("name email phone businessInfo approvalStatus accountStatus");
    if (!reseller) {
      return errorResponse(res, "Reseller not found", "RESELLER_NOT_FOUND", 404);
    }

    const orders = await Order.find({ reseller: resellerId, orderStatus: { $ne: "CANCELLED" } })
      .sort({ createdAt: -1 });

    const productMap = new Map();
    let totalUnits = 0;
    let totalWholesaleCost = 0;
    let totalCustomerRevenue = 0;
    let totalProfitEarned = 0;

    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const prodId = (item.product || item._id || item.sku || item.name).toString();
        const wholesaleUnitPrice = item.wholesalePricePaise || item.unitPricePaise || item.pricePaise || 0;
        const customerUnitPrice = item.customerSellingPricePaise || wholesaleUnitPrice;
        const qty = Number(item.quantity) || 1;
        const profit = item.resellerProfitPaise !== undefined ? item.resellerProfitPaise : (customerUnitPrice - wholesaleUnitPrice) * qty;

        totalUnits += qty;
        totalWholesaleCost += wholesaleUnitPrice * qty;
        totalCustomerRevenue += customerUnitPrice * qty;
        totalProfitEarned += profit;

        if (!productMap.has(prodId)) {
          productMap.set(prodId, {
            productId: item.product,
            name: item.name,
            sku: item.sku || item.variantSku || "SKU-N/A",
            image: item.image || "",
            color: item.color || "",
            size: item.size || "",
            totalQuantity: 0,
            wholesaleUnitPricePaise: wholesaleUnitPrice,
            wholesaleUnitPriceRupees: paiseToRupees(wholesaleUnitPrice),
            customerUnitPricePaise: customerUnitPrice,
            customerUnitPriceRupees: paiseToRupees(customerUnitPrice),
            totalWholesaleSpendPaise: 0,
            totalWholesaleSpendRupees: 0,
            totalCustomerRevenuePaise: 0,
            totalCustomerRevenueRupees: 0,
            totalProfitPaise: 0,
            totalProfitRupees: 0,
            ordersCount: 0,
            firstOrderedAt: o.createdAt,
            lastOrderedAt: o.createdAt,
            orders: [],
          });
        }

        const entry = productMap.get(prodId);
        entry.totalQuantity += qty;
        entry.totalWholesaleSpendPaise += wholesaleUnitPrice * qty;
        entry.totalWholesaleSpendRupees = paiseToRupees(entry.totalWholesaleSpendPaise);
        entry.totalCustomerRevenuePaise += customerUnitPrice * qty;
        entry.totalCustomerRevenueRupees = paiseToRupees(entry.totalCustomerRevenuePaise);
        entry.totalProfitPaise += profit;
        entry.totalProfitRupees = paiseToRupees(entry.totalProfitPaise);
        entry.ordersCount += 1;
        if (new Date(o.createdAt) < new Date(entry.firstOrderedAt)) entry.firstOrderedAt = o.createdAt;
        if (new Date(o.createdAt) > new Date(entry.lastOrderedAt)) entry.lastOrderedAt = o.createdAt;
        entry.orders.push({
          orderId: o._id,
          orderNumber: o.orderNumber,
          date: o.createdAt,
          quantity: qty,
          orderStatus: o.orderStatus,
          deliveryStatus: o.deliveryStatus || o.orderStatus,
          courierName: o.courierName,
          trackingNumber: o.trackingNumber,
        });
      });
    });

    const products = Array.from(productMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);

    return successResponse(res, "Reseller ordered products retrieved.", {
      reseller,
      summary: {
        totalProductsCount: products.length,
        totalUnitsOrdered: totalUnits,
        totalWholesaleSpendRupees: paiseToRupees(totalWholesaleCost),
        totalCustomerRevenueRupees: paiseToRupees(totalCustomerRevenue),
        totalProfitEarnedRupees: paiseToRupees(totalProfitEarned),
        totalOrdersCount: orders.length,
      },
      products,
      orders,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all orders by a specific reseller with delivery progress
 */
const getResellerOrders = async (req, res, next) => {
  try {
    const resellerId = req.params.id;
    const orders = await Order.find({ reseller: resellerId })
      .populate("reseller", "name email phone businessInfo")
      .sort({ createdAt: -1 });

    return successResponse(res, "Reseller orders retrieved.", { orders });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Consignment Tracking Details (India Post & Multi-courier)
 */
const getTrackingInfo = async (req, res, next) => {
  try {
    const trackingService = require("../services/trackingService");
    const trackingData = await trackingService.getTrackingInfo(req.params.trackingNumber);
    return successResponse(res, "Consignment tracking details retrieved successfully.", trackingData);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getAllResellers,
  getResellerById,
  getResellerOrderedProducts,
  getResellerOrders,
  getTrackingInfo,
  createReseller,
  updateReseller,
  approveReseller,
  rejectReseller,
  toggleAccountStatus,
  getResellerLedger,
};
