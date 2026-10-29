const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const categoryController = require("../controllers/categoryController");
const { protect, restrictTo } = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env");
const {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} = require("../validators/productValidator");

/**
 * Optional authentication helper: identifies user if token present, without blocking unauthenticated requests
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (e) {
    // ignore token errors for optional auth
  }
  next();
};

// Public / Reseller endpoints
router.get("/categories", categoryController.getCategories);
router.get("/categories/list", categoryController.getCategories);
router.get("/", optionalAuth, productController.getProducts);
router.get("/:slug", optionalAuth, productController.getProductBySlug);

// Admin-only endpoints
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validate(createProductSchema),
  productController.createProduct
);

router.patch(
  "/:id",
  protect,
  restrictTo("admin"),
  validate(updateProductSchema),
  productController.updateProduct
);

router.patch(
  "/:id/stock",
  protect,
  restrictTo("admin"),
  validate(updateStockSchema),
  productController.updateStock
);

router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  productController.deleteProduct
);

router.post(
  "/upload-image",
  protect,
  restrictTo("admin"),
  upload.single("image"),
  productController.uploadImage
);

router.post(
  "/import",
  protect,
  restrictTo("admin"),
  productController.bulkImportProducts
);

module.exports = router;

