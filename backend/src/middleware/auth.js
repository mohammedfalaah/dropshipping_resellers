const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env");
const { errorResponse } = require("../utils/response");

/**
 * Protect routes: verify JWT token and attach user to req
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Authentication required. Please log in.", "AUTH_REQUIRED", 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("+password");

    if (!user) {
      return errorResponse(res, "The user belonging to this token no longer exists.", "USER_NOT_FOUND", 401);
    }

    if (user.accountStatus === "blocked") {
      return errorResponse(res, "Your account has been suspended. Please contact support.", "ACCOUNT_BLOCKED", 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid authentication token. Please log in again.", "INVALID_TOKEN", 401);
    }
    if (err.name === "TokenExpiredError") {
      return errorResponse(res, "Your session has expired. Please log in again.", "TOKEN_EXPIRED", 401);
    }
    return errorResponse(res, "Authentication failed.", "AUTH_FAILED", 401);
  }
};

/**
 * Restrict access to designated roles (e.g. 'admin')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, "You do not have permission to perform this action.", "FORBIDDEN", 403);
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
