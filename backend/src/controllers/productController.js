const Product = require("../models/Product");
const Category = require("../models/Category");
const AuditLog = require("../models/AuditLog");
const { successResponse, errorResponse } = require("../utils/response");
const { rupeesToPaise, paiseToRupees } = require("../utils/currency");
const { optimizeImage } = require("../utils/imageOptimizer");


const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

/**
 * Get Products with Category, Search, Status & Pagination
 */
const getProducts = async (req, res, next) => {
  try {
    const { category, search, active, featured, trending, page = 1, limit = 20, sort = "-createdAt" } = req.query;

    const query = {};

    // Filter by active status
    if (active !== undefined) {
      query.isActive = active === "true";
    } else if (!req.user || req.user.role !== "admin") {
      query.isActive = true;
    }

    if (category) {
      query.categorySlug = category.toLowerCase();
    }

    if (featured !== undefined) {
      query.isFeatured = featured === "true";
    }

    if (trending !== undefined) {
      query.isTrending = trending === "true";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    // Check if requester has approved wholesale pricing privileges
    const isApprovedResellerOrAdmin =
      req.user &&
      (req.user.role === "admin" || (req.user.role === "reseller" && req.user.approvalStatus === "approved"));

    const formattedProducts = products.map((p) => {
      const obj = p.toObject();
      obj.price = isApprovedResellerOrAdmin ? paiseToRupees(p.resellerPricePaise) : null;
      obj.originalPrice = paiseToRupees(p.regularPricePaise);
      obj.resellerPrice = isApprovedResellerOrAdmin ? paiseToRupees(p.resellerPricePaise) : null;
      obj.regularPrice = paiseToRupees(p.regularPricePaise);
      return obj;
    });

    return successResponse(res, "Products retrieved successfully.", {
      products: formattedProducts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
      hasWholesaleAccess: isApprovedResellerOrAdmin,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Product by Slug
 */
const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) {
      return errorResponse(res, "Product not found", "PRODUCT_NOT_FOUND", 404);
    }

    const isApprovedResellerOrAdmin =
      req.user &&
      (req.user.role === "admin" || (req.user.role === "reseller" && req.user.approvalStatus === "approved"));

    const obj = product.toObject();
    obj.price = isApprovedResellerOrAdmin ? paiseToRupees(product.resellerPricePaise) : null;
    obj.originalPrice = paiseToRupees(product.regularPricePaise);
    obj.resellerPrice = isApprovedResellerOrAdmin ? paiseToRupees(product.resellerPricePaise) : null;
    obj.regularPrice = paiseToRupees(product.regularPricePaise);

    return successResponse(res, "Product details retrieved.", {
      product: obj,
      hasWholesaleAccess: isApprovedResellerOrAdmin,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Product (Admin Only)
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      category,
      description,
      shortDescription,
      mainImage,
      gallery,
      regularPrice,
      resellerPrice,
      stockQuantity,
      minOrderQuantity,
      isActive,
      isFeatured,
      isTrending,
      badge,
      rating,
      additionalInfo,
    } = req.body;

    // Check SKU uniqueness
    const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSku) {
      return errorResponse(res, `A product with SKU '${sku}' already exists.`, "DUPLICATE_SKU", 409);
    }

    const slug = slugify(name);
    const existingSlug = await Product.findOne({ slug });
    const finalSlug = existingSlug ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    const categorySlug = category.toLowerCase();

    const product = await Product.create({
      name,
      sku: sku.toUpperCase(),
      slug: finalSlug,
      category,
      categorySlug,
      description,
      shortDescription: shortDescription || "",
      mainImage,
      gallery: gallery || [],
      regularPricePaise: rupeesToPaise(regularPrice),
      resellerPricePaise: rupeesToPaise(resellerPrice),
      stockQuantity: stockQuantity || 0,
      minOrderQuantity: minOrderQuantity || 1,
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: !!isFeatured,
      isTrending: !!isTrending,
      badge: badge || "",
      rating: rating || 5,
      additionalInfo: additionalInfo || {},
    });

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "PRODUCT_CREATED",
      targetType: "PRODUCT",
      targetId: product._id.toString(),
      description: `Admin created product: ${product.name} (SKU: ${product.sku})`,
    });

    return successResponse(res, "Product created successfully.", { product }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update Product (Admin Only)
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, "Product not found", "PRODUCT_NOT_FOUND", 404);
    }

    const {
      name,
      sku,
      category,
      description,
      shortDescription,
      mainImage,
      gallery,
      regularPrice,
      resellerPrice,
      stockQuantity,
      minOrderQuantity,
      isActive,
      isFeatured,
      isTrending,
      badge,
      additionalInfo,
    } = req.body;

    if (sku && sku.toUpperCase() !== product.sku) {
      const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
      if (existingSku) {
        return errorResponse(res, `A product with SKU '${sku}' already exists.`, "DUPLICATE_SKU", 409);
      }
      product.sku = sku.toUpperCase();
    }

    if (name) {
      product.name = name;
      product.slug = slugify(name);
    }
    if (category) {
      product.category = category;
      product.categorySlug = category.toLowerCase();
    }
    if (description) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (mainImage) product.mainImage = mainImage;
    if (gallery) product.gallery = gallery;
    if (regularPrice !== undefined) product.regularPricePaise = rupeesToPaise(regularPrice);
    if (resellerPrice !== undefined) product.resellerPricePaise = rupeesToPaise(resellerPrice);
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
    if (minOrderQuantity !== undefined) product.minOrderQuantity = minOrderQuantity;
    if (isActive !== undefined) product.isActive = isActive;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isTrending !== undefined) product.isTrending = isTrending;
    if (badge !== undefined) product.badge = badge;
    if (additionalInfo) product.additionalInfo = additionalInfo;

    await product.save();

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "PRODUCT_UPDATED",
      targetType: "PRODUCT",
      targetId: product._id.toString(),
      description: `Admin updated product: ${product.name} (SKU: ${product.sku})`,
    });

    return successResponse(res, "Product updated successfully.", { product });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Product Stock (Admin Only)
 */
const updateStock = async (req, res, next) => {
  try {
    const { stockQuantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, "Product not found", "PRODUCT_NOT_FOUND", 404);
    }

    const previousStock = product.stockQuantity;
    product.stockQuantity = stockQuantity;
    await product.save();

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "PRODUCT_STOCK_UPDATED",
      targetType: "PRODUCT",
      targetId: product._id.toString(),
      description: `Stock for ${product.name} updated from ${previousStock} to ${stockQuantity}`,
    });

    return successResponse(res, `Stock for ${product.name} updated to ${stockQuantity}.`, {
      product,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete Product (Admin Only)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return errorResponse(res, "Product not found", "PRODUCT_NOT_FOUND", 404);
    }

    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: "admin",
      action: "PRODUCT_DELETED",
      targetType: "PRODUCT",
      targetId: req.params.id,
      description: `Admin deleted product: ${product.name} (SKU: ${product.sku})`,
    });

    return successResponse(res, `Product '${product.name}' deleted successfully.`);
  } catch (err) {
    next(err);
  }
};

/**
 * Upload & Compress Image (Auto-Resizes & Reduces File Size via Sharp)
 */
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return errorResponse(res, "Please select an image file to upload.", "NO_FILE", 400);
    }

    const optimization = await optimizeImage(req.file.buffer, req.file.originalname);

    return successResponse(
      res,
      `Image imported & compressed successfully: ${optimization.originalSizeFormatted} → ${optimization.compressedSizeFormatted} (${optimization.savingsPercent} reduction)`,
      optimization
    );
  } catch (err) {
    console.error("Image optimization error:", err);
    return errorResponse(res, "Failed to optimize image: " + err.message, "OPTIMIZATION_ERROR", 500);
  }
};

/**
 * Bulk Import Products (Array of product records)
 */
const bulkImportProducts = async (req, res, next) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return errorResponse(res, "Please provide an array of products to import.", "INVALID_DATA", 400);
    }

    const validCategories = ["Gadgets", "Watches", "Footwear", "Fashion"];
    const preparedProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.name || !p.sku) {
        errors.push(`Row ${i + 1}: Name and SKU are required.`);
        continue;
      }

      // Check category
      const category = p.category || "Gadgets";
      if (!validCategories.includes(category)) {
        errors.push(`Row ${i + 1} (${p.name}): Invalid category '${category}'. Must be one of: ${validCategories.join(", ")}`);
        continue;
      }

      // Check existing SKU
      const skuUpper = p.sku.trim().toUpperCase();
      const existingSku = await Product.findOne({ sku: skuUpper });
      if (existingSku) {
        errors.push(`Row ${i + 1}: SKU '${skuUpper}' already exists.`);
        continue;
      }

      const slug = slugify(p.name);
      const existingSlug = await Product.findOne({ slug });
      const finalSlug = existingSlug ? `${slug}-${Date.now().toString().slice(-4)}-${i}` : slug;

      preparedProducts.push({
        name: p.name.trim(),
        sku: skuUpper,
        slug: finalSlug,
        category,
        categorySlug: category.toLowerCase(),
        description: p.description || p.name,
        shortDescription: p.shortDescription || "",
        mainImage: p.mainImage || "/images/product-earbuds.jpg",
        gallery: Array.isArray(p.gallery) ? p.gallery : [],
        regularPricePaise: rupeesToPaise(p.regularPrice || 999),
        resellerPricePaise: rupeesToPaise(p.resellerPrice || 699),
        stockQuantity: Number(p.stockQuantity) || 50,
        minOrderQuantity: Number(p.minOrderQuantity) || 1,
        isActive: p.isActive !== false,
      });
    }

    if (preparedProducts.length === 0) {
      return errorResponse(
        res,
        "No valid products could be imported.",
        "IMPORT_FAILED",
        400,
        { errors }
      );
    }

    const inserted = await Product.insertMany(preparedProducts);

    await AuditLog.create({
      action: "PRODUCT_BULK_IMPORT",
      entity: "Product",
      entityId: inserted[0]._id,
      performedBy: req.user._id,
      description: `Admin imported ${inserted.length} products. Skipped/errors: ${errors.length}`,
      metadata: { count: inserted.length, errors },
    });

    return successResponse(
      res,
      `Successfully imported ${inserted.length} product(s).${errors.length > 0 ? ` (${errors.length} skipped)` : ""}`,
      {
        importedCount: inserted.length,
        errors,
        products: inserted,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get Categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true });
    return successResponse(res, "Categories retrieved.", { categories });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  uploadImage,
  bulkImportProducts,
  getCategories,
};

