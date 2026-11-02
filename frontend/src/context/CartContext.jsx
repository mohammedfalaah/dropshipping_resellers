import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [cart, setCart] = useState(() => {
    try {
      const savedToken = localStorage.getItem("sparepro_token");
      if (!savedToken) return [];
      const saved = localStorage.getItem("sparepro_cart") || localStorage.getItem("lumixa_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [coupon, setCoupon] = useState({ code: "", discountPercent: 0, applied: false });

  // Ensure cart is cleared if user is not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setCart([]);
      try {
        localStorage.removeItem("sparepro_cart");
        localStorage.removeItem("lumixa_cart");
      } catch (e) {
        // ignore
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      try {
        localStorage.setItem("sparepro_cart", JSON.stringify(cart));
      } catch (e) {
        console.error("Failed to save cart to localStorage", e);
      }
    }
  }, [cart, isAuthenticated]);

  const addToCart = (product, quantity = 1) => {
    if (!isAuthenticated) {
      return false;
    }
    const targetId = product.id || product._id;
    setCart((prev) => {
      const existing = prev.find((item) => (item.id || item._id) === targetId);
      if (existing) {
        return prev.map((item) =>
          (item.id || item._id) === targetId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, id: targetId, quantity }];
    });
    return true;
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const applyCoupon = (code) => {
    if (!code) return { success: false, message: "Please enter a coupon code" };
    const normalized = code.trim().toUpperCase();
    if (normalized === "SPARE20" || normalized === "SPAREPRO20" || normalized === "RESELLER20" || normalized === "LUMIXA20" || normalized === "SALE20") {
      setCoupon({ code: normalized, discountPercent: 20, applied: true });
      return { success: true, message: "Coupon applied: 20% discount!" };
    }
    if (normalized === "WELCOME10") {
      setCoupon({ code: normalized, discountPercent: 10, applied: true });
      return { success: true, message: "Coupon applied: 10% discount!" };
    }
    return { success: false, message: "Invalid coupon code. Try 'SPARE20'" };
  };

  const removeCoupon = () => {
    setCoupon({ code: "", discountPercent: 0, applied: false });
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const discountAmount = coupon.applied ? (cartSubtotal * coupon.discountPercent) / 100 : 0;
  const shipping = cartSubtotal > 50 || cartSubtotal === 0 ? 0 : 5.99;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + (cart.length > 0 ? shipping : 0));

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        coupon,
        applyCoupon,
        removeCoupon,
        cartCount,
        cartSubtotal,
        discountAmount,
        shipping,
        cartTotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
