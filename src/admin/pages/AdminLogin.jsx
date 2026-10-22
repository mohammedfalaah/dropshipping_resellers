import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import "../admin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await login(email, password);
      if (res.data?.user?.role !== "admin") {
        setErrorMsg("Access denied. This account does not possess administrator privileges.");
        return;
      }
      addToast(`Welcome to VEXORA Admin Console, ${res.data.user.name}!`, "success");
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || "Invalid administrator credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("admin@sparepro.com");
    setPassword("Admin@SparePro2026!");
    setErrorMsg("");
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ backgroundColor: "#F8F9FA" }}>
      <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border" style={{ maxWidth: "440px", width: "100%", margin: "20px" }}>
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center text-white fw-bold rounded-3 mb-3 shadow-sm"
            style={{ width: "48px", height: "48px", backgroundColor: "#5E43F3", fontSize: "22px" }}
          >
            V
          </div>
          <h4 className="fw-bold text-dark mb-1">VEXORA Admin Console</h4>
          <p className="text-muted small mb-0">Authorized administration and operations portal</p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger py-2 px-3 small rounded-3 mb-4 d-flex align-items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Demo Fill */}
        <div className="mb-4">
          <button
            type="button"
            id="adminDemoFillBtn"
            className="btn btn-outline-secondary w-100 rounded-3 py-2 small d-flex align-items-center justify-content-center gap-2"
            onClick={handleFillDemo}
          >
            <i className="fa-solid fa-shield-halved text-primary"></i>
            <span>Fill Super Admin Demo Credentials</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold text-secondary">Admin Email Address</label>
            <input
              type="email"
              className="form-control rounded-3 py-2"
              placeholder="admin@sparepro.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold text-secondary">Password</label>
            <input
              type="password"
              className="form-control rounded-3 py-2"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            id="adminSignInBtn"
            className="btn w-100 rounded-3 py-2 fw-semibold text-white mb-3"
            style={{ backgroundColor: "#5E43F3" }}
            disabled={submitting}
          >
            {submitting ? (
              <span><i className="fa-solid fa-spinner fa-spin me-2"></i> Verifying Access...</span>
            ) : (
              "Sign In to Console"
            )}
          </button>

          <div className="text-center">
            <Link to="/" className="text-decoration-none small text-muted">
              <i className="fa-solid fa-arrow-left me-1"></i> Return to Storefront
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
