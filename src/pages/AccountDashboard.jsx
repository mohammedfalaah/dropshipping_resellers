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

  // Fetch initial data based on role
  useEffect(() => {
    if (!isAuthenticated) return;

    if (role === "admin") {
      loadAdminDashboardData();
    } else {
      loadResellerData();
    }
  }, [isAuthenticated, role]);

  const getPayload = (res) => (res && res.data !== undefined ? res.data : res);

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
        ordersApi.getAll().catch(() => null),
        paymentsApi.getResellerSummary().catch(() => null),
        paymentsApi.getResellerLedger().catch(() => null),
      ]);

      const orders = getPayload(ordersRes);
      if (orders?.orders) setResellerOrders(orders.orders);

      const summary = getPayload(summaryRes);
      if (summary) setResellerSummary(summary);

      const ledger = getPayload(ledgerRes);
      if (ledger?.ledger) setResellerLedger(ledger.ledger);
    } catch (err) {
      console.error("Failed to load reseller data", err);
    } finally {
      setLoading(false);
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
      if (res.data?.data) setFinancialReports(res.data.data);
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
            <div className="mt-4 p-3 bg-light rounded-3 text-start small">
              <div className="fw-bold mb-1">Demo Access Credentials:</div>
              <div>Admin: <code>admin@sparepro.com</code> / <code>Admin@SparePro2026!</code></div>
              <div>Approved Reseller: <code>reseller@sparepro.com</code> / <code>Reseller@2026!</code></div>
              <div>Pending Reseller: <code>priya.patel@example.com</code> / <code>Priya@2026!</code></div>
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

          <div className="row g-4">
            {/* Sidebar Navigation */}
            <div className="col-lg-3">
              <div className="bg-white p-4 rounded-4 shadow-sm border">
                <div className="text-center pb-3 mb-3 border-bottom">
                  <div
                    className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold mb-2 shadow-sm"
                    style={{
                      width: "65px",
                      height: "65px",
                      backgroundColor: role === "admin" ? "#2B3A67" : "var(--accent-color, #FA7EAA)",
                      fontSize: "22px",
                    }}
                  >
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "SP"}
                  </div>
                  <h6 className="fw-bold mb-0">{user?.name}</h6>
                  <span className="text-muted small d-block mb-1">{user?.email}</span>
                  <div className="d-flex justify-content-center gap-1">
                    <span className={`badge ${role === "admin" ? "bg-dark" : "bg-primary"}`}>
                      {role === "admin" ? "Super Admin" : "Reseller"}
                    </span>
                    {role === "reseller" && (
                      <span className={`badge ${approvalStatus === "approved" ? "bg-success" : approvalStatus === "pending" ? "bg-warning text-dark" : "bg-danger"}`}>
                        {approvalStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Specific Nav Items */}
                <div className="nav flex-column gap-2">
                  <button
                    type="button"
                    className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "dashboard" ? "btn-dark text-white" : "btn-light"}`}
                    onClick={() => setActiveTab("dashboard")}
                  >
                    <i className="fa-solid fa-gauge me-2"></i> Dashboard Overview
                  </button>

                  {role === "admin" ? (
                    <>
                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 d-flex justify-content-between align-items-center ${activeTab === "approvals" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={() => setActiveTab("approvals")}
                      >
                        <span><i className="fa-solid fa-user-check me-2"></i> Reseller Approvals</span>
                        {pendingResellers.length > 0 && (
                          <span className="badge bg-danger rounded-pill">{pendingResellers.length}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "resellers" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={async () => {
                          setActiveTab("resellers");
                          const res = await adminApi.getResellers();
                          if (res.data?.data?.resellers) setAllResellers(res.data.data.resellers);
                        }}
                      >
                        <i className="fa-solid fa-users me-2"></i> All Resellers
                      </button>

                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "orders" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={() => setActiveTab("orders")}
                      >
                        <i className="fa-solid fa-boxes-stacked me-2"></i> Order Management
                      </button>

                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 d-flex justify-content-between align-items-center ${activeTab === "cod" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={() => setActiveTab("cod")}
                      >
                        <span><i className="fa-solid fa-hand-holding-dollar me-2"></i> COD Pending</span>
                        {codPendingList.length > 0 && (
                          <span className="badge bg-warning text-dark rounded-pill">{codPendingList.length}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "reports" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={() => {
                          setActiveTab("reports");
                          handleLoadReports();
                        }}
                      >
                        <i className="fa-solid fa-file-invoice-dollar me-2"></i> Balance & Reports
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "orders" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={() => setActiveTab("orders")}
                      >
                        <i className="fa-solid fa-box-open me-2"></i> My Orders
                      </button>

                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "ledger" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={() => setActiveTab("ledger")}
                      >
                        <i className="fa-solid fa-file-lines me-2"></i> Statement & Ledger
                      </button>

                      <button
                        type="button"
                        className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "business" ? "btn-dark text-white" : "btn-light"}`}
                        onClick={() => setActiveTab("business")}
                      >
                        <i className="fa-solid fa-store me-2"></i> Business Profile
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-outline-danger text-start rounded-pill px-3 py-2 mt-3"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket me-2"></i> Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-lg-9">
              <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border">
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
                              <td>
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
                          window.open("http://localhost:5001/api/admin/reports/sales/csv?token=" + localStorage.getItem("sparepro_token"), "_blank");
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
                    <h4 className="fw-bold mb-1">Welcome back, {user?.name}!</h4>
                    <p className="text-muted mb-4 small">
                      Wholesale account for <strong>{user?.businessInfo?.businessName || "Reseller Partner"}</strong>. Track wholesale orders, account ledger, and COD receivables.
                    </p>

                    <div className="row g-3 mb-4">
                      <div className="col-md-3">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h4 className="fw-bold mb-1 text-primary">₹{((resellerSummary?.totalPurchasesPaise || 0) / 100).toFixed(2)}</h4>
                          <span className="text-muted small">Total Purchases</span>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h4 className="fw-bold mb-1 text-success">₹{((resellerSummary?.totalPaymentsPaise || 0) / 100).toFixed(2)}</h4>
                          <span className="text-muted small">Total Paid</span>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h4 className="fw-bold mb-1 text-warning">₹{((resellerSummary?.codPendingPaise || 0) / 100).toFixed(2)}</h4>
                          <span className="text-muted small">COD In Transit</span>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h4 className="fw-bold mb-1 text-danger">₹{((resellerSummary?.outstandingBalancePaise || 0) / 100).toFixed(2)}</h4>
                          <span className="text-muted small">Net Balance Due</span>
                        </div>
                      </div>
                    </div>

                    <h5 className="fw-bold mb-3">Recent Orders</h5>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resellerOrders.slice(0, 5).map((o) => (
                            <tr key={o._id}>
                              <td className="fw-semibold">{o.orderNumber}</td>
                              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                              <td><span className="badge bg-success-subtle text-success text-capitalize">{o.orderStatus}</span></td>
                              <td><span className="badge bg-light text-dark border">{o.paymentMethod.toUpperCase()} ({o.paymentStatus})</span></td>
                              <td className="fw-bold">₹{(o.totalAmountPaise / 100).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* RESELLER VIEW: Orders Tab */}
                {role === "reseller" && activeTab === "orders" && (
                  <div>
                    <h4 className="fw-bold mb-3">Wholesale Order History</h4>
                    <p className="text-muted small mb-4">Complete history of placed wholesale orders with dispatch tracking.</p>

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
                      <div className="table-responsive">
                        <table className="table align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Order #</th>
                              <th>Date</th>
                              <th>Items</th>
                              <th>Payment Method</th>
                              <th>Status</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resellerOrders.map((o) => (
                              <tr key={o._id}>
                                <td className="fw-bold">{o.orderNumber}</td>
                                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                <td>{o.items?.length || 1} items</td>
                                <td>
                                  <span className="badge bg-light text-dark border">
                                    {o.paymentMethod.toUpperCase()} • {o.paymentStatus}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge bg-success-subtle text-success text-capitalize">{o.orderStatus}</span>
                                </td>
                                <td className="fw-bold">₹{(o.totalAmountPaise / 100).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                      <div className="table-responsive">
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
    </>
  );
}
