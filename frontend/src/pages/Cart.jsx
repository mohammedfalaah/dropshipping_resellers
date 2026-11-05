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
          <div className="container py-5">
            <div className="bg-white p-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: "560px" }}>
              <div className="mb-4">
                <i
                  className="fa-solid fa-basket-shopping text-muted"
                  style={{ fontSize: "72px" }}
                ></i>
              </div>
              <h2 className="fw-bold mb-3">Your cart is currently empty!</h2>
              <p className="text-muted mb-4">
                Before proceeding to checkout, you must add products to your order.
                Explore our high-demand wholesale gadgets, watches, footwear, and fashion collections.
              </p>
              <Link to="/shop" className="btn-default">
                <span>Start Shopping</span>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title="Shopping Cart" links={[{ label: "Cart" }]} />

      <div className="cart-page py-5">
        <div className="container">
          <div className="row g-4">
            {/* Cart Items Table */}
            <div className="col-lg-8">
              <div className="bg-white p-4 rounded-4 shadow-sm border">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold mb-0">Your Bag ({cart.length} unique items)</h4>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger text-decoration-none"
                    onClick={clearCart}
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" style={{ width: "70px" }}>Item</th>
                        <th scope="col">Product</th>
                        <th scope="col" className="text-nowrap">Wholesale Price</th>
                        <th scope="col" style={{ minWidth: "160px" }}>Customer Selling Price</th>
                        <th scope="col" style={{ width: "115px" }}>Quantity</th>
                        <th scope="col" className="text-nowrap">Customer Total</th>
                        <th scope="col" className="text-nowrap">Expected Profit</th>
                        <th scope="col" className="text-end">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => {
                        const itemKey = item.cartItemId || item.id || item._id;
                        const itemId = itemKey;
                        const wholesale = Number(item.wholesalePrice || item.price || 0);
                        const rawSelling = item.customerSellingPrice !== undefined && item.customerSellingPrice !== null ? item.customerSellingPrice : "";
                        const hasSelling = rawSelling !== "" && !isNaN(Number(rawSelling));
                        const numericSelling = hasSelling ? Number(rawSelling) : 0;
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
                                  style={{ width: "60px", height: "60px", objectFit: "contain" }}
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
                                <span className="text-muted small">SKU: {item.variantSku || item.sku || "RES-SKU"}</span>
                                {item.selectedColor && (
                                  <span className="badge bg-light text-dark border" style={{ fontSize: "11px" }}>
                                    Color: {item.selectedColor}
                                  </span>
                                )}
                                {item.selectedSize && (
                                  <span className="badge bg-light text-dark border" style={{ fontSize: "11px" }}>
                                    Size: {item.selectedSize}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="fw-semibold text-secondary">
                              ₹{wholesale.toLocaleString("en-IN")}
                            </td>
                            <td>
                              <div className="input-group input-group-sm" style={{ maxWidth: "150px" }}>
                                <span className="input-group-text bg-light text-muted fw-bold">₹</span>
                                <input
                                  type="number"
                                  className={`form-control fw-bold ${!hasSelling ? "border-warning text-muted" : "text-dark"}`}
                                  min={wholesale}
                                  placeholder="Enter price"
                                  value={rawSelling}
                                  onChange={(e) => updateCustomerSellingPrice(itemId, e.target.value)}
                                  onBlur={() => commitCustomerSellingPrice(itemId)}
                                  title={`Enter customer price (min ₹${wholesale})`}
                                />
                              </div>
                              <span className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
                                <i className="fa-solid fa-pen-to-square me-1 text-primary"></i>Min: ₹{wholesale}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center border rounded-pill px-2 py-1 bg-light" style={{ width: "100px" }}>
                                <button
                                  type="button"
                                  className="btn btn-sm border-0 p-0"
                                  onClick={() => updateQuantity(itemId, item.quantity - 1)}
                                >
                                  <i className="fa-solid fa-minus small"></i>
                                </button>
                                <span className="fw-semibold px-2 flex-grow-1 text-center small">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-sm border-0 p-0"
                                  onClick={() => updateQuantity(itemId, item.quantity + 1)}
                                >
                                  <i className="fa-solid fa-plus small"></i>
                                </button>
                              </div>
                            </td>
                            <td className="fw-bold text-dark">
                              {hasSelling ? (
                                `₹${lineCustomerTotal.toLocaleString("en-IN")}`
                              ) : (
                                <span className="text-muted small fst-italic">Enter price</span>
                              )}
                            </td>
                            <td>
                              {hasSelling && numericSelling >= wholesale ? (
                                <>
                                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold">
                                    +₹{lineTotalProfit.toLocaleString("en-IN")}
                                  </span>
                                  <div className="text-muted" style={{ fontSize: "11px" }}>
                                    ₹{profitPerUnit}/unit
                                  </div>
                                </>
                              ) : (
                                <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-2 py-1 small">
                                  Set Price
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm text-danger border-0"
                                onClick={() => {
                                  removeFromCart(itemId);
                                  addToast(`Removed ${item.name} from cart`, "info");
                                }}
                                title="Remove item"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Coupon Code Section */}
                <div className="border-top pt-4 mt-3">
                  <div className="row align-items-center g-3">
                    <div className="col-md-7">
                      <form onSubmit={handleApplyCoupon} className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Coupon code (e.g. SPARE20)"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-dark px-4 text-nowrap">
                          Apply Code
                        </button>
                      </form>
                      {coupon.applied && (
                        <div className="mt-2 text-success small d-flex align-items-center gap-2">
                          <span>
                            <i className="fa-solid fa-tag"></i> Coupon <strong>{coupon.code}</strong> applied ({coupon.discountPercent}% off)
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
                      <Link to="/shop" className="btn btn-outline-dark rounded-pill px-4">
                        Continue Shopping
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="col-lg-4">
              <div className="bg-white p-4 rounded-4 shadow-sm border">
                <h4 className="fw-bold mb-4">Financial Summary</h4>

                <div className="d-flex justify-content-between mb-2 text-muted small">
                  <span>Wholesale product cost</span>
                  <span className="fw-semibold text-dark">₹{Number(cartWholesaleSubtotal).toLocaleString("en-IN")}</span>
                </div>

                <div className="d-flex justify-content-between mb-2 text-muted small">
                  <span>Customer selling amount</span>
                  <span className="fw-bold text-dark">₹{Number(cartCustomerSellingTotal).toLocaleString("en-IN")}</span>
                </div>

                <div className="p-3 my-3 rounded-3 bg-success-subtle border border-success-subtle">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold text-success">Expected Reseller Profit</div>
                      <small className="text-muted">Calculated upon delivery</small>
                    </div>
                    <span className="h4 fw-bold text-success mb-0">
                      ₹{Number(cartExpectedProfit).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="d-flex justify-content-between mb-3 text-muted small">
                  <span>Delivery charge</span>
                  <span className="fw-semibold text-dark">
                    ₹{Number(deliveryCharge).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="border-top pt-3 mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small text-muted">COD Amount Payable Now (Delivery):</span>
                    <strong className="text-dark">₹{Number(codPayableNow).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-muted">Customer Collect on Delivery:</span>
                    <strong className="text-primary">₹{Number(codCollectionAmount).toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3 shadow-sm"
                  onClick={handleProceedToCheckout}
                >
                  Proceed to Checkout &rarr;
                </button>

                <div className="text-center small text-muted">
                  <i className="fa-solid fa-truck-fast me-1 text-primary"></i> Dropshipping COD &amp; Instant Razorpay Supported
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
