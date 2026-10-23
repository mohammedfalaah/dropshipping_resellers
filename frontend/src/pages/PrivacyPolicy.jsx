import React from "react";
import Breadcrumb from "../components/Breadcrumb";

export default function PrivacyPolicy() {
  return (
    <>
      <Breadcrumb title="Privacy Policy" links={[{ label: "Privacy Policy" }]} />

      <div className="policy-page py-5">
        <div className="container" style={{ maxWidth: "860px" }}>
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border" style={{ lineHeight: "1.8" }}>
            <span className="text-muted small d-block mb-3">Last updated: August 2026</span>
            <h3 className="fw-bold mb-4">1. Information We Collect</h3>
            <p className="text-muted mb-4">
              At SPARE PRO, we prioritize your privacy. When you browse our wholesale platform, register a reseller account, or place a bulk order, we collect necessary business and shipping details such as your name, billing and shipping address, email address, phone number, and transaction details to fulfill your orders.
            </p>

            <h3 className="fw-bold mb-4">2. How We Use Your Information</h3>
            <p className="text-muted mb-4">
              We use your information exclusively to:
            </p>
            <ul className="text-muted mb-4">
              <li className="mb-2">Process and deliver your wholesale gadget, watch, footwear, and fashion orders securely.</li>
              <li className="mb-2">Send real-time dispatch updates and order tracking notifications.</li>
              <li className="mb-2">Provide tailored product recommendations and customer service support.</li>
              <li className="mb-2">Prevent fraudulent transactions and uphold cybersecurity safety.</li>
            </ul>

            <h3 className="fw-bold mb-4">3. Data Security</h3>
            <p className="text-muted mb-4">
              We employ 256-bit SSL encryption across all checkout operations and tokenized payment processing through PCI-DSS compliant payment gateways. We never store raw credit card numbers on our servers.
            </p>

            <h3 className="fw-bold mb-4">4. Your Rights</h3>
            <p className="text-muted mb-0">
              You maintain the absolute right to view, amend, or request deletion of your personal data at any moment. For data inquiries, please email our Data Protection Officer at privacy@sparepro.com.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
