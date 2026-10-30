const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, restrictTo } = require("../middleware/auth");
const { requireApprovedReseller } = require("../middleware/resellerApproval");
const validate = require("../middleware/validate");
const {
  createOrderSchema,
  updateOrderStatusSchema,
  verifyRazorpayPaymentSchema,
  verifyCashfreePaymentSchema,
} = require("../validators/orderValidator");

// Reseller placing order (must be approved and active)
router.post(
  "/",
  protect,
  requireApprovedReseller,
  validate(createOrderSchema),
  orderController.createOrder
);

// Reseller viewing their order history
router.get("/my-orders", protect, requireApprovedReseller, orderController.getMyOrders);

// Verify Razorpay payment
router.post(
  "/verify-razorpay",
  protect,
  validate(verifyRazorpayPaymentSchema),
  orderController.verifyRazorpayPayment
);

// Verify Cashfree payment
router.post(
  "/verify-cashfree",
  protect,
  validate(verifyCashfreePaymentSchema),
  orderController.verifyCashfreePayment
);

// Single order details (Reseller own or Admin)
router.get("/:id", protect, orderController.getOrderById);

// Admin-only order management
router.get("/", protect, restrictTo("admin"), orderController.getAllOrders);
router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

module.exports = router;
