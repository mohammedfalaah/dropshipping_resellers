import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function QuickViewModal({ product, onClose }) {
  if (!product) return null;

  const [activeImg, setActiveImg] = useState(product.image || product.mainImage || "/images/product-earbuds.jpg");
  const [quantity, setQuantity] = useState(1);
  const wholesale = Number(product.price ?? product.resellerPrice ?? 0);
  const [customerSellingPrice, setCustomerSellingPrice] = useState("");

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

  const [selectedColor, setSelectedColor] = useState(availableColors[0] || "");
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || "");

  // Helper to match variant by color & size
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

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    const matched = getMatchingVariant(color, selectedSize);
    if (matched?.image) {
      setActiveImg(matched.image);
    }
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    const matched = getMatchingVariant(selectedColor, size);
    if (matched?.image) {
      setActiveImg(matched.image);
    }
  };

  const handleSelectVariantCard = (variant) => {
    if (variant.color) setSelectedColor(variant.color);
    if (variant.size) setSelectedSize(variant.size);
    if (variant.image) {
      setActiveImg(variant.image);
    } else if (product.image || product.mainImage) {
      setActiveImg(product.image || product.mainImage);
    }
  };

  const handleThumbnailClick = (thumb) => {
    setActiveImg(thumb);
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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isFavorited = isInWishlist(product.id || product._id);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      addToast("Please log in as a reseller to add products to your cart.", "info");
      if (onClose) onClose();
      navigate("/login", { state: { from: location } });
      return;
    }
    if (availableColors.length > 0 && !selectedColor) {
      addToast("Please select a color before adding to cart.", "error");
      return;
    }
    if (availableSizes.length > 0 && !selectedSize) {
      addToast("Please select a size before adding to cart.", "error");
      return;
    }

    const finalPrice = customerSellingPrice !== "" && !isNaN(Number(customerSellingPrice))
      ? Number(customerSellingPrice)
      : "";

    const matchedVariant = getMatchingVariant(selectedColor, selectedSize);
    const chosenImage = matchedVariant?.image || activeImg || product.image || product.mainImage;

    addToCart(product, quantity, finalPrice, selectedColor, selectedSize, chosenImage);

    const variantLabel = [selectedColor, selectedSize].filter(Boolean).join(" / ");
    const variantDesc = variantLabel ? ` (${variantLabel})` : "";

    addToast(
      finalPrice !== ""
        ? `Added ${quantity} × ${product.name}${variantDesc} (Customer Price: ₹${finalPrice}) to cart!`
        : `Added ${quantity} × ${product.name}${variantDesc} to cart! Set your customer price in cart or checkout.`,
      "success"
    );
    if (onClose) onClose();
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
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "20px", maxHeight: "92vh", overflowY: "auto" }}>
          <div className="modal-body p-3 p-md-4 p-lg-5 position-relative">
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
                {allThumbnails.length > 1 && (
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    {allThumbnails.map((thumb, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`p-1 border rounded-3 bg-white ${
                          activeImg === thumb ? "border-primary shadow-sm" : "border-light"
                        }`}
                        onClick={() => handleThumbnailClick(thumb)}
                        style={{ cursor: "pointer", width: "55px", height: "55px" }}
                        title="Click to view variant photo"
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
                      ₹{Number(
                        currentVariant?.pricePaise
                          ? currentVariant.pricePaise / 100
                          : product.price ?? product.resellerPrice ?? product.regularPrice ?? 0
                      ).toLocaleString("en-IN")}
                    </span>
                    {product.originalPrice && (
                      <span className="text-muted text-decoration-line-through">
                        ₹{Number(product.originalPrice ?? product.regularPrice ?? 0).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  <p className="text-muted small mb-3">{product.shortDescription || product.description}</p>

                  {/* Variant Selection (Color & Size) */}
                  {(availableColors.length > 0 || availableSizes.length > 0) && (
                    <div className="p-3 bg-light rounded-3 mb-3 border">
                      {availableColors.length > 0 && (
                        <div className={availableSizes.length > 0 ? "mb-2" : "mb-0"}>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small fw-bold text-dark">
                              <i className="fa-solid fa-palette text-primary me-1"></i>
                              Color: <span className="text-primary fw-semibold">{selectedColor}</span>
                            </span>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {availableColors.map((color, idx) => {
                              const colorVariant = Array.isArray(product?.variants)
                                ? product.variants.find((v) => v.color && v.color.toLowerCase() === color.toLowerCase() && v.image)
                                : null;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-2 ${
                                    selectedColor === color
                                      ? "btn-dark text-white"
                                      : "btn-outline-secondary bg-white text-dark"
                                  }`}
                                  onClick={() => handleColorSelect(color)}
                                  style={{ fontSize: "12px" }}
                                >
                                  {colorVariant?.image ? (
                                    <img
                                      src={colorVariant.image}
                                      alt={color}
                                      className="rounded-circle border"
                                      style={{ width: "18px", height: "18px", objectFit: "cover" }}
                                    />
                                  ) : (
                                    selectedColor === color && <i className="fa-solid fa-check me-1 small text-success"></i>
                                  )}
                                  <span>{color}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {availableSizes.length > 0 && (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small fw-bold text-dark">
                              <i className="fa-solid fa-ruler-combined text-primary me-1"></i>
                              Size: <span className="text-primary fw-semibold">{selectedSize}</span>
                            </span>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {availableSizes.map((size, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${
                                  selectedSize === size
                                    ? "btn-dark text-white"
                                    : "btn-outline-secondary bg-white text-dark"
                                }`}
                                onClick={() => handleSizeSelect(size)}
                                style={{ fontSize: "12px", minWidth: "40px" }}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Available Variants Quick List */}
                  {Array.isArray(product?.variants) && product.variants.length > 0 && (
                    <div className="p-2 bg-white rounded-3 mb-3 border">
                      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                        <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                          <i className="fa-solid fa-layer-group text-primary"></i>
                          <span>Variant Matrix ({product.variants.length})</span>
                        </span>
                        <span className="text-muted" style={{ fontSize: "11px" }}>Select variant</span>
                      </div>
                      <div className="d-flex gap-2 overflow-auto pb-1" style={{ maxWidth: "100%" }}>
                        {product.variants.map((v, idx) => {
                          const isMatched =
                            (!v.color || v.color.toLowerCase() === (selectedColor || "").toLowerCase()) &&
                            (!v.size || v.size.toLowerCase() === (selectedSize || "").toLowerCase());
                          const variantImg = v.image || product.image || product.mainImage || "/images/product-earbuds.jpg";

                          return (
                            <div
                              key={idx}
                              onClick={() => handleSelectVariantCard(v)}
                              className={`p-1 rounded-2 border d-flex flex-column align-items-center cursor-pointer flex-shrink-0 transition-all ${
                                isMatched ? "border-primary bg-primary-subtle shadow-sm" : "border-light bg-light"
                              }`}
                              style={{ width: "72px", cursor: "pointer", borderWidth: isMatched ? "2px" : "1px" }}
                              title={`${v.color || ""} ${v.size || ""} (${v.sku || ""})`}
                            >
                              <img
                                src={variantImg}
                                alt=""
                                className="rounded border bg-white"
                                style={{ width: "36px", height: "36px", objectFit: "cover" }}
                              />
                              <span className="fw-semibold text-truncate w-100 text-center mt-1" style={{ fontSize: "10px" }}>
                                {[v.color, v.size].filter(Boolean).join("/") || "Std"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Customer Selling Price Input */}
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small fw-bold text-dark">
                        <i className="fa-solid fa-pen-to-square text-primary me-1"></i> Customer Selling Price
                      </span>
                      {customerSellingPrice !== "" && Number(customerSellingPrice) >= wholesale ? (
                        <span className="small text-success fw-semibold">
                          +₹{((Number(customerSellingPrice) - wholesale) * quantity).toLocaleString("en-IN")} Profit
                        </span>
                      ) : (
                        <span className="small text-muted fst-italic">Enter price</span>
                      )}
                    </div>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white fw-bold">₹</span>
                      <input
                        type="number"
                        min={wholesale}
                        className="form-control fw-bold bg-white text-dark"
                        placeholder="Enter your customer price"
                        value={customerSellingPrice}
                        onChange={(e) => setCustomerSellingPrice(e.target.value)}
                        onBlur={() => {
                          if (customerSellingPrice !== "") {
                            const parsed = Number(customerSellingPrice);
                            if (isNaN(parsed) || parsed < wholesale) setCustomerSellingPrice(wholesale);
                          }
                        }}
                      />
                      <span className="input-group-text bg-light text-muted small">
                        Min: ₹{wholesale}
                      </span>
                    </div>
                  </div>

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
                      className="btn btn-dark flex-grow-1 rounded-pill py-2 px-4 fw-semibold d-flex align-items-center justify-content-center gap-2"
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
                      style={{ width: "42px", height: "42px" }}
                      onClick={handleToggleWishlist}
                      title={isFavorited ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <i className="fa-solid fa-heart"></i>
                    </button>
                  </div>

                  <div className="border-top pt-3 small text-muted">
                    <p className="mb-1"><strong>SKU:</strong> <span className="fw-semibold text-dark">{currentVariant?.sku || product.sku || "LUM-PROD"}</span></p>
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
