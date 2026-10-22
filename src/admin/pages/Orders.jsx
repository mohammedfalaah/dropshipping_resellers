import React, { useState, useEffect } from "react";
import { adminApi, ordersApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState("confirmed");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");

  const { addToast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, search };
      if (statusFilter !== "all") params.orderStatus = statusFilter;
      if (paymentFilter !== "all") params.paymentStatus = paymentFilter;

      const res = await adminApi.getOrders(params);
      const data = res.data?.orders ? res.data : res.data?.data || res.data;
      setOrders(data.orders || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch system orders.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, paymentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleOpenStatusModal = (o) => {
    setUpdatingOrderId(o._id);
    setNewStatus(o.orderStatus);
    setTrackingNumber(o.trackingNumber || "");
    setCourierName(o.courierName || "");
    setShowStatusModal(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateOrderStatus(updatingOrderId, newStatus);
      addToast(`Order updated to "${newStatus}".`, "success");
      setShowStatusModal(false);
      fetchOrders();
    } catch (err) {
      addToast(err.message || "Failed to update order status.", "error");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Order Management</h4>
          <p className="text-muted small mb-0">Track wholesale drop-ship dispatches, courier logistics, and payment states</p>
        </div>
        <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white" onClick={fetchOrders}>
          <i className="fa-solid fa-rotate me-1"></i> Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                placeholder="Search by order # (e.g. SP-9281)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-dark rounded-pill px-3">
                Search
              </button>
            </form>
          </div>
          <div className="col-md-7 d-flex justify-content-md-end gap-2 flex-wrap">
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "160px" }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "160px" }}
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="cod_pending">COD Pending</option>
              <option value="pending">Payment Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Loading system orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-box-open fa-3x text-muted mb-3"></i>
            <h6 className="fw-bold">No Orders Found</h6>
            <p className="text-muted small">No orders match the selected filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Reseller</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Payment Status</th>
                  <th>Order Status</th>
                  <th>Tracking / Courier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <div className="fw-bold text-dark">{o.orderNumber}</div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{o.reseller?.name || "Direct Reseller"}</div>
                      <div className="text-muted small">{o.reseller?.email}</div>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="fw-bold text-dark">₹{(o.totalAmountPaise / 100).toFixed(2)}</td>
                    <td>
                      <span className="small text-uppercase">{o.paymentMethod}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          o.paymentStatus === "paid"
                            ? "admin-badge-success"
                            : o.paymentStatus === "cod_pending"
                            ? "admin-badge-warning"
                            : "admin-badge-neutral"
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          o.orderStatus === "delivered"
                            ? "admin-badge-success"
                            : o.orderStatus === "shipped"
                            ? "admin-badge-info"
                            : o.orderStatus === "cancelled"
                            ? "admin-badge-danger"
                            : "admin-badge-warning"
                        } text-capitalize`}
                      >
                        {o.orderStatus}
                      </span>
                    </td>
                    <td>
                      {o.trackingNumber ? (
                        <div className="small">
                          <span className="fw-semibold">{o.courierName || "Courier"}: </span>
                          <code>{o.trackingNumber}</code>
                        </div>
                      ) : (
                        <span className="text-muted small">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          title="View Order Details"
                          onClick={() => {
                            setSelectedOrder(o);
                            setShowDetailModal(true);
                          }}
                        >
                          <i className="fa-regular fa-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          title="Update Status"
                          onClick={() => handleOpenStatusModal(o)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Showing page {page} of {pagination.pages} ({pagination.total} orders)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-outline-secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showDetailModal && selectedOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom">
                <div>
                  <h5 className="modal-title fw-bold">Order Details: {selectedOrder.orderNumber}</h5>
                  <span className="text-muted small">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</span>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Shipping & Reseller Info */}
                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Dropshipper / Reseller</span>
                    <strong className="text-dark">{selectedOrder.reseller?.name || "Direct"}</strong>
                    <div className="small text-muted">{selectedOrder.reseller?.email}</div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Recipient Shipping Address</span>
                    <div className="fw-semibold small">{selectedOrder.shippingAddress?.fullName}</div>
                    <div className="small text-muted">
                      {selectedOrder.shippingAddress?.addressLine1}, {selectedOrder.shippingAddress?.city},{" "}
                      {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.postalCode}
                    </div>
                    <div className="small text-muted">Ph: {selectedOrder.shippingAddress?.phone}</div>
                  </div>
                </div>

                {/* Items Snapshot */}
                <h6 className="fw-bold border-bottom pb-2">Order Items Snapshot</h6>
                <div className="table-responsive mb-4">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="fw-semibold">{it.name || it.product?.name || "Product"}</td>
                          <td><code>{it.sku || "RES-SKU"}</code></td>
                          <td>{it.quantity}</td>
                          <td>₹{(it.pricePaise / 100).toFixed(2)}</td>
                          <td className="fw-bold">₹{((it.pricePaise * it.quantity) / 100).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between p-3 bg-light rounded-3 fw-bold">
                  <span>Grand Total</span>
                  <span className="fs-5 text-dark">₹{(selectedOrder.totalAmountPaise / 100).toFixed(2)}</span>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleUpdateStatusSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Update Order Status</h5>
                  <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Fulfillment Status</label>
                    <select
                      className="form-select rounded-3"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled (Restores Inventory)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Courier / Logistics Partner</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. BlueDart, Delhivery, XpressBees"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tracking Number (AWB)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. BD-892184910"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowStatusModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-admin-primary rounded-pill px-4">
                    Update Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
