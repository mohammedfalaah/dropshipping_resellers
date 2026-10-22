import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRouteGuard({ children }) {
  const { user, token, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Admin Console...</span>
        </div>
      </div>
    );
  }

  // If not authenticated or not admin, redirect to /admin/login
  if (!token || !user || role !== "admin") {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
