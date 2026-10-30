const { z } = require("zod");

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "Order must contain at least one item"),
  shippingAddress: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(7, "Valid phone number is required"),
    address: z.string().min(5, "Delivery address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    postalCode: z.string().min(3, "Postal code is required"),
    country: z.string().optional().default("India"),
    notes: z.string().optional().default(""),
  }),
  paymentMethod: z.enum(["COD", "RAZORPAY", "CASHFREE", "BANK_TRANSFER", "CASH", "OTHER"], {
    errorMap: () => ({ message: "Payment method must be COD, RAZORPAY, CASHFREE, BANK_TRANSFER, CASH, or OTHER" }),
  }),
});

const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  trackingNumber: z.string().optional(),
  courierName: z.string().optional(),
  cancellationReason: z.string().optional(),
});

const verifyRazorpayPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
});

const verifyCashfreePaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  cfOrderId: z.string().optional(),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  verifyRazorpayPaymentSchema,
  verifyCashfreePaymentSchema,
};
