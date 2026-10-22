const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlistController");
const { protect } = require("../middleware/auth");
const { requireApprovedReseller } = require("../middleware/resellerApproval");

// All wishlist routes require authenticated, approved reseller
router.use(protect, requireApprovedReseller);

router.get("/", wishlistController.getWishlist);
router.post("/add", wishlistController.addToWishlist);
router.delete("/:productId", wishlistController.removeFromWishlist);
router.post("/:productId/move-to-cart", wishlistController.moveToCart);

module.exports = router;
