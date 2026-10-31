require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sparepro_reseller",
  JWT_SECRET: process.env.JWT_SECRET || "sparepro_super_secure_jwt_secret_key_2026_production_grade",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_TuV8GLC7nWbF1R",
  RAZORPAY_KEY_SECRET:
    process.env.RAZORPAY_KEY_SECRET ||
    Buffer.from("aFMyU3Fua0t3SUFSeTZTTDJPMWk1N2lH", "base64").toString("utf-8"),
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret_key_98765",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  ADMIN_INITIAL_EMAIL: process.env.ADMIN_INITIAL_EMAIL || "admin@sparepro.com",
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD || "Admin@SparePro2026!",
  ADMIN_INITIAL_NAME: process.env.ADMIN_INITIAL_NAME || "SPARE PRO Admin",
};
