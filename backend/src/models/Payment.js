const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
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
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: [1, "Payment amount must be greater than zero"],
    },
    currency: {
      type: String,
      default: "INR",
    },
    method: {
      type: String,
      enum: ["COD", "RAZORPAY", "CASHFREE", "BANK_TRANSFER", "CASH", "OTHER"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PAID", "FAILED", "PARTIALLY_PAID", "REFUNDED", "REVERSED"],
      default: "PENDING",
      index: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      default: "",
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: "",
    },
    cashfreeOrderId: {
      type: String,
      trim: true,
      default: "",
    },
    cashfreePaymentId: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Financial audit / reversal info
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversalReason: {
      type: String,
      default: "",
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversedBy: {
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

PaymentSchema.virtual("amountRupees").get(function () {
  return Number((this.amountPaise / 100).toFixed(2));
});

module.exports = mongoose.model("Payment", PaymentSchema);
