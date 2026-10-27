import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import ProductCard from "../components/ProductCard";
import QuickViewModal from "../components/QuickViewModal";
import { useProducts } from "../context/ProductContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

export default function ProductDetails() {
  const { slug } = useParams();
  const { products, getProductBySlug } = useProducts();
  const product = getProductBySlug(slug) || products.find((p) => p.slug === slug) || products[0] || {};

  const [activeImage, setActiveImage] = useState(product?.image || product?.mainImage || "/images/product-earbuds.jpg");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setActiveImage(product.image || product.mainImage || "/images/product-earbuds.jpg");
    }
  }, [product]);
  const [activeTab, setActiveTab] = useState("desc");
  const [reviewsList, setReviewsList] = useState([
    {
      id: 1,
      author: "Samantha B. (Boutique Owner)",
      rating: 5,
      date: "October 14, 2026",
      comment: "Outstanding product build and premium packaging. Ordered 50 units for our storefront and sold out in less than a week."
    },
    {
      id: 2,
      author: "David K. (Online Retailer)",
      rating: 5,
      date: "October 02, 2026",
      comment: "Consistent factory quality and reliable shipping. Profit margins are exactly as described in the reseller catalog."
    }
  ]);
  const [newReview, setNewReview] = useState({ name: "", email: "", rating: 5, comment: "" });
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToast } = useToast();

  const isFavorited = isInWishlist(product.id);

  // Related products from the same category
  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
    .slice(0, 4);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    addToast(`Added ${quantity} × ${product.name} to cart!`, "success");
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product);
    addToast(
      isFavorited
        ? `Removed ${product.name} from wishlist.`
        : `Added ${product.name} to wishlist!`,
      "info"
    );
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!newReview.name || !newReview.comment) {
      addToast("Please fill in your name and review.", "error");
      return;
    }
    const createdReview = {
      id: Date.now(),
      author: newReview.name,
      rating: Number(newReview.rating),
      date: "Just now",
      comment: newReview.comment
    };
    setReviewsList([createdReview, ...reviewsList]);
    setNewReview({ name: "", email: "", rating: 5, comment: "" });
    addToast("Review submitted successfully! Thank you for your feedback.", "success");
  };

  return (
    <>
      <Breadcrumb
        title={product.name}
        links={[
          { label: "Shop", to: "/shop" },
          { label: product.category, to: `/shop?category=${product.categorySlug}` },
          { label: product.name }
        ]}
      />

      <div className="product-single py-5">
        <div className="container">
          <div className="row g-5">
            {/* Gallery Left */}
            <div className="col-lg-6">
              <div className="product-gallery-box bg-white p-4 rounded-4 shadow-sm border text-center mb-3">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="img-fluid"
                  style={{ maxHeight: "420px", objectFit: "contain" }}
                />
              </div>

              {product.thumbnails && (
                <div className="d-flex gap-3 justify-content-center">
                  {product.thumbnails.map((thumb, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`p-2 border rounded-3 bg-white ${
                        activeImage === thumb ? "border-dark shadow-sm" : "border-light"
                      }`}
                      onClick={() => setActiveImage(thumb)}
                      style={{ cursor: "pointer", width: "75px", height: "75px" }}
                    >
                      <img
                        src={thumb}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta Right */}
            <div className="col-lg-6">
              <div className="product-single-details">
                <span className="badge bg-light text-muted px-3 py-2 rounded-pill mb-2">
                  {product.category}
                </span>
                <h1 className="h2 fw-bold mb-2">{product.name}</h1>

                {/* Rating */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="text-warning small">
                    {[...Array(5)].map((_, i) => (
                      <i
                        key={i}
                        className={`fa-solid fa-star ${
                          i < product.rating ? "text-warning" : "text-muted"
                        }`}
                      ></i>
                    ))}
                  </div>
                  <span className="text-muted small">
                    ({reviewsList.length + 20} customer ratings)
                  </span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="h3 fw-bold me-3" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                    ₹{Number(product?.price ?? product?.resellerPrice ?? product?.regularPrice ?? 0).toLocaleString("en-IN")}
                  </span>
                  {product.originalPrice && (
                    <span className="text-muted text-decoration-line-through fs-5">
                      ₹{Number(product?.originalPrice ?? product?.regularPrice ?? 0).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                <p className="text-muted mb-4" style={{ lineHeight: "1.7" }}>
                  {product.shortDescription}
                </p>

                {/* Availability */}
                <div className="mb-4 small">
                  <p className="mb-1">
                    <strong>Availability: </strong>
                    <span className="text-success fw-semibold">
                      <i className="fa-solid fa-circle-check me-1"></i> In Stock ({product.stockCount || 20} available)
                    </span>
                  </p>
                  <p className="mb-0">
                    <strong>SKU: </strong>
                    <span className="text-muted">{product.sku}</span>
                  </p>
                </div>

                {/* Stepper & Add to Cart */}
                <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
                  <div className="d-flex align-items-center border rounded-pill px-3 py-2 bg-white">
                    <button
                      type="button"
                      className="btn btn-sm border-0 p-0 me-2"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <i className="fa-solid fa-minus"></i>
                    </button>
                    <span className="fw-bold px-3">{quantity}</span>
                    <button
                      type="button"
                      className="btn btn-sm border-0 p-0 ms-2"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <i className="fa-solid fa-plus"></i>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-dark rounded-pill py-3 px-5 fw-semibold flex-grow-1"
                    onClick={handleAddToCart}
                  >
                    <i className="fa-solid fa-bag-shopping me-2"></i> Add to Cart
                  </button>

                  <button
                    type="button"
                    className={`btn border rounded-circle p-2 ${
                      isFavorited ? "btn-danger text-white border-danger" : "btn-light"
                    }`}
                    style={{ width: "50px", height: "50px" }}
                    onClick={handleToggleWishlist}
                    title={isFavorited ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <i className="fa-solid fa-heart"></i>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="p-3 bg-light rounded-4 small border">
                  <div className="row g-2 text-muted">
                    <div className="col-6">
                      <i className="fa-solid fa-truck-fast me-2 text-dark"></i> Free shipping over $50
                    </div>
                    <div className="col-6">
                      <i className="fa-solid fa-shield-halved me-2 text-dark"></i> 30-Day Money Back
                    </div>
                    <div className="col-6">
                      <i className="fa-solid fa-leaf me-2 text-dark"></i> 100% Certified Vegan
                    </div>
                    <div className="col-6">
                      <i className="fa-solid fa-flask-vial me-2 text-dark"></i> Dermatologist Tested
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Tabs: Description, Additional Info, Reviews */}
          <div className="row mt-5">
            <div className="col-lg-12">
              <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border">
                <ul className="nav nav-tabs border-bottom mb-4">
                  <li className="nav-item">
                    <button
                      className={`nav-link fw-semibold border-0 ${activeTab === "desc" ? "active border-bottom border-dark border-3" : "text-muted"}`}
                      onClick={() => setActiveTab("desc")}
                    >
                      Description
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link fw-semibold border-0 ${activeTab === "info" ? "active border-bottom border-dark border-3" : "text-muted"}`}
                      onClick={() => setActiveTab("info")}
                    >
                      Additional Information
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link fw-semibold border-0 ${activeTab === "reviews" ? "active border-bottom border-dark border-3" : "text-muted"}`}
                      onClick={() => setActiveTab("reviews")}
                    >
                      Reviews ({reviewsList.length})
                    </button>
                  </li>
                </ul>

                {/* Tab Content */}
                {activeTab === "desc" && (
                  <div className="tab-pane-content">
                    <h5 className="fw-bold mb-3">About this formula</h5>
                    <p className="text-muted mb-4" style={{ lineHeight: "1.8" }}>
                      {product.description}
                    </p>
                    <h5 className="fw-bold mb-3">Key Highlights</h5>
                    <ul className="text-muted mb-0">
                      <li className="mb-2">Infused with active botanicals and cold-pressed plant seed oils.</li>
                      <li className="mb-2">Free of harsh sulfates (SLS/SLES), parabens, phthalates, and mineral oils.</li>
                      <li className="mb-2">Sustainably packaged in recyclable glass and FSC-certified cartons.</li>
                      <li className="mb-2">Proudly manufactured under rigorous ISO Good Manufacturing Practices.</li>
                    </ul>
                  </div>
                )}

                {activeTab === "info" && (
                  <div className="tab-pane-content">
                    <div className="table-responsive">
                      <table className="table table-bordered mb-0">
                        <tbody>
                          {Object.entries(product.additionalInfo || {}).map(([key, value]) => (
                            <tr key={key}>
                              <th style={{ width: "240px" }} className="bg-light">{key}</th>
                              <td className="text-muted">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="tab-pane-content">
                    <div className="row g-4">
                      {/* Existing Reviews */}
                      <div className="col-lg-6">
                        <h5 className="fw-bold mb-4">Customer Feedback</h5>
                        {reviewsList.map((rev) => (
                          <div key={rev.id} className="border-bottom pb-3 mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <h6 className="fw-bold mb-0">{rev.author}</h6>
                              <span className="text-muted small">{rev.date}</span>
                            </div>
                            <div className="text-warning small mb-2">
                              {[...Array(5)].map((_, i) => (
                                <i
                                  key={i}
                                  className={`fa-solid fa-star ${
                                    i < rev.rating ? "text-warning" : "text-muted"
                                  }`}
                                ></i>
                              ))}
                            </div>
                            <p className="text-muted small mb-0">{rev.comment}</p>
                          </div>
                        ))}
                      </div>

                      {/* Add Review Form */}
                      <div className="col-lg-6">
                        <div className="bg-light p-4 rounded-4">
                          <h5 className="fw-bold mb-3">Leave a Review</h5>
                          <form onSubmit={handleReviewSubmit}>
                            <div className="mb-3">
                              <label className="form-label small fw-semibold">Your Rating</label>
                              <select
                                className="form-select form-select-sm"
                                value={newReview.rating}
                                onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
                              >
                                <option value="5">★★★★★ (5 - Excellent)</option>
                                <option value="4">★★★★☆ (4 - Good)</option>
                                <option value="3">★★★☆☆ (3 - Average)</option>
                                <option value="2">★★☆☆☆ (2 - Below Expectations)</option>
                                <option value="1">★☆☆☆☆ (1 - Poor)</option>
                              </select>
                            </div>

                            <div className="mb-3">
                              <label className="form-label small fw-semibold">Your Name *</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={newReview.name}
                                onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                                required
                              />
                            </div>

                            <div className="mb-3">
                              <label className="form-label small fw-semibold">Your Review *</label>
                              <textarea
                                className="form-control form-control-sm"
                                rows="3"
                                value={newReview.comment}
                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                required
                              ></textarea>
                            </div>

                            <button type="submit" className="btn btn-dark rounded-pill px-4">
                              Post Review
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="related-products mt-5 pt-4">
              <div className="section-title text-center mb-4">
                <span className="section-sub-title">Pairs Well With</span>
                <h2>You May Also Like</h2>
              </div>
              <div className="row g-4">
                {relatedProducts.map((relProd, idx) => (
                  <div
                    key={relProd.id}
                    className="col-lg-3 col-md-6 wow fadeInUp"
                    data-wow-delay={`${idx * 0.15}s`}
                  >
                    <ProductCard
                      product={relProd}
                      onQuickView={(p) => setQuickViewProduct(p)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
