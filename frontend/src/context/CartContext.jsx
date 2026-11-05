import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { settingsApi } from "../services/api";

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
  const [adminDeliveryCharge, setAdminDeliveryCharge] = useState(50);

  // Fetch configured delivery charge from platform settings
  useEffect(() => {
    let isMounted = true;
    settingsApi
      .getPublic()
      .then((res) => {
        const data = res?.data || res;
        if (isMounted && typeof data?.deliveryCharge === "number") {
          setAdminDeliveryCharge(data.deliveryCharge);
        }
      })
      .catch((err) => {
        // Fallback to default ₹50 quietly if server is initializing
        console.log("[CartContext] Settings delivery charge fetch fallback to ₹50:", err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const addToCart = (product, quantity = 1, customSellingPrice = null) => {
    if (!isAuthenticated) {
      return false;
    }
    const targetId = product.id || product._id;
    const wholesalePrice = Number(product.price ?? product.resellerPrice ?? 0);
    const initialSellingPrice =
      customSellingPrice !== null && customSellingPrice !== undefined && customSellingPrice !== ""
        ? customSellingPrice
        : "";

    setCart((prev) => {
      const existing = prev.find((item) => (item.id || item._id) === targetId);
      if (existing) {
        return prev.map((item) =>
          (item.id || item._id) === targetId
            ? {
                ...item,
                quantity: item.quantity + quantity,
                ...(customSellingPrice !== null && customSellingPrice !== undefined && customSellingPrice !== ""
                  ? { customerSellingPrice: customSellingPrice }
                  : {}),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          id: targetId,
          quantity,
          wholesalePrice,
          price: wholesalePrice,
          customerSellingPrice: initialSellingPrice,
        },
      ];
    });
    return true;
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        const itemId = String(item.id || item._id);
        const targetId = String(productId);
        return itemId === targetId ? { ...item, quantity: newQuantity } : item;
      })
    );
  };

  const updateCustomerSellingPrice = (productId, newSellingPrice) => {
    setCart((prev) =>
      prev.map((item) => {
        const itemId = String(item.id || item._id);
        const targetId = String(productId);
        if (itemId === targetId) {
          return { ...item, customerSellingPrice: newSellingPrice };
        }
        return item;
      })
    );
  };

  const commitCustomerSellingPrice = (productId) => {
    setCart((prev) =>
      prev.map((item) => {
        const itemId = String(item.id || item._id);
        const targetId = String(productId);
        if (itemId === targetId) {
          if (
            item.customerSellingPrice === "" ||
            item.customerSellingPrice === undefined ||
            item.customerSellingPrice === null
          ) {
            return { ...item, customerSellingPrice: "" };
          }
          const wholesale = Number(item.wholesalePrice ?? item.price ?? 0);
          const parsed = Number(item.customerSellingPrice);
          const finalPrice = isNaN(parsed) || parsed < wholesale ? wholesale : parsed;
          return { ...item, customerSellingPrice: finalPrice };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => String(item.id || item._id) !== String(productId)));
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
  // Wholesale cost
  const cartSubtotal = cart.reduce((total, item) => total + (Number(item.price || item.wholesalePrice || 0) * item.quantity), 0);
  const cartWholesaleSubtotal = cartSubtotal;

  const hasMissingCustomerPrices = cart.some(
    (item) => item.customerSellingPrice === "" || item.customerSellingPrice === undefined || item.customerSellingPrice === null
  );

  // Customer selling total and expected profit
  const cartCustomerSellingTotal = cart.reduce((total, item) => {
    const parsedSelling = Number(item.customerSellingPrice);
    const selling =
      item.customerSellingPrice !== "" &&
      item.customerSellingPrice !== undefined &&
      item.customerSellingPrice !== null &&
      !isNaN(parsedSelling)
        ? parsedSelling
        : 0;
    return total + (selling * item.quantity);
  }, 0);

  const cartExpectedProfit = Math.max(0, cartCustomerSellingTotal - cartWholesaleSubtotal);

  // Platform managed delivery charge for dropshipping
  const deliveryCharge = cart.length > 0 ? adminDeliveryCharge : 0;
  const shipping = deliveryCharge;

  const discountAmount = coupon.applied ? (cartSubtotal * coupon.discountPercent) / 100 : 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + (cart.length > 0 ? deliveryCharge : 0));

  // COD Specific totals
  const codPayableNow = deliveryCharge; // Reseller pays ONLY delivery charge at checkout for COD
  const codCollectionAmount = cartCustomerSellingTotal; // End customer pays the product selling amount upon delivery

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        updateCustomerSellingPrice,
        commitCustomerSellingPrice,
        removeFromCart,
        clearCart,
        coupon,
        applyCoupon,
        removeCoupon,
        cartCount,
        cartSubtotal,
        cartWholesaleSubtotal,
        cartCustomerSellingTotal,
        cartExpectedProfit,
        hasMissingCustomerPrices,
        deliveryCharge,
        shipping,
        cartTotal,
        codPayableNow,
        codCollectionAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
