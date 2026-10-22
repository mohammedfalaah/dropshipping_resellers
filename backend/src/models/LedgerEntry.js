const mongoose = require("mongoose");

const LedgerEntrySchema = new mongoose.Schema(
  {
    entryNumber: {
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
    type: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: [1, "Ledger entry amount must be positive integer paise"],
    },
    balanceBeforePaise: {
      type: Number,
      required: true,
    },
    balanceAfterPaise: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["ORDER", "PAYMENT", "COD_COLLECTION", "ADJUSTMENT", "REFUND", "REVERSAL"],
      required: true,
      index: true,
    },
    referenceId: {
      type: String,
      default: "",
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

LedgerEntrySchema.virtual("amountRupees").get(function () {
  return Number((this.amountPaise / 100).toFixed(2));
});

LedgerEntrySchema.virtual("balanceAfterRupees").get(function () {
  return Number((this.balanceAfterPaise / 100).toFixed(2));
});

module.exports = mongoose.model("LedgerEntry", LedgerEntrySchema);
