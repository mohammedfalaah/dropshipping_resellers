const { z } = require("zod");

const createOrderItemSchema = z
  .object({
    productId: z.string().optional(),
    product: z.string().optional(),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
    sku: z.string().optional(),
    name: z.string().optional(),
    pricePaise: z.number().optional(),
  })
  .refine((val) => val.productId || val.product, {
    message: "Product ID is required",
    path: ["productId"],
  })
  .transform((val) => ({
    productId: (val.productId || val.product).toString(),
    quantity: val.quantity,
    sku: val.sku || "",
    name: val.name || "",
    pricePaise: val.pricePaise,
  }));

const shippingAddressSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    addressLine1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional().default("India"),
    notes: z.string().optional().default(""),
  })
  .transform((val) => {
    let firstName = val.firstName?.trim() || "";
    let lastName = val.lastName?.trim() || "";
    if (!firstName && val.fullName?.trim()) {
      const parts = val.fullName.trim().split(" ");
      firstName = parts[0] || "Customer";
      lastName = parts.slice(1).join(" ") || "Reseller";
    }
    return {
      firstName: firstName || "Customer",
      lastName: lastName || "Reseller",
      email: val.email?.trim() || "",
      phone: val.phone?.trim() || "9999999999",
      address: val.address?.trim() || val.addressLine1?.trim() || "Address",
      city: val.city?.trim() || "City",
      state: val.state?.trim() || "State",
      postalCode: val.postalCode?.trim() || val.zip?.trim() || "400001",
      country: val.country?.trim() || "India",
      notes: val.notes?.trim() || "",
    };
  });

const createOrderSchema = z.object({
  items: z.array(createOrderItemSchema).min(1, "Order must contain at least one item"),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.preprocess((val) => {
    if (typeof val === "string") {
      const upper = val.toUpperCase().trim();
      if (upper === "CASHFREE") return "RAZORPAY";
      return upper;
    }
    return val;
  }, z.enum(["COD", "RAZORPAY", "BANK_TRANSFER", "CASH", "OTHER"], {
    errorMap: () => ({ message: "Payment method must be COD, RAZORPAY, BANK_TRANSFER, CASH, or OTHER" }),
  })),
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

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  verifyRazorpayPaymentSchema,
};
