const { z } = require("zod");

const recordPaymentSchema = z.object({
  resellerId: z.string().min(1, "Reseller ID is required"),
  orderId: z.string().optional().nullable(),
  amount: z.number().positive("Payment amount must be positive"),
  method: z.enum(["COD", "RAZORPAY", "CASHFREE", "BANK_TRANSFER", "CASH", "OTHER"]),
  transactionReference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const reversePaymentSchema = z.object({
  reason: z.string().min(5, "Reversal reason must be at least 5 characters"),
});

const recordAdjustmentSchema = z.object({
  resellerId: z.string().min(1, "Reseller ID is required"),
  type: z.enum(["DEBIT", "CREDIT"], {
    errorMap: () => ({ message: "Adjustment type must be DEBIT or CREDIT" }),
  }),
  amount: z.number().positive("Adjustment amount must be positive"),
  reason: z.string().min(5, "A mandatory reason of at least 5 characters is required for any ledger adjustment"),
});

module.exports = {
  recordPaymentSchema,
  reversePaymentSchema,
  recordAdjustmentSchema,
};
