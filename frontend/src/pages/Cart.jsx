import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const {
    cart,
    updateQuantity,
    updateCustomerSellingPrice,
    commitCustomerSellingPrice,
    removeFromCart,
    clearCart,
    coupon,
    applyCoupon,
    removeCoupon,
    cartSubtotal,
    cartWholesaleSubtotal,
    cartCustomerSellingTotal,
    cartExpectedProfit,
    deliveryCharge,
    shipping,
    cartTotal,
    codPayableNow,
    codCollectionAmount,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Validate prices to give proactive feedback
  const missingPriceCount = cart.filter(
    (item) => item.customerSellingPrice === "" || item.customerSellingPrice === undefined || item.customerSellingPrice === null
  ).length;

  const underpricedCount = cart.filter((item) => {
    const wholesale = Number(item.wholesalePrice || item.price || 0);
    const selling = Number(item.customerSellingPrice);
    return (
      item.customerSellingPrice !== "" &&
      item.customerSellingPrice !== undefined &&
      item.customerSellingPrice !== null &&
      !isNaN(selling) &&
      selling < wholesale
    );
  }).length;

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      addToast("Please log in as a reseller to checkout.", "info");
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
      return;
    }

    const emptyPriceItem = cart.find(
      (item) => item.customerSellingPrice === "" || item.customerSellingPrice === undefined || item.customerSellingPrice === null
    );
    if (emptyPriceItem) {
      addToast(`Please enter your customer selling price for "${emptyPriceItem.name}".`, "error");
      return;
    }

    const underpricedItem = cart.find((item) => {
      const wholesale = Number(item.wholesalePrice || item.price || 0);
      return Number(item.customerSellingPrice) < wholesale;
    });
    if (underpricedItem) {
      const wholesale = Number(underpricedItem.wholesalePrice || underpricedItem.price || 0);
      addToast(`Selling price for "${underpricedItem.name}" cannot be less than wholesale ₹${wholesale}.`, "error");
      return;
    }

    navigate("/checkout");
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      addToast("Please enter a valid coupon code.", "warning");
      return;
    }
    const res = applyCoupon(couponInput);
    if (res.success) {
      addToast(res.message, "success");
      setCouponInput("");
    } else {
      addToast(res.message, "error");
    }
  };

  if (cart.length === 0) {
    return (
      <>
        <Breadcrumb title="Shopping Cart" links={[{ label: "Cart" }]} />
        <div className="empty-cart-page py-5 text-center">
          <div className="container py-4 py-md-5">
            <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: "580px" }}>
              <div className="mb-4">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{ width: "90px", height: "90px", backgroundColor: "#f3f4f6" }}
                >
                  <i className="fa-solid fa-basket-shopping text-muted fs-1"></i>
                </div>
              </div>
              <h3 className="fw-bold mb-2 text-dark">Your reseller bag is empty</h3>
              <p className="text-muted mb-4 small" style={{ lineHeight: "1.6" }}>
                You haven't added any products to your order yet. Explore our high-demand wholesale catalog of gadgets, watches, footwear, and fashion to start selling and earning profit.
              </p>
              <Link to="/shop" className="btn btn-dark rounded-pill px-4 py-2 fw-semibold mb-4 shadow-sm">
                <i className="fa-solid fa-bag-shopping me-2"></i> Browse Wholesale Shop
              </Link>

              {/* Quick Categories Pills */}
              <div className="pt-3 border-top">
                <span className="text-muted small d-block mb-2">Explore Popular Wholesale Categories:</span>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  {["Gadgets", "Watches", "Footwear", "Fashion", "Sunglasses"].map((cat) => (
                    <Link
                      key={cat}
                      to="/shop"
                      className="badge bg-light text-dark border px-3 py-2 text-decoration-none rounded-pill"
                      style={{ fontSize: "12px", transition: "all 0.2s ease" }}
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title="Shopping Cart" links={[{ label: "Cart" }]} />

      <div className="cart-page py-4 py-md-5">
        <div className="container">
          {/* Dropshipping Stepper Header */}
          <div className="bg-white rounded-4 border shadow-sm p-3 p-md-4 mb-4">
            <div className="row g-2 align-items-center text-center">
              <div className="col-4">
                <div className="d-flex align-items-center justify-content-center gap-2 text-dark fw-bold">
                  <span
                    className="badge bg-dark text-white rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{ width: "26px", height: "26px", fontSize: "11px" }}
                  >
                    1
                  </span>
                  <span className="d-none d-sm-inline" style={{ fontSize: "13px" }}>Cart &amp; Profit Pricing</span>
                  <span className="d-inline d-sm-none" style={{ fontSize: "12px" }}>Cart</span>
                </div>
              </div>
              <div className="col-4">
                <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
                  <span
                    className="badge bg-light text-muted border rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{ width: "26px", height: "26px", fontSize: "11px" }}
                  >
                    2
                  </span>
                  <span className="d-none d-sm-inline" style={{ fontSize: "13px" }}>COD / Prepaid Checkout</span>
                  <span className="d-inline d-sm-none" style={{ fontSize: "12px" }}>Checkout</span>
                </div>
              </div>
              <div className="col-4">
                <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
                  <span
                    className="badge bg-light text-muted border rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{ width: "26px", height: "26px", fontSize: "11px" }}
                  >
                    3
                  </span>
                  <span className="d-none d-sm-inline" style={{ fontSize: "13px" }}>Delivery &amp; Settlement</span>
                  <span className="d-inline d-sm-none" style={{ fontSize: "12px" }}>Settlement</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Status Guidance Banner */}
          {missingPriceCount > 0 ? (
            <div className="alert alert-warning border-warning shadow-sm rounded-4 mb-4 p-3 d-flex align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-warning fs-5"></i>
                <span className="small text-dark">
                  <strong>Pricing Required:</strong> Please specify the customer selling price for{" "}
                  <strong>{missingPriceCount} item{missingPriceCount > 1 ? "s" : ""}</strong> to calculate your profit and unlock checkout.
                </span>
              </div>
              <span className="badge bg-warning text-dark px-3 py-1 rounded-pill small d-none d-md-inline">
                Price Entry Required
              </span>
            </div>
          ) : underpricedCount > 0 ? (
            <div className="alert alert-danger border-danger shadow-sm rounded-4 mb-4 p-3 d-flex align-items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-danger fs-5"></i>
              <span className="small">
                <strong>Price Alert:</strong> Customer selling price cannot be lower than the wholesale cost. Please adjust highlighted items.
              </span>
            </div>
          ) : (
            <div
              className="alert border shadow-sm rounded-4 mb-4 p-3 d-flex align-items-center justify-content-between gap-3"
              style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="fa-solid fa-circle-check text-success fs-5"></i>
                <span className="small text-dark">
                  <strong>Ready to Order:</strong> All products are priced. You will earn an expected profit of{" "}
                  <strong className="text-success">+₹{Number(cartExpectedProfit).toLocaleString("en-IN")}</strong> on this order!
                </span>
              </div>
              <span className="badge bg-success text-white px-3 py-1 rounded-pill small d-none d-md-inline">
                All Items Priced
              </span>
            </div>
          )}

          <div className="row g-4">
            {/* Left Column: Cart Items (Mobile Cards & Desktop Table) */}
            <div className="col-lg-8">
              <div className="bg-white p-3 p-md-4 rounded-4 shadow-sm border">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">Your Wholesale Bag</h5>
                    <span className="text-muted small" style={{ fontSize: "12px" }}>
                      {cart.length} unique item{cart.length > 1 ? "s" : ""} in cart
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                    style={{ fontSize: "12px" }}
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all items from your bag?")) {
                        clearCart();
                        addToast("Cart cleared", "info");
                      }
                    }}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    <span>Clear Bag</span>
                  </button>
                </div>

                {/* ========================================================
                    1. MOBILE-FRIENDLY CARD VIEW (< 768px)
                    ======================================================== */}
                <div className="d-block d-md-none">
                  {cart.map((item) => {
                    const itemKey = item.cartItemId || item.id || item._id;
                    const itemId = itemKey;
                    const wholesale = Number(item.wholesalePrice || item.price || 0);
                    const rawSelling =
                      item.customerSellingPrice !== undefined && item.customerSellingPrice !== null
                        ? item.customerSellingPrice
                        : "";
                    const hasSelling = rawSelling !== "" && !isNaN(Number(rawSelling));
                    const numericSelling = hasSelling ? Number(rawSelling) : 0;
                    const isUnderpriced = hasSelling && numericSelling < wholesale;
                    const profitPerUnit = hasSelling && numericSelling >= wholesale ? numericSelling - wholesale : 0;
                    const lineCustomerTotal = hasSelling ? numericSelling * item.quantity : 0;
                    const lineTotalProfit = profitPerUnit * item.quantity;

                    return (
                      <div
                        key={itemKey}
                        className="cart-mobile-card card rounded-4 p-3 mb-3 bg-white shadow-sm"
                      >
                        {/* Top Product Row */}
                        <div className="d-flex gap-3 align-items-start mb-3">
                          <Link to={`/product/${item.slug || "product"}`} className="flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="rounded-3 border"
                              style={{ width: "70px", height: "70px", objectFit: "contain", backgroundColor: "#f9fafb" }}
                            />
                          </Link>
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex justify-content-between align-items-start gap-1">
                              <h6 className="fw-bold mb-1 text-truncate" style={{ fontSize: "14px", maxWidth: "180px" }}>
                                <Link to={`/product/${item.slug || "product"}`} className="text-dark text-decoration-none">
                                  {item.name}
                                </Link>
                              </h6>
                              <button
                                type="button"
                                className="btn btn-sm text-danger p-0 border-0"
                                onClick={() => {
                                  removeFromCart(itemId);
                                  addToast(`Removed ${item.name} from cart`, "info");
                                }}
                                title="Remove item"
                                style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#fee2e2" }}
                              >
                                <i className="fa-solid fa-trash-can" style={{ fontSize: "11px" }}></i>
                              </button>
                            </div>

                            {/* Variant Tags */}
                            <div className="d-flex flex-wrap align-items-center gap-1 mb-2">
                              <span className="badge bg-light text-muted border" style={{ fontSize: "10px" }}>
                                SKU: {item.variantSku || item.sku || "RES-SKU"}
                              </span>
                              {item.selectedColor && (
                                <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>
                                  {item.selectedColor}
                                </span>
                              )}
                              {item.selectedSize && (
                                <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>
                                  Size: {item.selectedSize}
                                </span>
                              )}
                            </div>

                            {/* Wholesale Price & Quantity Row */}
                            <div className="d-flex align-items-center justify-content-between">
                              <div>
                                <span className="text-muted d-block" style={{ fontSize: "10px" }}>Wholesale Cost:</span>
                                <strong className="text-dark" style={{ fontSize: "14px" }}>
                                  ₹{wholesale.toLocaleString("en-IN")}
                                </strong>
                              </div>

                              {/* Touch-Friendly Quantity Stepper */}
                              <div className="d-flex align-items-center border rounded-pill bg-light p-1">
                                <button
                                  type="button"
                                  className="cart-qty-btn border-0 shadow-sm"
                                  onClick={() => updateQuantity(itemId, item.quantity - 1)}
                                  aria-label="Decrease quantity"
                                >
                                  <i className="fa-solid fa-minus" style={{ fontSize: "10px" }}></i>
                                </button>
                                <span className="fw-bold px-3 text-center small text-dark" style={{ minWidth: "28px" }}>
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="cart-qty-btn border-0 shadow-sm"
                                  onClick={() => updateQuantity(itemId, item.quantity + 1)}
                                  aria-label="Increase quantity"
                                >
                                  <i className="fa-solid fa-plus" style={{ fontSize: "10px" }}></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Customer Selling Price & Profit Calculation Box */}
                        <div
                          className="p-3 rounded-3 border"
                          style={{
                            backgroundColor: isUnderpriced ? "#fef2f2" : hasSelling ? "#f0fdf4" : "#fffbeb",
                            borderColor: isUnderpriced ? "#fecaca" : hasSelling ? "#bbf7d0" : "#fef08a",
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="small fw-bold mb-0 d-flex align-items-center gap-1" style={{ fontSize: "12px", color: "#1f2937" }}>
                              <i className="fa-solid fa-pen-to-square text-primary"></i>
                              <span>Customer Selling Price:</span>
                            </label>
                            {hasSelling && !isUnderpriced ? (
                              <span className="badge bg-success text-white px-2 py-1 rounded-pill fw-semibold" style={{ fontSize: "11px" }}>
                                +₹{lineTotalProfit.toLocaleString("en-IN")} Profit
                              </span>
                            ) : isUnderpriced ? (
                              <span className="badge bg-danger text-white px-2 py-1 rounded-pill fw-semibold" style={{ fontSize: "10px" }}>
                                Below Wholesale
                              </span>
                            ) : (
                              <span className="badge bg-warning text-dark px-2 py-1 rounded-pill fw-semibold" style={{ fontSize: "10px" }}>
                                Enter Price
                              </span>
                            )}
                          </div>

                          <div className="input-group input-group-sm mb-2">
                            <span className="input-group-text bg-white fw-bold text-muted" style={{ fontSize: "13px" }}>₹</span>
                            <input
                              type="number"
                              className={`form-control fw-bold bg-white ${
                                isUnderpriced
                                  ? "border-danger text-danger"
                                  : !hasSelling
                                  ? "border-warning text-muted"
                                  : "border-success text-dark"
                              }`}
                              style={{ fontSize: "14px", height: "38px" }}
                              min={wholesale}
                              placeholder={`Min ₹${wholesale}`}
                              value={rawSelling}
                              onChange={(e) => updateCustomerSellingPrice(itemId, e.target.value)}
                              onBlur={() => commitCustomerSellingPrice(itemId)}
                            />
                          </div>

                          <div
                            className="d-flex justify-content-between align-items-center pt-2 border-top"
                            style={{ fontSize: "11px", borderColor: "rgba(0,0,0,0.06)" }}
                          >
                            <span className="text-muted">
                              Unit Profit:{" "}
                              <strong className={profitPerUnit > 0 ? "text-success" : "text-muted"}>
                                {profitPerUnit > 0 ? `+₹${profitPerUnit}` : "₹0"}
                              </strong>
                            </span>
                            <span className="text-muted">
                              Customer Total:{" "}
                              <strong className="text-dark">
                                {hasSelling ? `₹${lineCustomerTotal.toLocaleString("en-IN")}` : "Pending entry"}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ========================================================
                    2. DESKTOP STREAMLINED TABLE VIEW (>= 768px)
                    ======================================================== */}
                <div className="d-none d-md-block table-responsive">
                  <table className="cart-table table align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: "70px" }}>Item</th>
                        <th scope="col">Product Details</th>
                        <th scope="col" className="text-nowrap">Wholesale</th>
                        <th scope="col" style={{ minWidth: "165px" }}>Customer Selling Price</th>
                        <th scope="col" style={{ width: "120px" }}>Quantity</th>
                        <th scope="col" className="text-nowrap">Customer Total</th>
                        <th scope="col" className="text-nowrap">Expected Profit</th>
                        <th scope="col" className="text-end" style={{ width: "50px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => {
                        const itemKey = item.cartItemId || item.id || item._id;
                        const itemId = itemKey;
                        const wholesale = Number(item.wholesalePrice || item.price || 0);
                        const rawSelling =
                          item.customerSellingPrice !== undefined && item.customerSellingPrice !== null
                            ? item.customerSellingPrice
                            : "";
                        const hasSelling = rawSelling !== "" && !isNaN(Number(rawSelling));
                        const numericSelling = hasSelling ? Number(rawSelling) : 0;
                        const isUnderpriced = hasSelling && numericSelling < wholesale;
                        const profitPerUnit = hasSelling && numericSelling >= wholesale ? numericSelling - wholesale : 0;
                        const lineCustomerTotal = hasSelling ? numericSelling * item.quantity : 0;
                        const lineTotalProfit = profitPerUnit * item.quantity;

                        return (
                          <tr key={itemKey}>
                            <td>
                              <Link to={`/product/${item.slug || "product"}`}>
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="rounded-3 border"
                                  style={{ width: "56px", height: "56px", objectFit: "contain", backgroundColor: "#f9fafb" }}
                                />
                              </Link>
                            </td>
                            <td>
                              <h6 className="mb-1" style={{ fontSize: "14px" }}>
                                <Link
                                  to={`/product/${item.slug || "product"}`}
                                  className="text-dark text-decoration-none fw-semibold"
                                >
                                  {item.name}
                                </Link>
                              </h6>
                              <div className="d-flex flex-wrap align-items-center gap-1">
                                <span className="badge bg-light text-muted border" style={{ fontSize: "10px" }}>
                                  SKU: {item.variantSku || item.sku || "RES-SKU"}
                                </span>
                                {item.selectedColor && (
                                  <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>
                                    {item.selectedColor}
                                  </span>
                                )}
                                {item.selectedSize && (
                                  <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>
                                    Size: {item.selectedSize}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="fw-semibold text-dark">
                              ₹{wholesale.toLocaleString("en-IN")}
                            </td>
                            <td>
                              <div className="input-group input-group-sm" style={{ maxWidth: "155px" }}>
                                <span className="input-group-text bg-white text-muted fw-bold">₹</span>
                                <input
                                  type="number"
                                  className={`form-control fw-bold bg-white ${
                                    isUnderpriced
                                      ? "border-danger text-danger"
                                      : !hasSelling
                                      ? "border-warning text-muted"
                                      : "border-success text-dark"
                                  }`}
                                  min={wholesale}
                                  placeholder={`Min ₹${wholesale}`}
                                  value={rawSelling}
                                  onChange={(e) => updateCustomerSellingPrice(itemId, e.target.value)}
                                  onBlur={() => commitCustomerSellingPrice(itemId)}
                                  title={`Enter customer price (min ₹${wholesale})`}
                                />
                              </div>
                              <span className="text-muted d-block mt-1" style={{ fontSize: "10px" }}>
                                <i className="fa-solid fa-pen-to-square me-1 text-primary"></i>Wholesale: ₹{wholesale}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center border rounded-pill px-2 py-1 bg-light" style={{ width: "96px" }}>
                                <button
                                  type="button"
                                  className="btn btn-sm border-0 p-0 text-muted"
                                  onClick={() => updateQuantity(itemId, item.quantity - 1)}
                                  aria-label="Decrease quantity"
                                >
                                  <i className="fa-solid fa-minus" style={{ fontSize: "10px" }}></i>
                                </button>
                                <span className="fw-bold px-2 flex-grow-1 text-center small text-dark">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-sm border-0 p-0 text-muted"
                                  onClick={() => updateQuantity(itemId, item.quantity + 1)}
                                  aria-label="Increase quantity"
                                >
                                  <i className="fa-solid fa-plus" style={{ fontSize: "10px" }}></i>
                                </button>
                              </div>
                            </td>
                            <td className="fw-bold text-dark">
                              {hasSelling ? (
                                `₹${lineCustomerTotal.toLocaleString("en-IN")}`
                              ) : (
                                <span className="text-muted small fst-italic">Pending price</span>
                              )}
                            </td>
                            <td>
                              {hasSelling && !isUnderpriced ? (
                                <>
                                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold">
                                    +₹{lineTotalProfit.toLocaleString("en-IN")}
                                  </span>
                                  <div className="text-muted mt-1" style={{ fontSize: "10px" }}>
                                    ₹{profitPerUnit}/unit
                                  </div>
                                </>
                              ) : isUnderpriced ? (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 small">
                                  Below Wholesale
                                </span>
                              ) : (
                                <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-2 py-1 small">
                                  Set Price
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm text-danger border-0 p-1"
                                onClick={() => {
                                  removeFromCart(itemId);
                                  addToast(`Removed ${item.name} from cart`, "info");
                                }}
                                title="Remove item"
                                style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#fee2e2" }}
                              >
                                <i className="fa-solid fa-trash-can" style={{ fontSize: "12px" }}></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Coupon Code & Actions Section */}
                <div className="border-top pt-4 mt-3">
                  <div className="row align-items-center g-3">
                    <div className="col-md-7">
                      <form onSubmit={handleApplyCoupon} className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control rounded-pill px-3"
                          placeholder="Coupon code (e.g. SPARE20)"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-dark rounded-pill px-4 text-nowrap fw-semibold">
                          Apply Code
                        </button>
                      </form>
                      {coupon.applied && (
                        <div className="mt-2 text-success small d-flex align-items-center gap-2">
                          <span>
                            <i className="fa-solid fa-tag me-1"></i> Coupon <strong>{coupon.code}</strong> applied ({coupon.discountPercent}% off wholesale)
                          </span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger p-0"
                            onClick={removeCoupon}
                          >
                            (Remove)
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="col-md-5 text-md-end">
                      <Link to="/shop" className="btn btn-outline-dark rounded-pill px-4 fw-semibold w-100 w-md-auto">
                        <i className="fa-solid fa-arrow-left me-1"></i> Continue Shopping
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Financial Summary Sidebar */}
            <div className="col-lg-4">
              <div className="bg-white p-4 rounded-4 shadow-sm border sticky-top" style={{ top: "110px" }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0 text-dark">Financial Summary</h5>
                  <span className="badge bg-light text-dark border rounded-pill">{cart.length} items</span>
                </div>

                <div className="py-2 border-bottom">
                  <div className="d-flex justify-content-between mb-2 text-muted small">
                    <span>Wholesale Product Cost</span>
                    <span className="fw-semibold text-dark">₹{Number(cartWholesaleSubtotal).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 text-muted small">
                    <span>Customer Selling Amount</span>
                    <span className="fw-bold text-dark">
                      {cartCustomerSellingTotal > 0 ? (
                        `₹${Number(cartCustomerSellingTotal).toLocaleString("en-IN")}`
                      ) : (
                        <span className="text-muted fst-italic">Pending price entry</span>
                      )}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted small">
                    <span>Delivery Charge</span>
                    <span className="fw-semibold text-dark">
                      ₹{Number(deliveryCharge).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Highlighted Profit Card */}
                <div
                  className="p-3 my-3 rounded-3 border"
                  style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold text-success d-flex align-items-center gap-1">
                        <i className="fa-solid fa-arrow-trend-up"></i>
                        <span>Expected Reseller Profit</span>
                      </div>
                      <small className="text-muted" style={{ fontSize: "11px" }}>Settled upon customer delivery</small>
                    </div>
                    <span className="h4 fw-bold text-success mb-0">
                      {cartExpectedProfit > 0 ? `+₹${Number(cartExpectedProfit).toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                </div>

                {/* COD vs Prepaid Highlights */}
                <div className="p-3 mb-4 rounded-3 border bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <strong className="text-dark d-block small">COD Payable Now</strong>
                      <span className="text-muted" style={{ fontSize: "11px" }}>Delivery charge only</span>
                    </div>
                    <span className="h5 fw-bold mb-0" style={{ color: "var(--accent-color, #2dd2b3)" }}>
                      ₹{Number(codPayableNow).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top" style={{ borderColor: "#e5e7eb" }}>
                    <div>
                      <span className="small text-primary fw-semibold d-block">Collect from Customer</span>
                      <span className="text-muted" style={{ fontSize: "11px" }}>On physical delivery</span>
                    </div>
                    <strong className="text-primary">
                      {codCollectionAmount > 0 ? `₹${Number(codCollectionAmount).toLocaleString("en-IN")}` : "Pending prices"}
                    </strong>
                  </div>
                </div>

                {/* Checkout CTA Button */}
                <button
                  type="button"
                  className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                  onClick={handleProceedToCheckout}
                  disabled={missingPriceCount > 0 || underpricedCount > 0}
                  style={{
                    opacity: missingPriceCount > 0 || underpricedCount > 0 ? 0.75 : 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>Proceed to Checkout</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </button>

                {missingPriceCount > 0 && (
                  <div className="text-center text-warning small mb-3">
                    <i className="fa-solid fa-circle-info me-1"></i>
                    Enter customer price for all items to proceed
                  </div>
                )}

                {/* Trust & Guarantee Badges */}
                <div className="d-flex flex-column gap-2 pt-2 border-top text-muted" style={{ fontSize: "12px" }}>
                  <div className="d-flex align-items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-success"></i>
                    <span>Atomic stock validation upon order booking</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <i className="fa-solid fa-truck-fast text-primary"></i>
                    <span>Dropshipping COD &amp; Instant Razorpay supported</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <i className="fa-solid fa-wallet text-secondary"></i>
                    <span>Automated double-entry ledger profit settlement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. MOBILE STICKY BOTTOM BAR (Floating checkout on mobile)
          ======================================================== */}
      <div
        className="cart-bottom-bar d-block d-lg-none fixed-bottom px-3 py-2"
        style={{ zIndex: 1040, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div>
            <div className="text-muted" style={{ fontSize: "10px", lineHeight: "1.2" }}>
              Reseller Profit
            </div>
            <div className="fw-bold text-success" style={{ fontSize: "15px", lineHeight: "1.2" }}>
              {cartExpectedProfit > 0 ? `+₹${Number(cartExpectedProfit).toLocaleString("en-IN")}` : "₹0"}
            </div>
            <div className="text-muted" style={{ fontSize: "10px" }}>
              COD Pay Now: <strong>₹{Number(codPayableNow).toLocaleString("en-IN")}</strong>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-dark rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 flex-grow-1 justify-content-center shadow"
            style={{ height: "46px" }}
            onClick={handleProceedToCheckout}
            disabled={missingPriceCount > 0 || underpricedCount > 0}
          >
            <span>Proceed to Checkout</span>
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </>
  );
}
