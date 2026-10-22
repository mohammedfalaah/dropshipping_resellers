const express = require("express");
const router = express.Router();
const codController = require("../controllers/codController");
const { protect, restrictTo } = require("../middleware/auth");
const { requireApprovedReseller } = require("../middleware/resellerApproval");
const validate = require("../middleware/validate");
const {
  updateCodCollectionSchema,
  updateDeliveryStatusSchema,
} = require("../validators/codValidator");

// Reseller viewing their COD orders
router.get("/my-cod-orders", protect, requireApprovedReseller, codController.getMyCodOrders);

// Admin COD management
router.get("/", protect, restrictTo("admin"), codController.getCodList);
router.patch(
  "/:id/collect",
  protect,
  restrictTo("admin"),
  validate(updateCodCollectionSchema),
  codController.recordCollection
);
router.patch(
  "/:id/delivery-status",
  protect,
  restrictTo("admin"),
  validate(updateDeliveryStatusSchema),
  codController.updateDeliveryStatus
);

module.exports = router;
