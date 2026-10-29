const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { protect, restrictTo } = require("../middleware/auth");

// Public endpoints (or authenticated)
router.get("/", categoryController.getCategories);
router.get("/:slug", categoryController.getCategoryBySlug);

// Admin-only endpoints
router.post("/", protect, restrictTo("admin"), categoryController.createCategory);
router.put("/:id", protect, restrictTo("admin"), categoryController.updateCategory);
router.patch("/:id", protect, restrictTo("admin"), categoryController.updateCategory);
router.delete("/:id", protect, restrictTo("admin"), categoryController.deleteCategory);

module.exports = router;
