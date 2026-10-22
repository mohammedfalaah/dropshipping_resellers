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

    return successResponse(res, "Admin dashboard statistics retrieved.", {
      overview: {
        ...overview,
        totalProducts,
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

    // Format response with Rupees values
    const formattedResellers = resellers.map((r) => {
      const obj = r.toObject();
      obj.financialSummary = {
        totalOrders: r.financialSummary?.totalOrders || 0,
        totalOrderValueRupees: paiseToRupees(r.financialSummary?.totalOrderValuePaise || 0),
        totalPaidRupees: paiseToRupees(r.financialSummary?.totalPaidPaise || 0),
        outstandingBalanceRupees: paiseToRupees(r.financialSummary?.outstandingBalancePaise || 0),
        codPendingRupees: paiseToRupees(r.financialSummary?.codPendingPaise || 0),
      };
      return obj;
    });

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

module.exports = {
  getDashboardStats,
  getAllResellers,
  getResellerById,
  createReseller,
  updateReseller,
  approveReseller,
  rejectReseller,
  toggleAccountStatus,
  getResellerLedger,
};
