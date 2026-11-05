const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  image: { type: String, default: "" },
  color: { type: String, default: "" },
  size: { type: String, default: "" },
  variantSku: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  // Wholesale price per unit charged by VEXORA
  unitPricePaise: { type: Number, required: true, min: 0 },
  wholesalePricePaise: { type: Number, min: 0 },
  subtotalPaise: { type: Number, required: true, min: 0 },
  // Price reseller charges end customer
  customerSellingPricePaise: { type: Number, required: true, min: 0 },
  customerSellingSubtotalPaise: { type: Number, required: true, min: 0 },
  // Expected profit for reseller: (customerSellingPrice - wholesalePrice) * quantity
  resellerProfitPaise: { type: Number, default: 0 },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [OrderItemSchema],
    subtotalPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    shippingPaise: { type: Number, default: 0, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
    // Financial Breakdown
    wholesaleCostPaise: { type: Number, default: 0, min: 0 },
    customerSellingTotalPaise: { type: Number, default: 0, min: 0 },
    expectedResellerProfitPaise: { type: Number, default: 0 },
    deliveryChargePaise: { type: Number, default: 5000, min: 0 },
    deliveryChargeStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
      index: true,
    },
    customerCollectionPaise: { type: Number, default: 0, min: 0 },
    codCollectedAmountPaise: { type: Number, default: 0, min: 0 },
    codCollectionStatus: {
      type: String,
      enum: ["PENDING", "PARTIALLY_COLLECTED", "COLLECTED", "RECONCILED", "CANCELLED", "NOT_APPLICABLE"],
      default: "NOT_APPLICABLE",
      index: true,
    },
    amountPayableToVexoraPaise: { type: Number, default: 0, min: 0 },
    resellerSettlementStatus: {
      type: String,
      enum: ["UNSETTLED", "PARTIALLY_SETTLED", "SETTLED"],
      default: "UNSETTLED",
      index: true,
    },
    settledProfitPaise: { type: Number, default: 0, min: 0 },
    settlementDate: { type: Date, default: null },
    settlementReference: { type: String, default: "" },
    settlementNotes: { type: String, default: "" },
    settlementHistory: [
      {
        amountPaise: { type: Number, required: true },
        method: { type: String, default: "BANK_TRANSFER" },
        reference: { type: String, default: "" },
        notes: { type: String, default: "" },
        settledAt: { type: Date, default: Date.now },
        settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    currency: { type: String, default: "INR" },
    paymentMethod: {
      type: String,
      enum: ["COD", "RAZORPAY", "BANK_TRANSFER", "CASH", "OTHER"],
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PAID", "PARTIALLY_PAID", "FAILED", "REFUNDED", "REVERSED"],
      default: "PENDING",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: "India" },
      notes: { type: String, default: "" },
    },
    trackingNumber: { type: String, default: "" },
    courierName: { type: String, default: "" },
    dispatchedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "" },
    // Razorpay specific metadata
    razorpay: {
      orderId: { type: String, default: "" },
      paymentId: { type: String, default: "" },
      signature: { type: String, default: "" },
    },
    // COD specific metadata
    cod: {
      codAmountPaise: { type: Number, default: 0 },
      collectedPaise: { type: Number, default: 0 },
      pendingPaise: { type: Number, default: 0 },
      collectionStatus: {
        type: String,
        enum: ["PENDING", "PARTIALLY_COLLECTED", "COLLECTED", "OVERDUE", "NOT_APPLICABLE"],
        default: "NOT_APPLICABLE",
      },
      collectionDate: { type: Date, default: null },
      collectionReference: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals for frontend display (in Rupees)
OrderSchema.virtual("totalRupees").get(function () {
  return Number((this.totalPaise / 100).toFixed(2));
});
OrderSchema.virtual("subtotalRupees").get(function () {
  return Number((this.subtotalPaise / 100).toFixed(2));
});
OrderSchema.virtual("shippingRupees").get(function () {
  return Number((this.shippingPaise / 100).toFixed(2));
});
OrderSchema.virtual("discountRupees").get(function () {
  return Number((this.discountPaise / 100).toFixed(2));
});
OrderSchema.virtual("wholesaleCostRupees").get(function () {
  return Number(((this.wholesaleCostPaise || this.subtotalPaise || 0) / 100).toFixed(2));
});
OrderSchema.virtual("customerSellingTotalRupees").get(function () {
  return Number(((this.customerSellingTotalPaise || this.totalPaise || 0) / 100).toFixed(2));
});
OrderSchema.virtual("expectedResellerProfitRupees").get(function () {
  return Number(((this.expectedResellerProfitPaise || 0) / 100).toFixed(2));
});
OrderSchema.virtual("deliveryChargeRupees").get(function () {
  return Number(((this.deliveryChargePaise || this.shippingPaise || 0) / 100).toFixed(2));
});
OrderSchema.virtual("customerCollectionRupees").get(function () {
  return Number(((this.customerCollectionPaise || this.cod?.codAmountPaise || 0) / 100).toFixed(2));
});
OrderSchema.virtual("settledProfitRupees").get(function () {
  return Number(((this.settledProfitPaise || 0) / 100).toFixed(2));
});

module.exports = mongoose.model("Order", OrderSchema);
