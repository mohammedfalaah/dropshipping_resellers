import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

export default function QuickViewModal({ product, onClose }) {
  if (!product) return null;

  const [activeImg, setActiveImg] = useState(product.image);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToast } = useToast();

  const isFavorited = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    addToast(`Added ${quantity} × ${product.name} to cart!`, "success");
    onClose();
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

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 10600 }}
      role="dialog"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content overflow-hidden border-0 shadow-lg" style={{ borderRadius: "20px" }}>
          <div className="modal-body p-4 p-md-5 position-relative">
            <button
              type="button"
              className="btn-close position-absolute top-0 end-0 m-4"
              onClick={onClose}
              aria-label="Close"
              style={{ zIndex: 10 }}
            ></button>

            <div className="row g-4 align-items-center">
              {/* Product Gallery */}
              <div className="col-md-6">
                <div className="product-modal-image text-center bg-light p-3 rounded-4 mb-3">
                  <img
                    src={activeImg}
                    alt={product.name}
                    className="img-fluid"
                    style={{ maxHeight: "300px", objectFit: "contain" }}
                  />
                </div>
                {product.thumbnails && product.thumbnails.length > 1 && (
                  <div className="d-flex gap-2 justify-content-center">
                    {product.thumbnails.map((thumb, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`p-1 border rounded-3 bg-white ${
                          activeImg === thumb ? "border-dark shadow-sm" : "border-light"
                        }`}
                        onClick={() => setActiveImg(thumb)}
                        style={{ cursor: "pointer", width: "55px", height: "55px" }}
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

              {/* Product Info */}
              <div className="col-md-6">
                <div className="product-modal-details">
                  <span className="badge bg-light text-muted mb-2 px-3 py-2 rounded-pill">
                    {product.category}
                  </span>
                  <h3 className="h4 fw-bold mb-2">{product.name}</h3>

                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span className="text-warning small">
                      {[...Array(5)].map((_, i) => (
                        <i
                          key={i}
                          className={`fa-solid fa-star ${
                            i < product.rating ? "text-warning" : "text-muted"
                          }`}
                        ></i>
                      ))}
                    </span>
                    <span className="text-muted small">({product.ratingCount || 20} reviews)</span>
                  </div>

                  <div className="mb-3">
                    <span className="h4 fw-bold me-2" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                      ₹{Number(product.price ?? product.resellerPrice ?? product.regularPrice ?? 0).toLocaleString("en-IN")}
                    </span>
                    {product.originalPrice && (
                      <span className="text-muted text-decoration-line-through">
                        ₹{Number(product.originalPrice ?? product.regularPrice ?? 0).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  <p className="text-muted small mb-4">{product.shortDescription || product.description}</p>

                  {/* Quantity & Actions */}
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="d-flex align-items-center border rounded-pill px-3 py-1 bg-white">
                      <button
                        type="button"
                        className="btn btn-sm border-0 p-0 me-2"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <i className="fa-solid fa-minus small"></i>
                      </button>
                      <span className="fw-semibold px-2">{quantity}</span>
                      <button
                        type="button"
                        className="btn btn-sm border-0 p-0 ms-2"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <i className="fa-solid fa-plus small"></i>
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-dark flex-grow-1 rounded-pill py-2 px-4 fw-semibold"
                      onClick={handleAddToCart}
                    >
                      <i className="fa-solid fa-bag-shopping me-2"></i> Add to Cart
                    </button>

                    <button
                      type="button"
                      className={`btn border rounded-circle p-2 ${
                        isFavorited ? "btn-danger text-white border-danger" : "btn-light"
                      }`}
                      style={{ width: "42px", height: "42px" }}
                      onClick={handleToggleWishlist}
                      title={isFavorited ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <i className="fa-solid fa-heart"></i>
                    </button>
                  </div>

                  <div className="border-top pt-3 small text-muted">
                    <p className="mb-1"><strong>SKU:</strong> {product.sku || "LUM-PROD"}</p>
                    <p className="mb-0">
                      <strong>View Details: </strong>
                      <Link
                        to={`/product/${product.slug}`}
                        onClick={onClose}
                        className="text-decoration-none fw-semibold"
                        style={{ color: "var(--accent-color, #FA7EAA)" }}
                      >
                        Go to Full Product Page &rarr;
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
