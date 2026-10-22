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
      enum: ["PENDING", "DISPATCHED", "DELIVERED", "RETURNED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    collectionStatus: {
      type: String,
      enum: ["PENDING", "PARTIALLY_COLLECTED", "COLLECTED", "OVERDUE", "CANCELLED"],
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

module.exports = mongoose.model("CodCollection", CodCollectionSchema);
