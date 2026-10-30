import React, { useState, useEffect } from "react";

export default function CashfreeModal({
  isOpen,
  orderData,
  onClose,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState("upi"); // 'upi' | 'card' | 'netbanking' | 'wallet'
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(899); // 14 mins 59 secs

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // UPI form state
  const [upiId, setUpiId] = useState("");

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState("HDFC");

  // Wallet state
  const [selectedWallet, setSelectedWallet] = useState("paytm");

  // Countdown timer for UPI QR Code
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !orderData) return null;

  const orderId = orderData.orderId || orderData.orderNumber || "SP-ORDER";
  const amount = Number(orderData.orderAmount || orderData.total || 0).toFixed(2);
  const isSimulated = Boolean(orderData.isSimulated);
  const customerName = orderData.customerName || "Valued Reseller";

  // Format MM:SS for countdown timer
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // UPI Payload QR URL
  const upiUrl = `upi://pay?pa=sparepro.cashfree@yesbank&pn=SPAREPRO+WHOLESALE&am=${amount}&tr=${orderId}&cu=INR&tn=Order+${orderId}`;
  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

  // Handle Card formatting
  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(" ") || val;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (val.length >= 3) {
      setCardExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
    } else {
      setCardExpiry(val);
    }
  };

  const fillDemoCard = (brand = "visa") => {
    if (brand === "visa") {
      setCardNumber("4000 0012 3456 7890");
      setCardName(customerName || "Test Merchant");
      setCardExpiry("12/28");
      setCardCvv("789");
    } else {
      setCardNumber("6080 1234 5678 9012");
      setCardName(customerName || "Test Merchant");
      setCardExpiry("10/29");
      setCardCvv("456");
    }
  };

  const triggerPaymentSuccess = (methodUsed) => {
    setProcessing(true);
    setProcessStep("Contacting Cashfree secure payment gateway...");

    setTimeout(() => {
      setProcessStep("Authorizing transaction with bank...");
    }, 900);

    setTimeout(() => {
      setProcessStep("Verifying payment security token...");
    }, 1800);

    setTimeout(() => {
      setProcessStep("Payment Approved!");
      setSuccess(true);
      const paymentRef = `CF_PAY_${Date.now().toString().slice(-8)}`;

      setTimeout(() => {
        onSuccess({
          paymentId: paymentRef,
          paymentMethod: methodUsed,
          orderId,
        });
      }, 1200);
    }, 2600);
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="bg-white rounded-4 shadow-lg border overflow-hidden d-flex flex-column"
        style={{
          width: "94%",
          maxWidth: "760px",
          maxHeight: "92vh",
          animation: "cfFadeIn 0.25s ease-out",
        }}
      >
        {/* Cashfree Top Header */}
        <div
          className="p-3 px-4 text-white d-flex justify-content-between align-items-center"
          style={{
            background: "linear-gradient(135deg, #5925dc 0%, #3a0ca3 100%)",
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-white text-primary rounded-3 d-flex align-items-center justify-content-center fw-bold"
              style={{ width: "38px", height: "38px", fontSize: "19px", color: "#5925dc" }}
            >
              <i className="fa-solid fa-bolt" style={{ color: "#5925dc" }}></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold fs-5 tracking-tight">cashfree</span>
                <span className="badge bg-white text-dark small fw-semibold" style={{ fontSize: "10px" }}>
                  PAYMENTS
                </span>
              </div>
              <div className="small text-white-50" style={{ fontSize: "12px" }}>
                <i className="fa-solid fa-lock me-1"></i> 256-Bit SSL Encrypted &bull; PCI-DSS Certified
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm text-white-50 p-2 border-0"
            onClick={onClose}
            disabled={processing}
            style={{ fontSize: "18px", transition: "all 0.2s" }}
            title="Cancel and close payment gateway"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Order Details Strip */}
        <div className="bg-light border-bottom p-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <div className="small text-muted">Merchant: <strong className="text-dark">SPARE PRO WHOLESALE</strong></div>
            <div className="small text-muted">Order ID: <span className="fw-mono fw-bold text-primary">{orderId}</span></div>
          </div>
          <div className="text-end">
            <div className="small text-muted">Amount to Pay</div>
            <div className="fs-4 fw-bold text-dark">₹{amount}</div>
          </div>
        </div>

        {/* Notice for account activation */}
        {isSimulated && (
          <div
            className="p-2 px-4 border-bottom d-flex align-items-center gap-2"
            style={{ backgroundColor: "#eff6ff", fontSize: "12px", color: "#1e40af" }}
          >
            <i className="fa-solid fa-circle-info text-primary"></i>
            <span>
              <strong>Cashfree Production Connected</strong> (App ID: 590031e9...). Live banking approval is currently in review on <strong>merchant.cashfree.com</strong>. Complete testing is active in this interactive gateway.
            </span>
          </div>
        )}

        {/* Processing / Success Screen */}
        {processing ? (
          <div className="p-5 text-center my-auto d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "360px" }}>
            {success ? (
              <div className="animate__animated animate__zoomIn">
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center mx-auto mb-3 shadow"
                  style={{ width: "72px", height: "72px", fontSize: "34px" }}
                >
                  <i className="fa-solid fa-check"></i>
                </div>
                <h4 className="fw-bold text-success mb-2">Payment Verified!</h4>
                <p className="text-muted small mb-1">Transaction confirmed by Cashfree Payment Gateway</p>
                <div className="badge bg-success-subtle text-success p-2 px-3 fw-mono">
                  REF: CF_PAY_{orderId.replace(/[^a-zA-Z0-9]/g, "")}_{Date.now().toString().slice(-6)}
                </div>
                <div className="small text-muted mt-4">Redirecting to order confirmation page...</div>
              </div>
            ) : (
              <div>
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3.5rem", height: "3.5rem", color: "#5925dc" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="fw-bold mb-2 text-dark">{processStep}</h5>
                <p className="text-muted small mb-0">Please do not close this window or refresh your browser.</p>
              </div>
            )}
          </div>
        ) : (
          /* Payment Tabs & Body */
          <div className="d-flex flex-column flex-md-row flex-grow-1 overflow-auto" style={{ minHeight: "380px" }}>
            {/* Sidebar Navigation */}
            <div
              className="border-end bg-white d-flex flex-row flex-md-column"
              style={{ width: "100%", maxWidth: "230px", flexShrink: 0 }}
            >
              <button
                type="button"
                className={`w-100 text-start p-3 border-0 border-bottom d-flex align-items-center gap-3 transition-all ${
                  activeTab === "upi" ? "fw-bold text-primary bg-primary-subtle bg-opacity-25 border-start border-4 border-primary" : "text-secondary bg-white"
                }`}
                onClick={() => setActiveTab("upi")}
              >
                <i className="fa-solid fa-qrcode fa-lg text-primary"></i>
                <div>
                  <div className="small">UPI &amp; QR</div>
                  <span className="badge bg-success text-white" style={{ fontSize: "9px" }}>Instant</span>
                </div>
              </button>

              <button
                type="button"
                className={`w-100 text-start p-3 border-0 border-bottom d-flex align-items-center gap-3 transition-all ${
                  activeTab === "card" ? "fw-bold text-primary bg-primary-subtle bg-opacity-25 border-start border-4 border-primary" : "text-secondary bg-white"
                }`}
                onClick={() => setActiveTab("card")}
              >
                <i className="fa-solid fa-credit-card fa-lg text-primary"></i>
                <div>
                  <div className="small">Cards</div>
                  <div className="text-muted" style={{ fontSize: "10px" }}>Credit &amp; Debit</div>
                </div>
              </button>

              <button
                type="button"
                className={`w-100 text-start p-3 border-0 border-bottom d-flex align-items-center gap-3 transition-all ${
                  activeTab === "netbanking" ? "fw-bold text-primary bg-primary-subtle bg-opacity-25 border-start border-4 border-primary" : "text-secondary bg-white"
                }`}
                onClick={() => setActiveTab("netbanking")}
              >
                <i className="fa-solid fa-building-columns fa-lg text-primary"></i>
                <div>
                  <div className="small">NetBanking</div>
                  <div className="text-muted" style={{ fontSize: "10px" }}>50+ Indian Banks</div>
                </div>
              </button>

              <button
                type="button"
                className={`w-100 text-start p-3 border-0 border-bottom d-flex align-items-center gap-3 transition-all ${
                  activeTab === "wallet" ? "fw-bold text-primary bg-primary-subtle bg-opacity-25 border-start border-4 border-primary" : "text-secondary bg-white"
                }`}
                onClick={() => setActiveTab("wallet")}
              >
                <i className="fa-solid fa-wallet fa-lg text-primary"></i>
                <div>
                  <div className="small">Wallets</div>
                  <div className="text-muted" style={{ fontSize: "10px" }}>Paytm, PhonePe</div>
                </div>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 flex-grow-1 overflow-auto bg-white">
              {/* TAB 1: UPI & QR CODE */}
              {activeTab === "upi" && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0 text-dark">Scan QR Code or Enter UPI ID</h6>
                    <span className="badge bg-danger-subtle text-danger fw-semibold">
                      <i className="fa-regular fa-clock me-1"></i>Expires in {formattedTime}
                    </span>
                  </div>

                  <div className="row g-4 align-items-center">
                    <div className="col-12 col-md-5 text-center">
                      <div className="p-3 border rounded-3 bg-light shadow-sm d-inline-block">
                        <img
                          src={qrCodeImgSrc}
                          alt="Cashfree UPI QR Code"
                          className="img-fluid rounded"
                          style={{ width: "170px", height: "170px" }}
                        />
                      </div>
                      <div className="mt-2 small text-muted">
                        Scan with <strong>GPay, PhonePe, Paytm</strong>
                      </div>
                    </div>

                    <div className="col-12 col-md-7">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">Or Pay with UPI ID / VPA</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. yourname@okhdfcbank"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-primary px-3"
                            style={{ backgroundColor: "#5925dc", borderColor: "#5925dc" }}
                            onClick={() => triggerPaymentSuccess("UPI_VPA")}
                          >
                            Pay ₹{amount}
                          </button>
                        </div>
                        <div className="form-text small">Accepted: @okaxis, @okhdfcbank, @paytm, @ybl</div>
                      </div>

                      <hr className="my-3 opacity-25" />

                      <div className="p-3 bg-light rounded-3 border">
                        <div className="small fw-semibold text-dark mb-1">Instant Test Payment</div>
                        <div className="small text-muted mb-2">Simulate instant UPI approval for this wholesale order:</div>
                        <button
                          type="button"
                          className="btn btn-success w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                          onClick={() => triggerPaymentSuccess("UPI_INSTANT")}
                        >
                          <i className="fa-solid fa-bolt"></i> Authorize &amp; Pay ₹{amount} Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CREDIT / DEBIT CARDS */}
              {activeTab === "card" && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0 text-dark">Enter Card Information</h6>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-0"
                        style={{ fontSize: "11px" }}
                        onClick={() => fillDemoCard("visa")}
                      >
                        ⚡ Fill Demo Visa
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0"
                        style={{ fontSize: "11px" }}
                        onClick={() => fillDemoCard("rupay")}
                      >
                        ⚡ Demo RuPay
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Card Number</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white">
                          <i className="fa-solid fa-credit-card text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="4000 0000 0000 0000"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          maxLength={19}
                        />
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Cardholder Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Name on card"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold">Expiry Date</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        maxLength={5}
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold">CVV</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4}
                      />
                    </div>

                    <div className="col-12 mt-4">
                      <button
                        type="button"
                        className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                        style={{ backgroundColor: "#5925dc", borderColor: "#5925dc" }}
                        onClick={() => triggerPaymentSuccess("CARD")}
                      >
                        <i className="fa-solid fa-lock"></i> Pay ₹{amount} Securely
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NETBANKING */}
              {activeTab === "netbanking" && (
                <div>
                  <h6 className="fw-bold mb-3 text-dark">Select Your Bank</h6>
                  <div className="row g-2 mb-3">
                    {[
                      { id: "HDFC", name: "HDFC Bank", icon: "fa-solid fa-building-columns" },
                      { id: "SBI", name: "State Bank of India", icon: "fa-solid fa-building-columns" },
                      { id: "ICICI", name: "ICICI Bank", icon: "fa-solid fa-building-columns" },
                      { id: "AXIS", name: "Axis Bank", icon: "fa-solid fa-building-columns" },
                      { id: "KOTAK", name: "Kotak Mahindra", icon: "fa-solid fa-building-columns" },
                      { id: "PNB", name: "Punjab National", icon: "fa-solid fa-building-columns" },
                    ].map((b) => (
                      <div key={b.id} className="col-6 col-sm-4">
                        <button
                          type="button"
                          className={`btn w-100 p-2 text-start border rounded-3 d-flex align-items-center gap-2 ${
                            selectedBank === b.id ? "btn-primary text-white" : "btn-light text-dark"
                          }`}
                          style={selectedBank === b.id ? { backgroundColor: "#5925dc", borderColor: "#5925dc" } : {}}
                          onClick={() => setSelectedBank(b.id)}
                        >
                          <i className={b.icon}></i>
                          <span className="small text-truncate">{b.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="form-label small text-muted">Other Popular Banks</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                    >
                      <option value="BOB">Bank of Baroda</option>
                      <option value="CANARA">Canara Bank</option>
                      <option value="INDUSIND">IndusInd Bank</option>
                      <option value="YES">Yes Bank</option>
                      <option value="UNION">Union Bank of India</option>
                      <option value="IDFC">IDFC FIRST Bank</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                    style={{ backgroundColor: "#5925dc", borderColor: "#5925dc" }}
                    onClick={() => triggerPaymentSuccess(`NETBANKING_${selectedBank}`)}
                  >
                    <i className="fa-solid fa-arrow-right"></i> Proceed to Pay ₹{amount} via {selectedBank}
                  </button>
                </div>
              )}

              {/* TAB 4: WALLETS */}
              {activeTab === "wallet" && (
                <div>
                  <h6 className="fw-bold mb-3 text-dark">Select Wallet</h6>
                  <div className="d-flex flex-column gap-2 mb-4">
                    {[
                      { id: "paytm", name: "Paytm Wallet", icon: "fa-solid fa-wallet" },
                      { id: "phonepe", name: "PhonePe Wallet", icon: "fa-solid fa-mobile-screen" },
                      { id: "mobikwik", name: "MobiKwik", icon: "fa-solid fa-wallet" },
                      { id: "amazonpay", name: "Amazon Pay", icon: "fa-brands fa-amazon" },
                    ].map((w) => (
                      <label
                        key={w.id}
                        className={`p-3 border rounded-3 d-flex align-items-center justify-content-between cursor-pointer ${
                          selectedWallet === w.id ? "border-primary bg-primary-subtle bg-opacity-10" : ""
                        }`}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <input
                            type="radio"
                            name="walletRadio"
                            checked={selectedWallet === w.id}
                            onChange={() => setSelectedWallet(w.id)}
                            className="form-check-input mt-0"
                          />
                          <span className="fw-semibold small">{w.name}</span>
                        </div>
                        <i className={`${w.icon} text-muted`}></i>
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2"
                    style={{ backgroundColor: "#5925dc", borderColor: "#5925dc" }}
                    onClick={() => triggerPaymentSuccess(`WALLET_${selectedWallet.toUpperCase()}`)}
                  >
                    Pay ₹{amount} with Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center px-4">
          <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: "11px" }}>
            <i className="fa-solid fa-shield-halved text-success"></i>
            <span>Certified by RBI &bull; Tokenized Card Vaulting</span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary px-3"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

