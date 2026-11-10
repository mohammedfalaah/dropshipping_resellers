require("dotenv").config();

// Live Razorpay credentials provided by merchant
const LIVE_RAZORPAY_KEY_ID = "rzp_live_TyLo7eXzFHYXh4";
const LIVE_RAZORPAY_KEY_SECRET = "iQvXbRNDkann1fOyxuIyLtSx";

// Old or invalid keys that must be ignored if still configured in cloud environment variables
const DEPRECATED_RAZORPAY_KEYS = [
  "rzp_test_TuV8GLC7nWbF1R",
  "rzp_live_tJm8f0aX037r67",
  "rzp_test_1DP5mmOlF5G5ag",
  "rzp_test_Ty2y2q6NmAHJka",
  "rzp_test_Ty43ORjkMVdbCx",
];

const envKeyId = process.env.RAZORPAY_KEY_ID?.trim();
const isDeprecated =
  !envKeyId ||
  DEPRECATED_RAZORPAY_KEYS.includes(envKeyId) ||
  envKeyId === "rzp_live_tJm8f0aX037r67";

const ACTIVE_RAZORPAY_KEY_ID = isDeprecated
  ? LIVE_RAZORPAY_KEY_ID
  : envKeyId;

const ACTIVE_RAZORPAY_KEY_SECRET = isDeprecated
  ? LIVE_RAZORPAY_KEY_SECRET
  : process.env.RAZORPAY_KEY_SECRET?.trim() || LIVE_RAZORPAY_KEY_SECRET;

module.exports = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sparepro_reseller",
  JWT_SECRET: process.env.JWT_SECRET || "sparepro_super_secure_jwt_secret_key_2026_production_grade",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  RAZORPAY_KEY_ID: ACTIVE_RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: ACTIVE_RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret_key_98765",
  FRONTEND_URL: process.env.FRONTEND_URL || "https://thesparepro.com",
  ADMIN_INITIAL_EMAIL: process.env.ADMIN_INITIAL_EMAIL || "admin@sparepro.com",
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD || "Admin@SparePro2026!",
  ADMIN_INITIAL_NAME: process.env.ADMIN_INITIAL_NAME || "SPARE PRO Admin",
};
