import React, { useState, useEffect } from "react";
import { adminApi, ordersApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [resellerFilter, setResellerFilter] = useState("all");
  const [speedFilter, setSpeedFilter] = useState("all");
  const [resellersList, setResellersList] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 3-dots actions dropdown state
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Status / Dispatch update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState("confirmed");
  const [deliveryStatus, setDeliveryStatus] = useState("IN_TRANSIT");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("India Post (Business Parcel)");
  const [checkpointLocation, setCheckpointLocation] = useState("");
  const [checkpointNote, setCheckpointNote] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

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

  // Live India Post Consignment Tracking
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [syncingOrderId, setSyncingOrderId] = useState(null);

  const { addToast } = useToast();

  // Load resellers for filtering
  useEffect(() => {
    const loadResellers = async () => {
      try {
        const res = await adminApi.getResellers({ limit: 100 });
        const list = res.data?.resellers || res.data || [];
        setResellersList(list);
      } catch (e) {
        console.warn("Could not load resellers for filter:", e.message);
      }
    };
    loadResellers();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search };
      if (statusFilter !== "all") params.orderStatus = statusFilter;
      if (paymentFilter !== "all") params.paymentStatus = paymentFilter;
      if (methodFilter !== "all") params.paymentMethod = methodFilter;
      if (resellerFilter !== "all") params.resellerId = resellerFilter;
      if (speedFilter === "fast") params.isFastDelivery = true;
      if (speedFilter === "standard") params.isFastDelivery = false;

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
  }, [page, statusFilter, paymentFilter, methodFilter, resellerFilter, speedFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleOpenStatusModal = (o) => {
    setUpdatingOrderId(o._id);
    setNewStatus((o.orderStatus || "CONFIRMED").toLowerCase());
    setDeliveryStatus(o.deliveryStatus || o.orderStatus || "IN_TRANSIT");
    setTrackingNumber(o.trackingNumber || "");
    setCourierName(o.courierName || "India Post (Business Parcel)");
    setCheckpointLocation(o.shippingAddress ? `${o.shippingAddress.city}, India` : "");
    setCheckpointNote("");
    setEstimatedDeliveryDate(
      o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate).toISOString().split("T")[0] : ""
    );
    setShowStatusModal(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    setSubmittingDispatch(true);
    try {
      if (adminApi.updateDeliveryProgress) {
        await adminApi.updateDeliveryProgress(updatingOrderId, {
          deliveryStatus,
          courierName,
          trackingNumber,
          checkpointLocation,
          checkpointNote,
          estimatedDeliveryDate: estimatedDeliveryDate || undefined,
        });
      } else {
        await adminApi.updateOrderStatus(updatingOrderId, newStatus.toUpperCase());
      }

      addToast(`Dispatch and delivery progress updated!`, "success");
      setShowStatusModal(false);
      fetchOrders();
    } catch (err) {
      addToast(err.message || "Failed to update order status.", "error");
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const handleOpenCodModal = (o) => {
    setCodTargetOrder(o);
    const existingCollected = (o.codCollectedAmountPaise || 0) / 100;
    const totalCod = (o.customerSellingTotalPaise || o.totalPaise || 0) / 100;
    const pendingAmount = Math.max(0, totalCod - existingCollected);

    setCodStatus(o.codCollectionStatus && o.codCollectionStatus !== "NOT_APPLICABLE" ? o.codCollectionStatus : "PENDING");
    setCodCollectedAmount(pendingAmount > 0 ? pendingAmount.toFixed(2) : existingCollected.toFixed(2));
    setCodDeliveryChargeStatus(o.deliveryChargeStatus || "PAID");
    setCodReference(o.cod?.collectionReference || "");
    setCodNotes("");
    setCodCourierName(o.courierName || "India Post (Business Parcel)");
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

      if (adminApi.updateOrderCodCollection) {
        await adminApi.updateOrderCodCollection(codTargetOrder._id, payload);
      } else {
        await ordersApi.updateCodCollection(codTargetOrder._id, payload);
      }

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

  // Open / Download 4x6" Printable Shipping Label
  const handlePrintShippingLabel = (orderId) => {
    const printUrl = adminApi.getShippingLabelPrintUrl
      ? adminApi.getShippingLabelPrintUrl(orderId)
      : `/api/orders/${orderId}/shipping-label?view=print&autoPrint=1&token=${localStorage.getItem("sparepro_token") || ""}`;
    window.open(printUrl, "_blank", "noopener,noreferrer,width=850,height=950");
  };

  const handleViewTracking = async (tNum, order = null) => {
    if (!tNum) {
      addToast("No tracking number assigned to this order yet.", "warning");
      return;
    }
    setTrackingLoading(true);
    setShowTrackingModal(true);
    try {
      const res = await adminApi.getTrackingInfo(tNum);
      const data = res.data?.data || res.data;
      setTrackingData(data);
    } catch (err) {
      console.error("Failed to load tracking:", err);
      addToast(err.response?.data?.message || "Could not retrieve tracking details.", "error");
      setTrackingData(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSyncOrderTracking = async (orderId) => {
    try {
      setSyncingOrderId(orderId);
      const res = await adminApi.syncOrderTracking(orderId);
      const data = res.data?.data || res.data;
      addToast("Live tracking synced from India Post DOP API!", "success");
      if (showTrackingModal) {
        setTrackingData(data);
      }
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => ({
          ...prev,
          latestTrackingStatus: data.currentStatus,
          deliveryStatus: data.statusStage,
          lastTrackedAt: new Date(),
        }));
      }
      fetchOrders();
    } catch (err) {
      console.error("Failed to sync tracking:", err);
      addToast(err.response?.data?.message || "Failed to sync tracking with India Post.", "error");
    } finally {
      setSyncingOrderId(null);
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
          <h4 className="fw-bold text-dark mb-1">Order Logistics & Delivery Monitoring</h4>
          <p className="text-muted small mb-0">
            Monitor products ordered by resellers, track India Post / courier dispatches, and inspect financial margins.
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
              <div className="text-muted small fw-semibold">Our Company Amount</div>
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

      {/* Filter and Search Bar with Reseller Selection */}
      <div className="admin-card mb-4 p-3 shadow-sm border">
        <div className="row g-3 align-items-center">
          <div className="col-md-3">
            <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                placeholder="Search order #, tracking, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-dark rounded-pill px-3">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </form>
          </div>
          <div className="col-md-9 d-flex justify-content-md-end gap-2 flex-wrap">
            {/* Filter by Specific Reseller */}
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "170px" }}
              value={resellerFilter}
              onChange={(e) => {
                setResellerFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Resellers</option>
              {resellersList.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} {r.businessInfo?.businessName ? `(${r.businessInfo.businessName})` : ""}
                </option>
              ))}
            </select>

            {/* Payment Method filter */}
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "130px" }}
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

            {/* Delivery / Dispatch status filter */}
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
              <option value="CONFIRMED">Confirmed / Booked</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Dispatched / In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Payment status filter */}
            <select
              className="form-select form-select-sm rounded-pill"
              style={{ width: "140px" }}
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

            {/* Fast Delivery Speed Filter */}
            <select
              className="form-select form-select-sm rounded-pill border-danger-subtle fw-semibold"
              style={{ width: "165px", color: speedFilter === "fast" ? "#dc2626" : undefined }}
              value={speedFilter}
              onChange={(e) => {
                setSpeedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Delivery Speeds</option>
              <option value="fast">⚡ Fast Delivery Only</option>
              <option value="standard">Standard Delivery</option>
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
          <div className="table-responsive" style={{ minHeight: "360px" }}>
            <table className="admin-table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ minWidth: "130px" }}>Order #</th>
                  <th style={{ minWidth: "160px" }}>Reseller & Customer</th>
                  <th style={{ minWidth: "130px" }}>Payment & Del. Chg</th>
                  <th style={{ minWidth: "140px" }}>Company Amount</th>
                  <th style={{ minWidth: "130px" }}>Reseller Profit</th>
                  <th style={{ minWidth: "120px" }}>Customer Total</th>
                  <th style={{ minWidth: "150px" }}>COD Collection State</th>
                  <th style={{ minWidth: "170px" }}>Delivery Progress & Courier</th>
                  <th style={{ minWidth: "80px", width: "80px" }} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => {
                  const isNearBottom = idx >= orders.length - 2 && orders.length > 2;
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

                  const deliveryStage = (o.deliveryStatus || o.orderStatus || "CONFIRMED").toUpperCase();
                  let progressPercent = 25;
                  if (deliveryStage === "DISPATCHED" || deliveryStage === "SHIPPED") progressPercent = 50;
                  else if (deliveryStage === "IN_TRANSIT") progressPercent = 75;
                  else if (deliveryStage === "OUT_FOR_DELIVERY") progressPercent = 90;
                  else if (deliveryStage === "DELIVERED") progressPercent = 100;
                  else if (deliveryStage === "CANCELLED" || deliveryStage === "FAILED") progressPercent = 100;

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
                        {o.isFastDelivery && (
                          <div className="mt-1">
                            <span
                              className="badge bg-danger text-white d-inline-flex align-items-center gap-1 shadow-sm px-2 py-1"
                              style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.4px" }}
                            >
                              <i className="fa-solid fa-bolt"></i> FAST DELIVERY
                            </span>
                          </div>
                        )}
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
                          Wholesale + Delivery
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

                      {/* Delivery Progress & Courier Tracking */}
                      <td>
                        <div className="d-flex align-items-center gap-1 mb-1 flex-wrap">
                          <span
                            className={`admin-badge ${
                              deliveryStage === "DELIVERED"
                                ? "admin-badge-success"
                                : deliveryStage === "SHIPPED" || deliveryStage === "IN_TRANSIT"
                                ? "admin-badge-info"
                                : deliveryStage === "CANCELLED"
                                ? "admin-badge-danger"
                                : "admin-badge-warning"
                            }`}
                            style={{ fontSize: "10px" }}
                          >
                            {deliveryStage} ({progressPercent}%)
                          </span>
                          {o.isFastDelivery && (
                            <span className="badge bg-danger text-white" style={{ fontSize: "9.5px" }} title="Fast Delivery Priority Dispatch">
                              ⚡ PRIORITY
                            </span>
                          )}
                        </div>
                        <div className="small text-truncate" style={{ maxWidth: "200px", fontSize: "11px" }}>
                          <span className="text-muted">{o.courierName || "India Post"}: </span>
                          {o.trackingNumber ? (
                            <span className="d-inline-flex align-items-center gap-1">
                              <code className="text-primary fw-bold">{o.trackingNumber}</code>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-danger p-0 px-1 border-0"
                                style={{ fontSize: "11px", lineHeight: "1" }}
                                title="View India Post Tracking Checkpoints"
                                onClick={() => handleViewTracking(o.trackingNumber, o)}
                              >
                                <i className="fa-solid fa-location-crosshairs"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-secondary p-0 px-1 border-0"
                                style={{ fontSize: "11px", lineHeight: "1" }}
                                title="Sync Live DOP Status"
                                disabled={syncingOrderId === o._id}
                                onClick={() => handleSyncOrderTracking(o._id)}
                              >
                                <i className={`fa-solid fa-rotate ${syncingOrderId === o._id ? "fa-spin" : ""}`}></i>
                              </button>
                            </span>
                          ) : (
                            <span className="text-muted">Not assigned</span>
                          )}
                        </div>
                      </td>

                      {/* Actions (3 Dots Dropdown Menu) */}
                      <td className="text-end">
                        <div className="dropdown position-relative d-inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`btn btn-sm btn-light border shadow-sm rounded-2 d-inline-flex align-items-center justify-content-center ${activeDropdownId === o._id ? "active bg-secondary-subtle" : ""}`}
                            style={{ width: "32px", height: "32px" }}
                            title="Actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === o._id ? null : o._id);
                            }}
                          >
                            <i className="fa-solid fa-ellipsis-vertical text-secondary"></i>
                          </button>
                          {activeDropdownId === o._id && (
                            <div
                              className="dropdown-menu dropdown-menu-end show shadow-lg border p-1"
                              style={{
                                position: "absolute",
                                right: 0,
                                ...(isNearBottom ? { bottom: "100%", marginBottom: "6px" } : { top: "100%", marginTop: "6px" }),
                                zIndex: 1050,
                                minWidth: "185px",
                                borderRadius: "10px",
                              }}
                            >
                              <button
                                type="button"
                                className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 small fw-semibold text-primary rounded-2"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenStatusModal(o);
                                }}
                              >
                                <i className="fa-solid fa-truck" style={{ width: "16px" }}></i>
                                <span>Dispatch</span>
                              </button>

                              <button
                                type="button"
                                className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 small rounded-2 text-dark"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handlePrintShippingLabel(o._id);
                                }}
                              >
                                <i className="fa-solid fa-barcode text-dark" style={{ width: "16px" }}></i>
                                <span>Print Label</span>
                              </button>

                              {isCod && (
                                <button
                                  type="button"
                                  className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 small rounded-2 text-dark"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleOpenCodModal(o);
                                  }}
                                >
                                  <i className="fa-solid fa-money-bill-transfer text-warning" style={{ width: "16px" }}></i>
                                  <span>Update COD</span>
                                </button>
                              )}

                              {o.trackingNumber && (
                                <button
                                  type="button"
                                  className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 small rounded-2 text-dark"
                                  disabled={syncingOrderId === o._id}
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleSyncOrderTracking(o._id);
                                  }}
                                >
                                  <i className={`fa-solid fa-rotate text-info ${syncingOrderId === o._id ? "fa-spin" : ""}`} style={{ width: "16px" }}></i>
                                  <span>Sync Tracking</span>
                                </button>
                              )}

                              <div className="dropdown-divider my-1"></div>

                              <button
                                type="button"
                                className="dropdown-item py-2 px-3 d-flex align-items-center gap-2 small rounded-2 text-dark"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setSelectedOrder(o);
                                  setShowDetailModal(true);
                                }}
                              >
                                <i className="fa-regular fa-eye text-secondary" style={{ width: "16px" }}></i>
                                <span>View Details</span>
                              </button>
                            </div>
                          )}
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
                      <select
                        className="form-select"
                        value={codCourierName}
                        onChange={(e) => setCodCourierName(e.target.value)}
                      >
                        <option value="India Post (Business Parcel)">India Post (Business Parcel)</option>
                        <option value="Delhivery Logistics">Delhivery Logistics</option>
                        <option value="Blue Dart Express">Blue Dart Express</option>
                        <option value="DTDC Courier">DTDC Courier</option>
                        <option value="XpressBees Logistics">XpressBees Logistics</option>
                        <option value="Shadowfax Logistics">Shadowfax Logistics</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Airway Bill / Consignment Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. RM019388105IN"
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

      {/* Fulfillment & Delivery Progress Modal */}
      {showStatusModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleUpdateStatusSubmit}>
                <div className="modal-header border-bottom bg-light rounded-top-4">
                  <h5 className="modal-title fw-bold">Update Dispatch & Delivery Progress</h5>
                  <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Delivery Progress Stage *</label>
                    <select
                      className="form-select"
                      value={deliveryStatus}
                      onChange={(e) => setDeliveryStatus(e.target.value)}
                    >
                      <option value="BOOKED">BOOKED (Manifest Created)</option>
                      <option value="DISPATCHED">DISPATCHED (Handed to Courier)</option>
                      <option value="IN_TRANSIT">IN TRANSIT (Line-haul Between Hubs)</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY (With Postman / Courier)</option>
                      <option value="DELIVERED">DELIVERED (Completed)</option>
                      <option value="CANCELLED">CANCELLED / RETURNED</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Courier Logistics Partner</label>
                    <select
                      className="form-select"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                    >
                      <option value="India Post (Business Parcel)">India Post (Business Parcel)</option>
                      <option value="Delhivery Logistics">Delhivery Logistics</option>
                      <option value="Blue Dart Express">Blue Dart Express</option>
                      <option value="DTDC Courier">DTDC Courier</option>
                      <option value="XpressBees Logistics">XpressBees Logistics</option>
                      <option value="Shadowfax Logistics">Shadowfax Logistics</option>
                      <option value="Standard Courier">Standard Courier</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Consignment / Tracking Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. RM019388105IN"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                    <div className="small text-muted mt-1">
                      India Post consignment format: e.g. RM019388105IN
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Checkpoint Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. New Delhi GPO, Mumbai Sorting Hub"
                      value={checkpointLocation}
                      onChange={(e) => setCheckpointLocation(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Checkpoint Event Remark</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bagged for destination delivery office"
                      value={checkpointNote}
                      onChange={(e) => setCheckpointNote(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Estimated Delivery Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={estimatedDeliveryDate}
                      onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowStatusModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={submittingDispatch}>
                    {submittingDispatch ? "Saving..." : "Save Delivery Progress"}
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
                {/* Fast Delivery Priority Banner */}
                {selectedOrder.isFastDelivery && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 py-2 px-3 rounded-3 border-danger shadow-sm">
                    <i className="fa-solid fa-bolt fa-lg text-danger"></i>
                    <div>
                      <strong className="d-block text-danger">⚡ Fast Delivery Priority Order</strong>
                      <span className="small text-muted">The reseller selected expedited fast delivery for this order. Please prioritize packaging and express courier dispatch.</span>
                    </div>
                  </div>
                )}

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

                {/* India Post DOP Live Tracking Banner */}
                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className="badge bg-danger text-white">
                          {selectedOrder.courierName || "India Post (Business Parcel)"}
                        </span>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                          AWB: {selectedOrder.trackingNumber || "Not assigned"}
                        </span>
                        {selectedOrder.latestTrackingStatus && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            {selectedOrder.latestTrackingStatus}
                          </span>
                        )}
                      </div>
                      <div className="small text-muted">
                        {selectedOrder.lastTrackedAt ? (
                          <span>Last Synced: {new Date(selectedOrder.lastTrackedAt).toLocaleString()}</span>
                        ) : (
                          <span>Status: {selectedOrder.deliveryStatus || selectedOrder.orderStatus}</span>
                        )}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      {selectedOrder.trackingNumber ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger rounded-pill px-3 shadow-sm"
                            disabled={syncingOrderId === selectedOrder._id}
                            onClick={() => handleSyncOrderTracking(selectedOrder._id)}
                          >
                            {syncingOrderId === selectedOrder._id ? (
                              <span><i className="fa-solid fa-spinner fa-spin me-1"></i> Syncing...</span>
                            ) : (
                              <span><i className="fa-solid fa-rotate me-1"></i> Sync Live DOP</span>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger text-white rounded-pill px-3 shadow-sm"
                            onClick={() => handleViewTracking(selectedOrder.trackingNumber, selectedOrder)}
                          >
                            <i className="fa-solid fa-location-crosshairs me-1"></i> View Checkpoints
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark rounded-pill px-3"
                          onClick={() => {
                            setShowDetailModal(false);
                            handleOpenStatusModal(selectedOrder);
                          }}
                        >
                          <i className="fa-solid fa-plus me-1"></i> Assign AWB
                        </button>
                      )}
                    </div>
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

                  {Boolean(selectedOrder.paymentMethod === "COD" || selectedOrder.codTotalChargePaise) && (
                    <div className="mt-3 p-2 rounded-2 bg-light border small">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-semibold text-dark">
                          <i className="fa-solid fa-calculator text-primary me-1"></i> COD Tariff Breakdown:
                        </span>
                        <span className="badge bg-primary text-white" style={{ fontSize: "10px" }}>
                          Total COD Fee: ₹{((selectedOrder.codTotalChargePaise || 5000) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between text-muted" style={{ fontSize: "11px" }}>
                        <span>Fixed COD Fee:</span>
                        <span>₹{((selectedOrder.codFixedChargePaise || 5000) / 100).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between text-muted" style={{ fontSize: "11px" }}>
                        <span>COD Commission ({Number(selectedOrder.codCommissionRate || 1.6).toFixed(2)}%):</span>
                        <span>₹{((selectedOrder.codCommissionPaise || 0) / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-top d-flex justify-content-between">
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-dark rounded-pill px-3 shadow-sm"
                    onClick={() => handlePrintShippingLabel(selectedOrder._id)}
                  >
                    <i className="fa-solid fa-barcode me-1"></i> Print / Download Shipping Label
                  </button>
                </div>
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* India Post Consignment Tracking Modal */}
      {showTrackingModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom bg-light rounded-top-4 px-4 py-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center" style={{ width: "38px", height: "38px" }}>
                    <i className="fa-solid fa-truck-fast"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">India Post DOP Tracking</h5>
                    <span className="text-muted small">
                      {trackingData?.courierName || "India Post (Business Parcel)"} •{" "}
                      <span className="font-monospace fw-semibold">{trackingData?.trackingNumber}</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowTrackingModal(false);
                    setTrackingData(null);
                  }}
                ></button>
              </div>

              <div className="modal-body p-4">
                {trackingLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-danger" role="status" style={{ width: "3rem", height: "3rem" }}></div>
                    <h6 className="fw-bold mt-3 mb-1">Querying India Post DOP Logistics Network...</h6>
                    <p className="text-muted small">Retrieving official consignment checkpoints and milestones</p>
                  </div>
                ) : !trackingData ? (
                  <div className="text-center py-5">
                    <i className="fa-solid fa-triangle-exclamation text-warning fa-3x mb-3"></i>
                    <h6 className="fw-bold text-dark mb-1">No Tracking Information Available</h6>
                    <p className="text-muted small">Could not retrieve tracking records from India Post DOP API.</p>
                  </div>
                ) : (
                  <>
                    {/* Status Header Banner */}
                    <div className="p-4 rounded-4 border mb-4" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="badge bg-danger text-white px-2 py-1" style={{ fontSize: "11px" }}>
                              {trackingData.courierName}
                            </span>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                              {trackingData.statusStage || "IN_TRANSIT"}
                            </span>
                            <span className="badge bg-light text-muted border px-2 py-1" style={{ fontSize: "10px" }}>
                              Source: {trackingData.source || "DOP_API"}
                            </span>
                          </div>
                          <h4 className="fw-bold text-dark mb-1">{trackingData.currentStatus}</h4>
                          <div className="small text-muted">
                            Consignment / AWB:{" "}
                            <code className="fw-bold text-dark fs-6 bg-white px-2 py-0.5 rounded border">
                              {trackingData.trackingNumber}
                            </code>
                          </div>
                        </div>

                        <div className="d-flex gap-2">
                          {trackingData.order?._id && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger rounded-pill px-3 py-2"
                              disabled={syncingOrderId === trackingData.order._id}
                              onClick={() => handleSyncOrderTracking(trackingData.order._id)}
                            >
                              {syncingOrderId === trackingData.order._id ? (
                                <span><i className="fa-solid fa-spinner fa-spin me-1"></i> Syncing...</span>
                              ) : (
                                <span><i className="fa-solid fa-rotate me-1"></i> Sync Live DOP</span>
                              )}
                            </button>
                          )}
                          {trackingData.officialTrackingUrl && (
                            <a
                              href={trackingData.officialTrackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-dark rounded-pill px-3 py-2 shadow-sm"
                            >
                              <i className="fa-solid fa-arrow-up-right-from-square me-1"></i> Official Portal
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Visual 5-Step Stepper & Progress */}
                      <div className="mt-4 pt-3 border-top">
                        <div className="progress mb-3" style={{ height: "6px" }}>
                          <div
                            className={`progress-bar ${trackingData.statusStage === "DELIVERED" ? "bg-success" : "bg-danger"}`}
                            role="progressbar"
                            style={{ width: `${trackingData.progressPercent || 30}%` }}
                          ></div>
                        </div>

                        <div className="d-flex justify-content-between text-center small">
                          <div className={`fw-semibold ${trackingData.progressPercent >= 20 ? "text-danger" : "text-muted"}`}>
                            <i className="fa-solid fa-box mb-1 d-block"></i>
                            <span>Booked</span>
                          </div>
                          <div className={`fw-semibold ${trackingData.progressPercent >= 50 ? "text-danger" : "text-muted"}`}>
                            <i className="fa-solid fa-warehouse mb-1 d-block"></i>
                            <span>Dispatched</span>
                          </div>
                          <div className={`fw-semibold ${trackingData.progressPercent >= 70 ? "text-danger" : "text-muted"}`}>
                            <i className="fa-solid fa-truck-fast mb-1 d-block"></i>
                            <span>In Transit</span>
                          </div>
                          <div className={`fw-semibold ${trackingData.progressPercent >= 90 ? "text-danger" : "text-muted"}`}>
                            <i className="fa-solid fa-motorcycle mb-1 d-block"></i>
                            <span>Out for Delivery</span>
                          </div>
                          <div className={`fw-semibold ${trackingData.progressPercent >= 100 ? "text-success" : "text-muted"}`}>
                            <i className="fa-solid fa-circle-check mb-1 d-block"></i>
                            <span>Delivered</span>
                          </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between small text-muted mt-3 pt-2 border-top">
                          <span>Origin Hub: <strong>{trackingData.origin || "Tirur Sorting Hub, Kerala"}</strong></span>
                          <span>Destination: <strong>{trackingData.destination || "Destination Hub, India"}</strong></span>
                        </div>

                        {trackingData.estimatedDelivery && (
                          <div className="small text-success fw-semibold mt-2">
                            <i className="fa-regular fa-calendar-check me-1"></i>
                            Estimated Delivery Date:{" "}
                            {new Date(trackingData.estimatedDelivery).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkpoints Timeline */}
                    <h6 className="fw-bold text-dark mb-3">
                      <i className="fa-solid fa-timeline me-2 text-danger"></i>
                      DOP Checkpoint Timeline
                    </h6>

                    {!trackingData.history || trackingData.history.length === 0 ? (
                      <p className="text-muted small">No tracking checkpoints posted yet.</p>
                    ) : (
                      <div className="position-relative ps-4 border-start border-2 border-danger ms-2">
                        {trackingData.history.map((h, i) => (
                          <div key={i} className="mb-3 position-relative">
                            <div
                              className="position-absolute bg-danger rounded-circle border border-2 border-white"
                              style={{ width: "12px", height: "12px", left: "-23px", top: "5px" }}
                            ></div>
                            <div className="p-3 bg-white rounded-3 border shadow-sm">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="text-dark fs-6">{h.status}</strong>
                                <span className="small text-muted" style={{ fontSize: "11px" }}>
                                  {new Date(h.timestamp).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="small text-muted mb-1">
                                <i className="fa-solid fa-location-dot me-1 text-danger"></i> {h.location}
                              </div>
                              {h.details && (
                                <div className="small text-secondary" style={{ fontSize: "11px" }}>
                                  {h.details}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer border-top bg-light rounded-bottom-4 px-4 py-3">
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => {
                    setShowTrackingModal(false);
                    setTrackingData(null);
                  }}
                >
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
