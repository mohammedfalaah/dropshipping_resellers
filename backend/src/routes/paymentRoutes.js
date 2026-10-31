const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect, restrictTo } = require("../middleware/auth");
const { requireApprovedReseller } = require("../middleware/resellerApproval");
const validate = require("../middleware/validate");
const {
  recordPaymentSchema,
  reversePaymentSchema,
  recordAdjustmentSchema,
} = require("../validators/paymentValidator");

// Razorpay Standard Checkout endpoints
router.post("/create-order", paymentController.createRazorpayOrder);
router.post("/verify-payment", paymentController.verifyPayment);

// Reseller viewing own payment history
router.get("/my-payments", protect, requireApprovedReseller, paymentController.getMyPayments);

// Admin financial management
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validate(recordPaymentSchema),
  paymentController.recordPayment
);

router.get(
  "/",
  protect,
  restrictTo("admin"),
  paymentController.getAllPayments
);

router.post(
  "/:id/reverse",
  protect,
  restrictTo("admin"),
  validate(reversePaymentSchema),
  paymentController.reversePayment
);

router.post(
  "/adjustment",
  protect,
  restrictTo("admin"),
  validate(recordAdjustmentSchema),
  paymentController.recordAdjustment
);

module.exports = router;
