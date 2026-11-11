import React, { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { settingsApi } from "../../services/api";

export default function Settings() {
  const { addToast } = useToast();
  const [platformName, setPlatformName] = useState("SPARE PRO Wholesale & Dropshipping");
  const [supportEmail, setSupportEmail] = useState("support@sparepro.com");
  const [currency, setCurrency] = useState("INR (Indian Rupee - Integer Paise)");
  const [autoApprove, setAutoApprove] = useState(false);
  const [defaultMoq, setDefaultMoq] = useState("1");
  const [deliveryCharge, setDeliveryCharge] = useState("50");
  const [razorpayKey, setRazorpayKey] = useState("rzp_live_TyLo7eXzFHYXh4");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing settings from database
  useEffect(() => {
    let isMounted = true;
    settingsApi
      .getAdmin()
      .then((res) => {
        const data = res?.data?.settings || res?.settings || res?.data;
        if (isMounted && data) {
          if (data.platformName) setPlatformName(data.platformName);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          if (data.defaultMoq !== undefined) setDefaultMoq(String(data.defaultMoq));
          if (data.deliveryChargeRupees !== undefined) {
            setDeliveryCharge(String(data.deliveryChargeRupees));
          } else if (data.deliveryChargePaise !== undefined) {
            setDeliveryCharge(String(data.deliveryChargePaise / 100));
          }
          if (typeof data.autoApproveResellers === "boolean") {
            setAutoApprove(data.autoApproveResellers);
          }
        }
      })
      .catch((err) => {
        console.warn("[Admin Settings] Fetch error:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const parsedCharge = Number(deliveryCharge);
    if (isNaN(parsedCharge) || parsedCharge < 0) {
      addToast("Please enter a valid non-negative delivery charge (₹).", "error");
      return;
    }

    try {
      setSaving(true);
      await settingsApi.updateAdmin({
        platformName,
        supportEmail,
        defaultMoq: Number(defaultMoq) || 1,
        deliveryCharge: parsedCharge,
        autoApproveResellers: autoApprove,
      });
      addToast(`Platform settings updated! Delivery charge set to ₹${parsedCharge.toFixed(2)}.`, "success");
    } catch (err) {
      console.error("[Admin Settings Save Error]:", err);
      addToast(err?.message || "Failed to update platform settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Administrative & Platform Settings</h4>
          <p className="text-muted small mb-0">Configure wholesale policies, delivery charges, payment credentials, and audit security</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="admin-card">
            {loading ? (
              <div className="text-center py-4 text-muted">
                <i className="fa-solid fa-spinner fa-spin me-2"></i> Loading settings...
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Business & Wholesale Rules</h6>
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
                      min="1"
                      value={defaultMoq}
                      onChange={(e) => setDefaultMoq(e.target.value)}
                    />
                  </div>
                </div>

                <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">
                  <i className="fa-solid fa-truck-fast text-primary me-2"></i>
                  Delivery & Shipping Charges
                </h6>
                <div className="p-3 bg-light rounded-3 mb-4 border">
                  <div className="row g-3 align-items-center">
                    <div className="col-sm-6">
                      <label className="form-label small fw-bold text-dark mb-1">
                        Standard Delivery Charge (₹)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text fw-bold">₹</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          className="form-control fw-bold fs-6"
                          value={deliveryCharge}
                          onChange={(e) => setDeliveryCharge(e.target.value)}
                          placeholder="e.g. 50"
                          required
                        />
                      </div>
                      <div className="small text-muted mt-1">
                        Applied per order. Reseller pays this delivery charge at checkout for Cash on Delivery (COD) and Prepaid orders.
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="p-3 bg-white rounded-3 border">
                        <div className="small text-muted mb-1">Live Calculation Preview:</div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small fw-semibold text-secondary">Delivery Fee / Order:</span>
                          <span className="badge bg-primary-subtle text-primary fs-6 px-3 py-2">
                            ₹{Number(deliveryCharge || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="small text-muted mt-2">
                          Stored as <code>{Math.round(Number(deliveryCharge || 0) * 100)} paise</code> in database.
                        </div>
                      </div>
                    </div>
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

                <button type="submit" className="btn-admin-primary px-4 py-2" disabled={saving}>
                  {saving ? (
                    <span>
                      <i className="fa-solid fa-spinner fa-spin me-2"></i> Saving Settings...
                    </span>
                  ) : (
                    "Save Platform Settings"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="admin-card mb-4">
            <h6 className="fw-bold text-dark mb-3">Warehouse & Dispatch Address (From)</h6>
            <div className="p-3 bg-light rounded-3">
              <div className="fw-bold text-dark mb-1">Spare pro</div>
              <div className="small text-muted mb-2">
                Thazepalam, Tirur<br />
                Malappuram, Kerala - 676107
              </div>
              <div className="small text-dark fw-semibold mb-2">
                <i className="fa-solid fa-phone me-1 text-primary"></i> 8139808004
              </div>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                <i className="fa-solid fa-barcode me-1 text-danger"></i>
                Printed on all India Post shipping labels and consignment manifest barcodes.
              </div>
            </div>
          </div>

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
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Delivery Charge:</span>
              <span className="badge bg-info-subtle text-info">₹{Number(deliveryCharge || 0).toFixed(2)}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2">
              <span className="small text-muted">Razorpay Webhooks:</span>
              <span className="badge bg-secondary-subtle text-secondary">HMAC SHA256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
