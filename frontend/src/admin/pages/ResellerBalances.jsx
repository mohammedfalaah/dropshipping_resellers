import React, { useState, useEffect } from "react";
import { adminApi, paymentsApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function ResellerBalances() {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [adjType, setAdjType] = useState("credit_adjustment");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const { addToast } = useToast();

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getResellers({ limit: 50 });
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

    try {
      await paymentsApi.recordAdjustment({
        resellerId: selectedReseller._id,
        type: adjType,
        amount: parseFloat(adjAmount),
        reason: adjReason,
      });
      addToast(`Ledger adjustment of ₹${adjAmount} recorded with immutable audit record!`, "success");
      setShowAdjModal(false);
      fetchBalances();
    } catch (err) {
      addToast(err.message || "Failed to record adjustment.", "error");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Reseller Balances & Ledger Reconciliation</h4>
          <p className="text-muted small mb-0">Audit-compliant balance management. Balances are derived from confirmed orders, collections, and adjustments.</p>
        </div>
        <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white" onClick={fetchBalances}>
          <i className="fa-solid fa-rotate me-1"></i> Refresh
        </button>
      </div>

      <div className="admin-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Computing balances from immutable ledger entries...</p>
          </div>
        ) : resellers.length === 0 ? (
          <div className="text-center py-5">
            <h6 className="fw-bold">No Resellers Found</h6>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reseller</th>
                  <th>Total Orders Value</th>
                  <th>Total Confirmed Paid</th>
                  <th>COD Pending</th>
                  <th>Net Outstanding Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="fw-bold text-dark">{r.name}</div>
                      <div className="text-muted small">{r.businessInfo?.businessName || r.email}</div>
                    </td>
                    <td className="fw-semibold">
                      ₹{(((r.financialSummary?.totalPurchasesPaise ?? r.financialSummary?.totalOrderValuePaise) || 0) / 100).toFixed(2)}
                    </td>
                    <td className="fw-semibold text-success">
                      ₹{(((r.financialSummary?.totalPaymentsPaise ?? r.financialSummary?.totalPaidPaise) || 0) / 100).toFixed(2)}
                    </td>
                    <td className="fw-semibold text-warning">
                      ₹{((r.financialSummary?.codPendingPaise || 0) / 100).toFixed(2)}
                    </td>
                    <td className="fw-bold text-danger">
                      ₹{((r.financialSummary?.outstandingBalancePaise || 0) / 100).toFixed(2)}
                    </td>
                    <td>
                      <span className={`admin-badge ${r.approvalStatus === "approved" ? "admin-badge-success" : "admin-badge-warning"}`}>
                        {r.approvalStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border rounded-pill px-3"
                        onClick={() => handleOpenAdjustment(r)}
                      >
                        <i className="fa-solid fa-sliders me-1"></i> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mandatory Audit Reason *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      required
                      placeholder="Explain the commercial or operational reason for this ledger entry (e.g. damaged goods return credit, annual volume discount, logistics dispute resolution)..."
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                    ></textarea>
                    <div className="small text-muted mt-1">
                      <i className="fa-solid fa-lock text-primary me-1"></i>
                      Logged to the permanent compliance audit trail with your admin user ID and timestamp.
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowAdjModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-admin-primary rounded-pill px-4">
                    Commit Ledger Adjustment
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
