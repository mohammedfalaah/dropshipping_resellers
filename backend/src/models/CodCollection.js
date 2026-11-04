const mongoose = require("mongoose");

const CodCollectionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resellerName: {
      type: String,
      required: true,
    },
    // Dropshipping Financial Breakdown
    wholesaleCostPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    customerSellingTotalPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedResellerProfitPaise: {
      type: Number,
      default: 0,
    },
    deliveryChargePaise: {
      type: Number,
      default: 5000,
      min: 0,
    },
    deliveryChargeStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
      index: true,
    },
    amountPayableToVexoraPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    codAmountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    collectedAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingAmountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "DISPATCHED", "DELIVERED", "RETURNED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    collectionStatus: {
      type: String,
      enum: ["PENDING", "PARTIALLY_COLLECTED", "COLLECTED", "RECONCILED", "OVERDUE", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    courierName: {
      type: String,
      default: "",
    },
    trackingNumber: {
      type: String,
      default: "",
    },
    collectionDate: {
      type: Date,
      default: null,
    },
    collectionReference: {
      type: String,
      default: "",
    },
    reconciliationDate: {
      type: Date,
      default: null,
    },
    reconciliationReference: {
      type: String,
      default: "",
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resellerSettlementStatus: {
      type: String,
      enum: ["UNSETTLED", "PARTIALLY_SETTLED", "SETTLED"],
      default: "UNSETTLED",
      index: true,
    },
    settledProfitPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    settlementDate: {
      type: Date,
      default: null,
    },
    settlementReference: {
      type: String,
      default: "",
    },
    settlementNotes: {
      type: String,
      default: "",
    },
    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    recordedBy: {
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

CodCollectionSchema.virtual("codAmountRupees").get(function () {
  return Number((this.codAmountPaise / 100).toFixed(2));
});
CodCollectionSchema.virtual("collectedAmountRupees").get(function () {
  return Number((this.collectedAmountPaise / 100).toFixed(2));
});
CodCollectionSchema.virtual("pendingAmountRupees").get(function () {
  return Number((this.pendingAmountPaise / 100).toFixed(2));
});
CodCollectionSchema.virtual("wholesaleCostRupees").get(function () {
  return Number(((this.wholesaleCostPaise || 0) / 100).toFixed(2));
});
CodCollectionSchema.virtual("customerSellingTotalRupees").get(function () {
  return Number(((this.customerSellingTotalPaise || this.codAmountPaise || 0) / 100).toFixed(2));
});
CodCollectionSchema.virtual("expectedResellerProfitRupees").get(function () {
  return Number(((this.expectedResellerProfitPaise || 0) / 100).toFixed(2));
});
CodCollectionSchema.virtual("deliveryChargeRupees").get(function () {
  return Number(((this.deliveryChargePaise || 0) / 100).toFixed(2));
});
CodCollectionSchema.virtual("settledProfitRupees").get(function () {
  return Number(((this.settledProfitPaise || 0) / 100).toFixed(2));
});

module.exports = mongoose.model("CodCollection", CodCollectionSchema);
