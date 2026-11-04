import React from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";

export default function About() {
  const stats = [
    { number: "10k+", label: "Active Resellers" },
    { number: "99.4%", label: "On-Time Dispatch" },
    { number: "4 Core", label: "Specialty Categories" },
    { number: "45%+", label: "Average Profit Margin" }
  ];

  return (
    <>
      <Breadcrumb title="About SPARE PRO Wholesale Platform" links={[{ label: "About Us" }]} />

      {/* Main Story Section */}
      <div className="about-us py-5">
        <div className="container py-lg-4">
          <div className="row g-5 align-items-center">
            <div className="col-lg-6 wow fadeInLeft">
              <div className="about-us-image text-center">
                <img
                  src="/images/lifestyle-display.png"
                  alt="SPARE PRO Wholesale Ecosystem"
                  className="img-fluid rounded-4 shadow-sm"
                  style={{ maxHeight: "480px", objectFit: "cover" }}
                />
              </div>
            </div>

            <div className="col-lg-6 wow fadeInRight" data-wow-delay="0.2s">
              <div className="about-us-content">
                <span className="section-sub-title mb-2 d-inline-block">Our Mission</span>
                <h2 className="display-6 fw-bold mb-4 text-anime-style-3">
                  Empowering Independent Resellers with High-Margin Inventory
                </h2>
                <p className="text-muted mb-4" style={{ lineHeight: "1.8" }}>
                  SPARE PRO was built specifically for modern e-commerce entrepreneurs, boutique store owners, and dropship resellers. We bridge the gap between Tier-1 manufacturing factories and independent sellers by providing curated, high-demand inventory.
                </p>
                <p className="text-muted mb-4" style={{ lineHeight: "1.8" }}>
                  Every item in our four core collections — Gadgets, Watches, Footwear, and Fashion — is vetted for build quality, market demand velocity, and healthy reseller profit margins.
                </p>

                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center gap-2">
                      <i className="fa-solid fa-circle-check text-warning fs-5"></i>
                      <span className="fw-semibold">Direct Factory Pricing</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center gap-2">
                      <i className="fa-solid fa-circle-check text-warning fs-5"></i>
                      <span className="fw-semibold">Rigorous QA Inspection</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center gap-2">
                      <i className="fa-solid fa-circle-check text-warning fs-5"></i>
                      <span className="fw-semibold">Expedited Global Logistics</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center gap-2">
                      <i className="fa-solid fa-circle-check text-warning fs-5"></i>
                      <span className="fw-semibold">Dedicated Account Support</span>
                    </div>
                  </div>
                </div>

                <Link to="/shop" className="btn-default">
                  <span>Explore Wholesale Catalog</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="py-5 bg-dark text-white">
        <div className="container">
         
          <div className="row g-4 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className="col-6 col-md-3 wow fadeInUp" data-wow-delay={`${idx * 0.15}s`}>
                <div className="p-3">
                  <h2 className="display-4 fw-bold mb-1" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                    {stat.number}
                  </h2>
                  <p className="text-white-50 mb-0">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
