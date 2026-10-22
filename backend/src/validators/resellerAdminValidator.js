const { z } = require("zod");

const resellerApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional().default(""),
});

const createResellerAdminSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(7).max(20),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
  accountStatus: z.enum(["active", "blocked"]).default("active"),
  businessInfo: z
    .object({
      businessName: z.string().optional().default(""),
      address: z.string().optional().default(""),
      city: z.string().optional().default(""),
      state: z.string().optional().default(""),
      postalCode: z.string().optional().default(""),
      country: z.string().optional().default("India"),
      taxId: z.string().optional().default(""),
    })
    .optional(),
});

const updateResellerAdminSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  accountStatus: z.enum(["active", "blocked"]).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
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
  resellerApprovalSchema,
  createResellerAdminSchema,
  updateResellerAdminSchema,
};
