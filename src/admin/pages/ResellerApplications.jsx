import React, { useState, useEffect } from "react";
import { adminApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function ResellerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const { addToast } = useToast();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getResellers({ approvalStatus: "pending", limit: 50 });
      const data = res.data?.resellers ? res.data : res.data?.data || res.data;
      setApplications(data.resellers || []);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch pending applications.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve wholesale application for ${name}?`)) return;
    try {
      await adminApi.approveReseller(id);
      addToast(`Wholesale account for ${name} has been approved!`, "success");
      setShowViewModal(false);
      fetchApplications();
    } catch (err) {
      addToast(err.message || "Failed to approve application.", "error");
    }
  };

  const handleReject = async (id, name) => {
    const reason = window.prompt(`Provide reason for rejecting ${name}:`, "Business registration could not be verified");
    if (!reason) return;
    try {
      await adminApi.rejectReseller(id, reason);
      addToast(`Application for ${name} rejected.`, "info");
      setShowViewModal(false);
      fetchApplications();
    } catch (err) {
      addToast(err.message || "Failed to reject application.", "error");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Reseller Partner Applications</h4>
          <p className="text-muted small mb-0">Review pending wholesale seller registrations before granting catalog access</p>
        </div>
        <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white" onClick={fetchApplications}>
          <i className="fa-solid fa-rotate me-1"></i> Refresh Queue
        </button>
      </div>

      <div className="admin-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Checking applications queue...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-5">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center text-success bg-success-subtle mb-3" style={{ width: "64px", height: "64px" }}>
              <i className="fa-solid fa-check fa-2x"></i>
            </div>
            <h6 className="fw-bold text-dark">Queue Cleared</h6>
            <p className="text-muted small mb-0">There are no pending reseller applications requiring review.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Business Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td>
                      <div className="fw-bold text-dark">{app.name}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{app.businessInfo?.businessName || "Individual"}</div>
                      <div className="text-muted small">{app.businessInfo?.city ? `${app.businessInfo.city}, ${app.businessInfo.state}` : "India"}</div>
                    </td>
                    <td>{app.email}</td>
                    <td>{app.phone || "—"}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className="admin-badge admin-badge-warning">
                        Pending Review
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          title="Review Dossier"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowViewModal(true);
                          }}
                        >
                          <i className="fa-regular fa-eye me-1"></i> Review
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success text-white"
                          title="Approve"
                          onClick={() => handleApprove(app._id, app.name)}
                        >
                          <i className="fa-solid fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Reject"
                          onClick={() => handleReject(app._id, app.name)}
                        >
                          <i className="fa-solid fa-xmark"></i>
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

      {/* Review Dossier Modal */}
      {showViewModal && selectedApp && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Application Dossier</h5>
                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <span className="text-muted small d-block">Full Legal Name</span>
                  <strong className="text-dark fs-6">{selectedApp.name}</strong>
                </div>
                <div className="mb-3">
                  <span className="text-muted small d-block">Business Organization</span>
                  <strong className="text-dark">{selectedApp.businessInfo?.businessName || "Not Specified"}</strong>
                  <div className="small text-muted">GST / Tax Identification: {selectedApp.businessInfo?.taxId || "Not Registered"}</div>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <span className="text-muted small d-block">Contact Email</span>
                    <span className="small fw-semibold">{selectedApp.email}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted small d-block">Phone Number</span>
                    <span className="small fw-semibold">{selectedApp.phone || "—"}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-muted small d-block">Address</span>
                  <span className="small">
                    {selectedApp.businessInfo?.address || "Address not provided"}, {selectedApp.businessInfo?.city}, {selectedApp.businessInfo?.state}
                  </span>
                </div>
                <div className="p-3 bg-light rounded-3 text-muted small">
                  <i className="fa-solid fa-shield-halved me-1 text-primary"></i>
                  Approving this partner will grant access to wholesale tiers, volume cart discounts, and drop-ship checkout.
                </div>
              </div>
              <div className="modal-footer border-top d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-danger rounded-pill px-4"
                  onClick={() => handleReject(selectedApp._id, selectedApp.name)}
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  className="btn btn-success text-white rounded-pill px-4"
                  onClick={() => handleApprove(selectedApp._id, selectedApp.name)}
                >
                  Approve Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
