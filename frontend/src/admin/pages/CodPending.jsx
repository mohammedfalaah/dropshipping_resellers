import React, { useState, useEffect } from "react";
import { codApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function CodPending() {
  const [codList, setCodList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectionFilter, setCollectionFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Record Collection Modal
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedCod, setSelectedCod] = useState(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectionRef, setCollectionRef] = useState("");
  const [notes, setNotes] = useState("");

  // Reconcile Remittance Modal
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileRef, setReconcileRef] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  // Settle Profit Modal
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleRef, setSettleRef] = useState("");
  const [settleNotes, setSettleNotes] = useState("");

  const { addToast } = useToast();

  const fetchCodOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (collectionFilter !== "all") params.collectionStatus = collectionFilter;

      const res = await codApi.getPending(params);
      const data = res.data?.codPendingOrders ? res.data : res.data?.data || res.data;
      setCodList(data.codPendingOrders || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch COD records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodOrders();
  }, [page, collectionFilter]);

  const handleOpenCollect = (item) => {
    setSelectedCod(item);
    setCollectAmount(((item.pendingAmountPaise ?? item.codAmountPaise) / 100).toFixed(2));
    setCollectionRef(`COD-REF-${Date.now().toString().slice(-6)}`);
    setNotes("Courier remittance settlement");
    setShowCollectModal(true);
  };

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCod) return;

    try {
      await codApi.markCollected(selectedCod._id, {
        collectedAmount: parseFloat(collectAmount),
        collectionReference: collectionRef,
        notes,
      });
      addToast("Courier collection recorded!", "success");
      setShowCollectModal(false);
      fetchCodOrders();
    } catch (err) {
      addToast(err.message || "Failed to record COD collection.", "error");
    }
  };

  const handleOpenReconcile = (item) => {
    setSelectedCod(item);
    setReconcileRef(item.collectionReference || `REMIT-${Date.now().toString().slice(-6)}`);
    setReconcileNotes("Courier bank remittance reconciled with VEXORA account");
    setShowReconcileModal(true);
  };

  const handleReconcileSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCod) return;

    try {
      await codApi.reconcile(selectedCod._id, {
        reconciliationReference: reconcileRef,
        notes: reconcileNotes,
      });
      addToast("COD remittance reconciled with VEXORA account!", "success");
      setShowReconcileModal(false);
      fetchCodOrders();
    } catch (err) {
      addToast(err.message || "Failed to reconcile remittance.", "error");
    }
  };

  const handleOpenSettle = (item) => {
    setSelectedCod(item);
    const expected = item.expectedResellerProfitPaise || 0;
    const settled = item.settledProfitPaise || 0;
    const remaining = Math.max(0, expected - settled);
    setSettleAmount((remaining / 100).toFixed(2));
    setSettleRef(`SETTLE-${item.orderNumber || item.order?.orderNumber || Date.now().toString().slice(-6)}`);
    setSettleNotes("Reseller profit payout for delivered COD dropship order");
    setShowSettleModal(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCod) return;

    try {
      await codApi.settleProfit(selectedCod._id, {
        amount: parseFloat(settleAmount),
        reference: settleRef,
        notes: settleNotes,
      });
      addToast("Reseller profit settled and credited to ledger!", "success");
      setShowSettleModal(false);
      fetchCodOrders();
    } catch (err) {
      addToast(err.message || "Failed to settle reseller profit.", "error");
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">COD Pending & Remittance Management</h4>
          <p className="text-muted small mb-0">
            A delivered COD order is distinct from financial collection. Reconcile courier remittances with double-entry ledger credits.
          </p>
        </div>
        <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white" onClick={fetchCodOrders}>
          <i className="fa-solid fa-rotate me-1"></i> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="admin-card mb-4 p-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="btn-group btn-group-sm">
            {[
              { label: "Pending Collection", val: "pending" },
              { label: "Partially Collected", val: "partially_collected" },
              { label: "Collected / Settled", val: "collected" },
              { label: "All Collections", val: "all" },
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                className={`btn btn-sm ${collectionFilter === f.val ? "btn-dark" : "btn-light border"}`}
                onClick={() => {
                  setCollectionFilter(f.val);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="small text-muted">
            <i className="fa-solid fa-shield-halved text-success me-1"></i> Prevents double-counting in accounting balance sheets
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Checking courier remittance records...</p>
          </div>
        ) : codList.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-receipt fa-3x text-muted mb-3"></i>
            <h6 className="fw-bold">No COD Records Found</h6>
            <p className="text-muted small">All cash-on-delivery payments match the selected state.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Reseller</th>
                  <th>Wholesale Cost</th>
                  <th>Customer Selling</th>
                  <th>Delivery Chg</th>
                  <th>Collection</th>
                  <th>Payable to VEXORA</th>
                  <th>Reseller Profit</th>
                  <th>COD State</th>
                  <th>Settlement</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codList.map((c) => {
                  const wholesaleCost = ((c.wholesaleCostPaise || c.order?.wholesaleCostPaise || 0) / 100).toFixed(2);
                  const customerSelling = ((c.customerSellingTotalPaise || c.codAmountPaise || 0) / 100).toFixed(2);
                  const deliveryChg = ((c.deliveryChargePaise || c.order?.deliveryChargePaise || 0) / 100).toFixed(2);
                  const collected = ((c.collectedAmountPaise || 0) / 100).toFixed(2);
                  const codTarget = ((c.codAmountPaise || 0) / 100).toFixed(2);
                  const payableVexora = ((c.amountPayableToVexoraPaise || ((c.wholesaleCostPaise || 0) + (c.deliveryChargePaise || 0)) || 0) / 100).toFixed(2);
                  const expectedProfit = ((c.expectedResellerProfitPaise || 0) / 100).toFixed(2);
                  const settledProfit = ((c.settledProfitPaise || 0) / 100).toFixed(2);
                  const settlementStatus = c.resellerSettlementStatus || "UNSETTLED";
                  const collectionStatus = (c.collectionStatus || "pending").toLowerCase();

                  return (
                    <tr key={c._id}>
                      <td>
                        <strong className="text-dark">{c.order?.orderNumber || c.orderNumber || "SP-ORDER"}</strong>
                        <div className="small text-muted">{new Date(c.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{c.reseller?.name || c.resellerName || "Reseller Partner"}</div>
                        <div className="small text-muted">{c.courierName || "Standard Courier"} • {c.trackingNumber || "—"}</div>
                      </td>
                      <td className="fw-semibold text-secondary">₹{wholesaleCost}</td>
                      <td className="fw-bold text-dark">₹{customerSelling}</td>
                      <td>
                        <div>₹{deliveryChg}</div>
                        <span className={`badge ${c.deliveryChargeStatus === "PAID" ? "bg-success-subtle text-success" : "bg-warning-subtle text-dark"}`} style={{ fontSize: "10px" }}>
                          {c.deliveryChargeStatus || "PENDING"}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold">₹{collected} / ₹{codTarget}</div>
                        <span className="small text-muted" style={{ fontSize: "10px" }}>
                          {Number(collected) >= Number(codTarget) && Number(codTarget) > 0 ? "Remitted by Courier" : "Pending Collection"}
                        </span>
                      </td>
                      <td className="fw-bold text-primary">₹{payableVexora}</td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold">
                          +₹{expectedProfit}
                        </span>
                        <div className="text-muted" style={{ fontSize: "10px" }}>₹{settledProfit} settled</div>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            collectionStatus === "reconciled" || collectionStatus === "collected"
                              ? "admin-badge-success"
                              : collectionStatus === "partially_collected"
                              ? "admin-badge-warning"
                              : "admin-badge-danger"
                          } text-uppercase`}
                        >
                          {c.collectionStatus}
                        </span>
                        {c.collectionReference && (
                          <div className="text-muted" style={{ fontSize: "10px" }}>Ref: {c.collectionReference}</div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            settlementStatus === "SETTLED"
                              ? "bg-success text-white"
                              : settlementStatus === "PARTIALLY_SETTLED"
                              ? "bg-warning text-dark"
                              : "bg-secondary text-white"
                          } text-uppercase`}
                        >
                          {settlementStatus}
                        </span>
                      </td>
                      <td className="text-end text-nowrap">
                        {collectionStatus === "pending" || collectionStatus === "partially_collected" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-success rounded-pill px-3 text-white me-1"
                            onClick={() => handleOpenCollect(c)}
                            title="Record courier cash collection"
                          >
                            <i className="fa-solid fa-hand-holding-dollar me-1"></i> Collect
                          </button>
                        ) : collectionStatus === "collected" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary rounded-pill px-3 text-white me-1"
                            onClick={() => handleOpenReconcile(c)}
                            title="Reconcile bank remittance"
                          >
                            <i className="fa-solid fa-file-invoice-dollar me-1"></i> Reconcile
                          </button>
                        ) : null}

                        {collectionStatus === "reconciled" && settlementStatus !== "SETTLED" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-dark rounded-pill px-3 text-white"
                            onClick={() => handleOpenSettle(c)}
                            title="Settle earned profit to reseller ledger"
                          >
                            <i className="fa-solid fa-money-bill-transfer me-1"></i> Settle Profit
                          </button>
                        ) : settlementStatus === "SETTLED" ? (
                          <span className="text-success small fw-semibold">
                            <i className="fa-solid fa-circle-check me-1"></i> Completed
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Record Collection Modal */}
      {showCollectModal && selectedCod && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleCollectSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Record COD Remittance Collection</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCollectModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <span className="text-muted small d-block">Order Reference</span>
                    <strong className="text-dark fs-6">{selectedCod.order?.orderNumber || selectedCod.orderNumber}</strong>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Collected Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                    />
                    <div className="small text-muted mt-1">Supports partial or full collection amounts.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Collection Reference / AWB UTR *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. BD-UTR-984218"
                      value={collectionRef}
                      onChange={(e) => setCollectionRef(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Internal Audit Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowCollectModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success text-white rounded-pill px-4">
                    Confirm Collection
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reconcile Modal */}
      {showReconcileModal && selectedCod && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleReconcileSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Reconcile COD Bank Remittance</h5>
                  <button type="button" className="btn-close" onClick={() => setShowReconcileModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Order:</span>
                      <strong className="text-dark small">{selectedCod.order?.orderNumber || selectedCod.orderNumber}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Customer Collected:</span>
                      <strong className="text-dark small">₹{((selectedCod.collectedAmountPaise || selectedCod.codAmountPaise || 0) / 100).toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Payable to VEXORA (Wholesale + Delivery):</span>
                      <strong className="text-primary small">₹{((selectedCod.amountPayableToVexoraPaise || 0) / 100).toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted small">Reseller Earned Profit:</span>
                      <strong className="text-success small">+₹{((selectedCod.expectedResellerProfitPaise || 0) / 100).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Courier Remittance / Bank UTR Reference *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. UTR-HDFC-99201488"
                      value={reconcileRef}
                      onChange={(e) => setReconcileRef(e.target.value)}
                    />
                    <div className="small text-muted mt-1">Verifies that courier funds have safely reached VEXORA bank account.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Internal Audit Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={reconcileNotes}
                      onChange={(e) => setReconcileNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowReconcileModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary text-white rounded-pill px-4">
                    Confirm Reconciliation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settle Reseller Profit Modal */}
      {showSettleModal && selectedCod && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleSettleSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Settle Profit to Reseller Ledger</h5>
                  <button type="button" className="btn-close" onClick={() => setShowSettleModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Reseller:</span>
                      <strong className="text-dark small">{selectedCod.reseller?.name || selectedCod.resellerName || "Reseller"}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Total Expected Profit:</span>
                      <strong className="text-dark small">₹{((selectedCod.expectedResellerProfitPaise || 0) / 100).toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Already Settled:</span>
                      <strong className="text-muted small">₹{((selectedCod.settledProfitPaise || 0) / 100).toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between border-top pt-1 mt-1">
                      <span className="text-muted small fw-semibold">Remaining Eligible:</span>
                      <strong className="text-success small fw-bold">
                        ₹{(Math.max(0, (selectedCod.expectedResellerProfitPaise || 0) - (selectedCod.settledProfitPaise || 0)) / 100).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Settlement Amount to Credit (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                    />
                    <div className="small text-muted mt-1">Credits reseller's double-entry wallet ledger balance.</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Settlement Reference / Batch ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. SETTLE-BATCH-0042"
                      value={settleRef}
                      onChange={(e) => setSettleRef(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Audit Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={settleNotes}
                      onChange={(e) => setSettleNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowSettleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark text-white rounded-pill px-4">
                    Settle & Credit Ledger
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
