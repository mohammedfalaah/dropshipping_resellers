import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { settingsApi } from "../services/api";

const CartContext = createContext();

// COD charge calculation helper:
// Formula: Total COD Charge = Fixed COD Fee + (COD Amount * Commission Rate)
// Default Fixed COD Fee = ₹50, Default Commission Rate = 1.60% on full COD Amount (no threshold)
export const calculateCodCharge = (codAmount, fixedFee = 50, commissionRate = 1.6) => {
  const numericAmount = Number(codAmount) || 0;
  const numericFixed = typeof fixedFee === "number" && !isNaN(fixedFee) ? fixedFee : 50;
  const numericRate = typeof commissionRate === "number" && !isNaN(commissionRate) ? commissionRate : 1.6;

  const rawCommission = numericAmount * (numericRate / 100);
  const commission = Number(rawCommission.toFixed(2));
  const totalCodCharge = Number((numericFixed + commission).toFixed(2));

  return {
    codAmount: numericAmount,
    fixedFee: numericFixed,
    commissionRate: numericRate,
    commission,
    totalCodCharge,
  };
};

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
  const [adminFastDeliveryCharge, setAdminFastDeliveryCharge] = useState(100);
  const [adminCodFixedFee, setAdminCodFixedFee] = useState(50);
  const [adminCodCommissionRate, setAdminCodCommissionRate] = useState(1.6);

  // Fetch configured delivery charges and COD settings from platform settings
  useEffect(() => {
    let isMounted = true;
    settingsApi
      .getPublic()
      .then((res) => {
        const data = res?.data || res;
        if (isMounted) {
          if (typeof data?.deliveryCharge === "number") {
            setAdminDeliveryCharge(data.deliveryCharge);
          }
          if (typeof data?.fastDeliveryCharge === "number") {
            setAdminFastDeliveryCharge(data.fastDeliveryCharge);
          }
          if (typeof data?.codFixedFee === "number") {
            setAdminCodFixedFee(data.codFixedFee);
          }
          if (typeof data?.codCommissionRate === "number") {
            setAdminCodCommissionRate(data.codCommissionRate);
          }
        }
      })
      .catch((err) => {
        // Fallback to default ₹50 and ₹100 quietly if server is initializing
        console.log("[CartContext] Settings delivery charge fetch fallback:", err.message);
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

  const addToCart = (product, quantity = 1, customSellingPrice = null, selectedColor = "", selectedSize = "", selectedImage = "") => {
    if (!isAuthenticated) {
      return false;
    }
    const targetId = product.id || product._id;
    const wholesalePrice = Number(product.price ?? product.resellerPrice ?? 0);
    const initialSellingPrice =
      customSellingPrice !== null && customSellingPrice !== undefined && customSellingPrice !== ""
        ? customSellingPrice
        : "";

    const colorKey = selectedColor ? String(selectedColor).trim() : "";
    const sizeKey = selectedSize ? String(selectedSize).trim() : "";

    // Look for matching variant in product.variants if present
    const matchedVariant = Array.isArray(product.variants)
      ? product.variants.find(
          (v) =>
            (!colorKey || (v.color && v.color.toLowerCase() === colorKey.toLowerCase())) &&
            (!sizeKey || (v.size && v.size.toLowerCase() === sizeKey.toLowerCase()))
        ) ||
        product.variants.find(
          (v) => colorKey && v.color && v.color.toLowerCase() === colorKey.toLowerCase()
        )
      : null;

    const resolvedColor = colorKey || matchedVariant?.color || (Array.isArray(product.colors) && product.colors[0]) || "";
    const resolvedSize = sizeKey || matchedVariant?.size || (Array.isArray(product.sizes) && product.sizes[0]) || "";
    const finalVariant = matchedVariant || (Array.isArray(product.variants) ? product.variants.find(v => resolvedColor && v.color && v.color.toLowerCase() === resolvedColor.toLowerCase()) : null);
    const variantSku = finalVariant?.sku || matchedVariant?.sku || product.sku || "";
    const itemImage = selectedImage || finalVariant?.image || matchedVariant?.image || product.image || product.mainImage || "/images/product-earbuds.jpg";
    const cartItemId = `${targetId}_${resolvedColor || "default"}_${resolvedSize || "default"}`;

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          (item.cartItemId && item.cartItemId === cartItemId) ||
          ((item.id || item._id) === targetId &&
            (item.selectedColor || item.color || "") === resolvedColor &&
            (item.selectedSize || item.size || "") === resolvedSize)
      );

      if (existing) {
        return prev.map((item) => {
          const isMatch =
            (item.cartItemId && item.cartItemId === cartItemId) ||
            ((item.id || item._id) === targetId &&
              (item.selectedColor || item.color || "") === resolvedColor &&
              (item.selectedSize || item.size || "") === resolvedSize);
          return isMatch
            ? {
                ...item,
                quantity: item.quantity + quantity,
                ...(customSellingPrice !== null && customSellingPrice !== undefined && customSellingPrice !== ""
                  ? { customerSellingPrice: customSellingPrice }
                  : {}),
              }
            : item;
        });
      }

      return [
        ...prev,
        {
          ...product,
          id: targetId,
          cartItemId,
          quantity,
          wholesalePrice,
          price: wholesalePrice,
          customerSellingPrice: initialSellingPrice,
          selectedColor: resolvedColor,
          selectedSize: resolvedSize,
          color: resolvedColor,
          size: resolvedSize,
          sku: variantSku || product.sku,
          variantSku: variantSku || product.sku,
          image: itemImage,
        },
      ];
    });
    return true;
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    const targetStr = String(itemId);
    setCart((prev) =>
      prev.map((item) => {
        const itemIdentifier = String(item.cartItemId || item.id || item._id);
        return itemIdentifier === targetStr ? { ...item, quantity: newQuantity } : item;
      })
    );
  };

  const updateCustomerSellingPrice = (itemId, newSellingPrice) => {
    const targetStr = String(itemId);
    setCart((prev) =>
      prev.map((item) => {
        const itemIdentifier = String(item.cartItemId || item.id || item._id);
        if (itemIdentifier === targetStr) {
          return { ...item, customerSellingPrice: newSellingPrice };
        }
        return item;
      })
    );
  };

  const commitCustomerSellingPrice = (itemId) => {
    const targetStr = String(itemId);
    setCart((prev) =>
      prev.map((item) => {
        const itemIdentifier = String(item.cartItemId || item.id || item._id);
        if (itemIdentifier === targetStr) {
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

  const removeFromCart = (itemId) => {
    const targetStr = String(itemId);
    setCart((prev) =>
      prev.filter((item) => String(item.cartItemId || item.id || item._id) !== targetStr)
    );
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

  // Platform managed delivery charges for dropshipping
  const standardDeliveryCharge = cart.length > 0 ? adminDeliveryCharge : 0;
  const fastDeliveryCharge = cart.length > 0 ? adminFastDeliveryCharge : 0;
  const deliveryCharge = standardDeliveryCharge;
  const shipping = deliveryCharge;

  const discountAmount = coupon.applied ? (cartSubtotal * coupon.discountPercent) / 100 : 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + (cart.length > 0 ? deliveryCharge : 0));

  // COD Specific totals & charge calculation
  const codAmount = cartCustomerSellingTotal > 0 ? cartCustomerSellingTotal : cartWholesaleSubtotal;
  const codCalculation = calculateCodCharge(codAmount, adminCodFixedFee, adminCodCommissionRate);
  const codPayableNow = codCalculation.totalCodCharge; // Reseller pays entire COD charge (Fixed ₹50 + 1.60% Commission) upfront via Razorpay
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
        standardDeliveryCharge,
        fastDeliveryCharge,
        adminDeliveryCharge,
        adminFastDeliveryCharge,
        adminCodFixedFee,
        adminCodCommissionRate,
        shipping,
        cartTotal,
        codPayableNow,
        codCollectionAmount,
        codAmount,
        codOrderValue: codAmount,
        codCalculation,
        codFixedFee: codCalculation.fixedFee,
        codFixedCharge: codCalculation.fixedFee,
        codCommissionRate: codCalculation.commissionRate,
        codCommission: codCalculation.commission,
        codTotalCharge: codCalculation.totalCodCharge,
        calculateCodCharge,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
