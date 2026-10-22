import React, { useState, useEffect } from "react";
import { paymentsApi, adminApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Manual payment modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [resellersList, setResellersList] = useState([]);
  const [manualForm, setManualForm] = useState({
    resellerId: "",
    amount: "",
    method: "bank_transfer",
    transactionReference: "",
    notes: "",
  });

  const { addToast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (methodFilter !== "all") params.method = methodFilter;

      const res = await paymentsApi.getAll(params);
      const data = res.data?.payments ? res.data : res.data?.data || res.data;
      setPayments(data.payments || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch payments.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, methodFilter]);

  const handleOpenManual = async () => {
    try {
      const res = await adminApi.getResellers({ limit: 100 });
      const data = res.data?.resellers ? res.data : res.data?.data || res.data;
      const list = data.resellers || [];
      setResellersList(list);
      if (list.length > 0) {
        setManualForm((prev) => ({ ...prev, resellerId: list[0]._id }));
      }
      setShowManualModal(true);
    } catch (err) {
      addToast("Failed to load resellers list.", "error");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentsApi.recordManual({
        resellerId: manualForm.resellerId,
        amount: parseFloat(manualForm.amount),
        method: manualForm.method,
        transactionReference: manualForm.transactionReference,
        notes: manualForm.notes,
      });
      addToast("Manual payment credited successfully!", "success");
      setShowManualModal(false);
      setManualForm({
        resellerId: "",
        amount: "",
        method: "bank_transfer",
        transactionReference: "",
        notes: "",
      });
      fetchPayments();
    } catch (err) {
      addToast(err.message || "Failed to record payment.", "error");
    }
  };

  const handleReversePayment = async (id, ref) => {
    const reason = window.prompt(`Provide mandatory reason for reversing payment (${ref}):`, "Bounced bank transfer");
    if (!reason) return;

    try {
      await paymentsApi.reversePayment(id, reason);
      addToast("Payment reversed with compensating double-entry ledger debit.", "info");
      fetchPayments();
    } catch (err) {
      addToast(err.message || "Failed to reverse payment.", "error");
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Payment Transactions & Receipts</h4>
          <p className="text-muted small mb-0">Live audit log of all online (Razorpay), cash on delivery (COD), and bank transfer payments</p>
        </div>
        <button className="btn-admin-primary" onClick={handleOpenManual}>
          <i className="fa-solid fa-plus"></i>
          <span>Record Manual Payment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="admin-card mb-4 p-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="btn-group btn-group-sm">
            {[
              { label: "All Payment Methods", val: "all" },
              { label: "Razorpay Online", val: "razorpay" },
              { label: "Cash on Delivery", val: "cash_on_delivery" },
              { label: "Bank Transfer", val: "bank_transfer" },
              { label: "Cash", val: "cash" },
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                className={`btn btn-sm ${methodFilter === f.val ? "btn-dark" : "btn-light border"}`}
                onClick={() => {
                  setMethodFilter(f.val);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="small text-muted">
            <i className="fa-solid fa-lock text-primary me-1"></i> Immutable transaction audit trail
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Loading transactions...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-credit-card fa-3x text-muted mb-3"></i>
            <h6 className="fw-bold">No Transactions Found</h6>
            <p className="text-muted small">No payments recorded under this filter.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Reseller</th>
                  <th>Related Order</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <code className="text-dark small">{p.transactionId || p._id.slice(-8)}</code>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{p.reseller?.name || "Direct Reseller"}</div>
                      <div className="text-muted small">{p.reseller?.businessInfo?.businessName || p.reseller?.email}</div>
                    </td>
                    <td>
                      {p.order?.orderNumber ? (
                        <span className="fw-semibold">{p.order.orderNumber}</span>
                      ) : (
                        <span className="text-muted small">Account Advance</span>
                      )}
                    </td>
                    <td>
                      <span className="small text-uppercase fw-semibold">{p.method}</span>
                    </td>
                    <td className="fw-bold text-success">₹{(p.amountPaise / 100).toFixed(2)}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          p.status === "paid"
                            ? "admin-badge-success"
                            : p.status === "reversed"
                            ? "admin-badge-danger"
                            : "admin-badge-warning"
                        } text-capitalize`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <span className="small text-muted">{p.transactionReference || "Direct Ledger"}</span>
                    </td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      {p.status === "paid" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Reverse Payment (Compensating Debit)"
                          onClick={() => handleReversePayment(p._id, p.transactionReference || p._id.slice(-6))}
                        >
                          <i className="fa-solid fa-rotate-left me-1"></i> Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Showing page {page} of {pagination.pages}
            </span>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-outline-secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Payment Modal */}
      {showManualModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleManualSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Record Authorized Manual Payment</h5>
                  <button type="button" className="btn-close" onClick={() => setShowManualModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Target Reseller *</label>
                    <select
                      className="form-select"
                      required
                      value={manualForm.resellerId}
                      onChange={(e) => setManualForm({ ...manualForm, resellerId: e.target.value })}
                    >
                      {resellersList.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name} ({r.businessInfo?.businessName || r.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Payment Method *</label>
                    <select
                      className="form-select"
                      value={manualForm.method}
                      onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })}
                    >
                      <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="cash">Direct Cash Deposit</option>
                      <option value="other">Other Authorized Mode</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Amount Received (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      placeholder="e.g. 5000.00"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Bank UTR / Transaction Reference *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. HDFC-UTR-891283"
                      value={manualForm.transactionReference}
                      onChange={(e) => setManualForm({ ...manualForm, transactionReference: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Audit Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Payment details, receipt verified..."
                      value={manualForm.notes}
                      onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowManualModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-admin-primary rounded-pill px-4">
                    Credit Reseller Account
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
