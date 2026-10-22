import React, { useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { blogPosts } from "../data/productsData";

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", "Wholesale Sourcing", "E-commerce Tips", "Market Trends"];

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Breadcrumb title="Reseller Insights & Sourcing Guide" links={[{ label: "Blog" }]} />

      <div className="blog-page py-5">
        <div className="container">
          {/* Top Filter Bar */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-5 gap-3 bg-white p-3 rounded-4 shadow-sm border">
            <div className="d-flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 ${
                    selectedCategory === cat ? "btn-dark text-white" : "btn-outline-secondary"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === "all" ? "All Articles" : cat}
                </button>
              ))}
            </div>

            <div style={{ maxWidth: "260px" }}>
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Posts Grid */}
          <div className="row g-4">
            {filteredPosts.map((post, idx) => (
              <div
                key={post.id}
                className="col-lg-4 col-md-6 wow fadeInUp"
                data-wow-delay={`${(idx % 6) * 0.15}s`}
              >
                <div className="card h-100 border-0 shadow-sm overflow-hidden rounded-4 bg-white">
                  <Link to={`/blog/${post.slug}`}>
                    <img
                      src={post.image}
                      alt={post.title}
                      className="card-img-top"
                      style={{ height: "240px", objectFit: "cover" }}
                    />
                  </Link>
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex align-items-center gap-3 text-muted small mb-2">
                      <span className="badge bg-light text-dark">{post.category}</span>
                      <span><i className="fa-regular fa-calendar me-1"></i> {post.date}</span>
                    </div>

                    <h5 className="card-title fw-bold mb-3">
                      <Link to={`/blog/${post.slug}`} className="text-dark text-decoration-none">
                        {post.title}
                      </Link>
                    </h5>

                    <p className="card-text text-muted small mb-4 flex-grow-1" style={{ lineHeight: "1.6" }}>
                      {post.excerpt}
                    </p>

                    <div className="d-flex justify-content-between align-items-center border-top pt-3">
                      <span className="small text-muted">
                        <i className="fa-regular fa-user me-1"></i> {post.author}
                      </span>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="fw-semibold text-decoration-none small"
                        style={{ color: "var(--accent-color, #FA7EAA)" }}
                      >
                        Read More &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
