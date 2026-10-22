import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegister) {
      if (formData.password !== formData.confirmPassword) {
        addToast("Passwords do not match!", "error");
        return;
      }
      addToast("Account created successfully! Welcome to SPARE PRO.", "success");
    } else {
      addToast("Logged in successfully! Welcome back.", "success");
    }
    navigate("/account");
  };

  return (
    <>
      <Breadcrumb
        title={isRegister ? "Create Account" : "Customer Login"}
        links={[{ label: isRegister ? "Register" : "Login" }]}
      />

      <div className="login-page py-5">
        <div className="container" style={{ maxWidth: "520px" }}>
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
                Register
              </button>
            </div>

            <h4 className="fw-bold mb-3">{isRegister ? "Join SPARE PRO Reseller Network" : "Welcome Back"}</h4>
            <p className="text-muted small mb-4">
              {isRegister
                ? "Create a reseller account to access tier pricing, bulk shipping discounts, and live inventory feeds."
                : "Sign in with your reseller email and password to access your dashboard and wholesale orders."}
            </p>

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
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
                <div className="d-flex justify-content-between align-items-center mb-4 small">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="rememberMe" defaultChecked />
                    <label className="form-check-label text-muted" htmlFor="rememberMe">
                      Remember me
                    </label>
                  </div>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      addToast("Password reset instructions sent to your email", "info");
                    }}
                    className="text-decoration-none fw-semibold"
                    style={{ color: "var(--accent-color, #FA7EAA)" }}
                  >
                    Forgot Password?
                  </a>
                </div>
              )}

              <button type="submit" className="btn btn-dark w-100 rounded-pill py-3 fw-semibold mb-3">
                {isRegister ? "Create Account" : "Sign In"}
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
                    New to SPARE PRO?{" "}
                    <button
                      type="button"
                      className="btn btn-link p-0 fw-semibold text-dark text-decoration-none"
                      onClick={() => setIsRegister(true)}
                    >
                      Create an Account
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
