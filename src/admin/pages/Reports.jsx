import React, { useState } from "react";
import { useToast } from "../../context/ToastContext";

export default function Reports() {
  const [reportType, setReportType] = useState("orders");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { addToast } = useToast();

  const handleDownloadCsv = (type) => {
    const token = localStorage.getItem("sparepro_token");
    let url = `http://localhost:5001/api/admin/reports/export?type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (token) url += `&token=${token}`;

    addToast(`Generating CSV download for ${type}...`, "info");
    window.open(url, "_blank");
  };

  const reportsList = [
    {
      id: "orders",
      title: "Orders & Gross Sales Report",
      description: "Complete order transactions with item counts, price snapshots, reseller identity, and fulfillment states.",
      icon: "fa-solid fa-file-invoice",
    },
    {
      id: "payments",
      title: "Payments & Collections Reconciliation",
      description: "Summary of online settlements (Razorpay), cash remittances, bank transfers, and reversals.",
      icon: "fa-solid fa-receipt",
    },
    {
      id: "resellers",
      title: "Reseller Outstanding & Balances",
      description: "Reseller-by-reseller accounting balances, lifetime purchase values, and overdue receivables.",
      icon: "fa-solid fa-users",
    },
    {
      id: "cod",
      title: "COD Remittance & Pipeline Report",
      description: "Cash on delivery pipeline, courier tracking numbers, collected amounts, and overdue pending sums.",
      icon: "fa-solid fa-hand-holding-dollar",
    },
  ];

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Financial & Operational Reports</h4>
          <p className="text-muted small mb-0">Generate, audit, and export double-entry financial statements and CSV datasets</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="admin-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-sm-4">
            <label className="form-label small fw-semibold text-muted">From Date</label>
            <input
              type="date"
              className="form-control form-control-sm rounded-pill"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-sm-4">
            <label className="form-label small fw-semibold text-muted">To Date</label>
            <input
              type="date"
              className="form-control form-control-sm rounded-pill"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-sm-4 d-flex align-items-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill w-100"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="row g-4">
        {reportsList.map((rep) => (
          <div key={rep.id} className="col-md-6">
            <div className="admin-card h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center text-white"
                    style={{ width: "42px", height: "42px", backgroundColor: "var(--admin-primary)" }}
                  >
                    <i className={rep.icon}></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-0">{rep.title}</h6>
                    <span className="badge bg-light text-muted border">CSV Export</span>
                  </div>
                </div>
                <p className="text-muted small mb-3">{rep.description}</p>
              </div>

              <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                <span className="small text-muted">Format: UTF-8 CSV</span>
                <button
                  type="button"
                  className="btn btn-sm btn-admin-primary rounded-pill px-3"
                  onClick={() => handleDownloadCsv(rep.id)}
                >
                  <i className="fa-solid fa-download me-1"></i> Export Dataset
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
