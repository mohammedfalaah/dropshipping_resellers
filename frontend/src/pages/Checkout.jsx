import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ordersApi, productsApi } from "../services/api";

export default function Checkout() {
  const { cart, cartSubtotal, discountAmount, shipping, cartTotal, clearCart } = useCart();
  const { addToast } = useToast();
  const { user, isAuthenticated, approvalStatus, isApproved } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: user?.name ? user.name.split(" ")[0] : "Sarah",
    lastName: user?.name ? user.name.split(" ").slice(1).join(" ") || "Partner" : "Jenkins",
    email: user?.email || "reseller@sparepro.com",
    phone: user?.phone || "+91 98765 43210",
    address: user?.businessInfo?.address || "Warehouse 4A, Industrial Complex",
    city: user?.businessInfo?.city || "Mumbai",
    state: user?.businessInfo?.state || "Maharashtra",
    zip: user?.businessInfo?.postalCode || "400001",
    country: "India",
    notes: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [submitting, setSubmitting] = useState(false);
  const [dbProducts, setDbProducts] = useState([]);

  useEffect(() => {
    // Pre-fetch DB products to map frontend cart items to MongoDB _ids and SKUs
    productsApi.getAll({ limit: 50 })
      .then((res) => {
        if (res.data?.data?.products) {
          setDbProducts(res.data.data.products);
        }
      })
      .catch((err) => console.log("DB products fetch fallback:", err.message));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!form.firstName || !form.email || !form.address) {
      addToast("Please fill in all required billing information.", "error");
      return;
    }

    if (isAuthenticated && approvalStatus === "pending") {
      addToast("Order blocked: Reseller account is pending admin approval.", "error");
      return;
    }

    setSubmitting(true);

    try {
      // If user is authenticated as an approved reseller, place order via backend API
      if (isAuthenticated && isApproved) {
        // Map cart items to backend format with productId
        const orderItems = cart.map((item) => {
          const isHexId = (val) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);
          const directId =
            (isHexId(item._id) && item._id) ||
            (isHexId(item.id) && item.id) ||
            (isHexId(item.productId) && item.productId) ||
            null;

          const matchedDb = dbProducts.find(
            (p) =>
              (directId && String(p._id) === String(directId)) ||
              (item.sku && String(p.sku).toUpperCase() === String(item.sku).toUpperCase()) ||
              (item.name && p.name.toLowerCase() === item.name.toLowerCase())
          );

          const resolvedId = directId || matchedDb?._id || dbProducts[0]?._id;

          return {
            productId: resolvedId ? String(resolvedId) : undefined,
            product: resolvedId ? String(resolvedId) : undefined,
            sku: item.sku || matchedDb?.sku || "SKU-" + (item.id || "1"),
            name: item.name || "Product",
            quantity: Number(item.quantity) || 1,
            pricePaise: Math.round(Number(item.price || 0) * 100),
          };
        });

        // Filter and ensure every item has productId
        const sanitizedItems = orderItems.map((it) => ({
          ...it,
          productId: it.productId || dbProducts[0]?._id,
          product: it.product || dbProducts[0]?._id,
        })).filter((it) => it.productId);

        const backendPaymentMethod =
          paymentMethod === "cash_on_delivery"
            ? "COD"
            : paymentMethod === "razorpay"
            ? "RAZORPAY"
            : "BANK_TRANSFER";

        const cleanFirstName = (form.firstName || user?.name?.split(" ")[0] || "Customer").trim();
        const cleanLastName = (form.lastName || user?.name?.split(" ").slice(1).join(" ") || "Reseller").trim();
        const cleanEmail = (form.email || user?.email || "customer@example.com").trim();
        const cleanPhone = (form.phone || user?.phone || "9999999999").trim();
        const cleanAddress = (form.address || user?.businessInfo?.address || "Warehouse 4A, Industrial Complex").trim();
        const cleanCity = (form.city || user?.businessInfo?.city || "Mumbai").trim();
        const cleanState = (form.state || user?.businessInfo?.state || "Maharashtra").trim();
        const cleanZip = (form.zip || user?.businessInfo?.postalCode || "400001").trim();

        const orderPayload = {
          items: sanitizedItems.length > 0 ? sanitizedItems : orderItems,
          shippingAddress: {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            fullName: `${cleanFirstName} ${cleanLastName}`.trim(),
            email: cleanEmail,
            phone: cleanPhone,
            address: cleanAddress,
            addressLine1: cleanAddress,
            city: cleanCity,
            state: cleanState,
            postalCode: cleanZip,
            zip: cleanZip,
            country: form.country || "India",
            notes: form.notes || "",
          },
          paymentMethod: backendPaymentMethod,
          notes: form.notes || "",
        };

        const res = await ordersApi.create(orderPayload);
        const createdOrder = res.data?.data?.order;
        const orderNumber = createdOrder?.orderNumber || "SP-" + Date.now().toString().slice(-6);

        // Save order details to local storage
        localStorage.setItem(
          "sparepro_latest_order",
          JSON.stringify({
            orderId: orderNumber,
            date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            items: [...cart],
            total: cartTotal,
            subtotal: cartSubtotal,
            shipping: shipping,
            paymentMethod:
              paymentMethod === "cash_on_delivery"
                ? "Cash on Delivery (COD)"
                : paymentMethod === "razorpay"
                ? "Razorpay Online"
                : "Bank Transfer",
            customer: form,
            paymentStatus: "CONFIRMED",
          })
        );

        clearCart();
        addToast(`Order ${createdOrder?.orderNumber || ""} confirmed and booked in ledger!`, "success");
        navigate(`/order-received?order_id=${orderNumber}`);
        return;
      }

      // Guest / Fallback flow
      const guestOrderNumber = "SP-" + Math.floor(100000 + Math.random() * 900000);
      const orderData = {
        orderId: guestOrderNumber,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        items: [...cart],
        total: cartTotal,
        subtotal: cartSubtotal,
        shipping: shipping,
        paymentMethod:
          paymentMethod === "cash_on_delivery"
            ? "Cash on Delivery"
            : "Bank Transfer",
        customer: form,
      };

      localStorage.setItem("sparepro_latest_order", JSON.stringify(orderData));
      clearCart();
      addToast("Order placed successfully! Redirecting...", "success");
      navigate("/order-received");
    } catch (err) {
      console.error("Order creation error:", err);
      const serverErrors = err.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        serverErrors.forEach((e) => {
          addToast(`Required field missing: ${e.field.replace("shippingAddress.", "")}`, "error");
        });
      } else {
        const errMsg = err.response?.data?.message || err.message || "Failed to process order";
        addToast(errMsg, "error");
      }
    } finally {
      setSubmitting(false);
    }
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
          {/* Reseller Status Check */}
          {isAuthenticated && approvalStatus === "pending" && (
            <div className="alert alert-warning border-warning shadow-sm rounded-4 mb-4 p-4 d-flex align-items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation fa-2x text-warning"></i>
              <div>
                <h5 className="alert-heading fw-bold mb-1">Approval Required for Wholesale Checkout</h5>
                <p className="mb-0 small">
                  Your reseller account is currently pending verification. Orders cannot be finalized until an administrator approves your wholesale profile.
                </p>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="alert alert-info border-info-subtle shadow-sm rounded-4 mb-4 p-3 d-flex justify-content-between align-items-center">
              <div className="small">
                <i className="fa-solid fa-circle-info me-2 text-primary"></i>
                Have a wholesale reseller account? Log in for direct ledger booking & verified wholesale pricing.
              </div>
              <Link to="/login" className="btn btn-sm btn-dark rounded-pill px-3">
                Log In
              </Link>
            </div>
          )}

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
                      <label className="form-label small fw-semibold">Street Address / Warehouse Location *</label>
                      <input
                        type="text"
                        name="address"
                        className="form-control mb-2"
                        placeholder="House / Warehouse number and street"
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
                      <label className="form-label small fw-semibold">State *</label>
                      <input
                        type="text"
                        name="state"
                        className="form-control"
                        value={form.state}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-sm-3">
                      <label className="form-label small fw-semibold">PIN / Postal Code *</label>
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
                        placeholder="Notes about your order, courier instructions, etc."
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
                    {/* Cash On Delivery */}
                    <div
                      className={`form-check p-3 border rounded-3 mb-2 cursor-pointer ${
                        paymentMethod === "cash_on_delivery" ? "border-dark bg-light" : ""
                      }`}
                      style={{ transition: "all 0.2s ease" }}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        name="paymentRadio"
                        id="paymentCod"
                        checked={paymentMethod === "cash_on_delivery"}
                        onChange={() => setPaymentMethod("cash_on_delivery")}
                      />
                      <label
                        className="form-check-label fw-semibold ms-2 d-flex justify-content-between align-items-center w-100"
                        htmlFor="paymentCod"
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <div className="text-dark">Cash on Delivery (COD)</div>
                          <div className="text-muted small fw-normal">Pay upon receipt at your delivery address</div>
                        </div>
                        <span className="badge bg-secondary-subtle text-secondary">Reseller Standard</span>
                      </label>
                    </div>

                    {/* Bank Transfer */}
                    <div
                      className={`form-check p-3 border rounded-3 cursor-pointer ${
                        paymentMethod === "bank_transfer" ? "border-dark bg-light" : ""
                      }`}
                      style={{ transition: "all 0.2s ease" }}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        name="paymentRadio"
                        id="paymentBank"
                        checked={paymentMethod === "bank_transfer"}
                        onChange={() => setPaymentMethod("bank_transfer")}
                      />
                      <label
                        className="form-check-label fw-semibold ms-2 d-flex justify-content-between align-items-center w-100"
                        htmlFor="paymentBank"
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <div className="text-dark">Direct Bank Transfer (NEFT / RTGS / IMPS)</div>
                          <div className="text-muted small fw-normal">Manual remittance to current account</div>
                        </div>
                        <span className="badge bg-light text-muted border">Manual Audit</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="col-lg-5">
                <div className="bg-white p-4 rounded-4 shadow-sm border sticky-top" style={{ top: "100px" }}>
                  <h4 className="fw-bold mb-4">Your Wholesale Order</h4>

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
                            <span className="text-muted small">Qty: {item.quantity} • SKU: {item.sku || "RES-SKU"}</span>
                          </div>
                        </div>
                        <span className="fw-semibold">
                          ₹{Number(item.price * item.quantity).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between mb-2 text-muted small">
                    <span>Subtotal</span>
                    <span className="fw-semibold text-dark">₹{Number(cartSubtotal).toLocaleString("en-IN")}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="d-flex justify-content-between mb-2 text-success small">
                      <span>Wholesale Discount</span>
                      <span className="fw-semibold">-₹{Number(discountAmount).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mb-3 text-muted small">
                    <span>Shipping</span>
                    <span className="fw-semibold text-dark">
                      {shipping === 0 ? "Free Shipping" : `₹${Number(shipping).toLocaleString("en-IN")}`}
                    </span>
                  </div>

                  <div className="border-top pt-3 mb-4 d-flex justify-content-between align-items-center">
                    <span className="h5 fw-bold mb-0">Total Due</span>
                    <span className="h4 fw-bold mb-0" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                      ₹{Number(cartTotal).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || (isAuthenticated && approvalStatus === "pending")}
                    className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                  >
                    {submitting ? (
                      <span><i className="fa-solid fa-spinner fa-spin me-2"></i> Processing Order...</span>
                    ) : isAuthenticated && approvalStatus === "pending" ? (
                      "Approval Pending (Cannot Checkout)"
                    ) : (
                      `Confirm Order (₹${Number(cartTotal).toLocaleString("en-IN")})`
                    )}
                  </button>

                  <p className="text-muted small text-center mb-0">
                    <i className="fa-solid fa-shield-halved me-1 text-success"></i>
                    Atomic stock validation &amp; immutable double-entry ledger bookkeeping.
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
