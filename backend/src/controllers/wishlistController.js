const Wishlist = require("../models/Wishlist");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { successResponse, errorResponse } = require("../utils/response");
const { paiseToRupees } = require("../utils/currency");

/**
 * Get Wishlist
 */
const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ reseller: req.user._id }).populate({
      path: "products",
      select: "name sku slug category mainImage resellerPricePaise regularPricePaise stockQuantity inStock isActive badge rating ratingCount",
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ reseller: req.user._id, products: [] });
    }

    const formattedProducts = (wishlist.products || [])
      .filter((p) => p && p.isActive)
      .map((p) => {
        const obj = p.toObject();
        obj.price = paiseToRupees(p.resellerPricePaise);
        obj.originalPrice = paiseToRupees(p.regularPricePaise);
        return obj;
      });

    return successResponse(res, "Wishlist retrieved.", {
      products: formattedProducts,
      count: formattedProducts.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add Product to Wishlist
 */
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ reseller: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({ reseller: req.user._id, products: [] });
    }

    if (!wishlist.products.some((id) => id.toString() === productId.toString())) {
      wishlist.products.push(productId);
      await wishlist.save();
    }

    return successResponse(res, "Product added to wishlist.", { wishlist });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove Product from Wishlist
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ reseller: req.user._id });
    if (wishlist) {
      wishlist.products = wishlist.products.filter(
        (id) => id.toString() !== productId.toString()
      );
      await wishlist.save();
    }
    return successResponse(res, "Product removed from wishlist.", { wishlist });
  } catch (err) {
    next(err);
  }
};

/**
 * Move Product from Wishlist to Cart
 */
const moveToCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return errorResponse(res, "Product not available", "PRODUCT_NOT_AVAILABLE", 404);
    }

    // 1. Add to cart
    let cart = await Cart.findOne({ reseller: req.user._id });
    if (!cart) {
      cart = new Cart({ reseller: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex((i) => i.product.toString() === productId);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += 1;
    } else {
      cart.items.push({ product: productId, quantity: 1 });
    }
    await cart.save();

    // 2. Remove from wishlist
    await Wishlist.findOneAndUpdate(
      { reseller: req.user._id },
      { $pull: { products: productId } }
    );

    return successResponse(res, `Moved ${product.name} to cart.`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
};
