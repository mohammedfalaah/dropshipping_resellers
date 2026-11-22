import React, { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { settingsApi, adminApi } from "../../services/api";

export default function Settings() {
  const { addToast } = useToast();
  const [platformName, setPlatformName] = useState("SPARE PRO Wholesale & Dropshipping");
  const [supportEmail, setSupportEmail] = useState("support@sparepro.com");
  const [currency, setCurrency] = useState("INR (Indian Rupee - Integer Paise)");
  const [autoApprove, setAutoApprove] = useState(false);
  const [defaultMoq, setDefaultMoq] = useState("1");
  const [deliveryCharge, setDeliveryCharge] = useState("50");
  const [fastDeliveryCharge, setFastDeliveryCharge] = useState("100");
  const [codFixedFee, setCodFixedFee] = useState("50");
  const [codCommissionRate, setCodCommissionRate] = useState("1.60");

  // India Post DOP Wholesaler Credentials & Token Integration
  const [indiapostApiUrl, setIndiapostApiUrl] = useState("https://app.indiapost.gov.in/beextcustomer");
  const [indiapostUsername, setIndiapostUsername] = useState("");
  const [indiapostPassword, setIndiapostPassword] = useState("");
  const [hasIndiapostPassword, setHasIndiapostPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [indiapostBearerToken, setIndiapostBearerToken] = useState("");
  const [indiapostRefreshToken, setIndiapostRefreshToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [indiapostAutoSync, setIndiapostAutoSync] = useState(true);
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null);
  const [jsonInput, setJsonInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAuth, setTestingAuth] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

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
          if (data.fastDeliveryChargeRupees !== undefined) {
            setFastDeliveryCharge(String(data.fastDeliveryChargeRupees));
          } else if (data.fastDeliveryChargePaise !== undefined) {
            setFastDeliveryCharge(String(data.fastDeliveryChargePaise / 100));
          }
          if (data.codFixedFeeRupees !== undefined) {
            setCodFixedFee(String(data.codFixedFeeRupees));
          } else if (data.codFixedFeePaise !== undefined) {
            setCodFixedFee(String(data.codFixedFeePaise / 100));
          } else if (data.codFixedFee !== undefined) {
            setCodFixedFee(String(data.codFixedFee));
          }
          if (data.codCommissionRatePercent !== undefined) {
            setCodCommissionRate(String(data.codCommissionRatePercent));
          } else if (data.codCommissionRate !== undefined) {
            setCodCommissionRate(String(data.codCommissionRate));
          }
          if (typeof data.autoApproveResellers === "boolean") {
            setAutoApprove(data.autoApproveResellers);
          }
          if (data.indiapostApiUrl) {
            setIndiapostApiUrl(data.indiapostApiUrl);
          }
          if (data.indiapostUsername) {
            setIndiapostUsername(data.indiapostUsername);
          }
          if (data.hasIndiapostPassword || data.indiapostPassword) {
            setHasIndiapostPassword(true);
            setIndiapostPassword(data.indiapostPassword || "••••••••");
          }
          if (data.indiapostBearerToken) {
            setIndiapostBearerToken(data.indiapostBearerToken);
          }
          if (data.indiapostRefreshToken) {
            setIndiapostRefreshToken(data.indiapostRefreshToken);
          }
          if (typeof data.indiapostAutoSync === "boolean") {
            setIndiapostAutoSync(data.indiapostAutoSync);
          }
          if (data.indiapostTokenExpiresAt) {
            setTokenExpiresAt(data.indiapostTokenExpiresAt);
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

  const handleParseJson = (text) => {
    try {
      const parsed = JSON.parse(text.trim());
      const d = parsed.data || parsed;
      let found = false;
      if (d.access_token) {
        setIndiapostBearerToken(d.access_token);
        found = true;
      }
      if (d.refresh_token) {
        setIndiapostRefreshToken(d.refresh_token);
        found = true;
      }
      if (found) {
        addToast("Successfully extracted access_token and refresh_token from JSON!", "success");
        setJsonInput("");
      } else {
        addToast("Could not find access_token or refresh_token in pasted JSON.", "error");
      }
    } catch (err) {
      addToast("Invalid JSON string. Please ensure valid JSON format.", "error");
    }
  };

  const handleTestIndiaPostAuth = async () => {
    try {
      setTestingAuth(true);
      const res = await adminApi.testIndiaPost();
      const info = res?.data?.data || res?.data || {};
      addToast("India Post DOP API authentication successful!", "success");
      if (info.hasAccessToken) {
        setTokenExpiresAt(info.tokenExpiresAt);
      }
      // Re-fetch to load fresh tokens
      const refreshed = await settingsApi.getAdmin();
      const refData = refreshed?.data?.settings || refreshed?.settings || refreshed?.data;
      if (refData?.indiapostBearerToken) setIndiapostBearerToken(refData.indiapostBearerToken);
      if (refData?.indiapostRefreshToken) setIndiapostRefreshToken(refData.indiapostRefreshToken);
      if (refData?.indiapostTokenExpiresAt) setTokenExpiresAt(refData.indiapostTokenExpiresAt);
    } catch (err) {
      console.error("[IndiaPost Auth Test Error]:", err);
      addToast(err.response?.data?.message || "Failed to authenticate with India Post DOP API.", "error");
    } finally {
      setTestingAuth(false);
    }
  };

  const handleSyncAllConsignments = async () => {
    try {
      setSyncingAll(true);
      const res = await adminApi.syncAllTracking();
      const count = res?.data?.data?.syncedCount ?? res?.data?.syncedCount ?? 0;
      addToast(`Batch tracking sync complete: ${count} active consignments refreshed!`, "success");
    } catch (err) {
      console.error("[Batch Sync Error]:", err);
      addToast(err.response?.data?.message || "Failed to batch sync consignments.", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const parsedCharge = Number(deliveryCharge);
    if (isNaN(parsedCharge) || parsedCharge < 0) {
      addToast("Please enter a valid non-negative standard delivery charge (₹).", "error");
      return;
    }
    const parsedFastCharge = Number(fastDeliveryCharge);
    if (isNaN(parsedFastCharge) || parsedFastCharge < 0) {
      addToast("Please enter a valid non-negative fast delivery charge (₹).", "error");
      return;
    }
    const parsedCodFixedFee = Number(codFixedFee);
    if (isNaN(parsedCodFixedFee) || parsedCodFixedFee < 0) {
      addToast("Please enter a valid non-negative fixed COD fee (₹).", "error");
      return;
    }
    const parsedCodCommissionRate = Number(codCommissionRate);
    if (isNaN(parsedCodCommissionRate) || parsedCodCommissionRate < 0) {
      addToast("Please enter a valid non-negative COD commission rate (%).", "error");
      return;
    }

    try {
      setSaving(true);
      await settingsApi.updateAdmin({
        platformName,
        supportEmail,
        defaultMoq: Number(defaultMoq) || 1,
        deliveryCharge: parsedCharge,
        fastDeliveryCharge: parsedFastCharge,
        codFixedFee: parsedCodFixedFee,
        codCommissionRate: parsedCodCommissionRate,
        autoApproveResellers: autoApprove,
        indiapostApiUrl,
        indiapostUsername,
        indiapostPassword,
        indiapostBearerToken,
        indiapostRefreshToken,
        indiapostAutoSync,
      });
      addToast(`Platform settings updated! Standard: ₹${parsedCharge.toFixed(2)}, Fast: ₹${parsedFastCharge.toFixed(2)}, COD Fixed: ₹${parsedCodFixedFee.toFixed(2)}, COD Rate: ${parsedCodCommissionRate.toFixed(2)}%.`, "success");
      if (indiapostPassword && indiapostPassword !== "••••••••") {
        setHasIndiapostPassword(true);
        setIndiapostPassword("••••••••");
      }
    } catch (err) {
      console.error("[Admin Settings Save Error]:", err);
      addToast(err?.message || "Failed to update platform settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Administrative &amp; Platform Settings</h4>
          <p className="text-muted small mb-0">Configure wholesale policies, India Post API integration, delivery charges, and system automation</p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-danger btn-sm rounded-pill px-3 py-2 fw-semibold"
            onClick={handleSyncAllConsignments}
            disabled={syncingAll}
          >
            {syncingAll ? (
              <span><i className="fa-solid fa-spinner fa-spin me-1"></i> Syncing...</span>
            ) : (
              <span><i className="fa-solid fa-rotate me-1"></i> Sync Active Shipments</span>
            )}
          </button>
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
                <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">Business &amp; Wholesale Rules</h6>
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
                    <label className="form-label small fw-semibold">Default Minimum Order Qty (MOQ)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={defaultMoq}
                      onChange={(e) => setDefaultMoq(e.target.value)}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold">Standard Delivery Charge (₹)</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(e.target.value)}
                      />
                    </div>
                    <div className="small text-muted mt-1">Default delivery charge for standard postal / business parcel orders.</div>
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold d-flex align-items-center gap-1">
                      <span>Fast Delivery Charge (₹)</span>
                      <span className="badge bg-danger text-white" style={{ fontSize: "10px" }}>Priority Logistics</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={fastDeliveryCharge}
                        onChange={(e) => setFastDeliveryCharge(e.target.value)}
                      />
                    </div>
                    <div className="small text-muted mt-1">Applied automatically when customer selects Fast Delivery / Priority Dispatch at checkout.</div>
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold d-flex align-items-center gap-1">
                      <span>Fixed COD Fee (₹)</span>
                      <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: "10px" }}>Cash on Delivery</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={codFixedFee}
                        onChange={(e) => setCodFixedFee(e.target.value)}
                      />
                    </div>
                    <div className="small text-muted mt-1">Base fixed fee applied to all Cash on Delivery orders (Default: ₹50).</div>
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold d-flex align-items-center gap-1">
                      <span>COD Commission Rate (%)</span>
                      <span className="badge bg-primary-subtle text-primary" style={{ fontSize: "10px" }}>Full COD Amount</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={codCommissionRate}
                        onChange={(e) => setCodCommissionRate(e.target.value)}
                      />
                      <span className="input-group-text">%</span>
                    </div>
                    <div className="small text-muted mt-1">Commission percentage calculated on the full COD amount (Default: 1.60%).</div>
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold">Reseller Approval Policy</label>
                    <div className="form-check form-switch mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="autoApproveSwitch"
                        checked={autoApprove}
                        onChange={(e) => setAutoApprove(e.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor="autoApproveSwitch">
                        {autoApprove ? (
                          <span className="text-success fw-bold">Instant Auto-Approval Enabled</span>
                        ) : (
                          <span className="text-secondary">Manual Admin Review Required</span>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <div className="p-3 rounded-3 border bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="small text-dark d-flex align-items-center gap-1">
                          <i className="fa-solid fa-calculator text-primary"></i>
                          <span>Cash on Delivery (COD) Tariff Policy</span>
                        </strong>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: "10px" }}>
                          Automated Calculation
                        </span>
                      </div>
                      <div className="small text-muted" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                        • <strong>Formula:</strong> Total COD Charge = Fixed COD Fee + (COD Amount × Commission Rate)<br />
                        • <strong>Applied to all COD orders:</strong> Commission is calculated on the <strong>full COD amount</strong> without any threshold.<br />
                        • <strong>Configured Values:</strong> Fixed Fee: <strong>₹{Number(codFixedFee || 50).toFixed(2)}</strong> | Commission: <strong>{Number(codCommissionRate || 1.6).toFixed(2)}%</strong> (e.g. ₹500 &rarr; ₹58.00, ₹1,000 &rarr; ₹66.00, ₹1,199 &rarr; ₹69.18, ₹1,499 &rarr; ₹73.98, ₹2,000 &rarr; ₹82.00).
                      </div>
                    </div>
                  </div>
                </div>

                {/* India Post Department of Posts Customer Integration API */}
                <h6 className="fw-bold text-dark mb-3 border-bottom pb-2 d-flex align-items-center justify-content-between">
                  <span>
                    <i className="fa-solid fa-truck-fast text-danger me-2"></i>
                    India Post DOP Customer Integration API (Wholesaler Account)
                  </span>
                  {indiapostBearerToken && (
                    <span className="badge bg-success-subtle text-success small">Connected</span>
                  )}
                </h6>
                <p className="text-muted small mb-3">
                  All reseller orders are tracked using the single Wholesaler India Post account via the official DOP Customer Integration API (<code>POST /v1/access/login</code> and <code>GET /v1/tracking/&#123;awb&#125;</code>). Wholesaler credentials and tokens remain strictly on the backend and are never exposed to resellers.
                </p>

                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">India Post API Base Gateway URL</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="https://app.indiapost.gov.in/beextcustomer"
                        value={indiapostApiUrl}
                        onChange={(e) => setIndiapostApiUrl(e.target.value)}
                      />
                      <div className="small text-muted mt-1">Production gateway: <code>https://app.indiapost.gov.in/beextcustomer</code></div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Wholesaler DOP Username
                        {indiapostUsername && (
                          <span className="badge bg-primary-subtle text-primary ms-2" style={{ fontSize: "10px" }}>Configured</span>
                        )}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. SPARE_PRO_TIRUR"
                        value={indiapostUsername}
                        onChange={(e) => setIndiapostUsername(e.target.value)}
                        autoComplete="off"
                      />
                      <div className="small text-muted mt-1">Wholesaler username registered with Department of Posts.</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Wholesaler DOP Password
                        {hasIndiapostPassword && (
                          <span className="badge bg-success-subtle text-success ms-2" style={{ fontSize: "10px" }}>Encrypted &amp; Saved</span>
                        )}
                      </label>
                      <div className="input-group">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          placeholder={hasIndiapostPassword ? "••••••••" : "Enter India Post password"}
                          value={indiapostPassword}
                          onChange={(e) => setIndiapostPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                        </button>
                      </div>
                      <div className="small text-muted mt-1">Stored securely on backend. Used to auto-login at <code>POST /v1/access/login</code>.</div>
                    </div>

                    <div className="col-12 d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 border-top">
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="autoSyncSwitch"
                          checked={indiapostAutoSync}
                          onChange={(e) => setIndiapostAutoSync(e.target.checked)}
                        />
                        <label className="form-check-label small fw-semibold" htmlFor="autoSyncSwitch">
                          Auto-Sync In-Transit Shipments
                        </label>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          Uses 15-minute smart caching to minimize DOP requests while keeping tracking live.
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1"
                        onClick={handleTestIndiaPostAuth}
                        disabled={testingAuth}
                      >
                        {testingAuth ? (
                          <span><i className="fa-solid fa-spinner fa-spin me-1"></i> Testing DOP Login...</span>
                        ) : (
                          <span><i className="fa-solid fa-shield-halved me-1"></i> Test India Post Authentication</span>
                        )}
                      </button>
                    </div>

                    {/* Optional Token override / direct token inspection */}
                    <div className="col-12 mt-3 pt-3 border-top">
                      <label className="form-label small fw-semibold text-secondary">
                        <i className="fa-solid fa-key me-1"></i>
                        Active Tokens &amp; Auto-Refresh State
                      </label>
                      {tokenExpiresAt && (
                        <div className="small text-success mb-2">
                          <i className="fa-regular fa-clock me-1"></i>
                          Current Token Active until: {new Date(tokenExpiresAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Access Token (Bearer)
                        {indiapostBearerToken && (
                          <span className="badge bg-success-subtle text-success ms-2 font-monospace" style={{ fontSize: "10px" }}>Active</span>
                        )}
                      </label>
                      <div className="input-group">
                        <input
                          type={showToken ? "text" : "password"}
                          className="form-control font-monospace small"
                          placeholder="Auto-generated via login"
                          value={indiapostBearerToken}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.trim().startsWith("{")) {
                              handleParseJson(val);
                            } else {
                              setIndiapostBearerToken(val);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowToken(!showToken)}
                          title={showToken ? "Hide token" : "Show token"}
                        >
                          <i className={`fa-solid ${showToken ? "fa-eye-slash" : "fa-eye"}`}></i>
                        </button>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Refresh Token
                        {indiapostRefreshToken && (
                          <span className="badge bg-primary-subtle text-primary ms-2 font-monospace" style={{ fontSize: "10px" }}>Enabled</span>
                        )}
                      </label>
                      <div className="input-group">
                        <input
                          type={showRefreshToken ? "text" : "password"}
                          className="form-control font-monospace small"
                          placeholder="Auto-generated via login"
                          value={indiapostRefreshToken}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.trim().startsWith("{")) {
                              handleParseJson(val);
                            } else {
                              setIndiapostRefreshToken(val);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowRefreshToken(!showRefreshToken)}
                          title={showRefreshToken ? "Hide token" : "Show token"}
                        >
                          <i className={`fa-solid ${showRefreshToken ? "fa-eye-slash" : "fa-eye"}`}></i>
                        </button>
                      </div>
                    </div>
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
            <h6 className="fw-bold text-dark mb-3">Warehouse &amp; Dispatch Address (From)</h6>
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
            <h6 className="fw-bold text-dark mb-3">API Health &amp; System Status</h6>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Backend Service:</span>
              <span className="badge bg-success-subtle text-success">Node.js Express v1.0.0</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Database Engine:</span>
              <span className="badge bg-success-subtle text-success">MongoDB Atlas (7.0)</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">India Post DOP Gateway:</span>
              <span className={`badge ${indiapostBearerToken || (indiapostUsername && hasIndiapostPassword) ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>
                {indiapostBearerToken || (indiapostUsername && hasIndiapostPassword) ? "Wholesaler Auth Ready" : "Awaiting Credentials"}
              </span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Double-Entry Ledger:</span>
              <span className="badge bg-primary-subtle text-primary">Active &amp; Audited</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Standard Delivery:</span>
              <span className="badge bg-info-subtle text-info">₹{Number(deliveryCharge || 0).toFixed(2)}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Fast Delivery:</span>
              <span className="badge bg-danger-subtle text-danger">⚡ ₹{Number(fastDeliveryCharge || 0).toFixed(2)}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">Fixed COD Fee:</span>
              <span className="badge bg-secondary-subtle text-dark">₹{Number(codFixedFee || 50).toFixed(2)}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
              <span className="small text-muted">COD Commission:</span>
              <span className="badge bg-secondary-subtle text-dark">{Number(codCommissionRate || 1.6).toFixed(2)}% (Full Amount)</span>
            </div>
            <div className="d-flex align-items-center justify-content-between py-2">
              <span className="small text-muted">Payment Gateway:</span>
              <span className="badge bg-primary-subtle text-primary">Razorpay Standard Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
