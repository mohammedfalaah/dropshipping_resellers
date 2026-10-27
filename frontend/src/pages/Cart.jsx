import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function Cart() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    coupon,
    applyCoupon,
    removeCoupon,
    cartSubtotal,
    discountAmount,
    shipping,
    cartTotal
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const { addToast } = useToast();
  const navigate = useNavigate();

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
                        <th scope="col" style={{ width: "80px" }}>Item</th>
                        <th scope="col">Product</th>
                        <th scope="col">Price</th>
                        <th scope="col" style={{ width: "130px" }}>Quantity</th>
                        <th scope="col">Subtotal</th>
                        <th scope="col" className="text-end">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <Link to={`/product/${item.slug || "product"}`}>
                              <img
                                src={item.image}
                                alt={item.name}
                                className="rounded-3 border"
                                style={{ width: "65px", height: "65px", objectFit: "contain" }}
                              />
                            </Link>
                          </td>
                          <td>
                            <h6 className="mb-1">
                              <Link
                                to={`/product/${item.slug || "product"}`}
                                className="text-dark text-decoration-none fw-semibold"
                              >
                                {item.name}
                              </Link>
                            </h6>
                            <span className="text-muted small">{item.category}</span>
                          </td>
                          <td>₹{Number(item.price).toLocaleString("en-IN")}</td>
                          <td>
                            <div className="d-flex align-items-center border rounded-pill px-2 py-1 bg-light" style={{ width: "105px" }}>
                              <button
                                type="button"
                                className="btn btn-sm border-0 p-0"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                <i className="fa-solid fa-minus small"></i>
                              </button>
                              <span className="fw-semibold px-2 flex-grow-1 text-center small">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm border-0 p-0"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <i className="fa-solid fa-plus small"></i>
                              </button>
                            </div>
                          </td>
                          <td className="fw-bold">
                            ₹{Number(item.price * item.quantity).toLocaleString("en-IN")}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm text-danger border-0"
                              onClick={() => {
                                removeFromCart(item.id);
                                addToast(`Removed ${item.name} from cart`, "info");
                              }}
                              title="Remove item"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
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
                <h4 className="fw-bold mb-4">Order Summary</h4>

                <div className="d-flex justify-content-between mb-3 text-muted">
                  <span>Subtotal</span>
                  <span className="fw-semibold text-dark">₹{Number(cartSubtotal).toLocaleString("en-IN")}</span>
                </div>

                {coupon.applied && (
                  <div className="d-flex justify-content-between mb-3 text-success">
                    <span>Discount ({coupon.discountPercent}%)</span>
                    <span className="fw-semibold">-₹{Number(discountAmount).toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between mb-3 text-muted">
                  <span>Estimated Shipping</span>
                  <span className="fw-semibold text-dark">
                    {shipping === 0 ? (
                      <span className="badge bg-success-subtle text-success">Free Shipping</span>
                    ) : (
                      `₹${Number(shipping).toLocaleString("en-IN")}`
                    )}
                  </span>
                </div>

                <div className="border-top pt-3 mb-4 d-flex justify-content-between align-items-center">
                  <span className="h5 fw-bold mb-0">Total</span>
                  <span className="h4 fw-bold mb-0" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                    ₹{Number(cartTotal).toLocaleString("en-IN")}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3"
                  onClick={() => navigate("/checkout")}
                >
                  Proceed to Checkout &rarr;
                </button>

                <div className="text-center small text-muted">
                  <i className="fa-solid fa-lock me-1"></i> Guaranteed safe & secure checkout
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
