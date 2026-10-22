import React, { useState, useEffect } from "react";
import { adminApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function BalanceSheet() {
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const { addToast } = useToast();

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBalanceSheet({ asOfDate });
      const data = res.data?.assets ? res.data : res.data?.data || res.data;
      setBalanceSheet(data);
    } catch (err) {
      console.error(err);
      addToast("Failed to compute accounting balance sheet.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, [asOfDate]);

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Accounting Balance Sheet</h4>
          <p className="text-muted small mb-0">
            Formal double-entry statement reconciling current assets, customer receivables, COD pipeline, and retained equity
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <input
            type="date"
            className="form-control form-control-sm rounded-pill"
            style={{ width: "160px" }}
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white" onClick={fetchBalanceSheet}>
            <i className="fa-solid fa-rotate me-1"></i> Re-Calculate
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted small mt-2">Computing double-entry ledger totals...</p>
        </div>
      ) : balanceSheet ? (
        <div className="row g-4">
          {/* Assets Column */}
          <div className="col-lg-6">
            <div className="admin-card h-100">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <h5 className="fw-bold text-primary mb-0">ASSETS</h5>
                <span className="badge bg-primary-subtle text-primary">Debit Normal</span>
              </div>

              <div className="mb-4">
                <h6 className="fw-semibold text-secondary text-uppercase small mb-3">Liquid Cash & Bank Collections</h6>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Cash & Online Settlements Received:</span>
                  <strong className="text-dark">
                    {balanceSheet.assets?.cashAndCollections?.formatted || "₹0.00"}
                  </strong>
                </div>
              </div>

              <div className="mb-4">
                <h6 className="fw-semibold text-secondary text-uppercase small mb-3">Accounts Receivable</h6>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>COD Pipeline (In-transit / Awaiting Courier Collection):</span>
                  <strong className="text-warning">
                    {balanceSheet.assets?.accountsReceivable?.codReceivables?.formatted || "₹0.00"}
                  </strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Direct Reseller Invoiced Receivables:</span>
                  <strong className="text-dark">
                    {balanceSheet.assets?.accountsReceivable?.directReceivables?.formatted || "₹0.00"}
                  </strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom fw-semibold bg-light px-2 rounded">
                  <span>Total Receivables:</span>
                  <span>{balanceSheet.assets?.accountsReceivable?.totalReceivables?.formatted || "₹0.00"}</span>
                </div>
              </div>

              <div className="d-flex justify-content-between p-3 rounded-3 mt-4" style={{ backgroundColor: "#EEF2FF" }}>
                <span className="fw-bold text-primary fs-6">TOTAL ASSETS:</span>
                <span className="fw-bold text-primary fs-6">
                  {balanceSheet.assets?.totalAssets?.formatted || "₹0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Equity & Revenue Column */}
          <div className="col-lg-6">
            <div className="admin-card h-100">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <h5 className="fw-bold text-success mb-0">LIABILITIES & EQUITY</h5>
                <span className="badge bg-success-subtle text-success">Credit Normal</span>
              </div>

              <div className="mb-4">
                <h6 className="fw-semibold text-secondary text-uppercase small mb-3">Current Liabilities</h6>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Accounts Payable (Courier Remittance Holds):</span>
                  <strong className="text-dark">₹0.00</strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Unearned Wholesale Deposits:</span>
                  <strong className="text-dark">₹0.00</strong>
                </div>
              </div>

              <div className="mb-4">
                <h6 className="fw-semibold text-secondary text-uppercase small mb-3">Retained Revenue & Equity</h6>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Gross Sales Recognized:</span>
                  <strong className="text-dark">
                    {balanceSheet.equityAndRevenue?.retainedRevenue?.grossRevenue?.formatted || "₹0.00"}
                  </strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span>Less: Customer Refunds Issued:</span>
                  <strong className="text-danger">
                    ({balanceSheet.equityAndRevenue?.retainedRevenue?.refundsIssued?.formatted || "₹0.00"})
                  </strong>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom fw-semibold bg-light px-2 rounded">
                  <span>Net Recognized Revenue:</span>
                  <span className="text-success">
                    {balanceSheet.equityAndRevenue?.retainedRevenue?.netRevenue?.formatted || "₹0.00"}
                  </span>
                </div>
              </div>

              <div className="d-flex justify-content-between p-3 rounded-3 mt-4" style={{ backgroundColor: "#ECFDF5" }}>
                <span className="fw-bold text-success fs-6">TOTAL LIABILITIES & EQUITY:</span>
                <span className="fw-bold text-success fs-6">
                  {balanceSheet.equityAndRevenue?.totalLiabilitiesAndEquity?.formatted || "₹0.00"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
