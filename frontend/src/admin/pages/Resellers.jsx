import React, { useState, useEffect } from "react";
import { adminApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Resellers() {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  //Modals state
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [resellerLedger, setResellerLedger] = useState([]);

  // Create form state
  const [newReseller, setNewReseller] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    businessName: "",
    taxId: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const { addToast } = useToast();

  const fetchResellers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, search };
      if (statusFilter !== "all") {
        if (["pending", "approved", "rejected"].includes(statusFilter)) {
          params.approvalStatus = statusFilter;
        } else if (["active", "blocked"].includes(statusFilter)) {
          params.accountStatus = statusFilter;
        }
      }

      const res = await adminApi.getResellers(params);
      const data = res.data?.resellers ? res.data : res.data?.data || res.data;
      setResellers(data.resellers || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch resellers.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchResellers();
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this reseller account for wholesale access?")) return;
    try {
      await adminApi.approveReseller(id);
      addToast("Reseller approved successfully!", "success");
      fetchResellers();
    } catch (err) {
      addToast(err.message || "Failed to approve reseller.", "error");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reason for rejection:", "Documentation incomplete");
    if (!reason) return;
    try {
      await adminApi.rejectReseller(id, reason);
      addToast("Reseller application rejected.", "info");
      fetchResellers();
    } catch (err) {
      addToast(err.message || "Failed to reject reseller.", "error");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "blocked" : "active";
    if (!window.confirm(`Are you sure you want to ${nextStatus === "blocked" ? "BLOCK" : "UNBLOCK"} this account?`)) return;
    try {
      await adminApi.toggleResellerStatus(id, nextStatus);
      addToast(`Account marked as ${nextStatus}.`, "success");
      fetchResellers();
    } catch (err) {
      addToast(err.message || "Failed to update account status.", "error");
    }
  };

  const handleViewLedger = async (reseller) => {
    setSelectedReseller(reseller);
    try {
      const res = await adminApi.getResellerById(reseller._id);
      const data = res.data?.data || res.data;
      setResellerLedger(data.ledger || []);
      setShowLedgerModal(true);
    } catch (err) {
      addToast("Failed to load reseller ledger.", "error");
    }
  };

  const handleCreateResellerSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createReseller(newReseller);
      addToast("Reseller account created successfully!", "success");
      setShowCreateModal(false);
      setNewReseller({
        name: "",
        email: "",
        password: "",
        phone: "",
        businessName: "",
        taxId: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
      });
      fetchResellers();
    } catch (err) {
      addToast(err.message || "Failed to create reseller.", "error");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Reseller Management</h4>
          <p className="text-muted small mb-0">Directory of registered dropshippers and wholesale partners</p>
        </div>
        <button
          className="btn-admin-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="fa-solid fa-plus"></i>
          <span>Create Reseller</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                placeholder="Search by name, business, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-dark rounded-pill px-3">
                Search
              </button>
            </form>
          </div>
          <div className="col-md-7 d-flex justify-content-md-end gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {[
                { label: "All", val: "all" },
                { label: "Pending", val: "pending" },
                { label: "Approved", val: "approved" },
                { label: "Rejected", val: "rejected" },
                { label: "Blocked", val: "blocked" },
              ].map((f) => (
                <button
                  key={f.val}
                  type="button"
                  className={`btn btn-sm ${statusFilter === f.val ? "btn-dark" : "btn-light border"}`}
                  onClick={() => {
                    setStatusFilter(f.val);
                    setPage(1);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resellers Table */}
      <div className="admin-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Loading resellers...</p>
          </div>
        ) : resellers.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-users-slash fa-3x text-muted mb-3"></i>
            <h6 className="fw-bold">No Resellers Found</h6>
            <p className="text-muted small">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reseller</th>
                  <th>Business Name</th>
                  <th>Contact</th>
                  <th>Approval</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>Outstanding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="fw-bold text-dark">{r.name}</div>
                      <div className="text-muted small">{r.email}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{r.businessInfo?.businessName || "Individual"}</div>
                      <div className="text-muted small">{r.businessInfo?.city || "India"}</div>
                    </td>
                    <td>
                      <span className="small">{r.phone || "—"}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          r.approvalStatus === "approved"
                            ? "admin-badge-success"
                            : r.approvalStatus === "pending"
                            ? "admin-badge-warning"
                            : "admin-badge-danger"
                        }`}
                      >
                        {r.approvalStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          r.accountStatus === "active" ? "admin-badge-success" : "admin-badge-danger"
                        }`}
                      >
                        {r.accountStatus}
                      </span>
                    </td>
                    <td className="fw-semibold">
                      {r.financialSummary?.totalOrders ?? r.financialSummary?.totalOrdersCount ?? 0}
                    </td>
                    <td className="fw-bold text-danger">
                      ₹{(((r.financialSummary?.outstandingBalancePaise || 0)) / 100).toFixed(2)}
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          title="View Details"
                          onClick={() => {
                            setSelectedReseller(r);
                            setShowDetailsModal(true);
                          }}
                        >
                          <i className="fa-regular fa-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          title="View Ledger Statement"
                          onClick={() => handleViewLedger(r)}
                        >
                          <i className="fa-solid fa-file-invoice"></i>
                        </button>
                        {r.approvalStatus === "pending" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success text-white"
                              title="Approve Reseller"
                              onClick={() => handleApprove(r._id)}
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger text-white"
                              title="Reject Reseller"
                              onClick={() => handleReject(r._id)}
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className={`btn btn-sm ${r.accountStatus === "active" ? "btn-outline-danger" : "btn-outline-success"}`}
                          title={r.accountStatus === "active" ? "Block Account" : "Activate Account"}
                          onClick={() => handleToggleStatus(r._id, r.accountStatus)}
                        >
                          <i className={`fa-solid ${r.accountStatus === "active" ? "fa-ban" : "fa-unlock"}`}></i>
                        </button>
                      </div>
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
              Showing page {page} of {pagination.pages} ({pagination.total} total)
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

      {/* Details Modal */}
      {showDetailsModal && selectedReseller && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Reseller Account: {selectedReseller.name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <span className="text-muted small">Email Address</span>
                    <div className="fw-semibold">{selectedReseller.email}</div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small">Phone Number</span>
                    <div className="fw-semibold">{selectedReseller.phone || "—"}</div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small">Company / Business Name</span>
                    <div className="fw-semibold">{selectedReseller.businessInfo?.businessName || "N/A"}</div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small">GST / Tax ID</span>
                    <div className="fw-semibold">{selectedReseller.businessInfo?.taxId || "Not Registered"}</div>
                  </div>
                  <div className="col-12">
                    <span className="text-muted small">Business Address</span>
                    <div className="fw-semibold">
                      {selectedReseller.businessInfo?.address || "Address not provided"},{" "}
                      {selectedReseller.businessInfo?.city}, {selectedReseller.businessInfo?.state} -{" "}
                      {selectedReseller.businessInfo?.postalCode}
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold border-bottom pb-2">Financial Account Snapshot</h6>
                <div className="row g-3 text-center mt-1">
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small">Total Purchases</div>
                      <div className="fw-bold text-dark">
                        ₹{(((selectedReseller.financialSummary?.totalPurchasesPaise || 0)) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small">COD Pending</div>
                      <div className="fw-bold text-warning">
                        ₹{(((selectedReseller.financialSummary?.codPendingPaise || 0)) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 bg-light rounded-3">
                      <div className="text-muted small">Net Outstanding</div>
                      <div className="fw-bold text-danger">
                        ₹{(((selectedReseller.financialSummary?.outstandingBalancePaise || 0)) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetailsModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && selectedReseller && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <div>
                  <h5 className="modal-title fw-bold">Statement & Ledger: {selectedReseller.name}</h5>
                  <span className="text-muted small">Double-entry immutable ledger statement</span>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowLedgerModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                {resellerLedger.length === 0 ? (
                  <p className="text-muted small text-center py-4">No ledger transactions posted for this reseller.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Reference #</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Debit (Due)</th>
                          <th>Credit (Paid)</th>
                          <th>Balance After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resellerLedger.map((e) => (
                          <tr key={e._id}>
                            <td className="small">{new Date(e.createdAt).toLocaleDateString()}</td>
                            <td className="fw-semibold small">{e.referenceNumber}</td>
                            <td>
                              <span className={`admin-badge ${e.entryType === "order_debit" ? "admin-badge-danger" : "admin-badge-success"}`}>
                                {e.entryType}
                              </span>
                            </td>
                            <td className="small">{e.description}</td>
                            <td className="text-danger fw-semibold">
                              {e.entryType === "order_debit" ? `₹${(e.amountPaise / 100).toFixed(2)}` : "—"}
                            </td>
                            <td className="text-success fw-semibold">
                              {e.entryType !== "order_debit" ? `₹${(e.amountPaise / 100).toFixed(2)}` : "—"}
                            </td>
                            <td className="fw-bold">₹{(e.balanceAfterPaise / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowLedgerModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Reseller Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleCreateResellerSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Provision New Reseller Account</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={newReseller.name}
                        onChange={(e) => setNewReseller({ ...newReseller, name: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Email Address *</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={newReseller.email}
                        onChange={(e) => setNewReseller({ ...newReseller, email: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        required
                        value={newReseller.password}
                        onChange={(e) => setNewReseller({ ...newReseller, password: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-control"
                        required
                        value={newReseller.phone}
                        onChange={(e) => setNewReseller({ ...newReseller, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Business / Company Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newReseller.businessName}
                        onChange={(e) => setNewReseller({ ...newReseller, businessName: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">GST / Tax ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newReseller.taxId}
                        onChange={(e) => setNewReseller({ ...newReseller, taxId: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newReseller.address}
                        onChange={(e) => setNewReseller({ ...newReseller, address: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newReseller.city}
                        onChange={(e) => setNewReseller({ ...newReseller, city: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newReseller.state}
                        onChange={(e) => setNewReseller({ ...newReseller, state: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">Postal Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newReseller.postalCode}
                        onChange={(e) => setNewReseller({ ...newReseller, postalCode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-admin-primary rounded-pill px-4">
                    Create Reseller
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
