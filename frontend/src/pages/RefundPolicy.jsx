import React from "react";
import Breadcrumb from "../components/Breadcrumb";

export default function RefundPolicy() {
  return (
    <>
      <Breadcrumb title="Return &amp; Replacement Policy" links={[{ label: "Return & Replacement Policy" }]} />

      <div className="policy-page py-5">
        <div className="container" style={{ maxWidth: "880px" }}>
          {/* Main Policy Card */}
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border" style={{ lineHeight: "1.8" }}>
            <div className="border-bottom pb-4 mb-4">
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill fw-semibold mb-2">
                <i className="fa-solid fa-shield-halved me-1"></i> Policy Notice
              </span>
              <h1 className="fw-bold text-dark h2 mb-2">RETURN &amp; REPLACEMENT POLICY</h1>
              <h5 className="text-secondary fw-semibold mb-0" style={{ fontSize: "16px" }}>
                IMPORTANT – PLEASE READ CAREFULLY
              </h5>
            </div>

            {/* Crucial Notice Banner */}
            <div
              className="alert border-0 rounded-4 p-4 mb-4 shadow-sm"
              style={{
                backgroundColor: "#FEF2F2",
                borderLeft: "5px solid #EF4444",
              }}
            >
              <div className="d-flex align-items-start gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: "42px", height: "42px", backgroundColor: "#FEE2E2", color: "#DC2626" }}
                >
                  <i className="fa-solid fa-video fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-danger mb-2" style={{ letterSpacing: "0.5px" }}>
                    IMPORTANT NOTICE
                  </h6>
                  <p className="mb-0 fw-bold text-dark small" style={{ lineHeight: "1.6" }}>
                    PLEASE RECORD A COMPLETE UNBOXING VIDEO WHEN OPENING YOUR PACKAGE. WITHOUT VALID VIDEO PROOF SUBMITTED WITHIN 24 HOURS OF DELIVERY, REPLACEMENT REQUESTS MAY NOT BE ACCEPTED.
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Sections */}
            <div className="d-flex flex-column gap-4">
              {/* Section 1 */}
              <div className="p-4 rounded-4 border bg-light">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-danger text-white rounded-pill px-2 py-1 small">1</span>
                  <h4 className="fw-bold text-dark mb-0 h5">NO RETURNS / NO REFUNDS</h4>
                </div>
                <p className="text-muted mb-0 small">
                  We do not accept returns or offer refunds. Replacements are allowed only for products that are damaged, defective, or have noticeable colour fading.
                </p>
              </div>

              {/* Section 2 */}
              <div className="p-4 rounded-4 border bg-light">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary text-white rounded-pill px-2 py-1 small">2</span>
                  <h4 className="fw-bold text-dark mb-0 h5">UNBOXING VIDEO IS MANDATORY</h4>
                </div>
                <p className="text-muted mb-0 small">
                  Customers must provide a clear and complete unboxing video showing the package being opened and the product's condition. The video must clearly show any damage or defects.
                </p>
              </div>

              {/* Section 3 */}
              <div className="p-4 rounded-4 border bg-light">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-warning text-dark rounded-pill px-2 py-1 small">3</span>
                  <h4 className="fw-bold text-dark mb-0 h5">24-HOUR CLAIM PERIOD</h4>
                </div>
                <p className="text-muted mb-0 small">
                  Customers must submit their unboxing video and replacement request within <strong>24 hours of delivery</strong>. Requests submitted after this period will not be accepted.
                </p>
              </div>

              {/* Section 4 */}
              <div className="p-4 rounded-4 border bg-light">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-info text-white rounded-pill px-2 py-1 small">4</span>
                  <h4 className="fw-bold text-dark mb-0 h5">RESELLER &amp; SUPPLIER RESPONSIBILITY</h4>
                </div>
                <p className="text-muted mb-0 small">
                  All communication and transactions related to returns, replacements, or refunds must be handled directly between the reseller and the supplier.
                </p>
              </div>

              {/* Section 5 */}
              <div className="p-4 rounded-4 border bg-light">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-secondary text-white rounded-pill px-2 py-1 small">5</span>
                  <h4 className="fw-bold text-dark mb-0 h5">WEBSITE OWNER'S RESPONSIBILITY</h4>
                </div>
                <p className="text-muted mb-0 small">
                  The website owner is not responsible for handling or resolving any return, replacement, or refund-related disputes or transactions between resellers and suppliers.
                </p>
              </div>
            </div>

            {/* Legal / Regulatory Disclaimer Footer */}
            <div className="mt-4 pt-3 border-top text-center">
              <p className="text-muted small fst-italic mb-0" style={{ fontSize: "12px" }}>
                This policy is subject to applicable consumer protection laws and regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
