import React, { useState, useEffect } from "react";
import { adminApi, paymentsApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function ResellerBalances() {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [adjType, setAdjType] = useState("credit_adjustment");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [submittingAdj, setSubmittingAdj] = useState(false);

  // Manual Payment Record Modal (when reseller sends money via bank/cash/UPI)
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  const { addToast } = useToast();

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getResellers({ limit: 100, search });
      const data = res.data?.resellers ? res.data : res.data?.data || res.data;
      setResellers(data.resellers || []);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch reseller balances.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBalances();
  };

  const handleOpenAdjustment = (r) => {
    setSelectedReseller(r);
    setAdjAmount("");
    setAdjReason("");
    setAdjType("credit_adjustment");
    setShowAdjModal(true);
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      addToast("Mandatory audit reason is required for any ledger adjustment.", "error");
      return;
    }
    setSubmittingAdj(true);

    try {
      await paymentsApi.recordAdjustment({
        resellerId: selectedReseller._id,
        type: adjType,
        amount: parseFloat(adjAmount),
        reason: adjReason,
      });
      addToast(`Ledger adjustment of ₹${adjAmount} recorded with immutable audit log!`, "success");
      setShowAdjModal(false);
      fetchBalances();
    } catch (err) {
      addToast(err.message || "Failed to record adjustment.", "error");
    } finally {
      setSubmittingAdj(false);
    }
  };

  const handleOpenPayment = (r) => {
    setSelectedReseller(r);
    setPayAmount("");
    setPayMethod("BANK_TRANSFER");
    setPayReference(`PAY-${Date.now().toString().slice(-6)}`);
    setPayNotes("");
    setShowPayModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) {
      addToast("Valid payment amount is required.", "error");
      return;
    }
    setSubmittingPay(true);

    try {
      await paymentsApi.recordManual({
        resellerId: selectedReseller._id,
        amount: parseFloat(payAmount),
        method: payMethod,
        reference: payReference,
        notes: payNotes,
      });
      addToast(`Payment of ₹${payAmount} sent by ${selectedReseller.name} recorded successfully!`, "success");
      setShowPayModal(false);
      fetchBalances();
    } catch (err) {
      addToast(err.message || "Failed to record payment.", "error");
    } finally {
      setSubmittingPay(false);
    }
  };

  // Aggregated totals across all resellers
  const totalSentSum = resellers.reduce(
    (s, r) => s + (r.financialSummary?.totalPaidPaise || 0),
    0
  );
  const totalRemainingBalanceSum = resellers.reduce(
    (s, r) => s + (r.financialSummary?.outstandingBalancePaise || 0),
    0
  );
  const totalCompanyAmountSum = resellers.reduce(
    (s, r) => s + (r.companyAmountPaise || r.financialSummary?.companyAmountPaise || 0),
    0
  );
  const totalResellerProfitSum = resellers.reduce(
    (s, r) => s + (r.resellerProfitPaise || r.financialSummary?.resellerProfitPaise || 0),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Reseller Balances & Financial Settlement</h4>
          <p className="text-muted small mb-0">
            Audit-compliant tracking of amount sent by resellers, remaining balances, and company receivables.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white shadow-sm" onClick={fetchBalances}>
            <i className="fa-solid fa-rotate me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* 4 Primary Highlight Cards: Sent vs Remaining vs Company vs Profit */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#ECFDF5" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#D1FAE5", color: "#059669" }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">Amount Resellers Have Sent</div>
              <h4 className="fw-bold text-success mb-0">₹{(totalSentSum / 100).toFixed(2)}</h4>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                Total payments received in bank
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#FEF2F2" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">Resellers Remaining Balance</div>
              <h4 className="fw-bold text-danger mb-0">₹{(totalRemainingBalanceSum / 100).toFixed(2)}</h4>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                Unpaid / Due from resellers
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#F0FDF4" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">Our Company Amount</div>
              <h4 className="fw-bold text-dark mb-0">₹{(totalCompanyAmountSum / 100).toFixed(2)}</h4>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                Wholesale costs + Delivery fees billed
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#EEF2FF" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#E0E7FF", color: "#4F46E5" }}>
              <i className="fa-solid fa-coins"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">Total Reseller Margins</div>
              <h4 className="fw-bold text-primary mb-0">+₹{(totalResellerProfitSum / 100).toFixed(2)}</h4>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                Profit earned by resellers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-card mb-4 p-3 shadow-sm border">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <input
                type="text"
                className="form-control rounded-start-pill"
                placeholder="Search reseller by name, email, phone, business..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-dark rounded-end-pill px-3">
                <i className="fa-solid fa-magnifying-glass me-1"></i> Search
              </button>
            </div>
          </div>
          <div className="col-md-7 text-md-end text-muted small">
            Showing {resellers.length} registered reseller accounts with verified ledger balances
          </div>
        </form>
      </div>

      {/* Reseller Balances Table */}
      <div className="admin-card p-0 overflow-hidden shadow-sm border">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Computing balances from immutable ledger entries...</p>
          </div>
        ) : resellers.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-users-slash fa-3x text-muted mb-3"></i>
            <h6 className="fw-bold">No Resellers Found</h6>
            <p className="text-muted small">No registered resellers found matching your criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: "180px" }}>Reseller</th>
                  <th style={{ minWidth: "160px" }}>Amount Reseller Sent</th>
                  <th style={{ minWidth: "160px" }}>Remaining Balance</th>
                  <th style={{ minWidth: "150px" }}>Our Company Amount</th>
                  <th style={{ minWidth: "140px" }}>Reseller Profit</th>
                  <th style={{ minWidth: "140px" }}>Total Order Value</th>
                  <th style={{ minWidth: "120px" }}>COD In-Transit</th>
                  <th style={{ minWidth: "100px" }}>Status</th>
                  <th style={{ minWidth: "150px" }} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((r) => {
                  const paid = (r.financialSummary?.totalPaidPaise || 0) / 100;
                  const balance = (r.financialSummary?.outstandingBalancePaise || 0) / 100;
                  const companyAmount = ((r.companyAmountPaise || r.financialSummary?.companyAmountPaise || 0) / 100);
                  const resellerProfit = ((r.resellerProfitPaise || r.financialSummary?.resellerProfitPaise || 0) / 100);
                  const orderValue = ((r.customerSellingTotalPaise || r.financialSummary?.totalOrderValuePaise || 0) / 100);
                  const codPending = (r.financialSummary?.codPendingPaise || 0) / 100;

                  return (
                    <tr key={r._id}>
                      {/* Reseller Info */}
                      <td>
                        <div className="fw-bold text-dark">{r.name}</div>
                        <div className="text-muted small" style={{ fontSize: "11px" }}>
                          {r.businessInfo?.businessName ? (
                            <span className="fw-semibold text-secondary">{r.businessInfo.businessName} • </span>
                          ) : null}
                          {r.email}
                        </div>
                        {r.phone && (
                          <div className="text-muted small" style={{ fontSize: "10px" }}>
                            Ph: {r.phone}
                          </div>
                        )}
                      </td>

                      {/* Amount Reseller Has Sent */}
                      <td>
                        <div className="fw-bold text-success fs-6">
                          ₹{paid.toFixed(2)}
                        </div>
                        <span className="badge bg-success-subtle text-success border border-success" style={{ fontSize: "9px" }}>
                          <i className="fa-solid fa-check me-1"></i> Sent to Company
                        </span>
                      </td>

                      {/* Reseller Remaining Balance */}
                      <td>
                        <div className={`fw-bold fs-6 ${balance > 0 ? "text-danger" : "text-dark"}`}>
                          ₹{balance.toFixed(2)}
                        </div>
                        <span
                          className={`badge ${
                            balance > 0 ? "bg-danger-subtle text-danger border border-danger" : "bg-light text-muted border"
                          }`}
                          style={{ fontSize: "9px" }}
                        >
                          {balance > 0 ? "Outstanding Due" : "Settled / Nil"}
                        </span>
                      </td>

                      {/* Our Company Amount */}
                      <td>
                        <div className="fw-bold text-dark fs-6">
                          ₹{companyAmount.toFixed(2)}
                        </div>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          Wholesale + Delivery
                        </div>
                      </td>

                      {/* Reseller Profit */}
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary fw-bold px-2 py-1">
                          +₹{resellerProfit.toFixed(2)}
                        </span>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          Markup earnings
                        </div>
                      </td>

                      {/* Total Orders Value */}
                      <td>
                        <div className="fw-semibold text-dark">
                          ₹{orderValue.toFixed(2)}
                        </div>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          {r.financialSummary?.totalOrders || 0} orders
                        </div>
                      </td>

                      {/* COD In Transit */}
                      <td>
                        <div className="fw-semibold text-warning">
                          ₹{codPending.toFixed(2)}
                        </div>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          Courier pending
                        </div>
                      </td>

                      {/* Account Status */}
                      <td>
                        <span
                          className={`admin-badge ${
                            r.approvalStatus === "approved" && r.accountStatus !== "blocked"
                              ? "admin-badge-success"
                              : r.accountStatus === "blocked"
                              ? "admin-badge-danger"
                              : "admin-badge-warning"
                          }`}
                          style={{ fontSize: "10px" }}
                        >
                          {r.accountStatus === "blocked" ? "BLOCKED" : (r.approvalStatus || "ACTIVE").toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            title="Record Payment Sent by Reseller"
                            onClick={() => handleOpenPayment(r)}
                          >
                            <i className="fa-solid fa-plus me-1"></i> Pay
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            title="Record Authorized Ledger Adjustment"
                            onClick={() => handleOpenAdjustment(r)}
                          >
                            <i className="fa-solid fa-sliders"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Sent by Reseller Modal */}
      {showPayModal && selectedReseller && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handlePaymentSubmit}>
                <div className="modal-header border-bottom bg-success-subtle rounded-top-4">
                  <div>
                    <h5 className="modal-title fw-bold text-success">
                      <i className="fa-solid fa-money-bill-wave me-2"></i>
                      Record Payment Sent by Reseller
                    </h5>
                    <span className="text-muted small">Reseller: {selectedReseller.name} ({selectedReseller.email})</span>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowPayModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 border mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Already Sent by Reseller:</span>
                      <strong className="text-success">₹{((selectedReseller.financialSummary?.totalPaidPaise || 0) / 100).toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Current Remaining Balance:</span>
                      <strong className="text-danger">₹{((selectedReseller.financialSummary?.outstandingBalancePaise || 0) / 100).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Amount Reseller Sent (₹) *</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        required
                        placeholder="e.g. 5000.00"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Payment Mode</label>
                    <select
                      className="form-select"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="CASH">Cash / Hand Delivery</option>
                      <option value="RAZORPAY">Razorpay Payment Link</option>
                      <option value="OTHER">Other Settlement</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Transaction Reference / UTR</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. UTR-98218731920 or Cheque #"
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Accounting Remarks</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Optional notes regarding this payment verification..."
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowPayModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success rounded-pill px-4 text-white" disabled={submittingPay}>
                    {submittingPay ? "Recording..." : "Record Payment & Credit Balance"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Authorized Adjustment Modal */}
      {showAdjModal && selectedReseller && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleAdjustmentSubmit}>
                <div className="modal-header border-bottom">
                  <div>
                    <h5 className="modal-title fw-bold">Record Authorized Ledger Adjustment</h5>
                    <span className="text-muted small">Reseller: {selectedReseller.name}</span>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowAdjModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Adjustment Type *</label>
                    <select
                      className="form-select"
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value)}
                    >
                      <option value="credit_adjustment">Credit Adjustment (Reduces Reseller Outstanding / Adds Credit)</option>
                      <option value="debit_adjustment">Debit Adjustment (Increases Reseller Outstanding / Charges Due)</option>
                      <option value="refund">Authorized Refund Credit</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Adjustment Amount (₹) *</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        required
                        placeholder="e.g. 1500.00"
                        value={adjAmount}
                        onChange={(e) => setAdjAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mandatory Audit Reason *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      required
                      placeholder="Explain commercial or operational reason (e.g. damaged goods return credit, annual volume rebate, logistics dispute resolution)..."
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                    ></textarea>
                    <div className="small text-muted mt-1">
                      <i className="fa-solid fa-lock text-primary me-1"></i>
                      Logged to the immutable compliance audit trail with your admin user ID and timestamp.
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowAdjModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={submittingAdj}>
                    {submittingAdj ? "Saving..." : "Commit Ledger Adjustment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
