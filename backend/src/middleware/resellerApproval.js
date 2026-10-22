const { errorResponse } = require("../utils/response");

/**
 * Enforce that the user is an approved and active reseller (or an admin)
 */
const requireApprovedReseller = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, "Authentication required.", "AUTH_REQUIRED", 401);
  }

  // Admins bypass reseller approval checks
  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.accountStatus === "blocked") {
    return errorResponse(
      res,
      "Your reseller account is blocked. Please contact support.",
      "RESELLER_ACCOUNT_BLOCKED",
      403
    );
  }

  if (req.user.approvalStatus === "pending") {
    return errorResponse(
      res,
      "Your reseller registration is pending administrator review. Once approved, you will gain access to wholesale pricing and checkout.",
      "RESELLER_APPROVAL_REQUIRED",
      403
    );
  }

  if (req.user.approvalStatus === "rejected") {
    const reasonText = req.user.rejectionReason ? ` Reason: ${req.user.rejectionReason}` : "";
    return errorResponse(
      res,
      `Your reseller application was rejected.${reasonText} Please contact support for assistance.`,
      "RESELLER_APPLICATION_REJECTED",
      403
    );
  }

  if (req.user.approvalStatus === "approved") {
    return next();
  }

  return errorResponse(res, "Access denied. Valid reseller approval required.", "FORBIDDEN", 403);
};

module.exports = {
  requireApprovedReseller,
};
