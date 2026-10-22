const Razorpay = require("razorpay");
const crypto = require("crypto");
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = require("./env");

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} catch (err) {
  console.warn("[Razorpay] Initialized in fallback mode:", err.message);
}

/**
 * Verify Razorpay payment signature
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false;
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");
  return expectedSignature === signature;
};

/**
 * Verify Razorpay webhook signature
 */
const verifyWebhookSignature = (body, signature) => {
  if (!signature || !RAZORPAY_WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(typeof body === "string" ? body : JSON.stringify(body))
    .digest("hex");
  return expectedSignature === signature;
};

module.exports = {
  razorpayInstance,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
