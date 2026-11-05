import React, { useState, useMemo } from "react";
import { useSearchParams, useLocation, Navigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import ProductCard from "../components/ProductCard";
import QuickViewModal from "../components/QuickViewModal";
import { useProducts } from "../context/ProductContext";
import { useAuth } from "../context/AuthContext";

export default function Shop() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  const { products, categories, loading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get("category") || "all";
  const currentSearch = searchParams.get("search") || "";

  const [sortBy, setSortBy] = useState("featured");

  const catalogMaxPrice = useMemo(() => {
    if (!products.length) return 1000;
    const max = Math.max(...products.map((p) => p.price || 0));
    return Math.max(120, Math.ceil(max));
  }, [products]);

  const [maxPrice, setMaxPrice] = useState(null);
  const effectiveMaxPrice = maxPrice ?? catalogMaxPrice;
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Protect Reseller Shop: Must be logged in to view catalog
  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Checking authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Category
    if (currentCategory && currentCategory !== "all") {
      const target = currentCategory.toLowerCase();
      result = result.filter(
        (p) =>
          (p.categorySlug || "").toLowerCase() === target ||
          (p.category || "").toLowerCase() === target
      );
    }

    // Filter by Search
    if (currentSearch.trim()) {
      const q = currentSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(q))
      );
    }

    // Filter by Max Price
    result = result.filter((p) => (p.price || 0) <= effectiveMaxPrice);

    // Sort
    if (sortBy === "price-low") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, currentCategory, currentSearch, effectiveMaxPrice, sortBy]);

  const handleCategorySelect = (slug) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", slug);
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({});
    setMaxPrice(null);
    setSortBy("featured");
  };

  return (
    <>
      <Breadcrumb
        title="Wholesale Products & Catalog"
        links={[{ label: "Shop", to: "/shop" }]}
      />

      <div className="shop-page py-4 py-md-5">
        <div className="container">
          {/* Mobile Category Quick-Filter Horizontal Swipe Bar */}
          <div className="d-flex d-lg-none overflow-x-auto gap-2 mb-3 pb-1 no-scrollbar">
            <button
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-2 text-nowrap fw-semibold ${
                currentCategory === "all" ? "btn-dark text-white shadow-sm" : "btn-light text-dark border"
              }`}
              onClick={() => handleCategorySelect("all")}
              style={{ fontSize: "12px" }}
            >
              All ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.categorySlug === cat.slug).length;
              const isSelected = currentCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 py-2 text-nowrap fw-semibold ${
                    isSelected ? "btn-dark text-white shadow-sm" : "btn-light text-dark border"
                  }`}
                  onClick={() => handleCategorySelect(cat.slug)}
                  style={{ fontSize: "12px" }}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Mobile Filter Toggle Button */}
          <div className="d-block d-lg-none mb-3">
            <button
              type="button"
              className="btn btn-outline-dark rounded-pill w-100 py-2 d-flex align-items-center justify-content-between px-3 fw-semibold small shadow-sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <span>
                <i className="fa-solid fa-sliders me-2 text-primary"></i>
                <span>Filter by Price &amp; Search</span>
                {(currentSearch || maxPrice !== null) && (
                  <span className="badge bg-primary text-white rounded-pill ms-2">Active</span>
                )}
              </span>
              <i className={`fa-solid ${showMobileFilters ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
            </button>
          </div>

          <div className="row g-3 g-md-4">
            {/* Sidebar Filters (Always visible on desktop, toggleable on mobile) */}
            <div className={`col-lg-3 ${showMobileFilters ? "d-block mb-3 mb-lg-0" : "d-none d-lg-block"}`}>
              <div className="shop-sidebar bg-white p-4 rounded-4 shadow-sm border">
                {/* Search in Shop */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3" style={{ fontSize: "16px" }}>Search Store</h5>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search items..."
                      value={currentSearch}
                      onChange={(e) => {
                        const newParams = new URLSearchParams(searchParams);
                        if (e.target.value) {
                          newParams.set("search", e.target.value);
                        } else {
                          newParams.delete("search");
                        }
                        setSearchParams(newParams);
                      }}
                    />
                    <button className="btn btn-dark" type="button">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </button>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3" style={{ fontSize: "16px" }}>Categories</h5>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <button
                        type="button"
                        className={`btn btn-link text-start text-decoration-none p-0 w-100 d-flex justify-content-between align-items-center ${
                          currentCategory === "all" ? "fw-bold text-dark" : "text-muted"
                        }`}
                        onClick={() => handleCategorySelect("all")}
                      >
                        <span>All Products</span>
                        <span className="badge bg-light text-dark rounded-pill">{products.length}</span>
                      </button>
                    </li>
                    {categories.map((cat) => {
                      const count = products.filter((p) => p.categorySlug === cat.slug).length;
                      return (
                        <li key={cat.id} className="mb-2">
                          <button
                            type="button"
                            className={`btn btn-link text-start text-decoration-none p-0 w-100 d-flex justify-content-between align-items-center ${
                              currentCategory === cat.slug ? "fw-bold text-dark" : "text-muted"
                            }`}
                            onClick={() => handleCategorySelect(cat.slug)}
                          >
                            <span>{cat.name}</span>
                            <span className="badge bg-light text-dark rounded-pill">{count}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Price Filter */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="fw-bold mb-0" style={{ fontSize: "16px" }}>Max Price</h5>
                    <span className="fw-semibold text-dark">₹{Number(effectiveMaxPrice).toLocaleString("en-IN")}</span>
                  </div>
                  <input
                    type="range"
                    className="form-range"
                    min="1"
                    max={catalogMaxPrice}
                    step="1"
                    value={effectiveMaxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                  />
                  <div className="d-flex justify-content-between text-muted small">
                    <span>₹1</span>
                    <span>₹{Number(catalogMaxPrice).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Reset Filters */}
                {(currentCategory !== "all" || currentSearch || maxPrice !== null || sortBy !== "featured") && (
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100 rounded-pill py-2 small fw-semibold"
                    onClick={handleClearFilters}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>

            {/* Product Catalog Grid */}
            <div className="col-lg-9">
              {/* Header Sorting Bar */}
              <div className="d-flex flex-wrap justify-content-between align-items-center bg-white p-3 rounded-4 shadow-sm border mb-4">
                <p className="mb-0 text-muted">
                  Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
                  {currentCategory !== "all" && <span className="ms-1">in <em>{currentCategory}</em></span>}
                  {currentSearch && <span className="ms-1">matching "<em>{currentSearch}</em>"</span>}
                </p>

                <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
                  <label htmlFor="sort-select" className="small text-muted text-nowrap mb-0">Sort By:</label>
                  <select
                    id="sort-select"
                    className="form-select form-select-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: "auto" }}
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </div>
              </div>

              {/* Product Grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border">
                  <i className="fa-solid fa-magnifying-glass fs-1 text-muted mb-3"></i>
                  <h4>No products found</h4>
                  <p className="text-muted mb-4">Try adjusting your filters or search keywords.</p>
                  <button
                    type="button"
                    className="btn btn-dark rounded-pill px-4"
                    onClick={handleClearFilters}
                  >
                    View All Products
                  </button>
                </div>
              ) : (
                <div className="row g-2 g-sm-3 g-md-4">
                  {filteredProducts.map((product, idx) => (
                    <div
                      key={product.id || product._id || idx}
                      className="col-6 col-sm-6 col-md-4"
                    >
                      <ProductCard
                        product={product}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  );
}
