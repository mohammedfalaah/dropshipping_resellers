import React from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { testimonials } from "../data/productsData";

export default function Testimonials() {
  const extendedReviews = [
    ...testimonials,
    {
      id: 4,
      name: "Hannah Cooper",
      role: "Electronics Reseller",
      avatar: "/images/author-1.jpg",
      rating: 5,
      title: "ANC Earbuds sold out in 4 days",
      content: "The audio quality and packaging on the Aether Pro earbuds exceeded my expectations. Tested with our customer base and repeat reorder rates have been remarkable."
    },
    {
      id: 5,
      name: "Devon Miller",
      role: "Streetwear Store Owner",
      avatar: "/images/author-2.jpg",
      rating: 5,
      title: "Hoodies are true luxury heavyweight",
      content: "The 450 GSM French Terry oversized hoodie is genuine luxury blank tier. Stitching, fit, and wash are world-class. Our customers keep asking for more colorways."
    },
    {
      id: 6,
      name: "Maya Patel",
      role: "Horology & Accessories Retailer",
      avatar: "/images/author-3.jpg",
      rating: 5,
      title: "Exceptional watch margins",
      content: "The automatic chronograph watch has genuine heft and stunning sapphire glass finishing. Reselling at 60% gross margin without a single return."
    }
  ];

  return (
    <>
      <Breadcrumb title="Reseller Reviews" links={[{ label: "Testimonials" }]} />

      <div className="testimonials-page py-5">
        <div className="container">
          <div className="text-center mb-5">
            <span className="section-sub-title">Verified Feedback</span>
            <h2 className="display-6 fw-bold">Trusted by 10,000+ Active Resellers</h2>
          </div>

          <div className="row g-4">
            {extendedReviews.map((rev) => (
              <div key={rev.id} className="col-lg-4 col-md-6">
                <div className="card h-100 border-0 shadow-sm p-4 rounded-4 bg-white d-flex flex-column">
                  <div className="mb-3 text-warning">
                    {[...Array(rev.rating)].map((_, i) => (
                      <i key={i} className="fa-solid fa-star me-1"></i>
                    ))}
                  </div>

                  <h5 className="fw-bold mb-2">"{rev.title}"</h5>
                  <p className="text-muted small mb-4 flex-grow-1" style={{ lineHeight: "1.7" }}>
                    {rev.content}
                  </p>

                  <div className="d-flex align-items-center gap-3 border-top pt-3">
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="rounded-circle shadow-sm"
                      style={{ width: "45px", height: "45px", objectFit: "cover" }}
                    />
                    <div>
                      <h6 className="mb-0 fw-bold" style={{ fontSize: "14px" }}>{rev.name}</h6>
                      <span className="text-muted small">{rev.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-5">
            <div className="p-5 bg-white rounded-4 shadow-sm border d-inline-block">
              <h4 className="fw-bold mb-2">Experience the SPARE PRO Advantage</h4>
              <p className="text-muted small mb-4">Scale your business with verified high-margin gadgets, timepieces, footwear, and apparel.</p>
              <Link to="/shop" className="btn-default">
                <span>Explore Catalog</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
