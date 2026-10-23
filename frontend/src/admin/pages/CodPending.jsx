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
      addToast("COD remittance recorded and credited to double-entry ledger!", "success");
      setShowCollectModal(false);
      fetchCodOrders();
    } catch (err) {
      addToast(err.message || "Failed to record COD collection.", "error");
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
                  <th>Delivery Status</th>
                  <th>COD Total</th>
                  <th>Collected</th>
                  <th>Pending Due</th>
                  <th>Collection State</th>
                  <th>Courier / Tracking</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {codList.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong className="text-dark">{c.order?.orderNumber || c.orderNumber || "SP-ORDER"}</strong>
                    </td>
                    <td>{c.reseller?.name || "Reseller Partner"}</td>
                    <td>
                      <span className="admin-badge admin-badge-info text-capitalize">
                        {c.deliveryStatus || "Delivered"}
                      </span>
                    </td>
                    <td className="fw-bold">₹{((c.codAmountPaise || 0) / 100).toFixed(2)}</td>
                    <td className="fw-semibold text-success">₹{((c.collectedAmountPaise || 0) / 100).toFixed(2)}</td>
                    <td className="fw-bold text-danger">
                      ₹{(((c.pendingAmountPaise ?? c.codAmountPaise) || 0) / 100).toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          c.collectionStatus === "collected"
                            ? "admin-badge-success"
                            : c.collectionStatus === "partially_collected"
                            ? "admin-badge-warning"
                            : "admin-badge-danger"
                        } text-capitalize`}
                      >
                        {c.collectionStatus}
                      </span>
                    </td>
                    <td>
                      <div className="small">{c.courierName || "Standard Shipping"}</div>
                      <div className="small text-muted">{c.trackingNumber || "—"}</div>
                    </td>
                    <td>
                      {c.collectionStatus !== "collected" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-success rounded-pill px-3 text-white"
                          onClick={() => handleOpenCollect(c)}
                        >
                          <i className="fa-solid fa-check-double me-1"></i> Collect
                        </button>
                      ) : (
                        <span className="text-muted small">
                          <i className="fa-solid fa-circle-check text-success me-1"></i> Reconciled
                        </span>
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
                    Confirm & Credit Ledger
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
