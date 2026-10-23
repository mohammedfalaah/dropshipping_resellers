import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

export default function ProductCard({ product, onQuickView, className = "", isDragging = false, ...props }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToast } = useToast();

  const isFavorited = isInWishlist(product.id);

  const marginPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;
    addToCart(product, 1);
    addToast(`Added ${product.name} to cart!`, "success");
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;
    toggleWishlist(product);
    addToast(
      isFavorited
        ? `Removed ${product.name} from wishlist.`
        : `Added ${product.name} to wishlist!`,
      "info"
    );
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;
    if (onQuickView) onQuickView(product);
  };

  const handleLinkClick = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className={`product-item ${className}`.trim()} {...props}>
      <div className="product-item-header position-relative">
        {product.badge && (
          <span
            className="position-absolute top-0 start-0 m-3 badge rounded-pill px-3 py-2 text-white shadow-sm"
            style={{
              backgroundColor: "var(--accent-color, #FA7EAA)",
              zIndex: 2,
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.02em"
            }}
          >
            {product.badge}
          </span>
        )}

        {marginPercent && (
          <span className="reseller-margin-pill">
            <i className="fa-solid fa-arrow-trend-up"></i>
            {marginPercent}% Margin
          </span>
        )}

        <div className="product-item-image">
          <Link to={`/product/${product.slug}`} onClick={handleLinkClick}>
            <figure className="mb-0">
              <img src={product.image} alt={product.name} draggable="false" />
            </figure>
          </Link>
        </div>

        {/* Floating action buttons */}
        <div className="product-item-action">
          <ul>
            <li>
              <button
                type="button"
                className="border-0 bg-transparent p-0"
                onClick={handleToggleWishlist}
                title={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
                style={{ cursor: "pointer" }}
              >
                {isFavorited ? (
                  <i className="fa-solid fa-heart" style={{ color: "#ffffff", fontSize: "16px" }}></i>
                ) : (
                  <img src="/images/icon-wishlist-white.svg" alt="Wishlist" />
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="border-0 bg-transparent p-0"
                onClick={handleQuickView}
                title="Quick View"
                style={{ cursor: "pointer" }}
              >
                <img src="/images/icon-preview-white.svg" alt="Quick View" />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="border-0 bg-transparent p-0"
                onClick={handleAddToCart}
                title="Add to Cart"
                style={{ cursor: "pointer" }}
              >
                <img src="/images/icon-cart-white.svg" alt="Add to Cart" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="product-item-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="product-category-pill">
            {product.category || "Wholesale"}
          </span>
          <span className="product-stock-pill">
            <span className="stock-dot"></span> In Stock
          </span>
        </div>

        <h2>
          <Link to={`/product/${product.slug}`} onClick={handleLinkClick}>
            {product.name}
          </Link>
        </h2>

        <div className="product-rating-row">
          <span className="product-item-rating">
            {[...Array(5)].map((_, i) => (
              <i
                key={i}
                className={`fa-solid fa-star ${
                  i < (product.rating || 5) ? "text-warning" : "text-muted"
                }`}
              ></i>
            ))}
          </span>
          <span className="rating-count">({product.ratingCount || 48})</span>
        </div>

        <div className="product-pricing-box">
          <div className="price-primary">
            <span className="wholesale-tag">Wholesale</span>
            <span className="current-price">${product.price.toFixed(2)}</span>
          </div>
          {product.originalPrice && (
            <div className="price-secondary">
              <span className="msrp-label">MSRP</span>
              <span className="original-price">${product.originalPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
