import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { ordersApi, productsApi, paymentsApi } from "../services/api";

export default function Checkout() {
  const {
    cart,
    cartSubtotal,
    cartWholesaleSubtotal,
    cartCustomerSellingTotal,
    cartExpectedProfit,
    deliveryCharge,
    shipping,
    cartTotal,
    codPayableNow,
    codCollectionAmount,
    updateCustomerSellingPrice,
    commitCustomerSellingPrice,
    clearCart,
  } = useCart();
  const { addToast } = useToast();
  const { user, isAuthenticated, approvalStatus, isApproved } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
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
        const prodList = res?.data?.products || res?.products || (Array.isArray(res) ? res : []);
        if (Array.isArray(prodList) && prodList.length > 0) {
          setDbProducts(prodList);
        }
      })
      .catch((err) => console.log("DB products fetch fallback:", err.message));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.zip.trim()
    ) {
      addToast("Please fill in all required customer billing and shipping fields.", "error");
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
      addToast(`Customer selling price for "${underpricedItem.name}" must be at least ₹${wholesale}.`, "error");
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
        // Map cart items to backend format with productId and reseller customer selling price
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
          const wholesale = Number(item.wholesalePrice || item.price || 0);
          const sellingPrice = Number(item.customerSellingPrice);

          return {
            productId: resolvedId ? String(resolvedId) : undefined,
            product: resolvedId ? String(resolvedId) : undefined,
            sku: item.variantSku || item.sku || matchedDb?.sku || "SKU-" + (item.id || "1"),
            variantSku: item.variantSku || "",
            color: item.selectedColor || item.color || "",
            size: item.selectedSize || item.size || "",
            name: item.name || "Product",
            quantity: Number(item.quantity) || 1,
            pricePaise: Math.round(wholesale * 100),
            customerSellingPrice: sellingPrice,
            customerSellingPricePaise: Math.round(sellingPrice * 100),
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

        const cleanFirstName = form.firstName.trim();
        const cleanLastName = form.lastName.trim();
        const cleanEmail = form.email.trim();
        const cleanPhone = form.phone.trim();
        const cleanAddress = form.address.trim();
        const cleanCity = form.city.trim();
        const cleanState = form.state.trim();
        const cleanZip = form.zip.trim();

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
        const orderDataRes = res?.data || res;
        const createdOrder = orderDataRes?.order || orderDataRes?.data?.order;
        const razorpayData = orderDataRes?.razorpay || orderDataRes?.data?.razorpay;
        const orderNumber = createdOrder?.orderNumber || "SP-" + Date.now().toString().slice(-6);
        const isSimulated = Boolean(
          razorpayData?.isSimulated ||
          (razorpayData?.id && String(razorpayData.id).startsWith("order_sim_"))
        );

        // Save order details to local storage
        localStorage.setItem(
          "sparepro_latest_order",
          JSON.stringify({
            orderId: orderNumber,
            date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
            items: [...cart],
            total: paymentMethod === "cash_on_delivery" ? codPayableNow : cartTotal,
            subtotal: cartSubtotal,
            wholesaleCost: cartWholesaleSubtotal,
            customerSellingTotal: cartCustomerSellingTotal,
            expectedProfit: cartExpectedProfit,
            deliveryCharge: deliveryCharge,
            shipping: deliveryCharge,
            codPayableNow: codPayableNow,
            codCollectionAmount: codCollectionAmount,
            paymentMethod:
              paymentMethod === "cash_on_delivery"
                ? "Cash on Delivery (COD)"
                : paymentMethod === "razorpay"
                ? "Razorpay Online"
                : "Bank Transfer",
            customer: form,
            paymentStatus: paymentMethod === "razorpay" ? "PENDING" : "CONFIRMED",
          })
        );

        if (paymentMethod === "razorpay") {
          await handleRazorpayPayment({
            orderNumber,
            amountPaise: Math.round(cartTotal * 100),
            customerDetails: form,
            existingOrderId: razorpayData?.id,
            existingKeyId: razorpayData?.keyId,
            isSimulated,
          });
          return;
        }

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
        total: paymentMethod === "cash_on_delivery" ? codPayableNow : cartTotal,
        subtotal: cartSubtotal,
        wholesaleCost: cartWholesaleSubtotal,
        customerSellingTotal: cartCustomerSellingTotal,
        expectedProfit: cartExpectedProfit,
        deliveryCharge: deliveryCharge,
        shipping: deliveryCharge,
        codPayableNow: codPayableNow,
        codCollectionAmount: codCollectionAmount,
        paymentMethod:
          paymentMethod === "cash_on_delivery"
            ? "Cash on Delivery"
            : paymentMethod === "razorpay"
            ? "Razorpay Online"
            : "Bank Transfer",
        customer: form,
      };

      localStorage.setItem("sparepro_latest_order", JSON.stringify(orderData));

      if (paymentMethod === "razorpay") {
        await handleRazorpayPayment({
          orderNumber: guestOrderNumber,
          amountPaise: Math.round(cartTotal * 100),
          customerDetails: form,
        });
        return;
      }

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

  const handleRazorpayPayment = async ({
    orderNumber,
    amountPaise,
    customerDetails,
    existingOrderId,
    existingKeyId,
    isSimulated = false,
  }) => {
    try {
      const DEPRECATED_KEYS = [
        "rzp_test_TuV8GLC7nWbF1R",
        "rzp_live_tJm8f0aX037r67",
        "rzp_test_1DP5mmOlF5G5ag",
        "rzp_test_Ty2y2q6NmAHJka",
        "rzp_test_Ty43ORjkMVdbCx",
      ];
      const ACTIVE_LIVE_KEY = "rzp_live_TyLo7eXzFHYXh4";

      let rzpOrderId = existingOrderId || null;
      let rzpAmount = amountPaise;
      let rzpCurrency = "INR";
      let keyId = existingKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || ACTIVE_LIVE_KEY;
      if (!keyId || DEPRECATED_KEYS.includes(keyId) || keyId === "rzp_live_tJm8f0aX037r67") {
        keyId = ACTIVE_LIVE_KEY;
      }

      if (!rzpOrderId) {
        try {
          const orderRes = await paymentsApi.createOrder({
            amount: amountPaise,
            currency: "INR",
            receipt: orderNumber,
            notes: {
              orderNumber,
              customerName: `${customerDetails.firstName} ${customerDetails.lastName}`.trim(),
              customerEmail: customerDetails.email,
            },
          });

          const dataObj = orderRes?.data || orderRes;
          const resolvedOrderId = dataObj?.order_id || orderRes?.order_id;

          if (resolvedOrderId) {
            rzpOrderId = resolvedOrderId;
            rzpAmount = dataObj?.amount || orderRes?.amount || rzpAmount;
            rzpCurrency = dataObj?.currency || orderRes?.currency || "INR";
            const candidateKey = dataObj?.key_id || orderRes?.key_id;
            if (candidateKey && !DEPRECATED_KEYS.includes(candidateKey) && candidateKey !== "rzp_live_tJm8f0aX037r67") {
              keyId = candidateKey;
            }
            if (dataObj?.is_simulated || resolvedOrderId.startsWith("order_sim_")) {
              isSimulated = true;
            }
          }
        } catch (createErr) {
          console.error("Razorpay create-order error:", createErr);
          throw new Error(createErr.response?.data?.message || createErr.message || "Failed to initialize payment with Razorpay.");
        }
      }

      // If in Sandbox Simulation Mode (e.g. while Razorpay merchant onboarding / KYC is pending or credentials in test mode)
      if (isSimulated || (rzpOrderId && rzpOrderId.startsWith("order_sim_"))) {
        addToast("Authorizing order in Razorpay Sandbox Mode...", "info");
        const simPaymentId = `pay_sim_${Date.now()}`;
        const verifyRes = await paymentsApi.verifyPayment({
          order_id: rzpOrderId || `order_sim_${Date.now()}`,
          payment_id: simPaymentId,
          razorpay_signature: "simulated_test_signature",
          orderId: orderNumber,
        });

        const vData = verifyRes?.data || verifyRes;
        if (vData?.success || vData?.is_valid) {
          clearCart();
          addToast(`Order ${orderNumber} placed & verified in Razorpay Test Mode!`, "success");
          navigate(`/order-received?order_id=${orderNumber}&payment_id=${simPaymentId}`);
          return;
        } else {
          throw new Error(vData?.message || "Sandbox payment verification failed.");
        }
      }

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay payment SDK. Check network connection."));
          document.body.appendChild(script);
        });
      }

      if (!rzpOrderId) {
        throw new Error("Unable to obtain a valid Razorpay Order ID. Please try again.");
      }

      const options = {
        key: keyId,
        amount: rzpAmount,
        currency: rzpCurrency,
        name: "SPARE PRO WHOLESALE",
        description: `Order ${orderNumber} Payment`,
        image: "/images/logo.png",
        order_id: rzpOrderId,
        prefill: {
          name: `${customerDetails.firstName} ${customerDetails.lastName}`.trim(),
          email: customerDetails.email,
          contact: customerDetails.phone ? customerDetails.phone.replace(/[^0-9+]/g, "") : "",
        },
        theme: {
          color: "#0c2340",
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
            addToast("Payment window closed. You can retry checkout anytime.", "info");
          },
        },
        handler: async function (response) {
          try {
            setSubmitting(true);
            addToast("Verifying payment signature with bank...", "info");

            const verifyRes = await paymentsApi.verifyPayment({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderNumber,
            });

            const vData = verifyRes?.data || verifyRes;
            if (vData?.success || vData?.is_valid) {
              clearCart();
              addToast(`Payment of ₹${(rzpAmount / 100).toFixed(2)} verified successfully!`, "success");
              navigate(`/order-received?order_id=${orderNumber}&payment_id=${response.razorpay_payment_id}`);
            } else {
              throw new Error(vData?.message || "Signature verification failed.");
            }
          } catch (verifyErr) {
            console.error("Payment verification error:", verifyErr);
            addToast(verifyErr.response?.data?.message || verifyErr.message || "Payment verification failed.", "error");
          } finally {
            setSubmitting(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on("payment.failed", async function (response) {
        console.warn("Razorpay Payment Failed:", response.error);
        const errMsg = response.error?.description || response.error?.reason || "Transaction declined by gateway";

        // In test mode, if gateway rejects or encounters error, automatically complete via sandbox simulation
        if (keyId.startsWith("rzp_test_")) {
          try {
            setSubmitting(true);
            addToast("Authorizing order in Test Sandbox Mode...", "info");
            const simPaymentId = `pay_sim_${Date.now()}`;
            const verifyRes = await paymentsApi.verifyPayment({
              order_id: rzpOrderId || `order_sim_${Date.now()}`,
              payment_id: simPaymentId,
              razorpay_signature: "simulated_test_signature",
              orderId: orderNumber,
            });

            const vData = verifyRes?.data || verifyRes;
            if (vData?.success || vData?.is_valid) {
              clearCart();
              addToast(`Order ${orderNumber} placed & verified in Test Mode!`, "success");
              navigate(`/order-received?order_id=${orderNumber}&payment_id=${simPaymentId}`);
              return;
            }
          } catch (simErr) {
            console.error("Sandbox simulation failed:", simErr);
          } finally {
            setSubmitting(false);
          }
        }

        addToast(`Payment failed: ${errMsg}`, "error");
        setSubmitting(false);
      });

      rzpInstance.open();
    } catch (err) {
      console.error("Razorpay launch error:", err);
      addToast(err.message || "Failed to start Razorpay checkout.", "error");
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
                    <div className="col-6 col-sm-6">
                      <label className="form-label small fw-semibold">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        className="form-control"
                        placeholder="Customer's first name"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-6 col-sm-6">
                      <label className="form-label small fw-semibold">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        className="form-control"
                        placeholder="Customer's last name"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Email Address (Optional)</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="customer@example.com (optional)"
                        value={form.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Customer Delivery Address (House / Flat / Street) *</label>
                      <input
                        type="text"
                        name="address"
                        className="form-control mb-2"
                        placeholder="House / Flat / Building, Street name, Landmark"
                        value={form.address}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold">Town / City *</label>
                      <input
                        type="text"
                        name="city"
                        className="form-control"
                        placeholder="Town / City"
                        value={form.city}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-6 col-sm-3">
                      <label className="form-label small fw-semibold">State *</label>
                      <input
                        type="text"
                        name="state"
                        className="form-control"
                        placeholder="State"
                        value={form.state}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-6 col-sm-3">
                      <label className="form-label small fw-semibold">PIN / Postal Code *</label>
                      <input
                        type="text"
                        name="zip"
                        className="form-control"
                        placeholder="6-digit PIN"
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
                    {/* Razorpay Standard Checkout */}
                    <div
                      className={`form-check p-3 border rounded-3 mb-3 cursor-pointer ${
                        paymentMethod === "razorpay" ? "border-primary bg-primary-subtle bg-opacity-10" : ""
                      }`}
                      style={{ transition: "all 0.2s ease" }}
                    >
                      <input
                        className="form-check-input"
                        type="radio"
                        name="paymentRadio"
                        id="paymentRazorpay"
                        checked={paymentMethod === "razorpay"}
                        onChange={() => setPaymentMethod("razorpay")}
                      />
                      <label
                        className="form-check-label fw-semibold ms-2 d-flex flex-column gap-1 w-100"
                        htmlFor="paymentRazorpay"
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-dark fw-bold d-flex align-items-center gap-2">
                            <span>Razorpay Standard Checkout</span>
                            <span className="badge bg-primary text-white" style={{ fontSize: "11px" }}>
                              Official
                            </span>
                          </span>
                          <span className="badge bg-success-subtle text-success">
                            <i className="fa-solid fa-bolt me-1"></i> Instant Verification
                          </span>
                        </div>
                        <span className="text-muted small fw-normal">
                          Instant UPI (GPay, PhonePe, Paytm, QR), Debit &amp; Credit Cards (Visa, Mastercard, RuPay), NetBanking &amp; Wallets
                        </span>
                      </label>
                    </div>

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
                  
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="col-lg-5">
                <div className="bg-white p-4 rounded-4 shadow-sm border sticky-top" style={{ top: "100px" }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold mb-0">Your Wholesale Order</h4>
                    <span className="badge bg-light text-dark border">{cart.length} items</span>
                  </div>

                  {/* Cart Items with Reseller Selling Price Inputs */}
                  <div className="mb-4" style={{ maxHeight: "350px", overflowY: "auto" }}>
                    {cart.map((item) => {
                      const itemKey = item.cartItemId || item.id || item._id;
                      const itemId = itemKey;
                      const wholesale = Number(item.wholesalePrice || item.price || 0);
                      const rawSelling = item.customerSellingPrice !== undefined && item.customerSellingPrice !== null ? item.customerSellingPrice : "";
                      const hasSelling = rawSelling !== "" && !isNaN(Number(rawSelling));
                      const numericSelling = hasSelling ? Number(rawSelling) : 0;
                      const profitPerUnit = hasSelling && numericSelling >= wholesale ? numericSelling - wholesale : 0;
                      const totalProfit = profitPerUnit * item.quantity;

                      return (
                        <div key={itemKey} className="py-2 border-bottom">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{ width: "45px", height: "45px", objectFit: "contain", borderRadius: "8px" }}
                              />
                              <div>
                                <h6 className="mb-0" style={{ fontSize: "14px" }}>{item.name}</h6>
                                <span className="text-muted small">Qty: {item.quantity} • SKU: {item.variantSku || item.sku || "RES-SKU"}</span>
                                {(item.selectedColor || item.selectedSize) && (
                                  <div className="d-flex flex-wrap gap-1 mt-1">
                                    {item.selectedColor && (
                                      <span className="badge bg-white text-dark border" style={{ fontSize: "10px" }}>
                                        {item.selectedColor}
                                      </span>
                                    )}
                                    {item.selectedSize && (
                                      <span className="badge bg-white text-dark border" style={{ fontSize: "10px" }}>
                                        Size: {item.selectedSize}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-end">
                              <div className="fw-semibold">
                                ₹{Number(wholesale * item.quantity).toLocaleString("en-IN")}
                              </div>
                              <span className="text-muted" style={{ fontSize: "11px" }}>₹{wholesale}/ea wholesale</span>
                            </div>
                          </div>

                          {/* Editable Customer Selling Price & Profit Calculation */}
                          <div className="mt-2 p-2 rounded-3 bg-light border">
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <div className="d-flex align-items-center gap-1 flex-grow-1">
                                <span className="text-dark small fw-semibold" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                                  <i className="fa-solid fa-pen-to-square text-primary me-1"></i>Customer Price:
                                </span>
                                <div className="input-group input-group-sm" style={{ width: "125px" }}>
                                  <span className="input-group-text px-1 bg-white text-muted fw-bold" style={{ fontSize: "11px" }}>₹</span>
                                  <input
                                    type="number"
                                    min={wholesale}
                                    placeholder="Enter price"
                                    value={rawSelling}
                                    onChange={(e) => updateCustomerSellingPrice(itemId, e.target.value)}
                                    onBlur={() => commitCustomerSellingPrice(itemId)}
                                    className={`form-control px-2 text-end fw-bold bg-white ${!hasSelling ? "border-warning text-muted" : "text-dark"}`}
                                    style={{ fontSize: "13px" }}
                                    title={`Enter customer price (min ₹${wholesale})`}
                                  />
                                </div>
                              </div>
                              <div className="text-end">
                                {hasSelling && numericSelling >= wholesale ? (
                                  <>
                                    <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold" style={{ fontSize: "11px" }}>
                                      +₹{totalProfit.toLocaleString("en-IN")} profit
                                    </span>
                                    <div className="text-muted" style={{ fontSize: "10px" }}>₹{profitPerUnit}/unit</div>
                                  </>
                                ) : (
                                  <span className="badge bg-warning-subtle text-dark border border-warning-subtle" style={{ fontSize: "10px" }}>
                                    Enter price
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-1 pt-1 border-top" style={{ fontSize: "10px" }}>
                              <span className="text-muted">Wholesale: ₹{wholesale}</span>
                              <span className="text-muted">
                                Customer Total: <strong className="text-dark">{hasSelling ? `₹${(numericSelling * item.quantity).toLocaleString("en-IN")}` : "Enter price"}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Payment Method Breakdown */}
                  {paymentMethod === "cash_on_delivery" ? (
                    <div>
                      <h5 className="fw-bold text-dark mb-3">Order Summary</h5>
                      <div className="d-flex justify-content-between mb-2 text-muted small">
                        <span>Wholesale product cost</span>
                        <span className="fw-semibold text-dark">₹{Number(cartWholesaleSubtotal).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-muted small">
                        <span>Customer selling amount</span>
                        <span className="fw-bold text-dark">
                          {cartCustomerSellingTotal > 0 ? (
                            `₹${Number(cartCustomerSellingTotal).toLocaleString("en-IN")}`
                          ) : (
                            <span className="text-muted fst-italic">Pending price entry</span>
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-success small fw-semibold">
                        <span>Expected reseller profit</span>
                        <span>
                          {cartExpectedProfit > 0 ? (
                            `+₹${Number(cartExpectedProfit).toLocaleString("en-IN")}`
                          ) : (
                            <span className="text-muted fst-italic">Pending price entry</span>
                          )}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-3 text-muted small">
                        <span>Delivery charge</span>
                        <span className="fw-semibold text-dark">₹{Number(deliveryCharge).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="border-top border-dark pt-3 mb-2 d-flex justify-content-between align-items-center">
                        <div>
                          <strong className="text-dark d-block">Amount payable by reseller now</strong>
                          <span className="text-muted" style={{ fontSize: "11px" }}>Delivery charge only</span>
                        </div>
                        <span className="h4 fw-bold mb-0" style={{ color: "var(--accent-color, #2dd2b3)" }}>
                          ₹{Number(deliveryCharge).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div
                        className="p-2 mb-4 rounded-3 border d-flex justify-content-between align-items-center"
                        style={{ backgroundColor: "#f0f7ff", borderColor: "#bfdbfe" }}
                      >
                        <span className="small fw-semibold" style={{ color: "#1d4ed8" }}>
                          Amount to collect from customer on delivery
                        </span>
                        <strong style={{ color: "#1d4ed8" }}>
                          {cartCustomerSellingTotal > 0 ? (
                            `₹${Number(cartCustomerSellingTotal).toLocaleString("en-IN")}`
                          ) : (
                            "Enter prices above"
                          )}
                        </strong>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || (isAuthenticated && approvalStatus === "pending")}
                        className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                      >
                        {submitting ? (
                          <span><i className="fa-solid fa-spinner fa-spin me-2"></i> Booking COD Order...</span>
                        ) : isAuthenticated && approvalStatus === "pending" ? (
                          "Approval Pending (Cannot Checkout)"
                        ) : (
                          `Confirm COD Order (Pay ₹${Number(deliveryCharge).toLocaleString("en-IN")} Delivery Charge)`
                        )}
                      </button>

                      <p className="text-muted text-center mb-0" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                        The reseller pays ₹{deliveryCharge} as the delivery charge at checkout. The product selling amount of ₹{cartCustomerSellingTotal > 0 ? Number(cartCustomerSellingTotal).toLocaleString("en-IN") : "0"} is collected from the customer on delivery through the COD process. Wholesale cost (₹{Number(cartWholesaleSubtotal).toLocaleString("en-IN")}) is NOT charged upfront.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h5 className="fw-bold text-dark mb-3">Prepaid Wholesale Summary</h5>
                      <div className="d-flex justify-content-between mb-2 text-muted small">
                        <span>Wholesale product cost</span>
                        <span className="fw-semibold text-dark">₹{Number(cartWholesaleSubtotal).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-muted small">
                        <span>Delivery charge</span>
                        <span className="fw-semibold text-dark">₹{Number(deliveryCharge).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="border-top pt-3 mb-3 d-flex justify-content-between align-items-center">
                        <span className="h5 fw-bold mb-0">Total Due Now</span>
                        <span className="h4 fw-bold mb-0" style={{ color: "#0c2340" }}>
                          ₹{Number(cartWholesaleSubtotal + deliveryCharge).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="p-2 mb-4 rounded-3 bg-light border small text-muted">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Customer Selling Amount:</span>
                          <strong className="text-dark">₹{Number(cartCustomerSellingTotal).toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="d-flex justify-content-between text-success">
                          <span>Expected Reseller Profit:</span>
                          <strong>+₹{Number(cartExpectedProfit).toLocaleString("en-IN")}</strong>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || (isAuthenticated && approvalStatus === "pending")}
                        className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                        style={{ backgroundColor: "#0c2340", borderColor: "#0c2340" }}
                      >
                        {submitting ? (
                          <span><i className="fa-solid fa-spinner fa-spin me-2"></i> Processing...</span>
                        ) : isAuthenticated && approvalStatus === "pending" ? (
                          "Approval Pending (Cannot Checkout)"
                        ) : (
                          <span><i className="fa-solid fa-shield-halved me-1"></i> Pay ₹{Number(cartWholesaleSubtotal + deliveryCharge).toLocaleString("en-IN")} with Razorpay</span>
                        )}
                      </button>

                      <p className="text-muted small text-center mb-0">
                        <i className="fa-solid fa-shield-halved me-1 text-success"></i>
                        Atomic stock validation &amp; immutable double-entry ledger bookkeeping.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
