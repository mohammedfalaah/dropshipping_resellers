const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "platform_settings",
      unique: true,
      index: true,
    },
    platformName: {
      type: String,
      default: "SPARE PRO Wholesale & Dropshipping",
      trim: true,
    },
    supportEmail: {
      type: String,
      default: "support@sparepro.com",
      trim: true,
    },
    deliveryChargePaise: {
      type: Number,
      default: 5000, // ₹50.00 in integer paise
      min: 0,
    },
    defaultMoq: {
      type: Number,
      default: 1,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
    },
    autoApproveResellers: {
      type: Boolean,
      default: false,
    },
    indiapostApiUrl: {
      type: String,
      default: "https://test.cept.gov.in/beextcustomer",
      trim: true,
    },
    indiapostBearerToken: {
      type: String,
      default: "",
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SettingSchema.virtual("deliveryChargeRupees").get(function () {
  return Number(((this.deliveryChargePaise || 0) / 100).toFixed(2));
});

module.exports = mongoose.model("Setting", SettingSchema);

