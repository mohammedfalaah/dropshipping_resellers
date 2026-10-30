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
  quantity: { type: Number, required: true, min: 1 },
  unitPricePaise: { type: Number, required: true, min: 0 },
  subtotalPaise: { type: Number, required: true, min: 0 },
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
    currency: { type: String, default: "INR" },
    paymentMethod: {
      type: String,
      enum: ["COD", "RAZORPAY", "CASHFREE", "BANK_TRANSFER", "CASH", "OTHER"],
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
    // Cashfree specific metadata
    cashfree: {
      orderId: { type: String, default: "" },
      cfOrderId: { type: String, default: "" },
      paymentSessionId: { type: String, default: "" },
      paymentStatus: { type: String, default: "" },
      cfPaymentId: { type: String, default: "" },
      paymentMethod: { type: String, default: "" },
      paymentCompletionTime: { type: Date, default: null },
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

module.exports = mongoose.model("Order", OrderSchema);
