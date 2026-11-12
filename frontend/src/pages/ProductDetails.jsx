import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Navigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import ProductCard from "../components/ProductCard";
import QuickViewModal from "../components/QuickViewModal";
import { useProducts } from "../context/ProductContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

export default function ProductDetails() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

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

  const wholesalePrice = Number(product?.price ?? product?.resellerPrice ?? 0);
  const [customerSellingPrice, setCustomerSellingPrice] = useState("");

  // Product Variants: Available Colors & Sizes
  const availableColors = Array.isArray(product?.colors) && product.colors.length > 0
    ? product.colors
    : Array.isArray(product?.variants)
    ? Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean)))
    : [];

  const availableSizes = Array.isArray(product?.sizes) && product.sizes.length > 0
    ? product.sizes
    : Array.isArray(product?.variants)
    ? Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)))
    : [];

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  // Helper to find matching variant by color and/or size
  const getMatchingVariant = (color, size) => {
    if (!Array.isArray(product?.variants) || product.variants.length === 0) return null;
    const c = (color || "").trim().toLowerCase();
    const s = (size || "").trim().toLowerCase();

    if (c && s) {
      const exact = product.variants.find(
        (v) => (v.color || "").trim().toLowerCase() === c && (v.size || "").trim().toLowerCase() === s
      );
      if (exact) return exact;
    }
    if (c) {
      const matchCol = product.variants.find(
        (v) => (v.color || "").trim().toLowerCase() === c
      );
      if (matchCol) return matchCol;
    }
    if (s) {
      const matchSz = product.variants.find(
        (v) => (v.size || "").trim().toLowerCase() === s
      );
      if (matchSz) return matchSz;
    }
    return product.variants[0] || null;
  };

  const currentVariant = getMatchingVariant(selectedColor, selectedSize);

  // Collect all unique thumbnails across product images and variant images
  const allThumbnails = React.useMemo(() => {
    const list = [];
    const main = product?.image || product?.mainImage;
    if (main) list.push(main);
    if (Array.isArray(product?.thumbnails)) {
      product.thumbnails.forEach((t) => {
        if (t && !list.includes(t)) list.push(t);
      });
    }
    if (Array.isArray(product?.variants)) {
      product.variants.forEach((v) => {
        if (v.image && !list.includes(v.image)) list.push(v.image);
      });
    }
    return list;
  }, [product]);

  useEffect(() => {
    setCustomerSellingPrice("");
    const defaultColor = availableColors.length > 0 ? availableColors[0] : "";
    const defaultSize = availableSizes.length > 0 ? availableSizes[0] : "";
    setSelectedColor(defaultColor);
    setSelectedSize(defaultSize);

    const initVariant = getMatchingVariant(defaultColor, defaultSize);
    if (initVariant?.image) {
      setActiveImage(initVariant.image);
    } else if (product?.image || product?.mainImage) {
      setActiveImage(product.image || product.mainImage);
    }
  }, [product]);

  // When color changes, update selected color and match variant photo
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    const matched = getMatchingVariant(color, selectedSize);
    if (matched?.image) {
      setActiveImage(matched.image);
    }
  };

  // When size changes, update selected size and match variant photo
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    const matched = getMatchingVariant(selectedColor, size);
    if (matched?.image) {
      setActiveImage(matched.image);
    }
  };

  // Direct selection from variant card
  const handleSelectVariantCard = (variant) => {
    if (variant.color) setSelectedColor(variant.color);
    if (variant.size) setSelectedSize(variant.size);
    if (variant.image) {
      setActiveImage(variant.image);
    } else if (product.image || product.mainImage) {
      setActiveImage(product.image || product.mainImage);
    }
  };

  // Thumbnail click: preview photo and auto-select matching variant if applicable
  const handleThumbnailClick = (thumb) => {
    setActiveImage(thumb);
    if (Array.isArray(product?.variants)) {
      const matched = product.variants.find((v) => v.image === thumb);
      if (matched) {
        if (matched.color) setSelectedColor(matched.color);
        if (matched.size) setSelectedSize(matched.size);
      }
    }
  };

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToast } = useToast();

  const isFavorited = isInWishlist(product.id);

  const navigate = useNavigate();

  // Related products from the same category
  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
    .slice(0, 4);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      addToast("Please log in as a reseller to add products to your cart.", "info");
      navigate("/login", { state: { from: location } });
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      addToast("Please select your preferred color before adding to cart.", "error");
      return;
    }

    if (availableSizes.length > 0 && !selectedSize) {
      addToast("Please select your preferred size before adding to cart.", "error");
      return;
    }

    const finalPrice = customerSellingPrice !== "" && !isNaN(Number(customerSellingPrice))
      ? Number(customerSellingPrice)
      : "";

    const matchedVariant = getMatchingVariant(selectedColor, selectedSize);
    const chosenImage = matchedVariant?.image || activeImage || product.image || product.mainImage;

    addToCart(product, quantity, finalPrice, selectedColor, selectedSize, chosenImage);

    const variantLabel = [selectedColor, selectedSize].filter(Boolean).join(" / ");
    const variantDesc = variantLabel ? ` (${variantLabel})` : "";

    addToast(
      finalPrice !== ""
        ? `Added ${quantity} × ${product.name}${variantDesc} (Customer Price: ₹${finalPrice}) to cart!`
        : `Added ${quantity} × ${product.name}${variantDesc} to cart! Set your customer price in cart or checkout.`,
      "success"
    );
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

              {allThumbnails.length > 1 && (
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  {allThumbnails.map((thumb, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`p-2 border rounded-3 bg-white ${
                        activeImage === thumb ? "border-primary shadow-sm" : "border-light"
                      }`}
                      onClick={() => handleThumbnailClick(thumb)}
                      style={{ cursor: "pointer", width: "72px", height: "72px" }}
                      title="Click to view variant photo"
                    >
                      <img
                        src={thumb}
                        alt={`Thumbnail ${idx + 1}`}
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
                    ₹{Number(
                      currentVariant?.pricePaise
                        ? currentVariant.pricePaise / 100
                        : product?.price ?? product?.resellerPrice ?? product?.regularPrice ?? 0
                    ).toLocaleString("en-IN")}
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

                {/* Availability & SKU */}
                <div className="mb-4 small">
                  <p className="mb-1">
                    <strong>Availability: </strong>
                    <span className="text-success fw-semibold">
                      <i className="fa-solid fa-circle-check me-1"></i> In Stock (
                      {currentVariant?.stockQuantity !== undefined
                        ? currentVariant.stockQuantity
                        : product.stockCount || 20}{" "}
                      available)
                    </span>
                  </p>
                  <p className="mb-0">
                    <strong>SKU: </strong>
                    <span className="text-muted fw-semibold">
                      {currentVariant?.sku || product.sku}
                    </span>
                  </p>
                </div>

                {/* Product Variants: Colors & Sizes Selection */}
                {(availableColors.length > 0 || availableSizes.length > 0) && (
                  <div className="p-3 bg-light rounded-4 mb-4 border">
                    {/* Color Selector */}
                    {availableColors.length > 0 && (
                      <div className={availableSizes.length > 0 ? "mb-3" : "mb-0"}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label small fw-bold text-dark mb-0">
                            <i className="fa-solid fa-palette text-primary me-1"></i>
                            Select Color: <span className="text-primary fw-semibold">{selectedColor || "None chosen"}</span>
                          </label>
                          <span className="badge bg-white text-muted border small">
                            {availableColors.length} {availableColors.length === 1 ? "Option" : "Options"}
                          </span>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {availableColors.map((color, idx) => {
                            const isSelected = selectedColor === color;
                            const colorVariant = Array.isArray(product?.variants)
                              ? product.variants.find((v) => v.color && v.color.toLowerCase() === color.toLowerCase() && v.image)
                              : null;
                            return (
                              <button
                                key={idx}
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 transition-all ${
                                  isSelected
                                    ? "btn-dark text-white shadow-sm"
                                    : "btn-outline-secondary bg-white text-dark"
                                }`}
                                onClick={() => handleColorSelect(color)}
                                style={{ fontSize: "13px" }}
                              >
                                {colorVariant?.image ? (
                                  <img
                                    src={colorVariant.image}
                                    alt={color}
                                    className="rounded-circle border"
                                    style={{ width: "22px", height: "22px", objectFit: "cover" }}
                                  />
                                ) : (
                                  isSelected && <i className="fa-solid fa-check small text-success"></i>
                                )}
                                <span>{color}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Size Selector */}
                    {availableSizes.length > 0 && (
                      <div className="mb-0">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label small fw-bold text-dark mb-0">
                            <i className="fa-solid fa-ruler-combined text-primary me-1"></i>
                            Select Size: <span className="text-primary fw-semibold">{selectedSize || "None chosen"}</span>
                          </label>
                          <span className="badge bg-white text-muted border small">
                            {availableSizes.length} {availableSizes.length === 1 ? "Size" : "Sizes"}
                          </span>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {availableSizes.map((size, idx) => {
                            const isSelected = selectedSize === size;
                            return (
                              <button
                                key={idx}
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 py-2 fw-semibold transition-all ${
                                  isSelected
                                    ? "btn-dark text-white shadow-sm"
                                    : "btn-outline-secondary bg-white text-dark"
                                }`}
                                onClick={() => handleSizeSelect(size)}
                                style={{ minWidth: "48px", fontSize: "13px" }}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Display All Product Variants & Respective Photos */}
                {Array.isArray(product?.variants) && product.variants.length > 0 && (
                  <div className="p-3 bg-white rounded-4 mb-4 border shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                          <i className="fa-solid fa-layer-group text-primary"></i>
                          <span>All Product Variants &amp; Photos ({product.variants.length})</span>
                        </h6>
                        <span className="text-muted small" style={{ fontSize: "12px" }}>
                          Click any variant below to select and preview its specific photo
                        </span>
                      </div>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 small" style={{ fontSize: "11px" }}>
                        Live Variant Matrix
                      </span>
                    </div>

                    <div className="row g-2" style={{ maxHeight: "280px", overflowY: "auto" }}>
                      {product.variants.map((v, idx) => {
                        const isMatched =
                          (!v.color || v.color.toLowerCase() === (selectedColor || "").toLowerCase()) &&
                          (!v.size || v.size.toLowerCase() === (selectedSize || "").toLowerCase());
                        const variantImg = v.image || product.image || product.mainImage || "/images/product-earbuds.jpg";
                        const variantWholesale = v.pricePaise ? v.pricePaise / 100 : wholesalePrice;

                        return (
                          <div key={idx} className="col-12 col-sm-6">
                            <div
                              className={`p-2 rounded-3 border d-flex align-items-center gap-3 transition-all ${
                                isMatched
                                  ? "border-primary bg-primary-subtle shadow-sm"
                                  : "border-light-subtle bg-light"
                              }`}
                              onClick={() => handleSelectVariantCard(v)}
                              style={{
                                cursor: "pointer",
                                borderWidth: isMatched ? "2px" : "1px",
                              }}
                              title={`Select ${v.color || ""} ${v.size || ""}`}
                            >
                              {/* Variant Photo Thumbnail */}
                              <div className="position-relative flex-shrink-0">
                                <img
                                  src={variantImg}
                                  alt={v.sku || `Variant ${idx + 1}`}
                                  className="rounded-2 border bg-white"
                                  style={{ width: "52px", height: "52px", objectFit: "cover" }}
                                />
                                {isMatched && (
                                  <span
                                    className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-primary p-1"
                                    style={{ fontSize: "8px" }}
                                  >
                                    <i className="fa-solid fa-check"></i>
                                  </span>
                                )}
                              </div>

                              {/* Variant Info */}
                              <div className="flex-grow-1 min-w-0" style={{ fontSize: "12px" }}>
                                <div className="d-flex align-items-center gap-1 mb-1 flex-wrap">
                                  {v.color && (
                                    <span className="badge bg-dark text-white rounded-pill px-2 py-0" style={{ fontSize: "10px" }}>
                                      {v.color}
                                    </span>
                                  )}
                                  {v.size && (
                                    <span className="badge bg-secondary text-white rounded-pill px-2 py-0" style={{ fontSize: "10px" }}>
                                      {v.size}
                                    </span>
                                  )}
                                  {!v.color && !v.size && (
                                    <span className="badge bg-light text-muted border rounded-pill px-2 py-0" style={{ fontSize: "10px" }}>
                                      Standard
                                    </span>
                                  )}
                                  {isMatched && (
                                    <span className="text-primary fw-bold ms-auto small" style={{ fontSize: "10px" }}>
                                      ✓ Selected
                                    </span>
                                  )}
                                </div>

                                <div className="text-truncate text-muted" style={{ fontSize: "11px" }}>
                                  <strong>SKU:</strong> {v.sku || `${product.sku}-${idx + 1}`}
                                </div>

                                <div className="d-flex justify-content-between align-items-center mt-1">
                                  <span className="fw-bold text-dark" style={{ fontSize: "11px" }}>
                                    ₹{Number(variantWholesale).toLocaleString("en-IN")}
                                  </span>
                                  <span
                                    className={`badge ${
                                      (v.stockQuantity ?? 10) > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"
                                    }`}
                                    style={{ fontSize: "10px" }}
                                  >
                                    {(v.stockQuantity ?? 10) > 0 ? `${v.stockQuantity ?? 10} in stock` : "Out of stock"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reseller Customer Selling Price & Profit Estimator */}
                <div className="p-3 bg-light rounded-4 mb-4 border">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <span className="fw-bold text-dark d-block">
                        <i className="fa-solid fa-pen-to-square text-primary me-1"></i> Reseller Customer Selling Price
                      </span>
                      <span className="text-muted small">Price your end customer will pay on delivery</span>
                    </div>
                    <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold">
                      Dropship Margin
                    </span>
                  </div>
                  <div className="row g-2 align-items-center">
                    <div className="col-sm-6">
                      <div className="input-group">
                        <span className="input-group-text bg-white fw-bold">₹</span>
                        <input
                          type="number"
                          min={wholesalePrice}
                          className="form-control fw-bold fs-6 text-dark bg-white"
                          value={customerSellingPrice}
                          onChange={(e) => setCustomerSellingPrice(e.target.value)}
                          onBlur={() => {
                            if (customerSellingPrice !== "") {
                              const parsed = Number(customerSellingPrice);
                              if (isNaN(parsed) || parsed < wholesalePrice) {
                                setCustomerSellingPrice(wholesalePrice);
                              }
                            }
                          }}
                          placeholder="Enter your customer price"
                        />
                      </div>
                      <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                        Wholesale Cost: ₹{wholesalePrice} (Min price)
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="p-2 rounded-3 bg-white border d-flex justify-content-between align-items-center">
                        <div>
                          <span className="text-muted d-block" style={{ fontSize: "11px" }}>Expected Profit</span>
                          {customerSellingPrice !== "" && Number(customerSellingPrice) >= wholesalePrice ? (
                            <strong className="text-success fs-6">
                              +₹{((Number(customerSellingPrice) - wholesalePrice) * quantity).toLocaleString("en-IN")}
                            </strong>
                          ) : (
                            <span className="text-muted small fst-italic">Enter selling price</span>
                          )}
                        </div>
                        {customerSellingPrice !== "" && Number(customerSellingPrice) >= wholesalePrice && (
                          <span className="badge bg-light text-muted border" style={{ fontSize: "11px" }}>
                            ₹{Number(customerSellingPrice) - wholesalePrice}/unit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
                    className="btn btn-dark rounded-pill py-3 px-5 fw-semibold flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleAddToCart}
                  >
                    <i className={`fa-solid ${isAuthenticated ? "fa-bag-shopping" : "fa-lock"} me-1`}></i>
                    <span>{isAuthenticated ? "Add to Cart" : "Login to Add to Cart"}</span>
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
                      <i className="fa-solid fa-truck-fast me-2 text-primary"></i> Fast Doorstep Dispatch
                    </div>
                    <div className="col-6">
                      <i className="fa-solid fa-box-open me-2 text-primary"></i> 24-Hr Unboxing Replacement
                    </div>
                    <div className="col-6">
                      <i className="fa-solid fa-handshake me-2 text-primary"></i> Factory Direct Wholesale
                    </div>
                    <div className="col-6">
                      <i className="fa-solid fa-wallet me-2 text-primary"></i> COD &amp; Reseller Margins
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
                    key={relProd.id || relProd._id || idx}
                    className="col-lg-3 col-md-6"
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
