/**
 * Currency utilities for precise financial calculations in INR (stored as integer paise)
 * 1 INR = 100 paise
 */

/**
 * Convert Rupees to integer Paise (e.g. 34.99 -> 3499, 100 -> 10000)
 */
const rupeesToPaise = (rupees) => {
  if (typeof rupees !== "number") {
    rupees = parseFloat(rupees) || 0;
  }
  return Math.round(rupees * 100);
};

/**
 * Convert integer Paise to Rupees with 2 decimal places (e.g. 3499 -> 34.99)
 */
const paiseToRupees = (paise) => {
  if (typeof paise !== "number") {
    paise = parseInt(paise, 10) || 0;
  }
  return Number((paise / 100).toFixed(2));
};

/**
 * Format integer Paise as readable INR string (e.g. 3499 -> "₹34.99")
 */
const formatINR = (paise) => {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(rupees);
};

/**
 * Calculate reseller margin percentage
 */
const calculateMarginPercent = (retailPaise, wholesalePaise) => {
  if (!retailPaise || retailPaise <= wholesalePaise) return 0;
  const margin = ((retailPaise - wholesalePaise) / retailPaise) * 100;
  return Math.round(margin);
};

module.exports = {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  calculateMarginPercent,
};
