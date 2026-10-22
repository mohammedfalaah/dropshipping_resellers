const { z } = require("zod");

const registerResellerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(7, "Valid phone number is required").max(20),
  businessName: z.string().min(2, "Business name is required").optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().optional().default("India"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  businessInfo: z
    .object({
      businessName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      taxId: z.string().optional(),
    })
    .optional(),
});

module.exports = {
  registerResellerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
};
