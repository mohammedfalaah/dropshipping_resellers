const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { protect } = require("../middleware/auth");
const { requireApprovedReseller } = require("../middleware/resellerApproval");

// All cart routes require authenticated, approved reseller
router.use(protect, requireApprovedReseller);

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.patch("/update", cartController.updateQuantity);
router.delete("/clear", cartController.clearCart);
router.delete("/:productId", cartController.removeFromCart);

module.exports = router;
