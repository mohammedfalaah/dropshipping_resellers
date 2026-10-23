import React from "react";
import Breadcrumb from "../components/Breadcrumb";

export default function RefundPolicy() {
  return (
    <>
      <Breadcrumb title="Refund & Return Policy" links={[{ label: "Refunds & Returns" }]} />

      <div className="policy-page py-5">
        <div className="container" style={{ maxWidth: "860px" }}>
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border" style={{ lineHeight: "1.8" }}>
            <h3 className="fw-bold mb-4">30-Day Money-Back Guarantee</h3>
            <p className="text-muted mb-4">
              We want you to succeed with every reseller order. If any inventory item is defective or does not match catalog specifications, return it within 30 days of delivery for a full refund or exchange.
            </p>

            <h3 className="fw-bold mb-4">Eligible Returns</h3>
            <ul className="text-muted mb-4">
              <li className="mb-2">Unopened, unused merchandise in original manufacturer packaging returned within 30 days.</li>
              <li className="mb-2">Items purchased directly through our SPARE PRO digital portal.</li>
              <li className="mb-2">Damaged or defective items reported within 48 hours of delivery receive an immediate complimentary replacement.</li>
            </ul>

            <h3 className="fw-bold mb-4">How to Initiate a Return</h3>
            <p className="text-muted mb-0">
              Email our support desk at returns@sparepro.com with your Order ID number. Our team will issue a prepaid return shipping label and instructions within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
