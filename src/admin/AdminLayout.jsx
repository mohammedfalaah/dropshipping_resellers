import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "./admin.css";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    addToast("Admin session ended successfully.", "info");
    navigate("/admin/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: "fa-solid fa-chart-pie" },
    { label: "Resellers", path: "/admin/resellers", icon: "fa-solid fa-users" },
    { label: "Reseller Applications", path: "/admin/applications", icon: "fa-solid fa-user-clock" },
    { label: "Products", path: "/admin/products", icon: "fa-solid fa-boxes-stacked" },
    { label: "Categories", path: "/admin/categories", icon: "fa-solid fa-tags" },
    { label: "Orders", path: "/admin/orders", icon: "fa-solid fa-bag-shopping" },
    { label: "COD Pending", path: "/admin/cod-pending", icon: "fa-solid fa-hand-holding-dollar" },
    { label: "Payments", path: "/admin/payments", icon: "fa-solid fa-receipt" },
    { label: "Reseller Balances", path: "/admin/balances", icon: "fa-solid fa-scale-balanced" },
    { label: "Balance Sheet", path: "/admin/balance-sheet", icon: "fa-solid fa-file-invoice-dollar" },
    { label: "Reports", path: "/admin/reports", icon: "fa-solid fa-chart-line" },
    { label: "Settings", path: "/admin/settings", icon: "fa-solid fa-gear" },
  ];

  return (
    <div className="admin-wrapper">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50 z-3 d-lg-none"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Admin Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "show" : ""}`}>
        <div className="admin-sidebar-brand d-flex justify-content-between align-items-center">
          <Link to="/admin/dashboard" className="text-decoration-none d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center text-white fw-bold rounded-3"
              style={{ width: "34px", height: "34px", backgroundColor: "var(--admin-primary)" }}
            >
              V
            </span>
            <div>
              <span className="fw-bold fs-6 text-dark tracking-wide">VEXORA</span>
              <span className="badge bg-light text-muted border ms-2" style={{ fontSize: "10px" }}>ADMIN</span>
            </div>
          </Link>
          <button
            className="btn btn-sm btn-light border-0 d-lg-none"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="text-uppercase text-muted px-3 mb-2" style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>
            Management
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin" || item.path === "/admin/dashboard"}
              className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="text-uppercase text-muted px-3 mt-4 mb-2" style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>
            Session
          </div>

          <button
            type="button"
            className="admin-nav-item text-danger border-0 bg-transparent w-100 text-start"
            onClick={handleLogout}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Logout</span>
          </button>
        </nav>

        <div className="p-3 border-top bg-light d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
            style={{ width: "36px", height: "36px", backgroundColor: "var(--admin-primary)", fontSize: "14px" }}
          >
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="overflow-hidden">
            <div className="text-truncate fw-semibold small text-dark">{user?.name || "Administrator"}</div>
            <div className="text-truncate text-muted small" style={{ fontSize: "11px" }}>{user?.email}</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-sm btn-light border d-lg-none"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="position-relative d-none d-md-block">
              <i className="fa-solid fa-magnifying-glass position-absolute text-muted" style={{ top: "11px", left: "14px", fontSize: "13px" }}></i>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search orders, resellers, SKUs..."
              />
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-none d-sm-inline-flex align-items-center gap-2"
              style={{ fontSize: "12px" }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              <span>View Storefront</span>
            </Link>

            <div className="dropdown">
              <button
                className="btn btn-sm btn-light rounded-circle border"
                style={{ width: "36px", height: "36px" }}
                title="Notifications"
                onClick={() => addToast("System audit trail active and healthy.", "info")}
              >
                <i className="fa-regular fa-bell text-muted"></i>
              </button>
            </div>

            <div className="d-flex align-items-center gap-2 border-start ps-3">
              <span className="badge bg-success-subtle text-success small">DB Connected</span>
            </div>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
