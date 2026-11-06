const settingsService = require("../services/settingsService");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Get Public Settings (Accessible without auth for Cart / Checkout delivery fee calculation)
 */
const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    return successResponse(res, "Public platform settings retrieved", {
      deliveryChargePaise: settings.deliveryChargePaise,
      deliveryCharge: Number((settings.deliveryChargePaise / 100).toFixed(2)),
      platformName: settings.platformName,
      currency: settings.currency || "INR",
      defaultMoq: settings.defaultMoq || 1,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Full Admin Platform Settings (Admin only)
 */
const getAdminSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return successResponse(res, "Platform settings retrieved", {
      settings: {
        ...settings.toObject(),
        deliveryChargeRupees: Number((settings.deliveryChargePaise / 100).toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Platform Settings (Admin only)
 */
const updateAdminSettings = async (req, res, next) => {
  try {
    const updated = await settingsService.updateSettings(req.body, req.user);
    return successResponse(res, "Platform settings updated successfully", {
      settings: {
        ...updated.toObject(),
        deliveryChargeRupees: Number((updated.deliveryChargePaise / 100).toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
};

