const settingsService = require("../services/settingsService");
const trackingService = require("../services/trackingService");
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
      fastDeliveryChargePaise: settings.fastDeliveryChargePaise ?? 10000,
      fastDeliveryCharge: Number(((settings.fastDeliveryChargePaise ?? 10000) / 100).toFixed(2)),
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
    const settingsObj = settings.toObject();

    // Never expose plain text password to the frontend
    settingsObj.hasIndiapostPassword = Boolean(settings.indiapostPassword);
    settingsObj.indiapostPassword = settings.indiapostPassword ? "••••••••" : "";

    return successResponse(res, "Platform settings retrieved", {
      settings: {
        ...settingsObj,
        deliveryChargeRupees: Number((settings.deliveryChargePaise / 100).toFixed(2)),
        fastDeliveryChargeRupees: Number(((settings.fastDeliveryChargePaise ?? 10000) / 100).toFixed(2)),
        fastDeliveryCharge: Number(((settings.fastDeliveryChargePaise ?? 10000) / 100).toFixed(2)),
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
    const updatedObj = updated.toObject();
    updatedObj.hasIndiapostPassword = Boolean(updated.indiapostPassword);
    updatedObj.indiapostPassword = updated.indiapostPassword ? "••••••••" : "";

    return successResponse(res, "Platform settings updated successfully", {
      settings: {
        ...updatedObj,
        deliveryChargeRupees: Number((updated.deliveryChargePaise / 100).toFixed(2)),
        fastDeliveryChargeRupees: Number(((updated.fastDeliveryChargePaise ?? 10000) / 100).toFixed(2)),
        fastDeliveryCharge: Number(((updated.fastDeliveryChargePaise ?? 10000) / 100).toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Test India Post API connectivity & Authentication
 */
const testIndiaPostIntegration = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    const hasCreds = Boolean(
      (settings.indiapostUsername && settings.indiapostPassword) ||
      process.env.INDIAPOST_USERNAME ||
      settings.indiapostRefreshToken ||
      settings.indiapostBearerToken
    );

    if (!hasCreds) {
      return errorResponse(
        res,
        "No India Post Wholesaler Username/Password or Refresh Token configured yet.",
        "CONFIG_MISSING",
        400
      );
    }

    let authResult = null;
    let authMethod = "none";

    // 1. Try Login via /v1/access/login if Username and Password exist
    if (
      (settings.indiapostUsername && settings.indiapostPassword) ||
      (process.env.INDIAPOST_USERNAME && process.env.INDIAPOST_PASSWORD)
    ) {
      authResult = await trackingService.loginIndiaPost(settings);
      if (authResult?.accessToken) {
        authMethod = "login_credentials";
      }
    }

    // 2. If login wasn't used or failed, try refresh token if available
    if (!authResult && settings.indiapostRefreshToken) {
      authResult = await trackingService.refreshIndiaPostToken(settings);
      if (authResult?.accessToken) {
        authMethod = "refresh_token";
      }
    }

    if (!authResult) {
      return errorResponse(
        res,
        "India Post DOP API authentication failed. Please verify Wholesaler Username and Password.",
        "AUTH_FAILED",
        401
      );
    }

    const updated = await settingsService.getSettings();

    return successResponse(res, "India Post DOP API authenticated successfully!", {
      authMethod,
      hasAccessToken: Boolean(updated.indiapostBearerToken),
      hasRefreshToken: Boolean(updated.indiapostRefreshToken),
      tokenExpiresAt: updated.indiapostTokenExpiresAt,
      lastRefreshedAt: updated.indiapostLastTokenRefresh,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
  testIndiaPostIntegration,
};

