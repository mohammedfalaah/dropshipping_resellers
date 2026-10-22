const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { successResponse, errorResponse } = require("../utils/response");
const { paiseToRupees } = require("../utils/currency");

/**
 * Get Cart for Authenticated Reseller
 */
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ reseller: req.user._id }).populate({
      path: "items.product",
      select: "name sku slug category mainImage resellerPricePaise regularPricePaise stockQuantity minOrderQuantity isActive",
    });

    if (!cart) {
      cart = await Cart.create({ reseller: req.user._id, items: [] });
    }

    // Filter out deleted/inactive products if any
    const validItems = [];
    let subtotalPaise = 0;

    for (const item of cart.items) {
      if (item.product && item.product.isActive) {
        const itemSubtotal = item.product.resellerPricePaise * item.quantity;
        subtotalPaise += itemSubtotal;

        validItems.push({
          id: item.product._id,
          productId: item.product._id,
          name: item.product.name,
          sku: item.product.sku,
          slug: item.product.slug,
          image: item.product.mainImage,
          category: item.product.category,
          price: paiseToRupees(item.product.resellerPricePaise),
          originalPrice: paiseToRupees(item.product.regularPricePaise),
          unitPricePaise: item.product.resellerPricePaise,
          quantity: item.quantity,
          subtotalPaise: itemSubtotal,
          subtotalRupees: paiseToRupees(itemSubtotal),
          stockQuantity: item.product.stockQuantity,
          inStock: item.product.stockQuantity >= item.quantity,
          minOrderQuantity: item.product.minOrderQuantity,
        });
      }
    }

    const shippingPaise = subtotalPaise >= 50000 || subtotalPaise === 0 ? 0 : 4900;
    const totalPaise = subtotalPaise + shippingPaise;

    return successResponse(res, "Cart retrieved.", {
      items: validItems,
      count: validItems.reduce((s, i) => s + i.quantity, 0),
      subtotalRupees: paiseToRupees(subtotalPaise),
      shippingRupees: paiseToRupees(shippingPaise),
      totalRupees: paiseToRupees(totalPaise),
      subtotalPaise,
      shippingPaise,
      totalPaise,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add Item to Cart
 */
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return errorResponse(res, "Product not available.", "PRODUCT_NOT_AVAILABLE", 404);
    }

    if (product.stockQuantity < quantity) {
      return errorResponse(
        res,
        `Cannot add ${quantity} units. Only ${product.stockQuantity} units available.`,
        "INSUFFICIENT_STOCK",
        400
      );
    }

    let cart = await Cart.findOne({ reseller: req.user._id });
    if (!cart) {
      cart = new Cart({ reseller: req.user._id, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (existingIndex > -1) {
      const newQuantity = cart.items[existingIndex].quantity + Number(quantity);
      if (product.stockQuantity < newQuantity) {
        return errorResponse(
          res,
          `Cannot increase quantity. Available stock: ${product.stockQuantity}.`,
          "INSUFFICIENT_STOCK",
          400
        );
      }
      cart.items[existingIndex].quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity: Number(quantity) });
    }

    await cart.save();
    return successResponse(res, `Added ${product.name} to cart.`, { cart });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Quantity
 */
const updateQuantity = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ reseller: req.user._id });
    if (!cart) {
      return errorResponse(res, "Cart not found.", "CART_NOT_FOUND", 404);
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.product.toString() !== productId.toString());
    } else {
      const product = await Product.findById(productId);
      if (product && product.stockQuantity < quantity) {
        return errorResponse(
          res,
          `Cannot set quantity to ${quantity}. Available: ${product.stockQuantity}`,
          "INSUFFICIENT_STOCK",
          400
        );
      }
      const itemIndex = cart.items.findIndex((i) => i.product.toString() === productId.toString());
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = quantity;
      }
    }

    await cart.save();
    return successResponse(res, "Cart quantity updated.", { cart });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove Item from Cart
 */
const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ reseller: req.user._id });
    if (cart) {
      cart.items = cart.items.filter((i) => i.product.toString() !== productId.toString());
      await cart.save();
    }
    return successResponse(res, "Item removed from cart.", { cart });
  } catch (err) {
    next(err);
  }
};

/**
 * Clear Cart
 */
const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ reseller: req.user._id }, { items: [] });
    return successResponse(res, "Cart cleared successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
};
