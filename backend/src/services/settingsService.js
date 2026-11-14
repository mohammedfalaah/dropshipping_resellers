const Setting = require("../models/Setting");
const AuditLog = require("../models/AuditLog");

/**
 * Get or initialize platform settings singleton
 */
const getSettings = async () => {
  let settings = await Setting.findOne({ key: "platform_settings" });
  if (!settings) {
    settings = await Setting.create({
      key: "platform_settings",
      platformName: "SPARE PRO Wholesale & Dropshipping",
      supportEmail: "support@sparepro.com",
      deliveryChargePaise: 5000,
      defaultMoq: 1,
      currency: "INR",
      autoApproveResellers: false,
    });
  }
  return settings;
};

/**
 * Get current delivery charge in integer paise
 * Fallback to default 5000 paise (₹50) if DB unavailable
 */
const getDeliveryChargePaise = async () => {
  try {
    const settings = await getSettings();
    return typeof settings.deliveryChargePaise === "number" ? settings.deliveryChargePaise : 5000;
  } catch (err) {
    console.warn("[SettingsService] Falling back to default delivery charge (5000 paise):", err.message);
    return 5000;
  }
};

/**
 * Update platform settings (Admin only)
 */
const updateSettings = async (data = {}, adminUser = null) => {
  let settings = await getSettings();
  const previousData = settings.toObject();

  if (data.deliveryCharge !== undefined && data.deliveryCharge !== null && data.deliveryCharge !== "") {
    const parsedRupees = Number(data.deliveryCharge);
    if (!isNaN(parsedRupees) && parsedRupees >= 0) {
      settings.deliveryChargePaise = Math.round(parsedRupees * 100);
    }
  } else if (typeof data.deliveryChargePaise === "number" && data.deliveryChargePaise >= 0) {
    settings.deliveryChargePaise = Math.round(data.deliveryChargePaise);
  }

  if (typeof data.platformName === "string" && data.platformName.trim()) {
    settings.platformName = data.platformName.trim();
  }

  if (typeof data.supportEmail === "string" && data.supportEmail.trim()) {
    settings.supportEmail = data.supportEmail.trim();
  }

  if (data.defaultMoq !== undefined && data.defaultMoq !== null) {
    const moq = Number(data.defaultMoq);
    if (!isNaN(moq) && moq >= 1) {
      settings.defaultMoq = Math.floor(moq);
    }
  }

  if (typeof data.autoApproveResellers === "boolean") {
    settings.autoApproveResellers = data.autoApproveResellers;
  }

  if (typeof data.indiapostApiUrl === "string") {
    settings.indiapostApiUrl = data.indiapostApiUrl.trim();
  }

  if (typeof data.indiapostBearerToken === "string") {
    settings.indiapostBearerToken = data.indiapostBearerToken.trim();
  }

  if (adminUser?._id) {
    settings.updatedBy = adminUser._id;
  }

  await settings.save();

  // Audit log entry
  if (adminUser) {
    try {
      await AuditLog.create({
        user: adminUser._id,
        userName: adminUser.name || "Admin",
        userRole: adminUser.role || "ADMIN",
        action: "UPDATE_PLATFORM_SETTINGS",
        targetType: "SETTINGS",
        targetId: settings._id.toString(),
        description: `Admin updated platform settings (Delivery charge: ₹${(settings.deliveryChargePaise / 100).toFixed(2)})`,
        changes: {
          previous: {
            deliveryChargePaise: previousData.deliveryChargePaise,
            deliveryChargeRupees: (previousData.deliveryChargePaise / 100).toFixed(2),
            platformName: previousData.platformName,
          },
          current: {
            deliveryChargePaise: settings.deliveryChargePaise,
            deliveryChargeRupees: (settings.deliveryChargePaise / 100).toFixed(2),
            platformName: settings.platformName,
          },
        },
      });
    } catch (auditErr) {
      console.warn("[SettingsService Audit Error]:", auditErr.message);
    }
  }

  return settings;
};

module.exports = {
  getSettings,
  getDeliveryChargePaise,
  updateSettings,
};

