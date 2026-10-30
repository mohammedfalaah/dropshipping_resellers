const crypto = require("crypto");
const {
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY,
  CASHFREE_ENVIRONMENT,
  CASHFREE_API_VERSION,
} = require("./env");

const isProd = (CASHFREE_ENVIRONMENT || "PRODUCTION").toUpperCase() === "PRODUCTION";
const CASHFREE_BASE_URL = isProd
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

/**
 * Standard headers required for Cashfree PG API requests
 */
const getHeaders = () => ({
  "Content-Type": "application/json",
  "x-client-id": CASHFREE_APP_ID,
  "x-client-secret": CASHFREE_SECRET_KEY,
  "x-api-version": CASHFREE_API_VERSION || "2023-08-01",
});

/**
 * Create a new payment order on Cashfree PG
 * @param {Object} params
 * @param {string} params.orderId - Unique order id (alphanumeric, max 50 chars)
 * @param {number} params.orderAmount - Amount in Rupees (e.g. 1499.00)
 * @param {Object} params.customerDetails - { customerId, customerName, customerEmail, customerPhone }
 * @param {string} params.returnUrl - URL to redirect the user after payment completion
 * @param {string} params.orderNote - Optional notes for the order
 */
const createOrder = async ({
  orderId,
  orderAmount,
  customerDetails,
  returnUrl,
  orderNote = "",
}) => {
  // Sanitize customer phone: Cashfree expects valid 10-digit phone
  const cleanPhone = (customerDetails.customerPhone || "9999999999")
    .toString()
    .replace(/[^0-9]/g, "")
    .slice(-10);

  const cleanCustomerId = (customerDetails.customerId || `cust_${Date.now()}`)
    .toString()
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 50);

  const payload = {
    order_id: orderId,
    order_amount: Number(Number(orderAmount).toFixed(2)),
    order_currency: "INR",
    customer_details: {
      customer_id: cleanCustomerId,
      customer_name: customerDetails.customerName || "Customer",
      customer_email: customerDetails.customerEmail || "customer@example.com",
      customer_phone: cleanPhone.length === 10 ? cleanPhone : "9999999999",
    },
    order_meta: {
      return_url: returnUrl,
    },
    order_note: orderNote || `Order ${orderId}`,
  };

  const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Cashfree Create Order Error]:", data);
    throw new Error(data.message || `Cashfree order creation failed with status ${response.status}`);
  }

  return data;
};

/**
 * Fetch Order details from Cashfree
 * @param {string} orderId
 */
const getOrder = async (orderId) => {
  const response = await fetch(`${CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Cashfree Fetch Order Error]:", data);
    throw new Error(data.message || `Failed to fetch Cashfree order: ${orderId}`);
  }

  return data;
};

/**
 * Fetch Payments list for a given Cashfree Order
 * @param {string} orderId
 */
const getOrderPayments = async (orderId) => {
  const response = await fetch(`${CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}/payments`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Cashfree Fetch Payments Error]:", data);
    throw new Error(data.message || `Failed to fetch payments for order ${orderId}`);
  }

  return data;
};

/**
 * Verify Cashfree Webhook Signature
 * @param {string} rawBody - Exact raw body string of the webhook payload
 * @param {string} signature - Header 'x-webhook-signature'
 * @param {string|number} timestamp - Header 'x-webhook-timestamp'
 */
const verifyWebhookSignature = (rawBody, signature, timestamp) => {
  if (!signature || !timestamp || !CASHFREE_SECRET_KEY) return false;
  try {
    const dataToSign = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", CASHFREE_SECRET_KEY)
      .update(dataToSign)
      .digest("base64");

    return expectedSignature === signature;
  } catch (err) {
    console.error("[Cashfree Webhook Signature Error]:", err);
    return false;
  }
};

module.exports = {
  createOrder,
  getOrder,
  getOrderPayments,
  verifyWebhookSignature,
  CASHFREE_BASE_URL,
  isProd,
};

