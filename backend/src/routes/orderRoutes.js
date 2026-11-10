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
router.get("/my-orders", protect, orderController.getMyOrders);

// Verify Razorpay payment
router.post(
  "/verify-razorpay",
  protect,
  validate(verifyRazorpayPaymentSchema),
  orderController.verifyRazorpayPayment
);

// Consignment / parcel tracking
router.get("/tracking/:trackingNumber", orderController.getPublicTracking);

// Single order details (Reseller own or Admin)
router.get("/:id", protect, orderController.getOrderById);

// Order list: admin gets system orders, reseller gets own orders
router.get("/", protect, (req, res, next) => {
  if (req.user.role === "admin") {
    return orderController.getAllOrders(req, res, next);
  }
  return orderController.getMyOrders(req, res, next);
});
router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

module.exports = router;
