import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { adminApi, ordersApi, paymentsApi, codApi } from "../services/api";

export default function AccountDashboard() {
  const { user, role, approvalStatus, isApproved, isAuthenticated, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  // Admin Data States
  const [adminStats, setAdminStats] = useState(null);
  const [pendingResellers, setPendingResellers] = useState([]);
  const [allResellers, setAllResellers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [codPendingList, setCodPendingList] = useState([]);
  const [financialReports, setFinancialReports] = useState(null);

  // Reseller Data States
  const [resellerOrders, setResellerOrders] = useState([]);
  const [resellerSummary, setResellerSummary] = useState(null);
  const [resellerLedger, setResellerLedger] = useState([]);
  const [selectedResellerOrder, setSelectedResellerOrder] = useState(null);

  // Live Tracking Modal & Search States
  const [trackQuery, setTrackQuery] = useState("");
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Fetch initial data based on role
  useEffect(() => {
    if (!isAuthenticated) return;

    if (role === "admin") {
      loadAdminDashboardData();
    } else {
      loadResellerData();
    }
  }, [isAuthenticated, role]);

  const getPayload = (res) => {
    if (!res) return null;
    if (res.data?.data !== undefined) return res.data.data;
    if (res.data !== undefined) return res.data;
    return res;
  };

  const loadAdminDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, ordersRes, codRes] = await Promise.all([
        adminApi.getDashboardStats().catch(() => null),
        adminApi.getResellers({ approvalStatus: "pending" }).catch(() => null),
        adminApi.getOrders({ limit: 20 }).catch(() => null),
        codApi.getPending({ limit: 20 }).catch(() => null),
      ]);

      const stats = getPayload(statsRes);
      if (stats) setAdminStats(stats);

      const pending = getPayload(pendingRes);
      if (pending?.resellers) setPendingResellers(pending.resellers);

      const orders = getPayload(ordersRes);
      if (orders?.orders) setAllOrders(orders.orders);

      const cod = getPayload(codRes);
      if (cod?.codPendingOrders) setCodPendingList(cod.codPendingOrders);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const loadResellerData = async () => {
    setLoading(true);
    try {
      const [ordersRes, summaryRes, ledgerRes] = await Promise.all([
        ordersApi.getMyOrders().catch(() => ordersApi.getAll().catch(() => null)),
        paymentsApi.getResellerSummary().catch(() => null),
        paymentsApi.getResellerLedger().catch(() => null),
      ]);

      const ordersPayload = getPayload(ordersRes);
      const ordersList =
        ordersPayload?.orders ||
        ordersPayload?.data?.orders ||
        ordersRes?.data?.data?.orders ||
        ordersRes?.data?.orders ||
        (Array.isArray(ordersPayload) ? ordersPayload : []);
      if (Array.isArray(ordersList)) {
        setResellerOrders(ordersList);
      }

      const summaryPayload = getPayload(summaryRes);
      const summaryData = summaryPayload?.data || summaryPayload;
      if (summaryData) setResellerSummary(summaryData);

      const ledgerPayload = getPayload(ledgerRes);
      const ledgerList =
        ledgerPayload?.ledger ||
        ledgerPayload?.data?.ledger ||
        ledgerRes?.data?.data?.ledger ||
        ledgerRes?.data?.ledger ||
        (Array.isArray(ledgerPayload) ? ledgerPayload : []);
      if (Array.isArray(ledgerList)) {
        setResellerLedger(ledgerList);
      }
    } catch (err) {
      console.error("Failed to load reseller data", err);
    } finally {
      setLoading(false);
    }
  };

  // Delivery & Tracking Helpers
  const getDeliveryProgressInfo = (order) => {
    const status = (order?.deliveryStatus || order?.orderStatus || "CONFIRMED").toUpperCase();
    switch (status) {
      case "PENDING":
        return { stage: "PENDING", percent: 20, label: "Order Placed", badgeClass: "dash-status-pill booked", pillClass: "booked" };
      case "BOOKED":
      case "CONFIRMED":
        return { stage: "BOOKED", percent: 35, label: "Consignment Booked", badgeClass: "dash-status-pill booked", pillClass: "booked" };
      case "PROCESSING":
        return { stage: "PROCESSING", percent: 45, label: "Warehouse Processing", badgeClass: "dash-status-pill transit", pillClass: "transit" };
      case "DISPATCHED":
      case "SHIPPED":
        return { stage: "DISPATCHED", percent: 60, label: "Dispatched from Hub", badgeClass: "dash-status-pill transit", pillClass: "transit" };
      case "IN_TRANSIT":
        return { stage: "IN_TRANSIT", percent: 75, label: "In Transit", badgeClass: "dash-status-pill transit", pillClass: "transit" };
      case "OUT_FOR_DELIVERY":
        return { stage: "OUT_FOR_DELIVERY", percent: 90, label: "Out for Delivery", badgeClass: "dash-status-pill out_for_delivery", pillClass: "out_for_delivery" };
      case "DELIVERED":
        return { stage: "DELIVERED", percent: 100, label: "Delivered", badgeClass: "dash-status-pill delivered", pillClass: "delivered" };
      case "CANCELLED":
      case "FAILED":
      case "RETURNED":
        return { stage: status, percent: 100, label: status === "RETURNED" ? "Returned to Sender" : "Cancelled", badgeClass: "dash-status-pill failed", pillClass: "failed" };
      default:
        return { stage: status, percent: 50, label: status.replace(/_/g, " "), badgeClass: "dash-status-pill transit", pillClass: "transit" };
    }
  };

  const handleTrackOrder = async (identifier) => {
    const query = (identifier || trackQuery || "").trim();
    if (!query) {
      addToast("Please enter an Order Number or Consignment / Tracking ID", "error");
      return;
    }
    setLoadingTracking(true);
    setShowTrackingModal(true);
    try {
      const res = await ordersApi.getTracking(query);
      const data = res.data?.data || res.data;
      setTrackingData(data);
    } catch (err) {
      console.error("Failed to load tracking details:", err);
      const errMsg = err.response?.data?.message || "Could not retrieve parcel tracking details.";
      addToast(errMsg, "error");
      setTrackingData(null);
    } finally {
      setLoadingTracking(false);
    }
  };

  // Admin Actions
  const handleApproveReseller = async (resellerId) => {
    try {
      await adminApi.approveReseller(resellerId);
      addToast("Reseller approved successfully!", "success");
      setPendingResellers((prev) => prev.filter((r) => r._id !== resellerId));
      loadAdminDashboardData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to approve reseller", "error");
    }
  };

  const handleRejectReseller = async (resellerId) => {
    const reason = window.prompt("Reason for rejection:", "Incomplete documentation");
    if (!reason) return;
    try {
      await adminApi.rejectReseller(resellerId, reason);
      addToast("Reseller application rejected.", "info");
      setPendingResellers((prev) => prev.filter((r) => r._id !== resellerId));
      loadAdminDashboardData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject reseller", "error");
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      addToast(`Order ${newStatus.toLowerCase()} successfully`, "success");
      loadAdminDashboardData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update order status", "error");
    }
  };

  const handleMarkCodCollected = async (codId) => {
    const notes = window.prompt("Collection Reference / Courier Receipt Number:", "COL-" + Date.now().toString().slice(-6));
    if (!notes) return;
    try {
      await codApi.markCollected(codId, { notes });
      addToast("COD marked as collected and credited to balance!", "success");
      loadAdminDashboardData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to mark COD collected", "error");
    }
  };

  const handleLoadReports = async () => {
    try {
      const res = await adminApi.getBalanceSheet();
      const reportData = res?.data || res;
      if (reportData) setFinancialReports(reportData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    addToast("Logged out successfully", "info");
    navigate("/login");
  };

  if (!isAuthenticated) {
    return (
      <>
        <Breadcrumb title="My Account" links={[{ label: "Account" }]} />
        <div className="container py-5 text-center">
          <div className="bg-white p-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: "520px" }}>
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center text-primary bg-primary-subtle mb-3" style={{ width: "70px", height: "70px" }}>
              <i className="fa-solid fa-lock fa-2x"></i>
            </div>
            <h4 className="fw-bold mb-2">Wholesale Portal Access</h4>
            <p className="text-muted mb-4 small">
              Please sign in to access your wholesale dashboard, reseller pricing, order ledger, and tracking.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to="/login" className="btn btn-dark rounded-pill px-4">
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title={role === "admin" ? "Admin Control Panel" : "Reseller Portal"} links={[{ label: "Dashboard" }]} />

      <div className="account-dashboard-page py-5">
        <div className="container">
          {/* Approval Notice Banner for Reseller */}
          {role === "reseller" && approvalStatus === "pending" && (
            <div className="alert alert-warning border-warning shadow-sm rounded-4 mb-4 p-4 d-flex align-items-start gap-3">
              <i className="fa-solid fa-clock-rotate-left fa-2x text-warning mt-1"></i>
              <div>
                <h5 className="alert-heading fw-bold mb-1">Registration Under Review</h5>
                <p className="mb-1 small">
                  Your wholesale reseller account for <strong>{user?.businessInfo?.businessName || user?.name}</strong> is currently pending admin verification.
                  Once verified, wholesale pricing and order placement will be automatically enabled.
                </p>
                <span className="badge bg-warning text-dark fw-bold">Status: Pending Verification</span>
              </div>
            </div>
          )}

          {role === "reseller" && approvalStatus === "rejected" && (
            <div className="alert alert-danger shadow-sm rounded-4 mb-4 p-4">
              <h5 className="fw-bold mb-1">Reseller Application Status: Rejected</h5>
              <p className="mb-0 small">Please contact SPARE PRO support at <code>support@sparepro.com</code> to update your business documentation.</p>
            </div>
          )}

          {/* MOBILE PROFILE & HORIZONTAL TABS (< 992px) */}
          <div className="d-block d-lg-none mb-3">
            <div className="dash-card p-3 mb-2">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="dash-avatar" style={{ width: "46px", height: "46px", fontSize: "16px" }}>
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "SP"}
                    <span className="dash-avatar-status"></span>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">{user?.name}</h6>
                    <div className="dash-user-email" style={{ fontSize: "11px", marginBottom: "3px" }}>{user?.email}</div>
                    <div className="d-flex align-items-center gap-1">
                      <span className="badge-role">
                        {role === "admin" ? "Super Admin" : "Reseller"}
                      </span>
                      {role === "reseller" && (
                        <span className={approvalStatus === "approved" ? "badge-approved" : "badge-pending"}>
                          {approvalStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                  title="Sign Out"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Tabs Bar on Mobile */}
            <div className="d-flex gap-2 overflow-x-auto pb-2 text-nowrap no-scrollbar">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "dashboard" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <i className="fa-solid fa-gauge me-1"></i> Overview
              </button>

              {role === "admin" ? (
                <>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "approvals" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={() => setActiveTab("approvals")}
                  >
                    <i className="fa-solid fa-user-check me-1"></i> Approvals {pendingResellers.length > 0 && `(${pendingResellers.length})`}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "resellers" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={async () => {
                      setActiveTab("resellers");
                      const res = await adminApi.getResellers();
                      const resellersList = res?.data?.resellers || res?.resellers || (Array.isArray(res?.data) ? res.data : null);
                      if (resellersList) setAllResellers(resellersList);
                    }}
                  >
                    <i className="fa-solid fa-users me-1"></i> Resellers
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "orders" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={() => setActiveTab("orders")}
                  >
                    <i className="fa-solid fa-boxes-stacked me-1"></i> Orders
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "cod" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={() => setActiveTab("cod")}
                  >
                    <i className="fa-solid fa-hand-holding-dollar me-1"></i> COD {codPendingList.length > 0 && `(${codPendingList.length})`}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "reports" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={() => {
                      setActiveTab("reports");
                      handleLoadReports();
                    }}
                  >
                    <i className="fa-solid fa-file-invoice-dollar me-1"></i> Reports
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "orders" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={() => {
                      setActiveTab("orders");
                      loadResellerData();
                    }}
                  >
                    <i className="fa-solid fa-box-open me-1"></i> Orders {resellerOrders.length > 0 && `(${resellerOrders.length})`}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "ledger" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={() => setActiveTab("ledger")}
                  >
                    <i className="fa-solid fa-file-lines me-1"></i> Statement
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 ${activeTab === "business" ? "btn-dark text-white shadow-sm" : "btn-light border"}`}
                    onClick={() => setActiveTab("business")}
                  >
                    <i className="fa-solid fa-store me-1"></i> Profile
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="row g-4">
            {/* Desktop Sidebar Navigation (>= 992px) */}
            <div className="col-lg-3 d-none d-lg-block">
              <div className="dash-card p-4" style={{ position: "sticky", top: "110px" }}>
                <div className="text-center pb-3 mb-3 border-bottom">
                  <div className="dash-avatar mb-2">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "SP"}
                    <span className="dash-avatar-status"></span>
                  </div>
                  <div className="dash-user-name">{user?.name}</div>
                  <div className="dash-user-email">{user?.email}</div>
                  <div className="d-flex justify-content-center gap-1 mt-2">
                    <span className="badge-role">
                      {role === "admin" ? "Super Admin" : "Reseller"}
                    </span>
                    {role === "reseller" && (
                      <span className={approvalStatus === "approved" ? "badge-approved" : "badge-pending"}>
                        {approvalStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Specific Nav Items - Vertical stack on desktop */}
                <div className="d-flex flex-column gap-1">
                  <button
                    type="button"
                    className={`dash-nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
                    onClick={() => setActiveTab("dashboard")}
                  >
                    <span><i className="fa-solid fa-gauge"></i> Dashboard Overview</span>
                  </button>

                  {role === "admin" ? (
                    <>
                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "approvals" ? "active" : ""}`}
                        onClick={() => setActiveTab("approvals")}
                      >
                        <span><i className="fa-solid fa-user-check"></i> Reseller Approvals</span>
                        {pendingResellers.length > 0 && (
                          <span className="dash-nav-pill-count bg-danger text-white">{pendingResellers.length}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "resellers" ? "active" : ""}`}
                        onClick={async () => {
                          setActiveTab("resellers");
                          const res = await adminApi.getResellers();
                          const resellersList = res?.data?.resellers || res?.resellers || (Array.isArray(res?.data) ? res.data : null);
                          if (resellersList) setAllResellers(resellersList);
                        }}
                      >
                        <span><i className="fa-solid fa-users"></i> All Resellers</span>
                      </button>

                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "orders" ? "active" : ""}`}
                        onClick={() => setActiveTab("orders")}
                      >
                        <span><i className="fa-solid fa-boxes-stacked"></i> Order Management</span>
                      </button>

                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "cod" ? "active" : ""}`}
                        onClick={() => setActiveTab("cod")}
                      >
                        <span><i className="fa-solid fa-hand-holding-dollar"></i> COD Pending</span>
                        {codPendingList.length > 0 && (
                          <span className="dash-nav-pill-count bg-warning text-dark">{codPendingList.length}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "reports" ? "active" : ""}`}
                        onClick={() => {
                          setActiveTab("reports");
                          handleLoadReports();
                        }}
                      >
                        <span><i className="fa-solid fa-file-invoice-dollar"></i> Balance & Reports</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "orders" ? "active" : ""}`}
                        onClick={() => {
                          setActiveTab("orders");
                          loadResellerData();
                        }}
                      >
                        <span><i className="fa-solid fa-box-open"></i> My Orders</span>
                        {resellerOrders.length > 0 && (
                          <span className="dash-nav-pill-count">{resellerOrders.length}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "ledger" ? "active" : ""}`}
                        onClick={() => setActiveTab("ledger")}
                      >
                        <span><i className="fa-solid fa-file-lines"></i> Statement & Ledger</span>
                      </button>

                      <button
                        type="button"
                        className={`dash-nav-btn ${activeTab === "business" ? "active" : ""}`}
                        onClick={() => setActiveTab("business")}
                      >
                        <span><i className="fa-solid fa-store"></i> Business Profile</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="dash-logout-btn"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-lg-9">
              <div className="dash-card p-4 p-md-5">
                {/* ADMIN VIEW: Dashboard Tab */}
                {role === "admin" && activeTab === "dashboard" && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <h4 className="fw-bold mb-1">Admin Operations Control</h4>
                        <span className="text-muted small">Live database synchronization • Financial ledger active</span>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-secondary rounded-pill"
                        onClick={loadAdminDashboardData}
                      >
                        <i className="fa-solid fa-rotate me-1"></i> Refresh
                      </button>
                    </div>

                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h3 className="fw-bold mb-1 text-primary">{adminStats?.resellers?.total || 0}</h3>
                          <span className="text-muted small">Total Resellers</span>
                          <div className="small text-warning mt-1 fw-semibold">
                            {adminStats?.resellers?.pending || 0} Pending Approvals
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h3 className="fw-bold mb-1 text-success">{adminStats?.financials?.totalSalesFormatted || "₹0.00"}</h3>
                          <span className="text-muted small">Total Sales Booked</span>
                          <div className="small text-muted mt-1">
                            {adminStats?.orders?.total || 0} Lifetime Orders
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h3 className="fw-bold mb-1 text-danger">{adminStats?.financials?.totalCodPendingFormatted || "₹0.00"}</h3>
                          <span className="text-muted small">COD Pending Collection</span>
                          <div className="small text-success mt-1 fw-semibold">
                            {adminStats?.financials?.totalPaymentsCollectedFormatted || "₹0.00"} Collected
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pending Approvals Quick Widget */}
                    <div className="card border-0 bg-light rounded-4 p-4 mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold mb-0">Pending Reseller Registrations</h5>
                        <button
                          className="btn btn-sm btn-dark rounded-pill px-3"
                          onClick={() => setActiveTab("approvals")}
                        >
                          View All ({pendingResellers.length})
                        </button>
                      </div>

                      {pendingResellers.length === 0 ? (
                        <p className="text-muted small mb-0">No pending reseller applications at this time.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm align-middle mb-0">
                            <thead>
                              <tr>
                                <th>Name / Email</th>
                                <th>Business Name</th>
                                <th>Phone</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingResellers.slice(0, 3).map((r) => (
                                <tr key={r._id}>
                                  <td>
                                    <div className="fw-semibold">{r.name}</div>
                                    <div className="small text-muted">{r.email}</div>
                                  </td>
                                  <td>{r.businessInfo?.businessName || "Individual"}</td>
                                  <td>{r.phone}</td>
                                  <td>
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        type="button"
                                        className="btn btn-success rounded-pill px-3 me-1"
                                        onClick={() => handleApproveReseller(r._id)}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger rounded-pill px-3"
                                        onClick={() => handleRejectReseller(r._id)}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Recent Orders Overview */}
                    <h5 className="fw-bold mb-3">Recent System Orders</h5>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Order #</th>
                            <th>Reseller</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allOrders.slice(0, 5).map((o) => (
                            <tr key={o._id}>
                              <td className="fw-semibold">{o.orderNumber}</td>
                              <td>{o.reseller?.name || "Direct"}</td>
                              <td className="fw-bold">₹{(o.totalAmountPaise / 100).toFixed(2)}</td>
                              <td>
                                <span className={`badge ${o.paymentStatus === "paid" ? "bg-success" : o.paymentStatus === "cod_pending" ? "bg-warning text-dark" : "bg-secondary"}`}>
                                  {o.paymentMethod.toUpperCase()} • {o.paymentStatus}
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-info-subtle text-info text-capitalize">{o.orderStatus}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ADMIN VIEW: Reseller Approvals Tab */}
                {role === "admin" && activeTab === "approvals" && (
                  <div>
                    <h4 className="fw-bold mb-3">Reseller Applications (Pending Approval)</h4>
                    <p className="text-muted small mb-4">
                      All new reseller signups default to pending. Approve verified partners to unlock wholesale catalog pricing and checkout capabilities.
                    </p>

                    {pendingResellers.length === 0 ? (
                      <div className="text-center py-5 bg-light rounded-4">
                        <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                        <h6 className="fw-bold">No Pending Applications</h6>
                        <p className="text-muted small mb-0">All reseller registrations are processed and up to date.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Applicant</th>
                              <th>Business Details</th>
                              <th>Location</th>
                              <th>Registration Date</th>
                              <th>Decision</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingResellers.map((r) => (
                              <tr key={r._id}>
                                <td>
                                  <div className="fw-bold">{r.name}</div>
                                  <div className="small text-muted">{r.email}</div>
                                  <div className="small text-muted">{r.phone}</div>
                                </td>
                                <td>
                                  <div className="fw-semibold">{r.businessInfo?.businessName || "N/A"}</div>
                                  <div className="small text-muted">GST: {r.businessInfo?.taxId || "Unspecified"}</div>
                                </td>
                                <td>
                                  <div className="small">
                                    {r.businessInfo?.city ? `${r.businessInfo.city}, ${r.businessInfo.state}` : "India"}
                                  </div>
                                </td>
                                <td>
                                  <div className="small text-muted">{new Date(r.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success rounded-pill px-3"
                                      onClick={() => handleApproveReseller(r._id)}
                                    >
                                      <i className="fa-solid fa-check me-1"></i> Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger rounded-pill px-3"
                                      onClick={() => handleRejectReseller(r._id)}
                                    >
                                      <i className="fa-solid fa-xmark me-1"></i> Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN VIEW: All Resellers Directory */}
                {role === "admin" && activeTab === "resellers" && (
                  <div>
                    <h4 className="fw-bold mb-3">Reseller Directory & Balance Management</h4>
                    <p className="text-muted small mb-4">Live ledger balances, approval states, and order totals per reseller.</p>

                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Reseller</th>
                            <th>Status</th>
                            <th>Total Orders</th>
                            <th>Total Purchased</th>
                            <th>Outstanding Balance</th>
                            <th>COD Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allResellers.map((r) => (
                            <tr key={r._id}>
                              <td>
                                <div className="fw-bold">{r.name}</div>
                                <div className="small text-muted">{r.email} • {r.businessInfo?.businessName}</div>
                              </td>
                              <td>
                                <span className={`badge ${r.approvalStatus === "approved" ? "bg-success" : r.approvalStatus === "pending" ? "bg-warning text-dark" : "bg-danger"}`}>
                                  {r.approvalStatus}
                                </span>
                              </td>
                              <td>{r.financialSummary?.totalOrdersCount || 0}</td>
                              <td className="fw-semibold">₹{((r.financialSummary?.totalPurchasesPaise || 0) / 100).toFixed(2)}</td>
                              <td className="fw-bold text-danger">₹{((r.financialSummary?.outstandingBalancePaise || 0) / 100).toFixed(2)}</td>
                              <td className="fw-semibold text-warning">₹{((r.financialSummary?.codPendingPaise || 0) / 100).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ADMIN VIEW: COD Pending Management */}
                {role === "admin" && activeTab === "cod" && (
                  <div>
                    <h4 className="fw-bold mb-3">COD Pending Collections</h4>
                    <p className="text-muted small mb-4">
                      Dedicated COD tracking. Delivery status and collection status are tracked separately. Once collected, click "Mark Collected" to post double-entry ledger credits.
                    </p>

                    {codPendingList.length === 0 ? (
                      <div className="text-center py-5 bg-light rounded-4">
                        <i className="fa-solid fa-receipt text-success fa-3x mb-3"></i>
                        <h6 className="fw-bold">No Pending COD Collections</h6>
                        <p className="text-muted small mb-0">All Cash on Delivery payments have been collected and reconciled.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Order #</th>
                              <th>Reseller</th>
                              <th>COD Amount</th>
                              <th>Delivery Status</th>
                              <th>Collection Status</th>
                              <th>Courier</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {codPendingList.map((item) => (
                              <tr key={item._id}>
                                <td className="fw-bold">{item.order?.orderNumber || "N/A"}</td>
                                <td>{item.reseller?.name || "Direct Reseller"}</td>
                                <td className="fw-bold text-danger">₹{(item.codAmountPaise / 100).toFixed(2)}</td>
                                <td>
                                  <span className="badge bg-secondary text-capitalize">{item.deliveryStatus}</span>
                                </td>
                                <td>
                                  <span className="badge bg-warning text-dark text-capitalize">{item.collectionStatus}</span>
                                </td>
                                <td>
                                  <div className="small">{item.courierName || "Standard Shipping"}</div>
                                  <div className="small text-muted">{item.trackingNumber || "—"}</div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success rounded-pill px-3"
                                    onClick={() => handleMarkCodCollected(item._id)}
                                  >
                                    <i className="fa-solid fa-check-double me-1"></i> Mark Collected
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN VIEW: Orders Management */}
                {role === "admin" && activeTab === "orders" && (
                  <div>
                    <h4 className="fw-bold mb-3">All System Orders</h4>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Reseller</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Order Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allOrders.map((o) => (
                            <tr key={o._id}>
                              <td className="fw-bold">{o.orderNumber}</td>
                              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                              <td>{o.reseller?.name || "N/A"}</td>
                              <td className="fw-bold">₹{(o.totalAmountPaise / 100).toFixed(2)}</td>
                              <td>
                                <span className={`badge ${o.paymentStatus === "paid" ? "bg-success" : o.paymentStatus === "cod_pending" ? "bg-warning text-dark" : "bg-secondary"}`}>
                                  {o.paymentMethod.toUpperCase()} ({o.paymentStatus})
                                </span>
                              </td>
                              <td>
                                <select
                                  className="form-select form-select-sm rounded-pill"
                                  value={o.orderStatus}
                                  onChange={(e) => handleUpdateOrderStatus(o._id, e.target.value)}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="processing">Processing</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td className="text-nowrap">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger rounded-pill px-3 me-2"
                                  onClick={() => handleTrackOrder(o.trackingNumber || o.orderNumber)}
                                  title="Track Consignment Delivery"
                                >
                                  <i className="fa-solid fa-location-crosshairs me-1"></i> Track
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark rounded-pill px-3"
                                  onClick={() => addToast(`Order details for ${o.orderNumber} loaded`, "info")}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ADMIN VIEW: Reports & Balance Sheet Tab */}
                {role === "admin" && activeTab === "reports" && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="fw-bold mb-0">Accounting Balance Sheet & Reconciliation</h4>
                      <a
                        href="/api/admin/reports/sales/csv"
                        download
                        className="btn btn-sm btn-dark rounded-pill px-3"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open("/api/admin/reports/sales/csv?token=" + localStorage.getItem("sparepro_token"), "_blank");
                        }}
                      >
                        <i className="fa-solid fa-download me-1"></i> Export Sales CSV
                      </a>
                    </div>
                    <p className="text-muted small mb-4">
                      True double-entry accounting reconciliation for assets, receivables, collections, and COD pipelines.
                    </p>

                    {financialReports && (
                      <div className="row g-4 mb-4">
                        <div className="col-md-6">
                          <div className="border rounded-4 p-4 bg-light">
                            <h6 className="fw-bold text-primary mb-3">ASSETS & RECEIVABLES</h6>
                            <div className="d-flex justify-content-between py-2 border-bottom">
                              <span>Cash & Online Collections Received:</span>
                              <strong>{financialReports.assets?.cashAndCollections?.formatted}</strong>
                            </div>
                            <div className="d-flex justify-content-between py-2 border-bottom">
                              <span>COD Pipeline (Awaiting Courier Collection):</span>
                              <strong>{financialReports.assets?.accountsReceivable?.codReceivables?.formatted}</strong>
                            </div>
                            <div className="d-flex justify-content-between py-2 border-bottom">
                              <span>Direct Reseller Invoiced Receivables:</span>
                              <strong>{financialReports.assets?.accountsReceivable?.directReceivables?.formatted}</strong>
                            </div>
                            <div className="d-flex justify-content-between py-2 mt-2 text-primary fw-bold">
                              <span>Total Assets:</span>
                              <span>{financialReports.assets?.totalAssets?.formatted}</span>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="border rounded-4 p-4 bg-light">
                            <h6 className="fw-bold text-success mb-3">EQUITY & REVENUE</h6>
                            <div className="d-flex justify-content-between py-2 border-bottom">
                              <span>Gross Wholesale Sales:</span>
                              <strong>{financialReports.equityAndRevenue?.retainedRevenue?.grossRevenue?.formatted}</strong>
                            </div>
                            <div className="d-flex justify-content-between py-2 border-bottom">
                              <span>Refunds & Adjustments:</span>
                              <strong className="text-danger">({financialReports.equityAndRevenue?.retainedRevenue?.refundsIssued?.formatted})</strong>
                            </div>
                            <div className="d-flex justify-content-between py-2 border-bottom">
                              <span>Net Earned Revenue:</span>
                              <strong>{financialReports.equityAndRevenue?.retainedRevenue?.netRevenue?.formatted}</strong>
                            </div>
                            <div className="d-flex justify-content-between py-2 mt-2 text-success fw-bold">
                              <span>Total Liabilities & Equity:</span>
                              <span>{financialReports.equityAndRevenue?.totalLiabilitiesAndEquity?.formatted}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* RESELLER VIEW: Dashboard Overview */}
                {role === "reseller" && activeTab === "dashboard" && (
                  <div>
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
                      <div>
                        <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: "-0.02em" }}>Welcome back, {user?.name}!</h4>
                        <p className="text-muted mb-0 small">
                          Wholesale portal for <strong className="text-dark">{user?.businessInfo?.businessName || "Reseller Partner"}</strong>. Track shipments, ledger statements, and receivables.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-refresh-pill align-self-start align-self-sm-center"
                        onClick={loadResellerData}
                        disabled={loading}
                      >
                        <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`}></i>
                        <span>Refresh Data</span>
                      </button>
                    </div>

                    {/* 4 Financial Metric Cards: 2x2 on Mobile, 4x1 on Desktop */}
                    <div className="row g-3 mb-4">
                      <div className="col-6 col-lg-3">
                        <div className="dash-metric-card">
                          <div className="dash-metric-header">
                            <span className="dash-metric-label">Total Purchases</span>
                            <div className="dash-metric-icon blue">
                              <i className="fa-solid fa-bag-shopping"></i>
                            </div>
                          </div>
                          <div>
                            <div className="dash-metric-value">
                              ₹{(((resellerSummary?.totalPurchasesPaise ?? resellerSummary?.data?.totalPurchasesPaise ?? 0) / 100)).toFixed(2)}
                            </div>
                            <div className="dash-metric-subtext">
                              <span>All-time wholesale</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-6 col-lg-3">
                        <div className="dash-metric-card">
                          <div className="dash-metric-header">
                            <span className="dash-metric-label">Total Settled</span>
                            <div className="dash-metric-icon emerald">
                              <i className="fa-solid fa-circle-check"></i>
                            </div>
                          </div>
                          <div>
                            <div className="dash-metric-value text-success">
                              ₹{(((resellerSummary?.totalPaymentsPaise ?? resellerSummary?.data?.totalPaymentsPaise ?? 0) / 100)).toFixed(2)}
                            </div>
                            <div className="dash-metric-subtext">
                              <span>Reconciled in ledger</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-6 col-lg-3">
                        <div className="dash-metric-card">
                          <div className="dash-metric-header">
                            <span className="dash-metric-label">COD In Transit</span>
                            <div className="dash-metric-icon amber">
                              <i className="fa-solid fa-truck-ramp-box"></i>
                            </div>
                          </div>
                          <div>
                            <div className="dash-metric-value text-warning">
                              ₹{(((resellerSummary?.codPendingPaise ?? resellerSummary?.data?.codPendingPaise ?? 0) / 100)).toFixed(2)}
                            </div>
                            <div className="dash-metric-subtext">
                              <span>With India Post</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-6 col-lg-3">
                        <div className="dash-metric-card">
                          <div className="dash-metric-header">
                            <span className="dash-metric-label">Net Balance</span>
                            <div className="dash-metric-icon rose">
                              <i className="fa-solid fa-scale-balanced"></i>
                            </div>
                          </div>
                          <div>
                            <div className="dash-metric-value text-danger">
                              ₹{(((resellerSummary?.outstandingBalancePaise ?? resellerSummary?.data?.outstandingBalancePaise ?? 0) / 100)).toFixed(2)}
                            </div>
                            <div className="dash-metric-subtext">
                              <span>Outstanding balance</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h5 className="fw-bold mb-0 text-dark" style={{ letterSpacing: "-0.015em" }}>Recent Orders</h5>
                        <span className="text-muted small" style={{ fontSize: "12px" }}>Latest shipments dispatched to customers</span>
                      </div>
                      {resellerOrders.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-decoration-none text-dark fw-semibold p-0"
                          style={{ fontSize: "12.5px" }}
                          onClick={() => setActiveTab("orders")}
                        >
                          View All ({resellerOrders.length}) →
                        </button>
                      )}
                    </div>

                    {resellerOrders.length === 0 ? (
                      <div className="text-center py-5 bg-light rounded-4">
                        <i className="fa-solid fa-box-open text-muted fa-3x mb-3"></i>
                        <h6 className="fw-bold">No orders placed yet</h6>
                        <p className="text-muted small mb-3">Browse our wholesale catalog to start placing orders.</p>
                        <Link to="/shop" className="btn btn-dark rounded-pill px-4">
                          Browse Wholesale Catalog
                        </Link>
                      </div>
                    ) : (
                      <>
                        {/* Mobile Recent Orders Cards (< 768px) */}
                        <div className="d-block d-md-none mb-3">
                          {resellerOrders.slice(0, 5).map((o) => {
                            const pInfo = getDeliveryProgressInfo(o);
                            const totalAmount = (((o.customerSellingTotalPaise || o.totalPaise || 0) / 100)).toFixed(2);
                            const isDelivered = pInfo.percent === 100;
                            return (
                              <div key={o._id} className="dash-card mb-2 p-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <div>
                                    <div className="fw-bold text-dark">{o.orderNumber}</div>
                                    <small className="text-muted" style={{ fontSize: "11px" }}>
                                      {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </small>
                                  </div>
                                  <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: "10px" }}>
                                    {o.paymentMethod.toUpperCase()}
                                  </span>
                                </div>
                                <div className="p-2 bg-light rounded-3 mb-2">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className={pInfo.badgeClass}>
                                      {pInfo.label}
                                    </span>
                                    <span className="small text-muted fw-bold">{pInfo.percent}%</span>
                                  </div>
                                  <div className="dash-progress-track w-100">
                                    <div
                                      className={`dash-progress-fill ${isDelivered ? "delivered" : "active"}`}
                                      style={{ width: `${pInfo.percent}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <span className="text-muted small" style={{ fontSize: "11px" }}>Total: </span>
                                    <span className="fw-bold text-dark font-monospace">₹{totalAmount}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-track-pill"
                                    onClick={() => handleTrackOrder(o.trackingNumber || o.orderNumber)}
                                  >
                                    <i className="fa-solid fa-location-crosshairs text-muted"></i> Track
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Recent Orders Table (>= 768px) */}
                        <div className="dash-table-wrapper d-none d-md-block mb-3">
                          <table className="dash-table">
                            <thead>
                              <tr>
                                <th>Order #</th>
                                <th>Date</th>
                                <th>Delivery &amp; Status</th>
                                <th>Payment</th>
                                <th>Total</th>
                                <th className="text-end">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resellerOrders.slice(0, 5).map((o) => {
                                const pInfo = getDeliveryProgressInfo(o);
                                const totalAmount = (((o.customerSellingTotalPaise || o.totalPaise || 0) / 100)).toFixed(2);
                                const isDelivered = pInfo.percent === 100;
                                return (
                                  <tr key={o._id}>
                                    <td>
                                      <div className="fw-semibold text-dark">{o.orderNumber}</div>
                                      {o.trackingNumber && (
                                        <span className="badge bg-light text-muted font-monospace border mt-1" style={{ fontSize: "10.5px" }}>
                                          {o.trackingNumber}
                                        </span>
                                      )}
                                    </td>
                                    <td className="text-muted" style={{ fontSize: "12.5px" }}>
                                      {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <span className={pInfo.badgeClass}>
                                          {pInfo.label}
                                          <span className="opacity-75 font-monospace">{pInfo.percent}%</span>
                                        </span>
                                      </div>
                                      <div className="dash-progress-track">
                                        <div
                                          className={`dash-progress-fill ${isDelivered ? "delivered" : "active"}`}
                                          style={{ width: `${pInfo.percent}%` }}
                                        ></div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: "11px" }}>
                                        {o.paymentMethod.toUpperCase()} {o.paymentStatus ? `• ${o.paymentStatus}` : ""}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="fw-bold text-dark font-monospace">₹{totalAmount}</span>
                                    </td>
                                    <td className="text-end">
                                      <button
                                        type="button"
                                        className="btn-track-pill"
                                        onClick={() => handleTrackOrder(o.trackingNumber || o.orderNumber)}
                                        title="Track Consignment Delivery"
                                      >
                                        <i className="fa-solid fa-location-crosshairs text-muted"></i>
                                        <span>Track</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* RESELLER VIEW: Orders Tab */}
                {(role === "reseller" || role !== "admin") && activeTab === "orders" && (
                  <div>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                      <div>
                        <h4 className="fw-bold mb-1">Wholesale Order History</h4>
                        <p className="text-muted small mb-0">Complete history of placed wholesale orders with live dispatch and delivery tracking.</p>
                      </div>
                      <span className="badge bg-dark rounded-pill px-3 py-2">
                        {resellerOrders.length} {resellerOrders.length === 1 ? "Order" : "Orders"} Total
                      </span>
                    </div>

                    {/* Quick Order & Consignment Tracking Field */}
                    <div
                      className="card border-0 shadow-sm rounded-4 mb-4"
                      style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#fff" }}
                    >
                      <div className="card-body p-3 p-md-4">
                        <div className="row align-items-center g-3">
                          <div className="col-12 col-lg-5">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-3 bg-danger text-white d-flex align-items-center justify-content-center shadow flex-shrink-0"
                                style={{ width: "44px", height: "44px" }}
                              >
                                <i className="fa-solid fa-truck-fast"></i>
                              </div>
                              <div>
                                <h6 className="fw-bold mb-0 text-white">Track Order & Parcel Delivery</h6>
                                <p className="text-light text-opacity-75 small mb-0" style={{ fontSize: "12px" }}>
                                  Live consignment tracking with checkpoint timeline & delivery progress.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-lg-7">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleTrackOrder();
                              }}
                              className="d-flex flex-column flex-sm-row gap-2"
                            >
                              <div className="input-group">
                                <span className="input-group-text bg-white border-0 text-muted">
                                  <i className="fa-solid fa-barcode"></i>
                                </span>
                                <input
                                  type="text"
                                  className="form-control border-0 py-2"
                                  placeholder="Enter Order # or Tracking ID (e.g. RM019388105IN)"
                                  value={trackQuery}
                                  onChange={(e) => setTrackQuery(e.target.value)}
                                />
                              </div>
                              <button
                                type="submit"
                                className="btn btn-danger rounded-pill px-4 py-2 text-nowrap fw-semibold shadow"
                                disabled={loadingTracking}
                              >
                                {loadingTracking ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status"></span> Tracking...
                                  </>
                                ) : (
                                  <>
                                    <i className="fa-solid fa-location-crosshairs me-1"></i> Track Order
                                  </>
                                )}
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* Quick Track Chips for Recent Consignments */}
                        {resellerOrders.filter((o) => o.trackingNumber).length > 0 && (
                          <div className="mt-3 pt-3 border-top border-secondary border-opacity-50 d-flex flex-wrap align-items-center gap-2">
                            <span className="small text-light text-opacity-75" style={{ fontSize: "11px" }}>
                              <i className="fa-solid fa-bolt text-warning me-1"></i> Quick Track:
                            </span>
                            {resellerOrders
                              .filter((o) => o.trackingNumber)
                              .slice(0, 3)
                              .map((o) => (
                                <button
                                  key={o._id}
                                  type="button"
                                  className="btn btn-sm btn-outline-light rounded-pill px-2 py-0 font-monospace"
                                  style={{ fontSize: "11px" }}
                                  onClick={() => {
                                    setTrackQuery(o.trackingNumber);
                                    handleTrackOrder(o.trackingNumber);
                                  }}
                                >
                                  {o.trackingNumber} ({o.orderNumber})
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {resellerOrders.length === 0 ? (
                      <div className="text-center py-5 bg-light rounded-4">
                        <i className="fa-solid fa-box-open text-muted fa-3x mb-3"></i>
                        <h6 className="fw-bold">No orders placed yet</h6>
                        <p className="text-muted small mb-3">Browse our wholesale catalog to start placing orders.</p>
                        <Link to="/shop" className="btn btn-dark rounded-pill px-4">
                          Browse Wholesale Catalog
                        </Link>
                      </div>
                    ) : (
                      <>
                        {/* MOBILE VIEW: Thumb-friendly Responsive Order Cards (< 992px) */}
                        <div className="d-block d-lg-none mb-3">
                          {resellerOrders.map((o) => {
                            const wholesaleCost = ((o.wholesaleCostPaise || o.subtotalPaise || 0) / 100).toFixed(2);
                            const customerSelling = ((o.customerSellingTotalPaise || o.totalPaise || 0) / 100).toFixed(2);
                            const expectedProfit = ((o.expectedResellerProfitPaise || 0) / 100).toFixed(2);
                            const deliveryChargeAmt = ((o.deliveryChargePaise || o.shippingPaise || 0) / 100).toFixed(2);
                            const collectedAmt = ((o.codCollectedAmountPaise || 0) / 100).toFixed(2);
                            const targetCollection = ((o.customerCollectionPaise || o.cod?.codAmountPaise || 0) / 100).toFixed(2);
                            const codStatus = o.codCollectionStatus || o.cod?.collectionStatus || (o.paymentMethod === "COD" ? "PENDING" : "PREPAID");
                            const progInfo = getDeliveryProgressInfo(o);
                            const printUrl = `/api/orders/${o._id}/shipping-label?view=print&autoPrint=1&token=${localStorage.getItem("sparepro_token") || ""}`;

                            return (
                              <div key={o._id} className="card border rounded-4 shadow-sm mb-3 overflow-hidden bg-white">
                                {/* Card Header: Order # + Date + Payment Badge */}
                                <div className="card-header bg-light border-bottom d-flex justify-content-between align-items-center py-2 px-3">
                                  <div>
                                      <div className="fw-bold text-dark d-flex align-items-center gap-2">
                                        <span>{o.orderNumber}</span>
                                        {o.isFastDelivery && (
                                          <span className="badge bg-danger text-white" style={{ fontSize: "10px" }}>
                                            <i className="fa-solid fa-bolt me-1"></i> Fast
                                          </span>
                                        )}
                                        <span className={`badge ${progInfo.badgeClass}`} style={{ fontSize: "10px" }}>
                                          {progInfo.label}
                                        </span>
                                      </div>
                                    <small className="text-muted" style={{ fontSize: "11px" }}>
                                      <i className="fa-regular fa-calendar me-1"></i>
                                      {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </small>
                                  </div>
                                  <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: "10px" }}>
                                    {o.paymentMethod.toUpperCase()} ({o.paymentStatus})
                                  </span>
                                </div>

                                <div className="card-body p-3">
                                  {/* Delivery & Tracking Progress Bar */}
                                  <div className="p-2 rounded-3 bg-light border mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <span className="small text-muted" style={{ fontSize: "11px" }}>
                                        <i className="fa-solid fa-truck text-danger me-1"></i>
                                        {o.courierName || "India Post (Business Parcel)"}
                                      </span>
                                      <span className="fw-bold text-dark" style={{ fontSize: "11px" }}>
                                        {progInfo.percent}%
                                      </span>
                                    </div>
                                    <div className="progress mb-2" style={{ height: "4px" }}>
                                      <div
                                        className={`progress-bar ${
                                          progInfo.percent === 100 ? "bg-success" : "bg-primary"
                                        }`}
                                        style={{ width: `${progInfo.percent}%` }}
                                      ></div>
                                    </div>
                                    {o.trackingNumber ? (
                                      <div className="d-flex justify-content-between align-items-center">
                                        <span className="small font-monospace fw-semibold text-dark" style={{ fontSize: "11px" }}>
                                          <i className="fa-solid fa-barcode text-muted me-1"></i> {o.trackingNumber}
                                        </span>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-link text-decoration-none p-0 text-primary"
                                          style={{ fontSize: "11px" }}
                                          onClick={() => {
                                            if (navigator.clipboard) {
                                              navigator.clipboard.writeText(o.trackingNumber);
                                              alert("Consignment AWB copied: " + o.trackingNumber);
                                            }
                                          }}
                                        >
                                          <i className="fa-regular fa-copy me-1"></i> Copy
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-muted" style={{ fontSize: "11px" }}>AWB Assigned Upon Dispatch</span>
                                    )}
                                  </div>

                                  {/* 3-Column Financial Snapshot (Wholesale, Customer Price, Expected Profit) */}
                                  <div className="row g-2 text-center mb-3">
                                    <div className="col-4">
                                      <div className="p-2 rounded-3 bg-light border h-100">
                                        <div className="text-muted" style={{ fontSize: "10px" }}>Wholesale</div>
                                        <div className="fw-bold text-secondary" style={{ fontSize: "13px" }}>₹{wholesaleCost}</div>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-2 rounded-3 bg-light border h-100">
                                        <div className="text-muted" style={{ fontSize: "10px" }}>Customer Price</div>
                                        <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>₹{customerSelling}</div>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-2 rounded-3 border h-100" style={{ backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }}>
                                        <div className="text-success" style={{ fontSize: "10px" }}>Expected Profit</div>
                                        <div className="fw-bold text-success" style={{ fontSize: "13px" }}>+₹{expectedProfit}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Logistics & COD Row */}
                                  <div className="d-flex justify-content-between align-items-center small py-1 border-top pt-2 mb-3" style={{ fontSize: "11px" }}>
                                    <div>
                                      <span className="text-muted">Delivery Chg: </span>
                                      <strong>₹{deliveryChargeAmt}</strong>{" "}
                                      <span className={`badge ${o.deliveryChargeStatus === "PAID" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`} style={{ fontSize: "9px" }}>
                                        {o.deliveryChargeStatus || "PENDING"}
                                      </span>
                                    </div>
                                    <div>
                                      {o.paymentMethod === "COD" ? (
                                        <span>
                                          <span className="text-muted">COD: </span>
                                          <strong>₹{collectedAmt}</strong> / ₹{targetCollection}
                                        </span>
                                      ) : (
                                        <span className="badge bg-success-subtle text-success" style={{ fontSize: "9px" }}>
                                          Prepaid Order
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons Toolbar */}
                                  <div className="d-flex gap-2">
                                    <a
                                      href={printUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-dark rounded-pill flex-fill text-center py-2"
                                      title="Download or Print Shipping Label"
                                    >
                                      <i className="fa-solid fa-barcode me-1"></i> Label
                                    </a>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger rounded-pill flex-fill py-2"
                                      onClick={() => handleTrackOrder(o.trackingNumber || o.orderNumber)}
                                    >
                                      <i className="fa-solid fa-location-crosshairs me-1"></i> Track
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary rounded-pill flex-fill py-2"
                                      onClick={() => setSelectedResellerOrder(o)}
                                    >
                                      <i className="fa-regular fa-eye me-1"></i> View
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* DESKTOP VIEW: Full Orders Table (>= 992px) */}
                        <div className="dash-table-wrapper d-none d-lg-block mb-4">
                          <table className="dash-table">
                            <thead>
                              <tr>
                                <th>Order #</th>
                                <th>Delivery &amp; Tracking</th>
                                <th>Wholesale Cost</th>
                                <th>Customer Price</th>
                                <th>Expected Profit</th>
                                <th>Delivery Charge</th>
                                <th>Customer Collection</th>
                                <th>COD Status</th>
                                <th>Settlement</th>
                                <th className="text-end">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resellerOrders.map((o) => {
                                const wholesaleCost = ((o.wholesaleCostPaise || o.subtotalPaise || 0) / 100).toFixed(2);
                                const customerSelling = ((o.customerSellingTotalPaise || o.totalPaise || 0) / 100).toFixed(2);
                                const expectedProfit = ((o.expectedResellerProfitPaise || 0) / 100).toFixed(2);
                                const deliveryChargeAmt = ((o.deliveryChargePaise || o.shippingPaise || 0) / 100).toFixed(2);
                                const collectedAmt = ((o.codCollectedAmountPaise || 0) / 100).toFixed(2);
                                const targetCollection = ((o.customerCollectionPaise || o.cod?.codAmountPaise || 0) / 100).toFixed(2);
                                const codStatus = o.codCollectionStatus || o.cod?.collectionStatus || (o.paymentMethod === "COD" ? "PENDING" : "PREPAID");
                                const settlementStatus = o.resellerSettlementStatus || "UNSETTLED";
                                const progInfo = getDeliveryProgressInfo(o);
                                const isDelivered = progInfo.percent === 100;

                                return (
                                  <tr key={o._id}>
                                    <td>
                                      <div className="fw-semibold text-dark d-flex align-items-center gap-1">
                                        <span>{o.orderNumber}</span>
                                        {o.isFastDelivery && (
                                          <span className="badge bg-danger text-white" style={{ fontSize: "9px" }}>
                                            <i className="fa-solid fa-bolt"></i> FAST
                                          </span>
                                        )}
                                      </div>
                                      <small className="text-muted" style={{ fontSize: "11px" }}>{new Date(o.createdAt).toLocaleDateString()}</small>
                                    </td>
                                    <td>
                                      <div className="d-flex align-items-center gap-2 mb-1">
                                        <span className={progInfo.badgeClass}>
                                          {progInfo.label}
                                        </span>
                                        <span className="small text-muted fw-semibold font-monospace" style={{ fontSize: "11px" }}>
                                          {progInfo.percent}%
                                        </span>
                                      </div>
                                      <div className="dash-progress-track">
                                        <div
                                          className={`dash-progress-fill ${isDelivered ? "delivered" : "active"}`}
                                          style={{ width: `${progInfo.percent}%` }}
                                        ></div>
                                      </div>
                                      <div className="small text-muted mt-1" style={{ fontSize: "11px" }}>
                                        {o.courierName || "India Post (Business Parcel)"}
                                      </div>
                                      {o.trackingNumber ? (
                                        <span className="badge bg-light text-muted font-monospace border mt-1" style={{ fontSize: "10.5px" }}>
                                          {o.trackingNumber}
                                        </span>
                                      ) : (
                                        <span className="text-muted" style={{ fontSize: "10px" }}>
                                          AWB Assigned Upon Dispatch
                                        </span>
                                      )}
                                    </td>
                                    <td className="fw-semibold text-secondary font-monospace">
                                      ₹{wholesaleCost}
                                    </td>
                                    <td className="fw-bold text-dark font-monospace">
                                      ₹{customerSelling}
                                    </td>
                                    <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold font-monospace">
                                        +₹{expectedProfit}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="font-monospace">₹{deliveryChargeAmt}</div>
                                      <span className={`badge ${o.deliveryChargeStatus === "PAID" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"} text-capitalize`} style={{ fontSize: "10px" }}>
                                        {o.deliveryChargeStatus || "PENDING"}
                                      </span>
                                    </td>
                                    <td>
                                      {o.paymentMethod === "COD" ? (
                                        <div>
                                          <div className="small fw-semibold font-monospace">₹{collectedAmt} / ₹{targetCollection}</div>
                                          <div className="text-muted" style={{ fontSize: "10px" }}>
                                            {Number(collectedAmt) >= Number(targetCollection) && Number(targetCollection) > 0 ? "Fully Collected" : "Pending Courier Remit"}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="badge bg-light text-muted border">Prepaid</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`badge ${
                                        codStatus === "RECONCILED" || codStatus === "COLLECTED"
                                          ? "bg-success-subtle text-success"
                                          : codStatus === "PENDING"
                                          ? "bg-warning-subtle text-dark"
                                          : "bg-light text-dark border"
                                      } text-uppercase font-monospace`}>
                                        {codStatus}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`badge ${
                                        settlementStatus === "SETTLED"
                                          ? "bg-success text-white"
                                          : settlementStatus === "PARTIALLY_SETTLED"
                                          ? "bg-warning text-dark"
                                          : "bg-secondary text-white"
                                      } text-uppercase`}>
                                        {settlementStatus}
                                      </span>
                                    </td>
                                    <td className="text-end text-nowrap">
                                      <a
                                        href={`/api/orders/${o._id}/shipping-label?view=print&autoPrint=1&token=${localStorage.getItem("sparepro_token") || ""}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-track-pill me-1"
                                        title="Download / Print Shipping Label with Barcode"
                                      >
                                        <i className="fa-solid fa-barcode text-muted"></i> <span>Label</span>
                                      </a>
                                      <button
                                        type="button"
                                        className="btn-track-pill me-1"
                                        onClick={() => handleTrackOrder(o.trackingNumber || o.orderNumber)}
                                        title="Track Delivery Progress"
                                      >
                                        <i className="fa-solid fa-location-crosshairs text-muted"></i> <span>Track</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-dark rounded-pill px-3"
                                        style={{ fontSize: "12px", padding: "5px 12px" }}
                                        onClick={() => setSelectedResellerOrder(o)}
                                      >
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Reseller Order Breakdown Modal (Read-Only) */}
                    {selectedResellerOrder && (
                      <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                          <div className="modal-content rounded-4 border-0 shadow">
                            <div className="modal-header border-bottom px-4 pt-4 pb-3">
                              <div>
                                <h5 className="modal-title fw-bold">Order Breakdown: {selectedResellerOrder.orderNumber}</h5>
                                <span className="badge bg-light text-dark border me-2">{selectedResellerOrder.paymentMethod}</span>
                                <span className="small text-muted">{new Date(selectedResellerOrder.createdAt).toLocaleString()}</span>
                              </div>
                              <button
                                type="button"
                                className="btn-close"
                                onClick={() => setSelectedResellerOrder(null)}
                              ></button>
                            </div>
                            <div className="modal-body p-3 p-md-4">
                              {/* Live Delivery Progress & Tracking Card */}
                              {(() => {
                                const progInfo = getDeliveryProgressInfo(selectedResellerOrder);
                                return (
                                  <div className="p-3 bg-light rounded-3 border mb-4">
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-2">
                                      <div>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                          <span className="badge bg-danger-subtle text-danger border border-danger" style={{ fontSize: "11px" }}>
                                            {selectedResellerOrder.courierName || "India Post (Business Parcel)"}
                                          </span>
                                          {selectedResellerOrder.isFastDelivery && (
                                            <span className="badge bg-danger text-white" style={{ fontSize: "11px" }}>
                                              <i className="fa-solid fa-bolt me-1"></i> Fast Delivery
                                            </span>
                                          )}
                                          <span className={`badge ${progInfo.badgeClass}`} style={{ fontSize: "11px" }}>
                                            {progInfo.label}
                                          </span>
                                          <span className="small text-muted fw-bold">{progInfo.percent}%</span>
                                        </div>
                                        <div className="small text-muted">
                                          Consignment / Tracking AWB:{" "}
                                          <strong className="text-dark font-monospace">
                                            {selectedResellerOrder.trackingNumber || selectedResellerOrder.orderNumber}
                                          </strong>
                                        </div>
                                      </div>
                                      <div className="d-flex gap-2">
                                        <a
                                          href={`/api/orders/${selectedResellerOrder._id}/shipping-label?view=print&autoPrint=1&token=${localStorage.getItem("sparepro_token") || ""}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-sm btn-outline-dark rounded-pill px-3 shadow-sm"
                                        >
                                          <i className="fa-solid fa-barcode me-1"></i> Print / Download Label
                                        </a>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-danger rounded-pill px-3 shadow-sm"
                                          onClick={() => handleTrackOrder(selectedResellerOrder.trackingNumber || selectedResellerOrder.orderNumber)}
                                        >
                                          <i className="fa-solid fa-location-crosshairs me-1"></i> Track Progress
                                        </button>
                                      </div>
                                    </div>
                                    <div className="progress mt-2" style={{ height: "8px" }}>
                                      <div
                                        className={`progress-bar progress-bar-striped progress-bar-animated ${
                                          progInfo.percent === 100 ? "bg-success" : "bg-danger"
                                        }`}
                                        role="progressbar"
                                        style={{ width: `${progInfo.percent}%` }}
                                      ></div>
                                    </div>
                                    <div className="d-flex justify-content-between small text-muted mt-2">
                                      <span>Current Stage: <strong>{progInfo.label}</strong></span>
                                      {selectedResellerOrder.shippingAddress && (
                                        <span>Destination: <strong>{selectedResellerOrder.shippingAddress.city}, {selectedResellerOrder.shippingAddress.state}</strong></span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Financial Summary Cards */}
                              <div className="row g-2 g-md-3 mb-4">
                                <div className="col-6 col-sm-3">
                                  <div className="p-3 bg-light rounded-3 text-center border h-100">
                                    <div className="text-muted small" style={{ fontSize: "11px" }}>Wholesale Cost</div>
                                    <div className="h5 fw-bold mb-0">₹{((selectedResellerOrder.wholesaleCostPaise || selectedResellerOrder.subtotalPaise || 0) / 100).toFixed(2)}</div>
                                  </div>
                                </div>
                                <div className="col-6 col-sm-3">
                                  <div className="p-3 bg-light rounded-3 text-center border h-100">
                                    <div className="text-muted small" style={{ fontSize: "11px" }}>Customer Selling</div>
                                    <div className="h5 fw-bold mb-0 text-dark">₹{((selectedResellerOrder.customerSellingTotalPaise || selectedResellerOrder.totalPaise || 0) / 100).toFixed(2)}</div>
                                  </div>
                                </div>
                                <div className="col-6 col-sm-3">
                                  <div className="p-3 bg-success-subtle rounded-3 text-center border border-success-subtle h-100">
                                    <div className="text-success small fw-semibold" style={{ fontSize: "11px" }}>Expected Profit</div>
                                    <div className="h5 fw-bold mb-0 text-success">+₹{((selectedResellerOrder.expectedResellerProfitPaise || 0) / 100).toFixed(2)}</div>
                                  </div>
                                </div>
                                <div className="col-6 col-sm-3">
                                  <div className="p-3 bg-primary-subtle rounded-3 text-center border border-primary-subtle h-100">
                                    <div className="text-primary small fw-semibold" style={{ fontSize: "11px" }}>Delivery Charge</div>
                                    <div className="h5 fw-bold mb-0 text-primary">₹{((selectedResellerOrder.deliveryChargePaise || 5000) / 100).toFixed(2)}</div>
                                    <span className={`badge ${selectedResellerOrder.deliveryChargeStatus === "PAID" ? "bg-success" : "bg-warning text-dark"} mt-1`} style={{ fontSize: "10px" }}>
                                      {selectedResellerOrder.deliveryChargeStatus || "PENDING"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Items Table */}
                              <h6 className="fw-bold mb-2">Ordered Items &amp; Margin Breakdown</h6>
                              <div className="table-responsive mb-4">
                                <table className="table table-sm align-middle border">
                                  <thead className="table-light">
                                    <tr>
                                      <th>Item</th>
                                      <th>Qty</th>
                                      <th>Wholesale Price</th>
                                      <th>Customer Selling Price</th>
                                      <th>Subtotal</th>
                                      <th>Expected Profit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(selectedResellerOrder.items || []).map((it, idx) => {
                                      const wPrice = ((it.wholesalePricePaise || it.unitPricePaise || 0) / 100).toFixed(2);
                                      const sPrice = ((it.customerSellingPricePaise || it.unitPricePaise || 0) / 100).toFixed(2);
                                      const profit = ((it.resellerProfitPaise || 0) / 100).toFixed(2);
                                      return (
                                        <tr key={it._id || idx}>
                                          <td className="fw-semibold">
                                            {it.name}
                                            {(it.color || it.size) && (
                                              <div className="d-flex flex-wrap gap-1 mt-1">
                                                {it.color && <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>{it.color}</span>}
                                                {it.size && <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>Size: {it.size}</span>}
                                              </div>
                                            )}
                                          </td>
                                          <td>{it.quantity}</td>
                                          <td>₹{wPrice}</td>
                                          <td className="fw-bold">₹{sPrice}</td>
                                          <td>₹{(((it.customerSellingSubtotalPaise || it.subtotalPaise || 0)) / 100).toFixed(2)}</td>
                                          <td className="text-success fw-bold">+₹{profit}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Settlement and Delivery status info */}
                              <div className="bg-light p-3 rounded-3 border small">
                                <div className="row g-2">
                                  <div className="col-sm-6">
                                    <div><strong>Delivery Charge:</strong> ₹{((selectedResellerOrder.deliveryChargePaise || 0) / 100).toFixed(2)} ({selectedResellerOrder.deliveryChargeStatus || "PENDING"})</div>
                                    <div><strong>COD Collection Status:</strong> {selectedResellerOrder.codCollectionStatus || "NOT_APPLICABLE"}</div>
                                  </div>
                                  <div className="col-sm-6">
                                    <div><strong>Amount Collected from Customer:</strong> ₹{((selectedResellerOrder.codCollectedAmountPaise || 0) / 100).toFixed(2)}</div>
                                    <div><strong>Profit Settled:</strong> ₹{((selectedResellerOrder.settledProfitPaise || 0) / 100).toFixed(2)}</div>
                                  </div>
                                </div>
                                {selectedResellerOrder.settlementReference && (
                                  <div className="mt-2 pt-2 border-top">
                                    <strong>Settlement Reference:</strong> {selectedResellerOrder.settlementReference}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="modal-footer border-top px-4 py-3">
                              <span className="text-muted small me-auto">
                                <i className="fa-solid fa-lock me-1"></i> Read-only confirmed order record.
                              </span>
                              <button
                                type="button"
                                className="btn btn-dark rounded-pill px-4"
                                onClick={() => setSelectedResellerOrder(null)}
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* RESELLER VIEW: Statement & Ledger Tab */}
                {role === "reseller" && activeTab === "ledger" && (
                  <div>
                    <h4 className="fw-bold mb-3">Immutable Financial Ledger & Statement</h4>
                    <p className="text-muted small mb-4">
                      Complete double-entry accounting ledger detailing all debits (orders), credits (payments, COD collections), and net balances.
                    </p>

                    {resellerLedger.length === 0 ? (
                      <p className="text-muted small">No financial ledger entries recorded yet.</p>
                    ) : (
                      <>
                        {/* Mobile Ledger Cards (< 768px) */}
                        <div className="d-block d-md-none mb-3">
                          {resellerLedger.map((entry) => (
                            <div key={entry._id} className="card border rounded-3 shadow-sm mb-2 p-3 bg-white">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="small text-muted font-monospace">{entry.referenceNumber}</span>
                                <span className={`badge ${entry.entryType === "order_debit" ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}>
                                  {entry.entryType}
                                </span>
                              </div>
                              <p className="small mb-2 text-dark">{entry.description}</p>
                              <div className="d-flex justify-content-between align-items-center pt-2 border-top small">
                                <div>
                                  <span className="text-muted">Amount: </span>
                                  <span className={entry.entryType === "order_debit" ? "text-danger fw-bold" : "text-success fw-bold"}>
                                    {entry.entryType === "order_debit" ? "-" : "+"}₹{(entry.amountPaise / 100).toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted">Balance: </span>
                                  <strong className="text-dark">₹{(entry.balanceAfterPaise / 100).toFixed(2)}</strong>
                                </div>
                              </div>
                              <div className="text-muted mt-1 text-end" style={{ fontSize: "10px" }}>
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Ledger Table (>= 768px) */}
                        <div className="d-none d-md-block table-responsive">
                          <table className="table table-sm align-middle">
                            <thead className="table-light">
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
                              {resellerLedger.map((entry) => (
                                <tr key={entry._id}>
                                  <td className="small">{new Date(entry.createdAt).toLocaleDateString()}</td>
                                  <td className="small fw-semibold">{entry.referenceNumber}</td>
                                  <td>
                                    <span className={`badge ${entry.entryType === "order_debit" ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}>
                                      {entry.entryType}
                                    </span>
                                  </td>
                                  <td className="small">{entry.description}</td>
                                  <td className="text-danger fw-semibold">
                                    {entry.entryType === "order_debit" ? `₹${(entry.amountPaise / 100).toFixed(2)}` : "—"}
                                  </td>
                                  <td className="text-success fw-semibold">
                                    {entry.entryType !== "order_debit" ? `₹${(entry.amountPaise / 100).toFixed(2)}` : "—"}
                                  </td>
                                  <td className="fw-bold">₹{(entry.balanceAfterPaise / 100).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* RESELLER VIEW: Business Profile Tab */}
                {role === "reseller" && activeTab === "business" && (
                  <div>
                    <h4 className="fw-bold mb-4">Reseller Business Profile</h4>
                    <div className="row g-3">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Contact Name</label>
                        <input type="text" className="form-control" value={user?.name || ""} disabled />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Email Address</label>
                        <input type="email" className="form-control" value={user?.email || ""} disabled />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Phone Number</label>
                        <input type="text" className="form-control" value={user?.phone || ""} disabled />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Business / Company Name</label>
                        <input type="text" className="form-control" value={user?.businessInfo?.businessName || ""} disabled />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">GST / Tax ID</label>
                        <input type="text" className="form-control" value={user?.businessInfo?.taxId || ""} disabled />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">City, State</label>
                        <input
                          type="text"
                          className="form-control"
                          value={`${user?.businessInfo?.city || ""}, ${user?.businessInfo?.state || ""}`}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Order & Parcel Tracking Modal */}
      {showTrackingModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1055 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom bg-light rounded-top-4 px-4 py-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="p-2 rounded-3 bg-danger text-white d-flex align-items-center justify-content-center shadow-sm"
                    style={{ width: "40px", height: "40px" }}
                  >
                    <i className="fa-solid fa-truck-fast"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">Order & Parcel Tracking</h5>
                    <span className="text-muted small">
                      {trackingData?.courierName || "India Post (Business Parcel)"} •{" "}
                      <span className="font-monospace fw-semibold">{trackingData?.trackingNumber || trackQuery}</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowTrackingModal(false);
                    setTrackingData(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                {loadingTracking ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-danger" role="status" style={{ width: "3rem", height: "3rem" }}></div>
                    <h6 className="fw-bold mt-3 mb-1">Connecting to Parcel Logistics Network...</h6>
                    <p className="text-muted small">Retrieving live consignment checkpoints and delivery status</p>
                  </div>
                ) : !trackingData ? (
                  <div className="text-center py-5">
                    <div
                      className="rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center mb-3"
                      style={{ width: "64px", height: "64px" }}
                    >
                      <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
                    </div>
                    <h5 className="fw-bold text-dark mb-1">Tracking Information Unavailable</h5>
                    <p className="text-muted small mb-4">
                      We could not find active postal records for <strong>{trackQuery}</strong>.
                      <br />
                      Orders are booked and assigned consignment AWB numbers upon warehouse dispatch.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline-dark rounded-pill px-4"
                      onClick={() => {
                        setShowTrackingModal(false);
                        setTrackingData(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Status Header Banner */}
                    <div className="p-4 rounded-4 border mb-4" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="badge bg-danger text-white px-2 py-1" style={{ fontSize: "11px" }}>
                              {trackingData.courierName}
                            </span>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                              {trackingData.statusStage || "IN TRANSIT"}
                            </span>
                          </div>
                          <h4 className="fw-bold text-dark mb-1">{trackingData.currentStatus}</h4>
                          <div className="small text-muted">
                            Consignment / AWB:{" "}
                            <code className="fw-bold text-dark fs-6 bg-white px-2 py-0.5 rounded border">
                              {trackingData.trackingNumber}
                            </code>
                          </div>
                        </div>

                        {trackingData.officialTrackingUrl && (
                          <a
                            href={trackingData.officialTrackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-danger rounded-pill px-3 py-2 shadow-sm"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square me-1"></i> Official Portal
                          </a>
                        )}
                      </div>

                      {/* Visual 5-Step Stepper & Progress */}
                      <div className="mt-4 pt-3 border-top">
                        <div className="progress mb-3" style={{ height: "6px" }}>
                          <div
                            className={`progress-bar ${
                              trackingData.progressPercent === 100 ? "bg-success" : "bg-primary"
                            }`}
                            role="progressbar"
                            style={{ width: `${trackingData.progressPercent || 40}%` }}
                          ></div>
                        </div>

                        <div className="row text-center g-2 small">
                          <div className="col">
                            <div className={`fw-bold ${(trackingData.progressPercent || 0) >= 20 ? (trackingData.progressPercent === 100 ? "text-success" : "text-primary") : "text-muted"}`}>
                              <i className="fa-solid fa-box mb-1 d-block"></i>
                              <span>Booked</span>
                            </div>
                          </div>
                          <div className="col">
                            <div className={`fw-bold ${(trackingData.progressPercent || 0) >= 50 ? (trackingData.progressPercent === 100 ? "text-success" : "text-primary") : "text-muted"}`}>
                              <i className="fa-solid fa-warehouse mb-1 d-block"></i>
                              <span>Dispatched</span>
                            </div>
                          </div>
                          <div className="col">
                            <div className={`fw-bold ${(trackingData.progressPercent || 0) >= 70 ? (trackingData.progressPercent === 100 ? "text-success" : "text-primary") : "text-muted"}`}>
                              <i className="fa-solid fa-truck mb-1 d-block"></i>
                              <span>In Transit</span>
                            </div>
                          </div>
                          <div className="col">
                            <div className={`fw-bold ${(trackingData.progressPercent || 0) >= 90 ? (trackingData.progressPercent === 100 ? "text-success" : "text-primary") : "text-muted"}`}>
                              <i className="fa-solid fa-person-biking mb-1 d-block"></i>
                              <span>Out for Delivery</span>
                            </div>
                          </div>
                          <div className="col">
                            <div className={`fw-bold ${(trackingData.progressPercent || 0) >= 100 ? "text-success" : "text-muted"}`}>
                              <i className="fa-solid fa-circle-check mb-1 d-block"></i>
                              <span>Delivered</span>
                            </div>
                          </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between small text-muted mt-3 pt-2 border-top">
                          <span>Origin Hub: <strong>{trackingData.origin || "SPARE PRO Central Hub, Delhi"}</strong></span>
                          <span>Destination: <strong>{trackingData.destination || "Destination Hub, India"}</strong></span>
                        </div>

                        {trackingData.estimatedDelivery && (
                          <div className="small text-success fw-semibold mt-2">
                            <i className="fa-regular fa-calendar-check me-1"></i>
                            Estimated Delivery Date:{" "}
                            {new Date(trackingData.estimatedDelivery).toLocaleDateString("en-IN", {
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

                    {!trackingData.history || trackingData.history.length === 0 ? (
                      <p className="text-muted small">No tracking checkpoints posted yet.</p>
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

              <div className="modal-footer border-top bg-light rounded-bottom-4 px-4 py-3">
                {trackingData?.officialTrackingUrl && (
                  <a
                    href={trackingData.officialTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-danger rounded-pill px-4 me-auto small"
                  >
                    <i className="fa-solid fa-external-link me-1"></i> Track on India Post Portal
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => {
                    setShowTrackingModal(false);
                    setTrackingData(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
