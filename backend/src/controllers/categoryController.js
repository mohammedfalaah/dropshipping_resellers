const Category = require("../models/Category");
const Product = require("../models/Product");
const AuditLog = require("../models/AuditLog");
const { successResponse, errorResponse } = require("../utils/response");

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
 * Get all categories with SKU counts
 */
const getCategories = async (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.role === "admin";
    const query = {};
    if (!isAdmin && req.query.all !== "true") {
      query.isActive = true;
    }

    const categories = await Category.find(query).sort({ createdAt: 1 }).lean();

    // Calculate productCount for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          $or: [
            { categorySlug: cat.slug },
            { category: new RegExp(`^${cat.name}$`, "i") },
          ],
        });
        return {
          ...cat,
          id: cat._id,
          productCount,
        };
      })
    );

    return successResponse(res, "Categories retrieved successfully.", {
      categories: categoriesWithCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get category by ID or slug
 */
const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({
      $or: [{ slug: slug.toLowerCase() }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!category) {
      return errorResponse(res, "Category not found.", "NOT_FOUND", 404);
    }

    const productCount = await Product.countDocuments({
      $or: [{ categorySlug: category.slug }, { category: category.name }],
    });

    return successResponse(res, "Category retrieved.", {
      category: {
        ...category.toObject(),
        productCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new Category
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description, image, isActive } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, "Category name is required.", "VALIDATION_ERROR", 400);
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName);

    // Check if category exists
    const existing = await Category.findOne({
      $or: [{ slug }, { name: new RegExp(`^${trimmedName}$`, "i") }],
    });

    if (existing) {
      return errorResponse(
        res,
        `Category '${trimmedName}' already exists.`,
        "DUPLICATE_CATEGORY",
        409
      );
    }

    const newCategory = await Category.create({
      name: trimmedName,
      slug,
      description: description ? description.trim() : "",
      image: image || `/images/category-${slug}.jpg`,
      isActive: isActive !== false,
    });

    if (req.user) {
      await AuditLog.create({
        action: "CATEGORY_CREATE",
        entity: "Category",
        entityId: newCategory._id,
        performedBy: req.user._id,
        description: `Created category '${newCategory.name}' (${newCategory.slug})`,
        metadata: { name: newCategory.name, slug: newCategory.slug },
      }).catch(() => {});
    }

    return successResponse(
      res,
      `Category '${newCategory.name}' created successfully.`,
      {
        category: {
          ...newCategory.toObject(),
          id: newCategory._id,
          productCount: 0,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing Category
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, image, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return errorResponse(res, "Category not found.", "NOT_FOUND", 404);
    }

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const newSlug = slugify(trimmedName);

      const conflict = await Category.findOne({
        _id: { $ne: id },
        $or: [{ slug: newSlug }, { name: new RegExp(`^${trimmedName}$`, "i") }],
      });

      if (conflict) {
        return errorResponse(
          res,
          `Category name '${trimmedName}' is already in use.`,
          "DUPLICATE_CATEGORY",
          409
        );
      }

      category.name = trimmedName;
      category.slug = newSlug;
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    const productCount = await Product.countDocuments({
      $or: [{ categorySlug: category.slug }, { category: category.name }],
    });

    return successResponse(res, `Category '${category.name}' updated successfully.`, {
      category: {
        ...category.toObject(),
        id: category._id,
        productCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a Category
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return errorResponse(res, "Category not found.", "NOT_FOUND", 404);
    }

    const productCount = await Product.countDocuments({
      $or: [{ categorySlug: category.slug }, { category: category.name }],
    });

    if (productCount > 0 && req.query.force !== "true") {
      return errorResponse(
        res,
        `Cannot delete category '${category.name}' because it contains ${productCount} active product(s). Please reassign or delete the products first, or deactivate the category.`,
        "CATEGORY_HAS_PRODUCTS",
        400,
        { productCount }
      );
    }

    await Category.findByIdAndDelete(id);

    return successResponse(res, `Category '${category.name}' deleted successfully.`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
