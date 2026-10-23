import React from "react";
import Breadcrumb from "../components/Breadcrumb";

export default function TermsConditions() {
  return (
    <>
      <Breadcrumb title="Terms & Conditions" links={[{ label: "Terms & Conditions" }]} />

      <div className="policy-page py-5">
        <div className="container" style={{ maxWidth: "860px" }}>
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border" style={{ lineHeight: "1.8" }}>
            <span className="text-muted small d-block mb-3">Effective Date: August 2026</span>
            <h3 className="fw-bold mb-4">1. Agreement to Terms</h3>
            <p className="text-muted mb-4">
              By accessing or using the SPARE PRO platform, you agree to be bound by these Terms and Conditions. If you do not agree with all provisions, you are prohibited from using the service.
            </p>

            <h3 className="fw-bold mb-4">2. Intellectual Property Rights</h3>
            <p className="text-muted mb-4">
              All visual trademarks, logos, copy, photographs, designs, and proprietary specifications featured on SPARE PRO are the exclusive property of SPARE PRO or its licensors and are protected under international copyright law.
            </p>

            <h3 className="fw-bold mb-4">3. Product Descriptions & Wholesale Pricing</h3>
            <p className="text-muted mb-4">
              We strive to display accurate descriptions, technical specifications, and color variations for all inventory items across gadgets, watches, footwear, and fashion. Wholesale tiers and volume discounts are subject to market adjustments.
            </p>

            <h3 className="fw-bold mb-4">4. Limitation of Liability</h3>
            <p className="text-muted mb-0">
              SPARE PRO is not liable for indirect or consequential damages arising from the resale or use of products beyond manufacturer defect replacement warranty.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
