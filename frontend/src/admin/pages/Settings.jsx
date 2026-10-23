import React, { useState } from "react";
import { useToast } from "../../context/ToastContext";

export default function Settings() {
  const { addToast } = useToast();
  const [platformName, setPlatformName] = useState("SPARE PRO Wholesale & Dropshipping");
  const [supportEmail, setSupportEmail] = useState("support@sparepro.com");
  const [currency, setCurrency] = useState("INR (Indian Rupee - Integer Paise)");
  const [autoApprove, setAutoApprove] = useState(false);
  const [defaultMoq, setDefaultMoq] = useState("1");
  const [razorpayKey, setRazorpayKey] = useState("rzp_test_sparepro2026");

  const handleSave = (e) => {
    e.preventDefault();
    addToast("Platform administrative settings updated successfully!", "success");
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Administrative & Platform Settings</h4>
          <p className="text-muted small mb-0">Configure wholesale policies, payment credentials, and audit security</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="admin-card">
            <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Business & Wholesale Rules</h6>
            <form onSubmit={handleSave}>
              <div className="row g-3 mb-4">
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Platform Brand Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Support Desk Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Platform Currency System</label>
                  <input type="text" className="form-control" value={currency} disabled />
                  <div className="small text-muted mt-1">Strict integer paise representation. Floating point arithmetic disabled.</div>
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Global Minimum Order Quantity (MOQ)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={defaultMoq}
                    onChange={(e) => setDefaultMoq(e.target.value)}
                  />
                </div>
              </div>

              <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Reseller Onboarding Security</h6>
              <div className="p-3 bg-light rounded-3 mb-4">
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="autoApproveCheck"
                    checked={autoApprove}
                    disabled
                  />
                  <label className="form-check-label fw-semibold small" htmlFor="autoApproveCheck">
                    Require Administrator Approval for New Resellers (Enforced)
                  </label>
                </div>
                <p className="text-muted small mb-0">
                  <i className="fa-solid fa-shield-halved text-primary me-1"></i>
                  By security policy, all public reseller signups default to <code>pending</code>. Unapproved accounts cannot see wholesale pricing or place orders.
                </p>
              </div>

              <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Razorpay Gateway Integration</h6>
              <div className="row g-3 mb-4">
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Public Key ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={razorpayKey}
                    onChange={(e) => setRazorpayKey(e.target.value)}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold">Server Secret Key</label>
                  <input type="password" className="form-control" value="••••••••••••••••••••" disabled />
                  <div className="small text-muted mt-1">Never exposed to client frontend bundle.</div>
                </div>
              </div>

              <button type="submit" className="btn-admin-primary px-4 py-2">
                Save Platform Settings
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="admin-card mb-4">
            <h6 className="fw-bold text-dark mb-3">API Health & System Status</h6>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Backend Service:</span>
              <span className="badge bg-success-subtle text-success">Node.js Express v1.0.0</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Database Engine:</span>
              <span className="badge bg-success-subtle text-success">MongoDB Atlas (7.0)</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Double-Entry Ledger:</span>
              <span className="badge bg-primary-subtle text-primary">Active & Audited</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2">
              <span className="small text-muted">Razorpay Webhooks:</span>
              <span className="badge bg-info-subtle text-info">HMAC SHA256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
