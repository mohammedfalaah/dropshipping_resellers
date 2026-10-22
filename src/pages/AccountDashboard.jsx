import React, { useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useToast } from "../context/ToastContext";

export default function AccountDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { addToast } = useToast();

  const [profile, setProfile] = useState({
    firstName: "Sarah",
    lastName: "Jenkins",
    email: "sarah.jenkins@example.com",
    phone: "+1 (555) 234-5678"
  });

  const orders = [
    {
      id: "SP-948210",
      date: "October 18, 2026",
      status: "Delivered",
      total: "$69.98",
      itemsCount: 2
    },
    {
      id: "SP-783921",
      date: "September 11, 2026",
      status: "Delivered",
      total: "$104.00",
      itemsCount: 2
    }
  ];

  const handleProfileSave = (e) => {
    e.preventDefault();
    addToast("Profile details updated successfully!", "success");
  };

  return (
    <>
      <Breadcrumb title="My Account" links={[{ label: "Account" }]} />

      <div className="account-dashboard-page py-5">
        <div className="container">
          <div className="row g-4">
            {/* Sidebar Navigation */}
            <div className="col-lg-3">
              <div className="bg-white p-4 rounded-4 shadow-sm border">
                <div className="text-center pb-3 mb-3 border-bottom">
                  <div
                    className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold mb-2 shadow-sm"
                    style={{ width: "65px", height: "65px", backgroundColor: "var(--accent-color, #FA7EAA)", fontSize: "22px" }}
                  >
                    SJ
                  </div>
                  <h6 className="fw-bold mb-0">{profile.firstName} {profile.lastName}</h6>
                  <span className="text-muted small">{profile.email}</span>
                </div>

                <div className="nav flex-column gap-2">
                  <button
                    type="button"
                    className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "dashboard" ? "btn-dark text-white" : "btn-light"}`}
                    onClick={() => setActiveTab("dashboard")}
                  >
                    <i className="fa-solid fa-gauge me-2"></i> Dashboard
                  </button>
                  <button
                    type="button"
                    className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "orders" ? "btn-dark text-white" : "btn-light"}`}
                    onClick={() => setActiveTab("orders")}
                  >
                    <i className="fa-solid fa-box-open me-2"></i> Orders
                  </button>
                  <button
                    type="button"
                    className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "addresses" ? "btn-dark text-white" : "btn-light"}`}
                    onClick={() => setActiveTab("addresses")}
                  >
                    <i className="fa-solid fa-location-dot me-2"></i> Addresses
                  </button>
                  <button
                    type="button"
                    className={`btn text-start rounded-pill px-3 py-2 ${activeTab === "details" ? "btn-dark text-white" : "btn-light"}`}
                    onClick={() => setActiveTab("details")}
                  >
                    <i className="fa-solid fa-user me-2"></i> Account Details
                  </button>
                  <Link
                    to="/wishlist"
                    className="btn btn-light text-start rounded-pill px-3 py-2 text-decoration-none text-dark"
                  >
                    <i className="fa-regular fa-heart me-2"></i> Wishlist
                  </Link>
                  <Link
                    to="/login"
                    className="btn btn-outline-danger text-start rounded-pill px-3 py-2 mt-3 text-decoration-none"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket me-2"></i> Log Out
                  </Link>
                </div>
              </div>
            </div>

            {/* Tab Details */}
            <div className="col-lg-9">
              <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border">
                {activeTab === "dashboard" && (
                  <div>
                    <h4 className="fw-bold mb-3">Hello, {profile.firstName}!</h4>
                    <p className="text-muted mb-4">
                      From your account dashboard you can view your <strong>recent orders</strong>, manage your <strong>shipping and billing addresses</strong>, and edit your <strong>password and account details</strong>.
                    </p>

                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h3 className="fw-bold mb-1" style={{ color: "var(--accent-color, #FA7EAA)" }}>{orders.length}</h3>
                          <span className="text-muted small">Total Orders</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h3 className="fw-bold mb-1 text-success">Active</h3>
                          <span className="text-muted small">Account Status</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="p-3 bg-light rounded-4 border text-center">
                          <h3 className="fw-bold mb-1 text-warning">VIP</h3>
                          <span className="text-muted small">Rewards Tier</span>
                        </div>
                      </div>
                    </div>

                    <h5 className="fw-bold mb-3">Recent Orders</h5>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Order</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o) => (
                            <tr key={o.id}>
                              <td className="fw-semibold">{o.id}</td>
                              <td>{o.date}</td>
                              <td><span className="badge bg-success-subtle text-success">{o.status}</span></td>
                              <td className="fw-bold">{o.total}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark rounded-pill px-3"
                                  onClick={() => addToast(`Order details for ${o.id} loaded`, "info")}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "orders" && (
                  <div>
                    <h4 className="fw-bold mb-4">Order History</h4>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Order</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o) => (
                            <tr key={o.id}>
                              <td className="fw-semibold">{o.id}</td>
                              <td>{o.date}</td>
                              <td><span className="badge bg-success-subtle text-success">{o.status}</span></td>
                              <td className="fw-bold">{o.total} for {o.itemsCount} items</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark rounded-pill px-3"
                                  onClick={() => addToast(`Order invoice for ${o.id} generated`, "info")}
                                >
                                  Invoice
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "addresses" && (
                  <div>
                    <h4 className="fw-bold mb-4">My Addresses</h4>
                    <div className="row g-4">
                      <div className="col-md-6">
                        <div className="p-4 border rounded-4 bg-light h-100">
                          <h6 className="fw-bold mb-2">Billing Address</h6>
                          <p className="text-muted small mb-3">
                            Sarah Jenkins<br />
                            742 Evergreen Terrace<br />
                            Springfield, OR 97477<br />
                            United States
                          </p>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark rounded-pill"
                            onClick={() => addToast("Editing billing address", "info")}
                          >
                            Edit Address
                          </button>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="p-4 border rounded-4 bg-light h-100">
                          <h6 className="fw-bold mb-2">Shipping Address</h6>
                          <p className="text-muted small mb-3">
                            Sarah Jenkins<br />
                            742 Evergreen Terrace<br />
                            Springfield, OR 97477<br />
                            United States
                          </p>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark rounded-pill"
                            onClick={() => addToast("Editing shipping address", "info")}
                          >
                            Edit Address
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "details" && (
                  <div>
                    <h4 className="fw-bold mb-4">Account Details</h4>
                    <form onSubmit={handleProfileSave}>
                      <div className="row g-3 mb-4">
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold">First Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={profile.firstName}
                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                          />
                        </div>
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold">Last Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={profile.lastName}
                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                          />
                        </div>
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold">Email Address</label>
                          <input
                            type="email"
                            className="form-control"
                            value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          />
                        </div>
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold">Phone</label>
                          <input
                            type="tel"
                            className="form-control"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <h5 className="fw-bold mb-3">Password Change</h5>
                      <div className="row g-3 mb-4">
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Current Password</label>
                          <input type="password" className="form-control" placeholder="••••••••" />
                        </div>
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold">New Password</label>
                          <input type="password" className="form-control" placeholder="••••••••" />
                        </div>
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold">Confirm New Password</label>
                          <input type="password" className="form-control" placeholder="••••••••" />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-dark rounded-pill px-4">
                        Save Changes
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
