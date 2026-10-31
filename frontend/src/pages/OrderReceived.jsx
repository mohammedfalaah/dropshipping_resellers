import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { ordersApi } from "../services/api";

export default function OrderReceived() {
  const [order, setOrder] = useState(null);
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [isPaidVerified, setIsPaidVerified] = useState(false);

  useEffect(() => {
    let orderData = null;
    try {
      const saved = localStorage.getItem("sparepro_latest_order") || localStorage.getItem("lumixa_latest_order");
      if (saved) {
        orderData = JSON.parse(saved);
        setOrder(orderData);
      }
    } catch (e) {
      console.error(e);
    }
  }, [searchParams]);

  const fallbackOrder = {
    orderId: "SP-849201",
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    total: 70.93,
    paymentMethod: "Credit Card",
    customer: {
      email: "customer@example.com",
      address: "742 Evergreen Terrace, Springfield, OR"
    },
    items: [
      { id: 1, name: "Aether Pro ANC Wireless Earbuds", price: 34.99, quantity: 2, image: "/images/product-earbuds.jpg" },
      { id: 3, name: "Aethereus Automatic Chronograph Watch", price: 68.00, quantity: 1, image: "/images/product-luxury-watch.jpg" }
    ]
  };

  const currentOrder = order || fallbackOrder;

  return (
    <>
      <Breadcrumb title="Order Received" links={[{ label: "Order Received" }]} />

      <div className="order-received-page py-5">
        <div className="container">
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: "800px" }}>
            {/* Header Success Badge */}
            <div className="text-center mb-5">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "rgba(250, 126, 170, 0.15)",
                  color: "var(--accent-color, #FA7EAA)"
                }}
              >
                <i className="fa-solid fa-check fs-1"></i>
              </div>
              <h2 className="fw-bold mb-2">Thank you! Your order is confirmed.</h2>
              <p className="text-muted">
                A confirmation email with tracking information has been dispatched to{" "}
                <strong>{currentOrder.customer?.email}</strong>.
              </p>
            </div>

            {searchParams.get("payment_id") && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 small rounded-3 mb-4">
                <i className="fa-solid fa-circle-check text-success"></i>
                <span>
                  Razorpay Online Payment Verified (ID: <code>{searchParams.get("payment_id")}</code>)
                </span>
              </div>
            )}

            {/* Key Order Details Grid */}
            <div className="bg-light p-4 rounded-4 mb-4">
              <div className="row g-3 text-center">
                <div className="col-sm-3 col-6">
                  <span className="text-muted small d-block">Order Number:</span>
                  <strong className="text-dark">{currentOrder.orderId}</strong>
                </div>
                <div className="col-sm-3 col-6">
                  <span className="text-muted small d-block">Date:</span>
                  <strong className="text-dark">{currentOrder.date}</strong>
                </div>
                <div className="col-sm-3 col-6">
                  <span className="text-muted small d-block">Total:</span>
                  <strong className="text-dark">
                    ₹{Number(currentOrder.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="col-sm-3 col-6">
                  <span className="text-muted small d-block">Payment:</span>
                  <div className="d-flex align-items-center justify-content-center gap-1">
                    <strong className="text-dark">{currentOrder.paymentMethod}</strong>
                    {isPaidVerified && (
                      <span className="badge bg-success-subtle text-success p-1" title="Verified Online">
                        <i className="fa-solid fa-check"></i>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Purchased Items List */}
            <h5 className="fw-bold mb-3">Order Summary</h5>
            <div className="border rounded-3 p-3 mb-4">
              {currentOrder.items?.map((item, idx) => (
                <div key={idx} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: "50px", height: "50px", objectFit: "contain", borderRadius: "8px" }}
                    />
                    <div>
                      <h6 className="mb-0" style={{ fontSize: "14px" }}>{item.name}</h6>
                      <span className="text-muted small">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="fw-semibold">
                    ₹{(item.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div className="d-flex justify-content-between pt-3">
                <span className="fw-bold">Total Amount</span>
                <span className="fw-bold h5 mb-0 text-dark">
                  ₹{Number(currentOrder.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="text-center">
              <Link to="/shop" className="btn btn-dark rounded-pill px-5 py-3 fw-semibold">
                Continue Shopping &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
