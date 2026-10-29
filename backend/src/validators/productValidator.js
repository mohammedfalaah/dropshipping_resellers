const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(200),
  sku: z.string().min(3, "SKU is required").max(50),
  category: z.string().min(1, "Category is required").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDescription: z.string().optional().default(""),
  mainImage: z.string().min(1, "Main image is required"),
  gallery: z.array(z.string()).optional().default([]),
  regularPrice: z.number().positive("Regular price must be greater than zero"),
  resellerPrice: z.number().positive("Reseller wholesale price must be greater than zero"),
  stockQuantity: z.number().int().min(0, "Stock cannot be negative").default(0),
  minOrderQuantity: z.number().int().min(1).default(1),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  badge: z.string().optional().default(""),
  rating: z.number().min(1).max(5).optional().default(5),
  additionalInfo: z.record(z.string()).optional().default({}),
});

const updateProductSchema = createProductSchema.partial();

const updateStockSchema = z.object({
  stockQuantity: z.number().int().min(0, "Stock quantity cannot be negative"),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
};
