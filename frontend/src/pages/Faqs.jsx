import React, { useState } from "react";
import Breadcrumb from "../components/Breadcrumb";
import { faqsData } from "../data/productsData";

export default function Faqs() {
  const [activeId, setActiveId] = useState(1);
  const [selectedCat, setSelectedCat] = useState("all");

  const categories = ["all", "Wholesale & Pricing", "Products & Quality", "Shipping & Fulfillment"];

  const filteredFaqs = faqsData.filter(
    (item) => selectedCat === "all" || item.category === selectedCat
  );

  return (
    <>
      <Breadcrumb title="Frequently Asked Questions" links={[{ label: "FAQs" }]} />

      <div className="faqs-page py-5">
        <div className="container" style={{ maxWidth: "860px" }}>
          {/* Category Filter Pills */}
          <div className="d-flex justify-content-center gap-2 flex-wrap mb-5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn rounded-pill px-4 py-2 ${
                  selectedCat === cat ? "btn-dark text-white" : "btn-outline-dark"
                }`}
                onClick={() => setSelectedCat(cat)}
              >
                {cat === "all" ? "All Questions" : cat}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="accordion-wrapper">
            {filteredFaqs.map((faq) => {
              const isOpen = activeId === faq.id;
              return (
                <div key={faq.id} className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden bg-white">
                  <button
                    type="button"
                    className="card-header bg-white border-0 p-4 text-start d-flex justify-content-between align-items-center w-100"
                    onClick={() => setActiveId(isOpen ? null : faq.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="fw-bold h6 mb-0 text-dark pe-3">{faq.question}</span>
                    <i
                      className={`fa-solid fa-chevron-down transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.25s ease",
                        color: "var(--accent-color, #FA7EAA)"
                      }}
                    ></i>
                  </button>

                  {isOpen && (
                    <div className="card-body p-4 pt-0 text-muted small border-top" style={{ lineHeight: "1.8" }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Help Box */}
          <div className="text-center p-4 bg-light rounded-4 mt-5 border">
            <h5 className="fw-bold mb-2">Still have questions?</h5>
            <p className="text-muted small mb-3">Our customer support specialists are ready to assist you.</p>
            <a href="mailto:support@sparepro.com" className="btn btn-dark rounded-pill px-4">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
