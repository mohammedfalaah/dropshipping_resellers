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

  // Modals state
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [resellerLedger, setResellerLedger] = useState([]);

  // Ordered Products & Deliveries Modal state
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [productsData, setProductsData] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsTab, setProductsTab] = useState("products"); // "products" or "orders"
  const [productSearch, setProductSearch] = useState("");

  // Live Tracking Modal state
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Update Delivery Modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [targetOrder, setTargetOrder] = useState(null);
  const [deliveryStatusInput, setDeliveryStatusInput] = useState("IN_TRANSIT");
  const [courierNameInput, setCourierNameInput] = useState("India Post (Business Parcel)");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [checkpointLocationInput, setCheckpointLocationInput] = useState("");
  const [checkpointNoteInput, setCheckpointNoteInput] = useState("");
  const [estimatedDateInput, setEstimatedDateInput] = useState("");
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

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
      addToast(err.message || "Failed to toggle status.", "error");
    }
  };

  const handleViewLedger = async (r) => {
    setSelectedReseller(r);
    try {
      const res = await adminApi.getResellerById(r._id);
      const data = res.data || {};
      setResellerLedger(data.ledger || []);
      setShowLedgerModal(true);
    } catch (err) {
      addToast("Failed to load reseller ledger.", "error");
    }
  };

  // Open Ordered Products & Delivery Progress modal for a reseller
  const handleOpenOrderedProducts = async (r) => {
    setSelectedReseller(r);
    setProductsData(null);
    setProductsTab("products");
    setShowProductsModal(true);
    setLoadingProducts(true);

    try {
      const res = await adminApi.getResellerOrderedProducts(r._id);
      const data = res.data || {};
      setProductsData(data);
    } catch (err) {
      console.error("Error loading reseller products:", err);
      addToast("Failed to load ordered products.", "error");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Open Live Consignment Tracking modal (India Post / Courier)
  const handleTrackConsignment = async (trackingIdentifier) => {
    if (!trackingIdentifier) {
      addToast("No tracking number assigned yet.", "info");
      return;
    }
    setLoadingTracking(true);
    setShowTrackingModal(true);
    setTrackingData(null);

    try {
      const res = await adminApi.getTrackingInfo(trackingIdentifier);
      setTrackingData(res.data || res);
    } catch (err) {
      console.error("Tracking lookup error:", err);
      addToast(err.message || "Failed to fetch consignment tracking.", "error");
    } finally {
      setLoadingTracking(false);
    }
  };

  // Open Update Delivery Modal
  const handleOpenUpdateDelivery = (order) => {
    setTargetOrder(order);
    setDeliveryStatusInput(order.deliveryStatus || order.orderStatus || "IN_TRANSIT");
    setCourierNameInput(order.courierName || "India Post (Business Parcel)");
    setTrackingNumberInput(order.trackingNumber || "");
    setCheckpointLocationInput(order.shippingAddress ? `${order.shippingAddress.city}, India` : "");
    setCheckpointNoteInput("");
    setEstimatedDateInput(
      order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toISOString().split("T")[0] : ""
    );
    setShowDeliveryModal(true);
  };

  // Submit Update Delivery Progress
  const handleSaveDelivery = async (e) => {
    e.preventDefault();
    if (!targetOrder) return;
    setSubmittingDelivery(true);

    try {
      await adminApi.updateDeliveryProgress(targetOrder._id, {
        deliveryStatus: deliveryStatusInput,
        courierName: courierNameInput,
        trackingNumber: trackingNumberInput,
        checkpointLocation: checkpointLocationInput,
        checkpointNote: checkpointNoteInput,
        estimatedDeliveryDate: estimatedDateInput || undefined,
      });

      addToast(`Delivery progress updated for order ${targetOrder.orderNumber}!`, "success");
      setShowDeliveryModal(false);

      // Refresh products & orders data if modal open
      if (selectedReseller) {
        const res = await adminApi.getResellerOrderedProducts(selectedReseller._id);
        setProductsData(res.data || {});
      }
      fetchResellers();
    } catch (err) {
      addToast(err.message || "Failed to update delivery progress.", "error");
    } finally {
      setSubmittingDelivery(false);
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

  // Filter products in modal
  const filteredProducts = (productsData?.products || []).filter((p) => {
    if (!productSearch) return true;
    const term = productSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Reseller Management & Product Orders</h4>
          <p className="text-muted small mb-0">
            Monitor products ordered by each reseller, track order fulfillment, and inspect live delivery progress.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white shadow-sm" onClick={fetchResellers}>
            <i className="fa-solid fa-rotate me-1"></i> Refresh
          </button>
          <button className="btn-admin-primary shadow-sm" onClick={() => setShowCreateModal(true)}>
            <i className="fa-solid fa-plus me-1"></i>
            <span>Create Reseller</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card mb-4 p-3 shadow-sm border">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                placeholder="Search reseller by name, email, phone, business..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-dark rounded-pill px-3">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </form>
          </div>
          <div className="col-md-7 d-flex justify-content-md-end gap-2 flex-wrap">
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "170px" }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Resellers</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Approval</option>
              <option value="active">Active Accounts</option>
              <option value="blocked">Blocked Accounts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resellers Table */}
      <div className="admin-card p-0 overflow-hidden shadow-sm border">
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
            <table className="admin-table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: "180px" }}>Reseller</th>
                  <th style={{ minWidth: "150px" }}>Business Name</th>
                  <th style={{ minWidth: "120px" }}>Contact</th>
                  <th style={{ minWidth: "110px" }}>Approval</th>
                  <th style={{ minWidth: "90px" }}>Status</th>
                  <th style={{ minWidth: "100px" }}>Orders</th>
                  <th style={{ minWidth: "130px" }}>Total Sent</th>
                  <th style={{ minWidth: "130px" }}>Remaining Due</th>
                  <th style={{ minWidth: "180px" }} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((r) => {
                  const paid = (r.financialSummary?.totalPaidPaise || 0) / 100;
                  const balance = (r.financialSummary?.outstandingBalancePaise || 0) / 100;
                  const ordersCount = r.financialSummary?.totalOrders || 0;

                  return (
                    <tr key={r._id}>
                      <td>
                        <div className="fw-bold text-dark">{r.name}</div>
                        <div className="text-muted small" style={{ fontSize: "11px" }}>{r.email}</div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{r.businessInfo?.businessName || "Individual Partner"}</div>
                        <div className="text-muted small" style={{ fontSize: "11px" }}>{r.businessInfo?.city || "India"}</div>
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
                          style={{ fontSize: "10px" }}
                        >
                          {r.approvalStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            r.accountStatus === "active" ? "admin-badge-success" : "admin-badge-danger"
                          }`}
                          style={{ fontSize: "10px" }}
                        >
                          {r.accountStatus}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border fw-bold px-2 py-1">
                          {ordersCount} orders
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold text-success fs-6">
                          ₹{paid.toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <div className={`fw-bold fs-6 ${balance > 0 ? "text-danger" : "text-dark"}`}>
                          ₹{balance.toFixed(2)}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {/* Products Ordered & Delivery Progress Button */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            title="Monitor Ordered Products & Delivery Progress"
                            onClick={() => handleOpenOrderedProducts(r)}
                          >
                            <i className="fa-solid fa-boxes-packing me-1"></i> Products
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            title="View Account Snapshot"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
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

      {/* Ordered Products & Delivery Progress Modal */}
      {showProductsModal && selectedReseller && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom bg-light rounded-top-4">
                <div>
                  <h5 className="modal-title fw-bold text-dark">
                    <i className="fa-solid fa-boxes-stacked text-primary me-2"></i>
                    Ordered Products & Delivery Progress: {selectedReseller.name}
                  </h5>
                  <span className="text-muted small">
                    {selectedReseller.businessInfo?.businessName ? `${selectedReseller.businessInfo.businessName} • ` : ""}
                    {selectedReseller.email} • Ph: {selectedReseller.phone || "N/A"}
                  </span>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowProductsModal(false)}></button>
              </div>

              {/* Navigation Tabs */}
              <div className="px-4 pt-3 border-bottom bg-white d-flex justify-content-between align-items-center">
                <ul className="nav nav-pills gap-2">
                  <li className="nav-item">
                    <button
                      className={`btn btn-sm rounded-pill px-4 ${productsTab === "products" ? "btn-dark text-white" : "btn-light text-muted border"}`}
                      onClick={() => setProductsTab("products")}
                    >
                      <i className="fa-solid fa-box-open me-2"></i>
                      Products Ordered ({productsData?.products?.length || 0})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`btn btn-sm rounded-pill px-4 ${productsTab === "orders" ? "btn-dark text-white" : "btn-light text-muted border"}`}
                      onClick={() => setProductsTab("orders")}
                    >
                      <i className="fa-solid fa-truck-fast me-2"></i>
                      Orders & Deliveries ({productsData?.orders?.length || 0})
                    </button>
                  </li>
                </ul>

                {productsTab === "products" && (
                  <div style={{ maxWidth: "250px" }}>
                    <input
                      type="text"
                      className="form-control form-control-sm rounded-pill"
                      placeholder="Filter product or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-body p-4 bg-light">
                {loadingProducts ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted small mt-2">Aggregating reseller products and logistics...</p>
                  </div>
                ) : (
                  <>
                    {/* Summary KPI Cards */}
                    <div className="row g-3 mb-4">
                      <div className="col-sm-6 col-md-3">
                        <div className="p-3 bg-white rounded-3 border shadow-sm">
                          <span className="text-muted small">Distinct SKUs Ordered</span>
                          <h4 className="fw-bold text-dark mt-1 mb-0">{productsData?.summary?.totalProductsCount || 0}</h4>
                        </div>
                      </div>
                      <div className="col-sm-6 col-md-3">
                        <div className="p-3 bg-white rounded-3 border shadow-sm">
                          <span className="text-muted small">Total Units Ordered</span>
                          <h4 className="fw-bold text-primary mt-1 mb-0">{productsData?.summary?.totalUnitsOrdered || 0}</h4>
                        </div>
                      </div>
                      <div className="col-sm-6 col-md-3">
                        <div className="p-3 bg-white rounded-3 border shadow-sm">
                          <span className="text-muted small">Total Wholesale Spend</span>
                          <h4 className="fw-bold text-success mt-1 mb-0">₹{productsData?.summary?.totalWholesaleSpendRupees || 0}</h4>
                        </div>
                      </div>
                      <div className="col-sm-6 col-md-3">
                        <div className="p-3 bg-white rounded-3 border shadow-sm">
                          <span className="text-muted small">Reseller Margins Earned</span>
                          <h4 className="fw-bold text-success mt-1 mb-0">+₹{productsData?.summary?.totalProfitEarnedRupees || 0}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Tab 1: Products Ordered */}
                    {productsTab === "products" && (
                      <div className="admin-card p-0 overflow-hidden shadow-sm border bg-white">
                        {filteredProducts.length === 0 ? (
                          <div className="text-center py-5">
                            <i className="fa-solid fa-box-open fa-3x text-muted mb-3"></i>
                            <h6 className="fw-bold">No Products Found</h6>
                            <p className="text-muted small">This reseller hasn't placed confirmed product orders yet.</p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="admin-table table-hover align-middle mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th style={{ minWidth: "220px" }}>Product</th>
                                  <th style={{ minWidth: "120px" }}>SKU</th>
                                  <th style={{ minWidth: "100px" }}>Units</th>
                                  <th style={{ minWidth: "120px" }}>Wholesale Cost</th>
                                  <th style={{ minWidth: "120px" }}>Customer Price</th>
                                  <th style={{ minWidth: "130px" }}>Total Spend</th>
                                  <th style={{ minWidth: "130px" }}>Reseller Profit</th>
                                  <th style={{ minWidth: "100px" }}>Orders Count</th>
                                  <th style={{ minWidth: "120px" }}>Last Ordered</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredProducts.map((p, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        {p.image ? (
                                          <img
                                            src={p.image}
                                            alt={p.name}
                                            className="rounded-2 border object-fit-cover"
                                            style={{ width: "42px", height: "42px" }}
                                          />
                                        ) : (
                                          <div
                                            className="rounded-2 border bg-light d-flex align-items-center justify-content-center text-muted"
                                            style={{ width: "42px", height: "42px" }}
                                          >
                                            <i className="fa-solid fa-cube"></i>
                                          </div>
                                        )}
                                        <div>
                                          <strong className="text-dark d-block" style={{ fontSize: "13px" }}>
                                            {p.name}
                                          </strong>
                                          {(p.color || p.size) && (
                                            <div className="d-flex gap-1 mt-1">
                                              {p.color && <span className="badge bg-light text-dark border" style={{ fontSize: "9px" }}>{p.color}</span>}
                                              {p.size && <span className="badge bg-light text-dark border" style={{ fontSize: "9px" }}>{p.size}</span>}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td><code>{p.sku}</code></td>
                                    <td>
                                      <span className="badge bg-primary-subtle text-primary border border-primary fw-bold px-2 py-1">
                                        {p.totalQuantity} units
                                      </span>
                                    </td>
                                    <td className="fw-semibold">₹{p.wholesaleUnitPriceRupees}</td>
                                    <td className="fw-semibold text-dark">₹{p.customerUnitPriceRupees}</td>
                                    <td className="fw-bold text-success">₹{p.totalWholesaleSpendRupees}</td>
                                    <td className="fw-bold text-success">+₹{p.totalProfitRupees}</td>
                                    <td>
                                      <span className="badge bg-light text-muted border">
                                        {p.ordersCount} orders
                                      </span>
                                    </td>
                                    <td className="small text-muted">
                                      {new Date(p.lastOrderedAt).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Orders & Delivery Progress */}
                    {productsTab === "orders" && (
                      <div className="d-flex flex-column gap-3">
                        {(!productsData?.orders || productsData.orders.length === 0) ? (
                          <div className="admin-card p-5 text-center bg-white shadow-sm border">
                            <i className="fa-solid fa-truck-ramp-box fa-3x text-muted mb-3"></i>
                            <h6 className="fw-bold">No Orders Placed Yet</h6>
                            <p className="text-muted small">No order dispatches recorded for this reseller.</p>
                          </div>
                        ) : (
                          productsData.orders.map((o) => {
                            const isCod = o.paymentMethod === "COD";
                            const itemsCount = (o.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
                            const deliveryStage = (o.deliveryStatus || o.orderStatus || "CONFIRMED").toUpperCase();

                            // Compute percent for progress bar
                            let percent = 25;
                            if (deliveryStage === "DISPATCHED" || deliveryStage === "SHIPPED") percent = 50;
                            else if (deliveryStage === "IN_TRANSIT") percent = 75;
                            else if (deliveryStage === "OUT_FOR_DELIVERY") percent = 90;
                            else if (deliveryStage === "DELIVERED") percent = 100;
                            else if (deliveryStage === "CANCELLED" || deliveryStage === "FAILED") percent = 100;

                            return (
                              <div key={o._id} className="admin-card p-3 bg-white shadow-sm border">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 pb-2 mb-3 border-bottom">
                                  <div>
                                    <strong className="fs-6 text-dark me-2">{o.orderNumber}</strong>
                                    {o.isFastDelivery && (
                                      <span className="badge bg-danger text-white me-2" style={{ fontSize: "10.5px" }}>
                                        <i className="fa-solid fa-bolt me-1"></i> Fast Delivery
                                      </span>
                                    )}
                                    <span className="text-muted small">
                                      Placed on {new Date(o.createdAt).toLocaleString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>

                                  <div className="d-flex align-items-center gap-2">
                                    <span
                                      className={`badge ${
                                        isCod ? "bg-warning-subtle text-dark border border-warning" : "bg-primary-subtle text-primary border border-primary"
                                      }`}
                                      style={{ fontSize: "11px" }}
                                    >
                                      {o.paymentMethod || "COD"}
                                    </span>
                                    <span
                                      className={`admin-badge ${
                                        deliveryStage === "DELIVERED"
                                          ? "admin-badge-success"
                                          : deliveryStage === "SHIPPED" || deliveryStage === "IN_TRANSIT"
                                          ? "admin-badge-info"
                                          : deliveryStage === "CANCELLED"
                                          ? "admin-badge-danger"
                                          : "admin-badge-warning"
                                      }`}
                                      style={{ fontSize: "11px" }}
                                    >
                                      {deliveryStage}
                                    </span>
                                  </div>
                                </div>

                                {/* Order Content & Logistics */}
                                <div className="row g-3 align-items-center">
                                  <div className="col-md-5">
                                    <div className="small text-muted mb-1">
                                      Recipient: <strong className="text-dark">{o.shippingAddress?.fullName || o.shippingAddress?.firstName}</strong> ({o.shippingAddress?.city}, {o.shippingAddress?.state})
                                    </div>
                                    <div className="small text-muted">
                                      Package: <strong className="text-dark">{itemsCount} items</strong> • Total: <strong className="text-dark">₹{(((o.customerSellingTotalPaise || o.totalPaise) / 100)).toFixed(2)}</strong>
                                    </div>
                                  </div>

                                  <div className="col-md-4">
                                    <div className="small mb-1">
                                      Courier: <strong className="text-dark">{o.courierName || "India Post (Business Parcel)"}</strong>
                                    </div>
                                    <div className="small">
                                      AWB / Consignment:{" "}
                                      {o.trackingNumber ? (
                                        <code className="text-primary fw-bold">{o.trackingNumber}</code>
                                      ) : (
                                        <span className="text-muted">Awaiting Dispatch</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="col-md-3 text-md-end">
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        title="Track Consignment Live on India Post"
                                        onClick={() => handleTrackConsignment(o.trackingNumber || o.orderNumber)}
                                      >
                                        <i className="fa-solid fa-location-dot me-1"></i> Track
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-light border"
                                        title="Update Delivery Status"
                                        onClick={() => handleOpenUpdateDelivery(o)}
                                      >
                                        <i className="fa-solid fa-pen-to-square me-1"></i> Update
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Delivery Progress Bar Stepper */}
                                <div className="mt-3 pt-3 border-top">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="small text-muted fw-semibold">Delivery Progress:</span>
                                    <span className="small fw-bold text-primary">{deliveryStage} ({percent}%)</span>
                                  </div>
                                  <div className="progress" style={{ height: "8px" }}>
                                    <div
                                      className={`progress-bar progress-bar-striped progress-bar-animated ${
                                        deliveryStage === "DELIVERED" ? "bg-success" : deliveryStage === "CANCELLED" ? "bg-danger" : "bg-primary"
                                      }`}
                                      role="progressbar"
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>
                                  <div className="d-flex justify-content-between text-muted mt-1" style={{ fontSize: "10px" }}>
                                    <span>Booked</span>
                                    <span>Dispatched</span>
                                    <span>In Transit</span>
                                    <span>Out for Delivery</span>
                                    <span>Delivered</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer border-top bg-white">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowProductsModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Consignment Tracking Modal (India Post & Multi-Courier) */}
      {showTrackingModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom bg-light rounded-top-4">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="p-2 rounded-3 bg-danger text-white d-flex align-items-center justify-content-center"
                    style={{ width: "38px", height: "38px" }}
                  >
                    <i className="fa-solid fa-envelope-open-text"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Consignment Tracking</h5>
                    <span className="text-muted small">
                      {trackingData?.courierName || "India Post (Business Parcel)"} • {trackingData?.trackingNumber}
                    </span>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowTrackingModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {loadingTracking ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-danger" role="status"></div>
                    <p className="text-muted small mt-2">Connecting to parcel tracking server...</p>
                  </div>
                ) : !trackingData ? (
                  <div className="text-center py-5">
                    <i className="fa-solid fa-triangle-exclamation fa-3x text-warning mb-3"></i>
                    <h6 className="fw-bold">Tracking Data Unavailable</h6>
                    <p className="text-muted small">No live checkpoints found for this consignment ID.</p>
                  </div>
                ) : (
                  <>
                    {/* Status Header Banner */}
                    <div className="p-3 rounded-3 border mb-4 bg-light">
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div>
                          <span className="badge bg-danger-subtle text-danger border border-danger mb-1" style={{ fontSize: "11px" }}>
                            {trackingData.courierName}
                          </span>
                          <h4 className="fw-bold text-dark mb-1">{trackingData.currentStatus}</h4>
                          <div className="small text-muted">
                            Consignment ID: <code className="fw-bold text-dark">{trackingData.trackingNumber}</code>
                          </div>
                        </div>

                        {trackingData.officialTrackingUrl && (
                          <a
                            href={trackingData.officialTrackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-danger rounded-pill px-3 shadow-sm"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square me-1"></i> Track on India Post Portal
                          </a>
                        )}
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="mt-3 pt-3 border-top">
                        <div className="progress" style={{ height: "8px" }}>
                          <div
                            className="progress-bar progress-bar-striped progress-bar-animated bg-danger"
                            role="progressbar"
                            style={{ width: `${trackingData.progressPercent || 50}%` }}
                          ></div>
                        </div>
                        <div className="d-flex justify-content-between small text-muted mt-2">
                          <span>Origin: <strong>{trackingData.origin}</strong></span>
                          <span>Destination: <strong>{trackingData.destination}</strong></span>
                        </div>
                        {trackingData.estimatedDelivery && (
                          <div className="small text-success fw-semibold mt-1">
                            <i className="fa-regular fa-calendar-check me-1"></i>
                            Estimated Delivery: {new Date(trackingData.estimatedDelivery).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkpoint Timeline History */}
                    <h6 className="fw-bold text-dark mb-3">
                      <i className="fa-solid fa-timeline me-2 text-danger"></i>
                      Consignment Checkpoint History
                    </h6>

                    {(!trackingData.history || trackingData.history.length === 0) ? (
                      <p className="text-muted small">No tracking events posted yet.</p>
                    ) : (
                      <div className="position-relative ps-4 border-start border-2 border-danger ms-2">
                        {trackingData.history.map((h, i) => (
                          <div key={i} className="mb-3 position-relative">
                            <div
                              className="position-absolute bg-danger rounded-circle border border-2 border-white"
                              style={{ width: "12px", height: "12px", left: "-23px", top: "5px" }}
                            ></div>
                            <div className="p-3 bg-white rounded-3 border shadow-sm">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="text-dark fs-6">{h.status}</strong>
                                <span className="small text-muted" style={{ fontSize: "11px" }}>
                                  {new Date(h.timestamp).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="small text-muted mb-1">
                                <i className="fa-solid fa-location-dot me-1 text-danger"></i> {h.location}
                              </div>
                              {h.details && (
                                <div className="small text-secondary" style={{ fontSize: "11px" }}>
                                  {h.details}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowTrackingModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Delivery Progress Modal */}
      {showDeliveryModal && targetOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleSaveDelivery}>
                <div className="modal-header border-bottom bg-light rounded-top-4">
                  <h5 className="modal-title fw-bold text-dark">
                    <i className="fa-solid fa-truck-fast text-primary me-2"></i>
                    Update Delivery: {targetOrder.orderNumber}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowDeliveryModal(false)}></button>
                </div>

                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Delivery Progress Stage *</label>
                    <select
                      className="form-select"
                      value={deliveryStatusInput}
                      onChange={(e) => setDeliveryStatusInput(e.target.value)}
                    >
                      <option value="BOOKED">BOOKED (Consignment Booked & Manifest Created)</option>
                      <option value="DISPATCHED">DISPATCHED (Handed over at Sorting Office)</option>
                      <option value="IN_TRANSIT">IN TRANSIT (Line-haul Transit between Hubs)</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY (With Beat Postman / Agent)</option>
                      <option value="DELIVERED">DELIVERED (Completed Successfully)</option>
                      <option value="RETURNED">RETURNED / FAILED (RTO / Unclaimed)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Courier Logistics Partner</label>
                    <select
                      className="form-select"
                      value={courierNameInput}
                      onChange={(e) => setCourierNameInput(e.target.value)}
                    >
                      <option value="India Post (Business Parcel)">India Post (Business Parcel)</option>
                      <option value="Delhivery Logistics">Delhivery Logistics</option>
                      <option value="Blue Dart Express">Blue Dart Express</option>
                      <option value="DTDC Courier">DTDC Courier</option>
                      <option value="XpressBees Logistics">XpressBees Logistics</option>
                      <option value="Shadowfax Logistics">Shadowfax Logistics</option>
                      <option value="Standard Courier">Standard Courier</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Consignment / Tracking Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. RM019388105IN or AWB..."
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                    />
                    <div className="small text-muted mt-1">
                      India Post articles format: 2 letters, 9 numbers, and IN (e.g. RM019388105IN)
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Current Checkpoint Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. New Delhi GPO, Mumbai Sorting Hub"
                      value={checkpointLocationInput}
                      onChange={(e) => setCheckpointLocationInput(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Checkpoint Note / Event Remarks</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Item bagged for destination line-haul"
                      value={checkpointNoteInput}
                      onChange={(e) => setCheckpointNoteInput(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Estimated Delivery Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={estimatedDateInput}
                      onChange={(e) => setEstimatedDateInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowDeliveryModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={submittingDelivery}>
                    {submittingDelivery ? "Saving..." : "Save Delivery Progress"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
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
                        ₹{(((selectedReseller.financialSummary?.totalPurchasesPaise || selectedReseller.financialSummary?.totalOrderValuePaise || 0)) / 100).toFixed(2)}
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
                          <th>Entry #</th>
                          <th>Type</th>
                          <th>Reference</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resellerLedger.map((l) => (
                          <tr key={l._id}>
                            <td>{new Date(l.createdAt).toLocaleDateString()}</td>
                            <td><code>{l.entryNumber}</code></td>
                            <td>
                              <span className={`admin-badge ${l.type === "DEBIT" ? "admin-badge-danger" : "admin-badge-success"}`}>
                                {l.type}
                              </span>
                            </td>
                            <td>{l.referenceType} ({l.referenceId || "—"})</td>
                            <td>{l.description}</td>
                            <td className={`fw-bold ${l.type === "DEBIT" ? "text-danger" : "text-success"}`}>
                              {l.type === "DEBIT" ? "+" : "-"}₹{(l.amountPaise / 100).toFixed(2)}
                            </td>
                            <td className="fw-semibold">₹{(l.balanceAfterPaise / 100).toFixed(2)}</td>
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
                  <h5 className="modal-title fw-bold">Create Direct Reseller Account</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Full Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. Rahul Sharma"
                        value={newReseller.name}
                        onChange={(e) => setNewReseller({ ...newReseller, name: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Email Address *</label>
                      <input
                        type="email"
                        required
                        className="form-control"
                        placeholder="e.g. rahul@sparepro.in"
                        value={newReseller.email}
                        onChange={(e) => setNewReseller({ ...newReseller, email: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Initial Password *</label>
                      <input
                        type="password"
                        required
                        className="form-control"
                        placeholder="At least 6 characters"
                        value={newReseller.password}
                        onChange={(e) => setNewReseller({ ...newReseller, password: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        className="form-control"
                        placeholder="+91 98765 43210"
                        value={newReseller.phone}
                        onChange={(e) => setNewReseller({ ...newReseller, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Business / Shop Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Sharma Auto Spares"
                        value={newReseller.businessName}
                        onChange={(e) => setNewReseller({ ...newReseller, businessName: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">GSTIN / Tax ID</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 07AAAAA0000A1Z5"
                        value={newReseller.taxId}
                        onChange={(e) => setNewReseller({ ...newReseller, taxId: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Shop / Office address"
                        value={newReseller.address}
                        onChange={(e) => setNewReseller({ ...newReseller, address: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Mumbai"
                        value={newReseller.city}
                        onChange={(e) => setNewReseller({ ...newReseller, city: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">State</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Maharashtra"
                        value={newReseller.state}
                        onChange={(e) => setNewReseller({ ...newReseller, state: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">Postal Code</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 400001"
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
