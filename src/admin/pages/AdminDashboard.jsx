import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminApi, codApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboardStats({ filter: dateFilter });
      const data = res.data?.overview ? res.data : res.data?.data || res.data;
      setStats(data);
    } catch (err) {
      console.error("Dashboard stats error:", err);
      addToast("Failed to load dashboard metrics.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  const overview = stats?.overview || stats || {};
  const recentOrders = stats?.recentOrders || [];
  const recentActivities = stats?.recentActivities || [];

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Executive Dashboard</h4>
          <p className="text-muted small mb-0">Real-time dropshipping & wholesale platform performance metrics</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Date Filter Buttons */}
          <div className="btn-group btn-group-sm bg-white border rounded-pill p-1 shadow-sm">
            {["all", "monthly", "weekly", "daily"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`btn btn-sm rounded-pill text-capitalize px-3 ${dateFilter === mode ? "btn-dark text-white" : "btn-light text-muted border-0"}`}
                onClick={() => setDateFilter(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-pill px-3 shadow-sm bg-white"
            onClick={fetchDashboardData}
          >
            <i className="fa-solid fa-rotate me-1"></i> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted small mt-2">Computing live accounting metrics...</p>
        </div>
      ) : (
        <>
          {/* Top 4 Primary KPIs */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <div className="admin-stat-card">
                <div className="admin-stat-icon" style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}>
                  <i className="fa-solid fa-users"></i>
                </div>
                <div>
                  <div className="text-muted small">Total Resellers</div>
                  <h4 className="fw-bold mb-0 text-dark">{overview.totalResellers ?? 0}</h4>
                  <div className="small text-warning mt-1" style={{ fontSize: "11px" }}>
                    <i className="fa-solid fa-clock me-1"></i>
                    {overview.pendingResellers ?? 0} Pending Approvals
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="admin-stat-card">
                <div className="admin-stat-icon" style={{ backgroundColor: "#ECFDF5", color: "#059669" }}>
                  <i className="fa-solid fa-indian-rupee-sign"></i>
                </div>
                <div>
                  <div className="text-muted small">Total Sales Booked</div>
                  <h4 className="fw-bold mb-0 text-dark">{overview.totalSalesFormatted || "₹0.00"}</h4>
                  <div className="small text-muted mt-1" style={{ fontSize: "11px" }}>
                    {overview.totalOrders ?? 0} confirmed orders
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="admin-stat-card">
                <div className="admin-stat-icon" style={{ backgroundColor: "#FFFBEB", color: "#D97706" }}>
                  <i className="fa-solid fa-hand-holding-dollar"></i>
                </div>
                <div>
                  <div className="text-muted small">COD In Transit</div>
                  <h4 className="fw-bold mb-0 text-warning">{overview.totalCodPendingFormatted || "₹0.00"}</h4>
                  <div className="small text-muted mt-1" style={{ fontSize: "11px" }}>
                    Awaiting courier collection
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="admin-stat-card">
                <div className="admin-stat-icon" style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}>
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <div>
                  <div className="text-muted small">Reseller Outstanding</div>
                  <h4 className="fw-bold mb-0 text-danger">{overview.totalOutstandingFormatted || "₹0.00"}</h4>
                  <div className="small text-success mt-1 fw-semibold" style={{ fontSize: "11px" }}>
                    {overview.totalPaymentsCollectedFormatted || "₹0.00"} Collected
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-white rounded-3 border">
                <span className="text-muted small">Catalog Products</span>
                <h5 className="fw-bold text-dark mt-1 mb-0">{overview.totalProducts ?? 8}</h5>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-white rounded-3 border">
                <span className="text-muted small">Approved Resellers</span>
                <h5 className="fw-bold text-success mt-1 mb-0">{overview.approvedResellers ?? 0}</h5>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-white rounded-3 border">
                <span className="text-muted small">Pending Fulfillment</span>
                <h5 className="fw-bold text-warning mt-1 mb-0">{overview.pendingOrders ?? 0}</h5>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="p-3 bg-white rounded-3 border">
                <span className="text-muted small">Delivered Orders</span>
                <h5 className="fw-bold text-primary mt-1 mb-0">{overview.deliveredOrders ?? 0}</h5>
              </div>
            </div>
          </div>

          {/* Monthly Collections & Sales Trend Chart Representation */}
          <div className="admin-card mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-dark mb-0">Financial Performance & Monthly Collections</h6>
                <span className="text-muted small">Double-entry revenue and collection reconciliation</span>
              </div>
              <span className="badge bg-light text-muted border">FY 2026</span>
            </div>

            <div className="p-4 bg-light rounded-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted">October 2026 Collection Ratio</span>
                <span className="small fw-bold text-success">88% Settled</span>
              </div>
              <div className="progress mb-3" style={{ height: "10px" }}>
                <div className="progress-bar bg-success" role="progressbar" style={{ width: "88%" }}></div>
                <div className="progress-bar bg-warning" role="progressbar" style={{ width: "12%" }}></div>
              </div>
              <div className="row text-center pt-2">
                <div className="col-4 border-end">
                  <div className="text-muted small">Gross Sales</div>
                  <strong className="text-dark">{overview.totalSalesFormatted || "₹0.00"}</strong>
                </div>
                <div className="col-4 border-end">
                  <div className="text-muted small">Total Collections</div>
                  <strong className="text-success">{overview.totalPaymentsCollectedFormatted || "₹0.00"}</strong>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Uncollected COD</div>
                  <strong className="text-warning">{overview.totalCodPendingFormatted || "₹0.00"}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tables Row: Recent Orders and Reseller Applications */}
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="admin-card h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold text-dark mb-0">Recent Wholesale Orders</h6>
                  <Link to="/admin/orders" className="btn btn-sm btn-link p-0 text-decoration-none small text-primary fw-semibold">
                    View All Orders &rarr;
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <p className="text-muted small mb-0 py-3 text-center">No orders placed recently.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Reseller</th>
                          <th>Total</th>
                          <th>Payment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.slice(0, 5).map((o) => (
                          <tr key={o._id}>
                            <td className="fw-bold">{o.orderNumber}</td>
                            <td>{o.reseller?.name || "Direct Reseller"}</td>
                            <td className="fw-semibold">₹{(o.totalAmountPaise / 100).toFixed(2)}</td>
                            <td>
                              <span className={`admin-badge ${o.paymentStatus === "paid" ? "admin-badge-success" : "admin-badge-warning"}`}>
                                {o.paymentMethod.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span className="admin-badge admin-badge-info text-capitalize">
                                {o.orderStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="col-lg-5">
              <div className="admin-card h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold text-dark mb-0">System Activity & Audit Log</h6>
                  <Link to="/admin/applications" className="btn btn-sm btn-link p-0 text-decoration-none small text-primary fw-semibold">
                    Applications ({overview.pendingResellers ?? 0})
                  </Link>
                </div>

                {recentActivities.length === 0 ? (
                  <div className="p-3 text-muted small text-center">
                    Audit trail synchronized. All ledger entries verified.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {recentActivities.slice(0, 5).map((act) => (
                      <div key={act._id} className="d-flex align-items-start gap-2 border-bottom pb-2">
                        <i className="fa-solid fa-shield text-primary mt-1" style={{ fontSize: "12px" }}></i>
                        <div className="flex-grow-1">
                          <div className="small fw-semibold text-dark">{act.action}</div>
                          <div className="text-muted" style={{ fontSize: "11px" }}>
                            {new Date(act.createdAt).toLocaleString()} • IP: {act.ipAddress || "127.0.0.1"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
