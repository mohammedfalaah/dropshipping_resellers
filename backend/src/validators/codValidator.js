const { z } = require("zod");

const updateCodCollectionSchema = z.object({
  collectedAmount: z.number().min(0, "Collected amount cannot be negative"),
  collectionStatus: z.enum(["PENDING", "PARTIALLY_COLLECTED", "COLLECTED", "OVERDUE", "CANCELLED"]),
  collectionReference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const updateDeliveryStatusSchema = z.object({
  deliveryStatus: z.enum(["PENDING", "DISPATCHED", "DELIVERED", "RETURNED", "CANCELLED"]),
  courierName: z.string().optional(),
  trackingNumber: z.string().optional(),
});

module.exports = {
  updateCodCollectionSchema,
  updateDeliveryStatusSchema,
};
