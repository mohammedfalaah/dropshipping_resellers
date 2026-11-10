import React, { useState, useEffect } from "react";
import { adminApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Status / Dispatch update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState("confirmed");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");

  // COD Collection update modal
  const [showCodModal, setShowCodModal] = useState(false);
  const [codTargetOrder, setCodTargetOrder] = useState(null);
  const [codStatus, setCodStatus] = useState("PENDING");
  const [codCollectedAmount, setCodCollectedAmount] = useState("");
  const [codDeliveryChargeStatus, setCodDeliveryChargeStatus] = useState("PAID");
  const [codReference, setCodReference] = useState("");
  const [codNotes, setCodNotes] = useState("");
  const [codCourierName, setCodCourierName] = useState("");
  const [codTrackingNumber, setCodTrackingNumber] = useState("");
  const [submittingCod, setSubmittingCod] = useState(false);

  const { addToast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search };
      if (statusFilter !== "all") params.orderStatus = statusFilter;
      if (paymentFilter !== "all") params.paymentStatus = paymentFilter;
      if (methodFilter !== "all") params.paymentMethod = methodFilter;

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
  }, [page, statusFilter, paymentFilter, methodFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleOpenStatusModal = (o) => {
    setUpdatingOrderId(o._id);
    setNewStatus((o.orderStatus || "CONFIRMED").toLowerCase());
    setTrackingNumber(o.trackingNumber || "");
    setCourierName(o.courierName || "");
    setShowStatusModal(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateOrderStatus(updatingOrderId, newStatus.toUpperCase());
      addToast(`Order updated to "${newStatus.toUpperCase()}".`, "success");
      setShowStatusModal(false);
      fetchOrders();
    } catch (err) {
      addToast(err.message || "Failed to update order status.", "error");
    }
  };

  const handleOpenCodModal = (o) => {
    setCodTargetOrder(o);
    const existingCollected = (o.codCollectedAmountPaise || 0) / 100;
    const totalCod = ((o.customerSellingTotalPaise || o.totalPaise || 0) / 100);
    const pendingAmount = Math.max(0, totalCod - existingCollected);

    setCodStatus(o.codCollectionStatus && o.codCollectionStatus !== "NOT_APPLICABLE" ? o.codCollectionStatus : "PENDING");
    setCodCollectedAmount(pendingAmount > 0 ? pendingAmount.toFixed(2) : existingCollected.toFixed(2));
    setCodDeliveryChargeStatus(o.deliveryChargeStatus || "PAID");
    setCodReference(o.cod?.collectionReference || "");
    setCodNotes("");
    setCodCourierName(o.courierName || "");
    setCodTrackingNumber(o.trackingNumber || "");
    setShowCodModal(true);
  };

  const handleCodSubmit = async (e) => {
    e.preventDefault();
    if (!codTargetOrder) return;
    setSubmittingCod(true);

    try {
      const payload = {
        collectionStatus: codStatus,
        collectedAmount: codCollectedAmount !== "" ? parseFloat(codCollectedAmount) : undefined,
        deliveryChargeStatus: codDeliveryChargeStatus,
        collectionReference: codReference,
        notes: codNotes,
        courierName: codCourierName,
        trackingNumber: codTrackingNumber,
      };

      await adminApi.updateOrderCodCollection(codTargetOrder._id, payload);

      addToast(`COD collection status updated for order ${codTargetOrder.orderNumber}!`, "success");
      setShowCodModal(false);
      fetchOrders();
    } catch (err) {
      console.error("COD update error:", err);
      addToast(err.message || "Failed to update COD collection details.", "error");
    } finally {
      setSubmittingCod(false);
    }
  };

  // Aggregated totals across current view
  const totalCustomerSum = orders.reduce((s, o) => s + (o.customerSellingTotalPaise || o.totalPaise || 0), 0);
  const totalCompanySum = orders.reduce(
    (s, o) => s + (o.amountPayableToVexoraPaise || (o.wholesaleCostPaise || 0) + (o.deliveryChargePaise || 5000)),
    0
  );
  const totalResellerProfitSum = orders.reduce((s, o) => s + (o.expectedResellerProfitPaise || 0), 0);
  const totalCodPendingSum = orders.reduce((s, o) => {
    if (o.paymentMethod === "COD") {
      const codTotal = o.customerSellingTotalPaise || o.totalPaise || 0;
      const collected = o.codCollectedAmountPaise || 0;
      return s + Math.max(0, codTotal - collected);
    }
    return s;
  }, 0);

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Order Management & Financial Settlement</h4>
          <p className="text-muted small mb-0">
            Track all orders, manage COD collection receipts, and inspect Company vs Reseller amounts.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white shadow-sm" onClick={fetchOrders}>
            <i className="fa-solid fa-rotate me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* Financial Summary Strip */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#F0FDF4" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">Company Amount</div>
              <h5 className="fw-bold text-dark mb-0">₹{(totalCompanySum / 100).toFixed(2)}</h5>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                Wholesale + Delivery fees
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#EEF2FF" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#E0E7FF", color: "#4F46E5" }}>
              <i className="fa-solid fa-wallet"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">Reseller Amount (Profit)</div>
              <h5 className="fw-bold text-primary mb-0">+₹{(totalResellerProfitSum / 100).toFixed(2)}</h5>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                Resellers margin markup
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#FFFBEB" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}>
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">COD In Transit</div>
              <h5 className="fw-bold text-warning mb-0">₹{(totalCodPendingSum / 100).toFixed(2)}</h5>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                Awaiting courier collection
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="admin-stat-card border-0 shadow-sm" style={{ backgroundColor: "#F8FAFC" }}>
            <div className="admin-stat-icon" style={{ backgroundColor: "#E2E8F0", color: "#334155" }}>
              <i className="fa-solid fa-bag-shopping"></i>
            </div>
            <div>
              <div className="text-muted small fw-semibold">Customer Selling Total</div>
              <h5 className="fw-bold text-dark mb-0">₹{(totalCustomerSum / 100).toFixed(2)}</h5>
              <div className="small text-muted" style={{ fontSize: "11px" }}>
                {pagination.total || orders.length} total orders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card mb-4 p-3 shadow-sm border">
        <div className="row g-3 align-items-center">
          <div className="col-md-4">
            <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                placeholder="Search order #, customer, phone, tracking..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-dark rounded-pill px-3">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </form>
          </div>
          <div className="col-md-8 d-flex justify-content-md-end gap-2 flex-wrap">
            {/* Payment Method filter */}
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "140px" }}
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Methods</option>
              <option value="COD">COD Only</option>
              <option value="RAZORPAY">Razorpay (Online)</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>

            {/* Order status filter */}
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "150px" }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Dispatches</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Payment status filter */}
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "150px" }}
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Payment Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-card p-0 overflow-hidden shadow-sm border">
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
            <table className="admin-table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: "130px" }}>Order #</th>
                  <th style={{ minWidth: "160px" }}>Reseller & Customer</th>
                  <th style={{ minWidth: "130px" }}>Payment & Del. Chg</th>
                  <th style={{ minWidth: "150px" }}>Company Amount</th>
                  <th style={{ minWidth: "130px" }}>Reseller Amount</th>
                  <th style={{ minWidth: "120px" }}>Customer Total</th>
                  <th style={{ minWidth: "160px" }}>COD Collection State</th>
                  <th style={{ minWidth: "120px" }}>Fulfillment</th>
                  <th style={{ minWidth: "120px" }} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const wholesalePaise =
                    o.wholesaleCostPaise ||
                    (o.items || []).reduce(
                      (s, it) => s + (it.wholesalePricePaise || it.unitPricePaise || 0) * (it.quantity || 1),
                      0
                    );
                  const deliveryChargePaise = o.deliveryChargePaise !== undefined ? o.deliveryChargePaise : 5000;
                  const companyAmountPaise =
                    o.amountPayableToVexoraPaise || wholesalePaise + deliveryChargePaise;
                  const customerTotalPaise =
                    o.customerSellingTotalPaise ||
                    (o.items || []).reduce(
                      (s, it) =>
                        s +
                        (it.customerSellingPricePaise || it.wholesalePricePaise || it.unitPricePaise || 0) *
                          (it.quantity || 1),
                      0
                    ) ||
                    o.totalPaise;
                  const resellerProfitPaise =
                    o.expectedResellerProfitPaise !== undefined
                      ? o.expectedResellerProfitPaise
                      : Math.max(0, customerTotalPaise - companyAmountPaise);

                  const codCollected = (o.codCollectedAmountPaise || 0) / 100;
                  const codTarget = customerTotalPaise / 100;
                  const isCod = o.paymentMethod === "COD";

                  return (
                    <tr key={o._id}>
                      {/* Order # and Date */}
                      <td>
                        <strong className="text-dark d-block">{o.orderNumber}</strong>
                        <span className="text-muted small" style={{ fontSize: "11px" }}>
                          {new Date(o.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>

                      {/* Reseller & Customer */}
                      <td>
                        <div className="fw-semibold text-dark">{o.reseller?.name || "Direct Reseller"}</div>
                        <div className="small text-muted text-truncate" style={{ maxWidth: "180px", fontSize: "11px" }}>
                          To: {o.shippingAddress?.firstName || o.shippingAddress?.fullName} ({o.shippingAddress?.city || "India"})
                        </div>
                      </td>

                      {/* Payment Method & Delivery Charge */}
                      <td>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <span
                            className={`badge ${
                              isCod ? "bg-warning-subtle text-dark border border-warning" : "bg-primary-subtle text-primary border border-primary"
                            }`}
                            style={{ fontSize: "10px" }}
                          >
                            {o.paymentMethod || "COD"}
                          </span>
                        </div>
                        <div className="small" style={{ fontSize: "11px" }}>
                          Del. Chg: <strong className="text-dark">₹{(deliveryChargePaise / 100).toFixed(2)}</strong>
                          <span
                            className={`badge ms-1 ${
                              o.deliveryChargeStatus === "PAID"
                                ? "bg-success text-white"
                                : "bg-warning text-dark"
                            }`}
                            style={{ fontSize: "9px" }}
                          >
                            {o.deliveryChargeStatus === "PAID" ? "PAID" : "PENDING"}
                          </span>
                        </div>
                      </td>

                      {/* Company Amount */}
                      <td>
                        <div className="fw-bold text-success fs-6">
                          ₹{(companyAmountPaise / 100).toFixed(2)}
                        </div>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          Wholesale: ₹{(wholesalePaise / 100).toFixed(2)} + Del: ₹{(deliveryChargePaise / 100).toFixed(2)}
                        </div>
                      </td>

                      {/* Reseller Amount (Profit) */}
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1">
                          +₹{(resellerProfitPaise / 100).toFixed(2)}
                        </span>
                      </td>

                      {/* Customer Total */}
                      <td>
                        <div className="fw-bold text-dark">
                          ₹{(customerTotalPaise / 100).toFixed(2)}
                        </div>
                      </td>

                      {/* COD Collection Status */}
                      <td>
                        {isCod ? (
                          <div>
                            <span
                              className={`badge ${
                                o.codCollectionStatus === "COLLECTED" || o.codCollectionStatus === "RECONCILED"
                                  ? "bg-success"
                                  : o.codCollectionStatus === "PARTIALLY_COLLECTED"
                                  ? "bg-info text-dark"
                                  : "bg-warning text-dark"
                              } mb-1`}
                              style={{ fontSize: "10px" }}
                            >
                              {o.codCollectionStatus || "PENDING"}
                            </span>
                            <div className="small fw-semibold text-muted" style={{ fontSize: "11px" }}>
                              Collected: ₹{codCollected.toFixed(2)} / ₹{codTarget.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="badge bg-secondary-subtle text-dark" style={{ fontSize: "10px" }}>
                              Prepaid (Paid Online)
                            </span>
                            <div className="small text-muted" style={{ fontSize: "11px" }}>
                              {o.paymentStatus || "PAID"}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Fulfillment Status */}
                      <td>
                        <span
                          className={`admin-badge ${
                            o.orderStatus === "DELIVERED" || o.orderStatus === "delivered"
                              ? "admin-badge-success"
                              : o.orderStatus === "SHIPPED" || o.orderStatus === "shipped"
                              ? "admin-badge-info"
                              : o.orderStatus === "CANCELLED" || o.orderStatus === "cancelled"
                              ? "admin-badge-danger"
                              : "admin-badge-warning"
                          } text-uppercase`}
                          style={{ fontSize: "10px" }}
                        >
                          {o.orderStatus || "CONFIRMED"}
                        </span>
                        {o.trackingNumber && (
                          <div className="small text-truncate text-muted mt-1" style={{ maxWidth: "120px", fontSize: "10px" }}>
                            {o.courierName ? `${o.courierName}: ` : ""}
                            <code>{o.trackingNumber}</code>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {isCod && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning text-dark"
                              title="Update COD Collection"
                              onClick={() => handleOpenCodModal(o)}
                            >
                              <i className="fa-solid fa-money-bill-transfer"></i> COD
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            title="Update Dispatch / Tracking"
                            onClick={() => handleOpenStatusModal(o)}
                          >
                            <i className="fa-solid fa-truck"></i>
                          </button>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center bg-white">
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

      {/* COD Collection Update Modal */}
      {showCodModal && codTargetOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleCodSubmit}>
                <div className="modal-header border-bottom bg-light rounded-top-4">
                  <div>
                    <h5 className="modal-title fw-bold text-dark">
                      <i className="fa-solid fa-money-bill-transfer text-warning me-2"></i>
                      Update COD Collection: {codTargetOrder.orderNumber}
                    </h5>
                    <span className="text-muted small">
                      Reseller: {codTargetOrder.reseller?.name || "Direct"} • Customer: {codTargetOrder.shippingAddress?.firstName || codTargetOrder.shippingAddress?.fullName} ({codTargetOrder.shippingAddress?.city})
                    </span>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowCodModal(false)}></button>
                </div>

                <div className="modal-body p-4">
                  {/* Financial Breakdown Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-sm-4">
                      <div className="p-3 rounded-3 border bg-light text-center">
                        <span className="text-muted small d-block">Company Amount</span>
                        <strong className="fs-5 text-success">
                          ₹{((codTargetOrder.amountPayableToVexoraPaise || (codTargetOrder.wholesaleCostPaise || 0) + (codTargetOrder.deliveryChargePaise || 5000)) / 100).toFixed(2)}
                        </strong>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          Wholesale + Delivery fee
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-4">
                      <div className="p-3 rounded-3 border bg-light text-center">
                        <span className="text-muted small d-block">Reseller Amount</span>
                        <strong className="fs-5 text-primary">
                          +₹{((codTargetOrder.expectedResellerProfitPaise || 0) / 100).toFixed(2)}
                        </strong>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          Reseller profit margin
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-4">
                      <div className="p-3 rounded-3 border bg-light text-center">
                        <span className="text-muted small d-block">Total to Collect (COD)</span>
                        <strong className="fs-5 text-dark">
                          ₹{((codTargetOrder.customerSellingTotalPaise || codTargetOrder.totalPaise || 0) / 100).toFixed(2)}
                        </strong>
                        <div className="text-muted small" style={{ fontSize: "10px" }}>
                          Customer collection target
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">COD Collection Status *</label>
                      <select
                        className="form-select"
                        value={codStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCodStatus(val);
                          if (val === "COLLECTED" || val === "RECONCILED") {
                            const total = (codTargetOrder.customerSellingTotalPaise || codTargetOrder.totalPaise || 0) / 100;
                            const existing = (codTargetOrder.codCollectedAmountPaise || 0) / 100;
                            const remaining = Math.max(0, total - existing);
                            if (!codCollectedAmount || parseFloat(codCollectedAmount) === 0) {
                              setCodCollectedAmount(remaining > 0 ? remaining.toFixed(2) : total.toFixed(2));
                            }
                          }
                        }}
                      >
                        <option value="PENDING">PENDING (Awaiting Courier Collection)</option>
                        <option value="PARTIALLY_COLLECTED">PARTIALLY COLLECTED (Partial Amount Received)</option>
                        <option value="COLLECTED">COLLECTED (Courier Collected Cash from Customer)</option>
                        <option value="RECONCILED">RECONCILED (Courier Remitted Cash to Company Bank)</option>
                        <option value="FAILED">FAILED / CANCELLED (Customer Refused / RTO)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Collected Amount (₹) *</label>
                      <div className="input-group">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="e.g. 1499.00"
                          value={codCollectedAmount}
                          onChange={(e) => setCodCollectedAmount(e.target.value)}
                        />
                      </div>
                      <span className="text-muted small" style={{ fontSize: "11px" }}>
                        Already recorded: ₹{((codTargetOrder.codCollectedAmountPaise || 0) / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Delivery Charge Status (₹50)</label>
                      <select
                        className="form-select"
                        value={codDeliveryChargeStatus}
                        onChange={(e) => setCodDeliveryChargeStatus(e.target.value)}
                      >
                        <option value="PAID">PAID (Upfront Delivery Fee Received via Razorpay)</option>
                        <option value="PENDING">PENDING (Delivery Charge Unpaid)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Courier Remittance Ref / UTR</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. REMIT-DELHIVERY-981290 or UTR..."
                        value={codReference}
                        onChange={(e) => setCodReference(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Courier Logistics Partner</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Delhivery, BlueDart, DTDC, XpressBees"
                        value={codCourierName}
                        onChange={(e) => setCodCourierName(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Airway Bill / Tracking Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. AWB-982187321"
                        value={codTrackingNumber}
                        onChange={(e) => setCodTrackingNumber(e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Accounting & Verification Notes</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Optional remarks regarding courier remittance, cash deposits, or delivery notes..."
                        value={codNotes}
                        onChange={(e) => setCodNotes(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowCodModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning rounded-pill px-4 fw-semibold text-dark" disabled={submittingCod}>
                    {submittingCod ? "Updating..." : "Save COD Collection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Status Modal */}
      {showStatusModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleUpdateStatusSubmit}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">Update Dispatch Status</h5>
                  <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Order Fulfillment Status</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="pending">PENDING (Awaiting Review)</option>
                      <option value="confirmed">CONFIRMED (Ready to Pack)</option>
                      <option value="processing">PROCESSING (In Warehouse)</option>
                      <option value="shipped">SHIPPED (Handed to Courier)</option>
                      <option value="delivered">DELIVERED (Completed)</option>
                      <option value="cancelled">CANCELLED (Void)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Courier Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Delhivery, Bluedart, DTDC"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Tracking Number / AWB</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. DLHV-102948201"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowStatusModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark rounded-pill px-4">
                    Update Dispatch
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                    <strong className="text-dark">{selectedOrder.reseller?.name || "Direct Reseller"}</strong>
                    <div className="small text-muted">{selectedOrder.reseller?.email}</div>
                    <div className="small text-muted">{selectedOrder.reseller?.phone}</div>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Recipient Shipping Address</span>
                    <div className="fw-semibold small">
                      {selectedOrder.shippingAddress?.firstName || selectedOrder.shippingAddress?.fullName}{" "}
                      {selectedOrder.shippingAddress?.lastName || ""}
                    </div>
                    <div className="small text-muted">
                      {selectedOrder.shippingAddress?.address || selectedOrder.shippingAddress?.addressLine1},{" "}
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} -{" "}
                      {selectedOrder.shippingAddress?.postalCode}
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
                        <th>Qty</th>
                        <th>Company Wholesale</th>
                        <th>Customer Price</th>
                        <th>Reseller Profit</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((it, idx) => {
                        const wholesale = it.wholesalePricePaise || it.unitPricePaise || it.pricePaise || 0;
                        const customerPrice = it.customerSellingPricePaise || wholesale;
                        const profit = it.resellerProfitPaise || (customerPrice - wholesale) * (it.quantity || 1);
                        return (
                          <tr key={idx}>
                            <td className="fw-semibold">
                              {it.name || it.product?.name || "Product"}
                              {(it.color || it.size) && (
                                <div className="d-flex flex-wrap gap-1 mt-1">
                                  {it.color && <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>{it.color}</span>}
                                  {it.size && <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>Size: {it.size}</span>}
                                </div>
                              )}
                            </td>
                            <td>{it.quantity}</td>
                            <td>₹{(wholesale / 100).toFixed(2)}</td>
                            <td>₹{(customerPrice / 100).toFixed(2)}</td>
                            <td className="text-success fw-semibold">
                              +₹{(profit / 100).toFixed(2)}
                            </td>
                            <td className="fw-bold">₹{((customerPrice * it.quantity) / 100).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Separating Company and Reseller Amount */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <h6 className="fw-bold text-dark mb-3">
                    <i className="fa-solid fa-receipt me-2 text-primary"></i>
                    Company vs Reseller Accounting Breakdown
                  </h6>
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div className="d-flex justify-content-between py-1 border-bottom small">
                        <span className="text-muted">Wholesale Product Cost:</span>
                        <strong className="text-dark">
                          ₹{((selectedOrder.wholesaleCostPaise || 0) / 100).toFixed(2)}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom small">
                        <span className="text-muted">Delivery Charge:</span>
                        <strong className="text-dark">
                          ₹{((selectedOrder.deliveryChargePaise || 5000) / 100).toFixed(2)}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-2 border-bottom small bg-white px-2 rounded">
                        <span className="fw-bold text-success">Total Company Amount:</span>
                        <strong className="text-success fs-6">
                          ₹{((selectedOrder.amountPayableToVexoraPaise || (selectedOrder.wholesaleCostPaise || 0) + (selectedOrder.deliveryChargePaise || 5000)) / 100).toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <div className="col-sm-6">
                      <div className="d-flex justify-content-between py-1 border-bottom small">
                        <span className="text-muted">Customer Selling Total:</span>
                        <strong className="text-dark">
                          ₹{((selectedOrder.customerSellingTotalPaise || selectedOrder.totalPaise || 0) / 100).toFixed(2)}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom small text-primary">
                        <span>Reseller Profit / Margin:</span>
                        <strong>
                          +₹{((selectedOrder.expectedResellerProfitPaise || 0) / 100).toFixed(2)}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-2 border-bottom small bg-white px-2 rounded">
                        <span className="fw-bold text-dark">Payment Method:</span>
                        <span className="badge bg-warning-subtle text-dark border">
                          {selectedOrder.paymentMethod || "COD"}
                        </span>
                      </div>
                    </div>
                  </div>
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
    </div>
  );
}
