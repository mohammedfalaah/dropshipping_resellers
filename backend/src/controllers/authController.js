const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");
const { successResponse, errorResponse } = require("../utils/response");
const ledgerService = require("../services/ledgerService");
const AuditLog = require("../models/AuditLog");

const signToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Public Reseller Registration
 * Defaults strictly to approvalStatus: "pending" and role: "reseller"
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, businessName, address, city, state, postalCode, country } = req.body;

    // Check if email already registered
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return errorResponse(res, "An account with this email address already exists.", "EMAIL_ALREADY_EXISTS", 409);
    }

    // Force role to reseller and approvalStatus to pending (NEVER allow public admin creation)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: "reseller",
      approvalStatus: "pending",
      accountStatus: "active",
      businessInfo: {
        businessName: businessName || name,
        address: address || "",
        city: city || "",
        state: state || "",
        postalCode: postalCode || "",
        country: country || "India",
      },
    });

    const token = signToken(user._id, user.role);

    await AuditLog.create({
      user: user._id,
      userName: user.name,
      userRole: "reseller",
      action: "RESELLER_REGISTERED",
      targetType: "USER",
      targetId: user._id.toString(),
      description: `New reseller application submitted: ${user.name} (${user.email})`,
    });

    return successResponse(
      res,
      "Your reseller registration has been received! It is currently pending administrator review. You will receive access upon approval.",
      {
        token,
        user: user.toSafeObject(),
        status: {
          approvalStatus: user.approvalStatus,
          accountStatus: user.accountStatus,
          isApproved: false,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Login (Admin or Reseller)
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return errorResponse(res, "Invalid email address or password.", "INVALID_CREDENTIALS", 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, "Invalid email address or password.", "INVALID_CREDENTIALS", 401);
    }

    if (user.accountStatus === "blocked") {
      return errorResponse(
        res,
        "Your account has been deactivated. Please contact administrator support.",
        "ACCOUNT_BLOCKED",
        403
      );
    }

    const token = signToken(user._id, user.role);

    // Sync financial summary if reseller
    let financialSummary = null;
    if (user.role === "reseller") {
      financialSummary = await ledgerService.syncResellerFinancialSummary(user._id);
    }

    return successResponse(res, "Logged in successfully.", {
      token,
      user: user.toSafeObject(),
      financialSummary,
      status: {
        role: user.role,
        approvalStatus: user.approvalStatus,
        accountStatus: user.accountStatus,
        isApproved: user.role === "admin" || user.approvalStatus === "approved",
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Current Authenticated Profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let financialSummary = null;
    if (user.role === "reseller") {
      financialSummary = await ledgerService.syncResellerFinancialSummary(user._id);
    }

    return successResponse(res, "User profile retrieved.", {
      user: user.toSafeObject(),
      financialSummary,
      status: {
        role: user.role,
        approvalStatus: user.approvalStatus,
        accountStatus: user.accountStatus,
        isApproved: user.role === "admin" || user.approvalStatus === "approved",
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, businessInfo } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (businessInfo) {
      user.businessInfo = {
        ...user.businessInfo.toObject(),
        ...businessInfo,
      };
    }

    await user.save();

    return successResponse(res, "Profile updated successfully.", {
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Change Password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, "Incorrect current password.", "INVALID_PASSWORD", 400);
    }

    user.password = newPassword;
    await user.save();

    return successResponse(res, "Password changed successfully. Please log in with your new credentials.");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
