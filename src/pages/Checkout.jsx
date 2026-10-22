import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function Checkout() {
  const { cart, cartSubtotal, discountAmount, shipping, cartTotal, clearCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "Sarah",
    lastName: "Jenkins",
    email: "sarah.jenkins@example.com",
    phone: "+1 (555) 234-5678",
    address: "742 Evergreen Terrace",
    city: "Springfield",
    state: "OR",
    zip: "97477",
    country: "United States",
    notes: ""
  });

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    number: "•••• •••• •••• 4242",
    expiry: "12/28",
    cvc: "123"
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.address) {
      addToast("Please fill in all required billing information.", "error");
      return;
    }

    const orderData = {
      orderId: "SP-" + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      items: [...cart],
      total: cartTotal,
      subtotal: cartSubtotal,
      shipping: shipping,
      paymentMethod: paymentMethod === "card" ? "Credit Card" : paymentMethod === "paypal" ? "PayPal" : "Cash on Delivery",
      customer: form
    };

    localStorage.setItem("sparepro_latest_order", JSON.stringify(orderData));
    clearCart();
    addToast("Order placed successfully! Redirecting...", "success");
    navigate("/order-received");
  };

  if (cart.length === 0) {
    return (
      <>
        <Breadcrumb title="Checkout" links={[{ label: "Checkout" }]} />
        <div className="container py-5 text-center">
          <div className="bg-white p-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: "500px" }}>
            <h4 className="fw-bold mb-3">No items to checkout</h4>
            <p className="text-muted mb-4">Please add products to your cart before proceeding to checkout.</p>
            <Link to="/shop" className="btn-default">
              <span>Return to Shop</span>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title="Checkout" links={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]} />

      <div className="checkout-page py-5">
        <div className="container">
          <form onSubmit={handlePlaceOrder}>
            <div className="row g-4">
              {/* Billing Information Form */}
              <div className="col-lg-7">
                <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border mb-4">
                  <h4 className="fw-bold mb-4">Billing & Shipping Details</h4>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        className="form-control"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        className="form-control"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        value={form.email}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        value={form.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Street Address *</label>
                      <input
                        type="text"
                        name="address"
                        className="form-control mb-2"
                        placeholder="House number and street name"
                        value={form.address}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Town / City *</label>
                      <input
                        type="text"
                        name="city"
                        className="form-control"
                        value={form.city}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-sm-3">
                      <label className="form-label small fw-semibold">State / Region</label>
                      <input
                        type="text"
                        name="state"
                        className="form-control"
                        value={form.state}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-sm-3">
                      <label className="form-label small fw-semibold">ZIP Code *</label>
                      <input
                        type="text"
                        name="zip"
                        className="form-control"
                        value={form.zip}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Order Notes (Optional)</label>
                      <textarea
                        name="notes"
                        className="form-control"
                        rows="3"
                        placeholder="Notes about your order, e.g. special delivery instructions."
                        value={form.notes}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border">
                  <h4 className="fw-bold mb-4">Payment Method</h4>

                  <div className="mb-3">
                    <div className="form-check p-3 border rounded-3 mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="paymentRadio"
                        id="paymentCard"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                      />
                      <label className="form-check-label fw-semibold ms-2 d-flex justify-content-between align-items-center w-100" htmlFor="paymentCard">
                        <span>Credit / Debit Card</span>
                        <span>
                          <i className="fa-brands fa-cc-visa text-primary fs-5 me-2"></i>
                          <i className="fa-brands fa-cc-mastercard text-warning fs-5"></i>
                        </span>
                      </label>
                    </div>

                    {paymentMethod === "card" && (
                      <div className="bg-light p-3 rounded-3 mb-3">
                        <div className="mb-2">
                          <label className="form-label small text-muted">Card Number</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={cardDetails.number}
                            onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                          />
                        </div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label small text-muted">Expiry</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={cardDetails.expiry}
                              onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small text-muted">CVC</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={cardDetails.cvc}
                              onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="form-check p-3 border rounded-3 mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="paymentRadio"
                        id="paymentPaypal"
                        checked={paymentMethod === "paypal"}
                        onChange={() => setPaymentMethod("paypal")}
                      />
                      <label className="form-check-label fw-semibold ms-2 d-flex justify-content-between align-items-center w-100" htmlFor="paymentPaypal">
                        <span>PayPal Express</span>
                        <i className="fa-brands fa-paypal text-primary fs-5"></i>
                      </label>
                    </div>

                    <div className="form-check p-3 border rounded-3">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="paymentRadio"
                        id="paymentCod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                      />
                      <label className="form-check-label fw-semibold ms-2" htmlFor="paymentCod">
                        Cash on Delivery
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="col-lg-5">
                <div className="bg-white p-4 rounded-4 shadow-sm border sticky-top" style={{ top: "100px" }}>
                  <h4 className="fw-bold mb-4">Your Order</h4>

                  <div className="mb-4" style={{ maxHeight: "260px", overflowY: "auto" }}>
                    {cart.map((item) => (
                      <div key={item.id} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: "45px", height: "45px", objectFit: "contain", borderRadius: "8px" }}
                          />
                          <div>
                            <h6 className="mb-0" style={{ fontSize: "14px" }}>{item.name}</h6>
                            <span className="text-muted small">Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <span className="fw-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between mb-2 text-muted small">
                    <span>Subtotal</span>
                    <span className="fw-semibold text-dark">${cartSubtotal.toFixed(2)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="d-flex justify-content-between mb-2 text-success small">
                      <span>Discount</span>
                      <span className="fw-semibold">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mb-3 text-muted small">
                    <span>Shipping</span>
                    <span className="fw-semibold text-dark">
                      {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="border-top pt-3 mb-4 d-flex justify-content-between align-items-center">
                    <span className="h5 fw-bold mb-0">Total</span>
                    <span className="h4 fw-bold mb-0" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3"
                  >
                    Place Order (${cartTotal.toFixed(2)})
                  </button>

                  <p className="text-muted small text-center mb-0">
                    Your personal data will be used to process your order and support your experience on this website.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
