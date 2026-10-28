import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    businessName: "",
    city: "",
  });

  const { addToast } = useToast();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from
    ? (location.state.from.pathname + (location.state.from.search || ""))
    : "/shop";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (formData.password !== formData.confirmPassword) {
          addToast("Passwords do not match!", "error");
          setIsSubmitting(false);
          return;
        }

        const res = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || "+91 9999999999",
          businessName: formData.businessName || formData.name,
          city: formData.city || "Mumbai",
        });

        addToast(res.message || "Registration submitted! Pending administrator approval.", "info");
        navigate("/account");
      } else {
        const res = await login(formData.email, formData.password);
        addToast(`Welcome back, ${res.data.user.name}!`, "success");
        navigate(redirectTarget, { replace: true });
      }
    } catch (err) {
      addToast(err.message || "Authentication error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Breadcrumb
        title={isRegister ? "Create Reseller Account" : "Platform Login"}
        links={[{ label: isRegister ? "Register" : "Login" }]}
      />

      <div className="login-page py-5">
        <div className="container" style={{ maxWidth: "560px" }}>
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border">
            {/* Tabs Toggle */}
            <div className="d-flex border rounded-pill p-1 mb-4 bg-light">
              <button
                type="button"
                className={`btn flex-grow-1 rounded-pill fw-semibold py-2 ${
                  !isRegister ? "btn-dark text-white" : "btn-light text-muted border-0"
                }`}
                onClick={() => setIsRegister(false)}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`btn flex-grow-1 rounded-pill fw-semibold py-2 ${
                  isRegister ? "btn-dark text-white" : "btn-light text-muted border-0"
                }`}
                onClick={() => setIsRegister(true)}
              >
                Register Reseller
              </button>
            </div>

            <h4 className="fw-bold mb-2">
              {isRegister ? "Join SPARE PRO Reseller Network" : "Welcome Back"}
            </h4>
            <p className="text-muted small mb-4">
              {isRegister
                ? "Register your business to access wholesale margins, live inventory, and dropship fulfillment."
                : "Sign in with your reseller or administrator credentials to manage your account."}
            </p>

            {location.state?.from && (
              <div className="alert alert-warning border d-flex align-items-center mb-4 py-2 px-3 rounded-3" style={{ fontSize: "13px" }}>
                <i className="fa-solid fa-lock me-2 text-warning fs-6"></i>
                <span>Reseller login required to access wholesale pricing and products.</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Business Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Apex Retailers"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">City / Region *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Mumbai, Maharashtra"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold">Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Password *</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              {isRegister && (
                <div className="mb-4">
                  <label className="form-label small fw-semibold">Confirm Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              )}

              {!isRegister && (
                <>
                  <div className="d-flex gap-2 mb-3">
                    <button
                      type="button"
                      id="demoAdminBtn"
                      className="btn btn-sm btn-outline-dark rounded-pill flex-fill"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          email: "admin@sparepro.com",
                          password: "Admin@SparePro2026!",
                        });
                      }}
                    >
                      <i className="fa-solid fa-user-shield me-1"></i> Fill Admin Demo
                    </button>
                    <button
                      type="button"
                      id="demoResellerBtn"
                      className="btn btn-sm btn-outline-dark rounded-pill flex-fill"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          email: "reseller@sparepro.com",
                          password: "Reseller@2026!",
                        });
                      }}
                    >
                      <i className="fa-solid fa-store me-1"></i> Fill Reseller Demo
                    </button>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-4 small">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="rememberMe" defaultChecked />
                      <label className="form-check-label text-muted" htmlFor="rememberMe">
                        Remember me
                      </label>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3 shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>
                    <i className="fa-solid fa-spinner fa-spin me-2"></i> Processing...
                  </span>
                ) : isRegister ? (
                  "Submit Reseller Application"
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="text-center small text-muted">
                {isRegister ? (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="btn btn-link p-0 fw-semibold text-dark text-decoration-none"
                      onClick={() => setIsRegister(false)}
                    >
                      Sign In
                    </button>
                  </span>
                ) : (
                  <span>
                    Want to sell with us?{" "}
                    <button
                      type="button"
                      className="btn btn-link p-0 fw-semibold text-dark text-decoration-none"
                      onClick={() => setIsRegister(true)}
                    >
                      Apply for Reseller Account
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
