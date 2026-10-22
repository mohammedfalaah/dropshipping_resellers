import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { products, categories, blogPosts, testimonials } from "../data/productsData";
import ProductCard from "../components/ProductCard";
import QuickViewModal from "../components/QuickViewModal";

const tickerItems = [
  { img: "/images/ticker-wholesale.jpg", text: "Wholesale Prices for Resellers" },
  { img: "/images/ticker-gadgets.jpg", text: "Trending Gadgets & Accessories" },
  { img: "/images/ticker-watches.jpg", text: "Stylish Watches & Footwear" },
  { img: "/images/ticker-fashion.jpg", text: "Fashion for Every Style" },
  { img: "/images/ticker-shipping.jpg", text: "Reliable Shipping & Tracking" },
  { img: "/images/ticker-ordering.jpg", text: "Easy Ordering for Resellers" },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [viewMode, setViewMode] = useState("carousel"); // "carousel" | "grid"
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const productScrollRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Live countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 8,
    minutes: 45,
    seconds: 30
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredProducts =
    selectedCategory === "all"
      ? products.slice(0, 8)
      : products.filter((p) => p.categorySlug === selectedCategory);

  // Scroll position & progress updater
  const updateScrollStatus = () => {
    const el = productScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;

    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(maxScroll > 10 && scrollLeft < maxScroll - 10);

    const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
  };

  useEffect(() => {
    updateScrollStatus();
    const el = productScrollRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollStatus, { passive: true });
      window.addEventListener("resize", updateScrollStatus);
    }
    return () => {
      if (el) el.removeEventListener("scroll", updateScrollStatus);
      window.removeEventListener("resize", updateScrollStatus);
    };
  }, [filteredProducts, viewMode]);

  // When changing category, smoothly reset scroll to start
  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    if (productScrollRef.current) {
      productScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const scrollByAmount = (amount) => {
    if (productScrollRef.current) {
      productScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const scrollToProductIndex = (idx) => {
    if (!productScrollRef.current) return;
    const cards = productScrollRef.current.querySelectorAll(".product-item");
    if (cards[idx]) {
      cards[idx].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    }
  };

  // Drag-to-scroll handlers
  const handleMouseDown = (e) => {
    if (!productScrollRef.current) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - productScrollRef.current.offsetLeft;
    scrollLeftStartRef.current = productScrollRef.current.scrollLeft;
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDownRef.current || !productScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - productScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.35;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    productScrollRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
    setIsDragging(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 70);
  };

  return (
    <>
      {/* Hero Section */}
      <div className="hero dark-section parallaxie">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="hero-content">
                <div className="hero-sub-heading wow fadeInUp">
                  <p>Shop popular products selected by demand and sales performance.</p>
                </div>

                <div className="section-title">
                  <h1 className="text-anime-style-3">Wholesale Prices. Better Margins. </h1>
                </div>

               

                <div className="hero-content-btn wow fadeInUp" data-wow-delay="0.4s">
                  <Link to="/shop" className="btn-default">
                    <span>Explore Products</span>
                  </Link>
                  <Link to="/shop" className="btn-default btn-border">
                    <span>Start Reselling</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling Ticker Section */}
      <div className="our-scrolling-ticker">
        <div className="scrolling-ticker-box">
          <div className="scrolling-content">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={`ticker-a-${idx}`}>
                <img src={item.img} alt="" />
                {item.text}
              </span>
            ))}
          </div>

          <div className="scrolling-content" aria-hidden="true">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={`ticker-b-${idx}`}>
                <img src={item.img} alt="" />
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="our-category">
        <div className="container">
          <div className="row section-row">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <span className="section-sub-title wow fadeInUp">Our Core Categories</span>
                <h2 className="text-anime-style-3">Curated Wholesale Categories</h2>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-12">
              <div className="category-item-list">
                {categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="category-item wow fadeInUp"
                    data-wow-delay={`${idx * 0.15}s`}
                    style={{ width: "calc(25% - 15px)" }}
                  >
                    <div className="category-item-image">
                      <Link to={`/shop?category=${cat.slug}`}>
                        <figure>
                          <img src={cat.image} alt={cat.name} />
                        </figure>
                      </Link>
                    </div>
                    <div className="category-item-content">
                      <h3>
                        <Link to={`/shop?category=${cat.slug}`}>{cat.name}</Link>
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="our-products">
        <div className="container">
          <div className="row section-row">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <span className="section-sub-title wow fadeInUp">Featured Reseller Catalog</span>
                <h2 className="text-anime-style-3">High-Margin Wholesale Products</h2>
              </div>

              {/* Product Showcase Controls Bar */}
              <div className="product-showcase-controls wow fadeInUp" data-wow-delay="0.2s">
                {/* Category Filter Tabs */}
                <div className="product-category-tabs">
                  <button
                    type="button"
                    className={`product-category-tab ${selectedCategory === "all" ? "active" : ""}`}
                    onClick={() => handleCategoryChange("all")}
                  >
                    All Products
                  </button>
                  <button
                    type="button"
                    className={`product-category-tab ${selectedCategory === "gadgets" ? "active" : ""}`}
                    onClick={() => handleCategoryChange("gadgets")}
                  >
                    Gadgets
                  </button>
                  <button
                    type="button"
                    className={`product-category-tab ${selectedCategory === "watches" ? "active" : ""}`}
                    onClick={() => handleCategoryChange("watches")}
                  >
                    Watches
                  </button>
                  <button
                    type="button"
                    className={`product-category-tab ${selectedCategory === "footwear" ? "active" : ""}`}
                    onClick={() => handleCategoryChange("footwear")}
                  >
                    Footwear
                  </button>
                  <button
                    type="button"
                    className={`product-category-tab ${selectedCategory === "fashion" ? "active" : ""}`}
                    onClick={() => handleCategoryChange("fashion")}
                  >
                    Fashion
                  </button>
                </div>

                {/* Right Action Controls: View Mode & Carousel Nav Arrows */}
                <div className="product-action-controls">
                  <div className="view-mode-toggle">
                    <button
                      type="button"
                      className={`view-mode-btn ${viewMode === "carousel" ? "active" : ""}`}
                      onClick={() => setViewMode("carousel")}
                      title="Horizontal Slider Mode"
                    >
                      <i className="fa-solid fa-arrows-left-right"></i>
                      <span>Slider</span>
                    </button>
                    <button
                      type="button"
                      className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid Mode"
                    >
                      <i className="fa-solid fa-grip"></i>
                      <span>Grid</span>
                    </button>
                  </div>

                  {viewMode === "carousel" && (
                    <div className="carousel-nav-arrows">
                      <button
                        type="button"
                        className="carousel-nav-btn"
                        onClick={() => scrollByAmount(-340)}
                        disabled={!canScrollLeft}
                        title="Previous Products"
                        aria-label="Previous Products"
                      >
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                      <button
                        type="button"
                        className="carousel-nav-btn"
                        onClick={() => scrollByAmount(340)}
                        disabled={!canScrollRight}
                        title="Next Products"
                        aria-label="Next Products"
                      >
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product Showcase Viewport */}
          <div className="row">
            <div className="col-lg-12">
              {viewMode === "carousel" ? (
                <div className="product-carousel-viewport">
                  {canScrollLeft && <div className="carousel-edge-fade-left"></div>}
                  {canScrollRight && <div className="carousel-edge-fade-right"></div>}

                  {/* Floating Desktop Edge Navigation Buttons */}
                  <button
                    type="button"
                    className="floating-nav-btn prev"
                    onClick={() => scrollByAmount(-340)}
                    disabled={!canScrollLeft}
                    aria-label="Previous Products"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button
                    type="button"
                    className="floating-nav-btn next"
                    onClick={() => scrollByAmount(340)}
                    disabled={!canScrollRight}
                    aria-label="Next Products"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>

                  <div
                    ref={productScrollRef}
                    className={`product-scroll-track ${isDragging ? "is-dragging" : ""}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                  >
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isDragging={hasDraggedRef.current}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    ))}
                  </div>

                  {/* Live Progress Bar and Indicators */}
                  <div className="product-scroll-footer">
                    <div className="product-scroll-progress-track">
                      <div
                        className="product-scroll-progress-bar"
                        style={{ width: `${Math.max(12, scrollProgress)}%` }}
                      ></div>
                    </div>

                    <div className="product-scroll-indicator-text">
                      <span>Showing {filteredProducts.length} Wholesale Essentials</span>
                      <span>•</span>
                      <span>
                        <i className="fa-solid fa-hand-pointer me-1 text-muted"></i>
                        Drag or click arrows to explore
                      </span>
                    </div>

                    {filteredProducts.length > 3 && (
                      <div className="product-scroll-dots">
                        {filteredProducts.map((_, dotIdx) => {
                          const activeDot = Math.round(
                            (scrollProgress / 100) * (filteredProducts.length - 1)
                          );
                          return (
                            <button
                              key={dotIdx}
                              type="button"
                              className={`product-scroll-dot ${
                                activeDot === dotIdx ? "active" : ""
                              }`}
                              onClick={() => scrollToProductIndex(dotIdx)}
                              aria-label={`Scroll to product ${dotIdx + 1}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="product-item-list">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      className="fade-in-item"
                      onQuickView={(p) => setQuickViewProduct(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-center mt-5 wow fadeInUp" data-wow-delay="0.3s">
            <Link to="/shop" className="btn-default">
              <span>View All Products</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Trending Offers Section */}
      <div className="trending-offers">
        <div className="container">
          <div className="row section-row">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <span className="section-sub-title wow fadeInUp">Trending Catalogs</span>
                <h2 className="text-anime-style-3">Exclusive Wholesale Drops</h2>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-12">
              <div className="trending-offer-item-list">
                {/* Box 1 - Gadgets */}
                <div className="trending-offer-item box-1 wow fadeInUp">
                  <div className="trending-offer-item-image">
                    <figure>
                      <img src="/images/category-gadgets.jpg" alt="Smart Audio & Mobile Accessories" />
                    </figure>
                  </div>
                  <div className="trending-offer-item-body">
                    <div className="trending-offer-item-title">
                      <p>Smart Audio & Mobile Accessories</p>
                    </div>
                    <div className="trending-offer-item-content">
                      <div className="trending-offer-item-info">
                        <h3>Up to 50% Margin</h3>
                        <p>Fast-Selling Tech Gear</p>
                      </div>
                      <div className="trending-offer-item-btn">
                        <Link to="/shop?category=gadgets" className="btn-default btn-highlighted">
                          <span>Shop Gadgets</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 2 - Watches */}
                <div className="trending-offer-item box-2 wow fadeInUp" data-wow-delay="0.2s">
                  <div className="trending-offer-item-image">
                    <figure>
                      <img src="/images/category-watches.jpg" alt="Precision Automatic & Smartwatches" />
                    </figure>
                  </div>
                  <div className="trending-offer-item-body">
                    <div className="trending-offer-item-title">
                      <p>Precision Automatic & Smartwatches</p>
                    </div>
                    <div className="trending-offer-item-content">
                      <div className="trending-offer-item-info">
                        <h3>Up to 60% Margin</h3>
                        <p>Luxury & AMOLED Wearables</p>
                      </div>
                      <div className="trending-offer-item-btn">
                        <Link to="/shop?category=watches" className="btn-default btn-highlighted">
                          <span>Shop Watches</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 3 - Footwear */}
                <div className="trending-offer-item box-3 wow fadeInUp" data-wow-delay="0.4s">
                  <div className="trending-offer-item-image">
                    <figure>
                      <img src="/images/category-footwear.jpg" alt="Urban Sneakers & Chelsea Boots" />
                    </figure>
                  </div>
                  <div className="trending-offer-item-body">
                    <div className="trending-offer-item-title">
                      <p>Urban Sneakers & Chelsea Boots</p>
                    </div>
                    <div className="trending-offer-item-content">
                      <div className="trending-offer-item-info">
                        <h3>Volume Discounts</h3>
                        <p>High-Demand Street Footwear</p>
                      </div>
                      <div className="trending-offer-item-btn">
                        <Link to="/shop?category=footwear" className="btn-default btn-highlighted">
                          <span>Shop Footwear</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Offer Item List */}
            <div className="col-lg-12">
              <div className="special-offer-item-list">
                <div className="special-offer-item wow fadeInUp" data-wow-delay="0.2s">
                  <div className="special-offer-item-image">
                    <figure>
                      <img src="/images/category-fashion.jpg" alt="Premium Streetwear Fashion" />
                    </figure>
                  </div>
                  <div className="special-offer-item-body">
                    <div className="section-title">
                      <span className="section-sub-title">Fashion Wholesale</span>
                      <h2>
                        <Link to="/shop?category=fashion">Heavyweight Streetwear & Selvedge Denim</Link>
                      </h2>
                      <p>Heavyweight French Terry hoodies and Japanese selvedge denim tailored for modern boutiques.</p>
                    </div>
                    <div className="special-offer-item-btn">
                      <Link to="/shop?category=fashion" className="btn-default btn-border">
                        <span>Explore Fashion</span>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="special-offer-item wow fadeInUp" data-wow-delay="0.4s">
                  <div className="special-offer-item-image">
                    <figure>
                      <img src="/images/lifestyle-display.png" alt="Curated Lifestyle Display" />
                    </figure>
                  </div>
                  <div className="special-offer-item-body">
                    <div className="section-title">
                      <span className="section-sub-title">Complete Catalog</span>
                      <h2>
                        <Link to="/shop">Curated Tech, Watches, Footwear & Apparel</Link>
                      </h2>
                      <p>Direct factory-sourced inventory with verified margins and expedited global logistics.</p>
                    </div>
                    <div className="special-offer-item-btn">
                      <Link to="/shop" className="btn-default btn-border">
                        <span>Browse Catalog</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Limited Time Countdown Offer */}
      <div className="limited-offer">
        <div className="container-fluid">
          <div className="row no-gutters">
            <div className="col-lg-12">
              <div className="limited-offer-box">
                {/* Content Box */}
                <div className="limited-offer-content-box dark-section">
                  <div className="limited-offer-content">
                    <div className="section-title">
                      <span className="section-sub-title wow fadeInUp">Limited Offers</span>
                      <h2 className="text-anime-style-3">Seasonal Reseller Bulk Sale</h2>
                      <p className="wow fadeInUp" data-wow-delay="0.2s">
                        Boost your store margins with Tier-1 wholesale volume pricing across gadgets, luxury watches, sneakers, and modern apparel.
                      </p>
                    </div>

                    <div className="limited-offer-countdown wow fadeInUp">
                      <div className="countdown">
                        <div className="counter-box">
                          <span className="days">{String(timeLeft.days).padStart(2, "0")}</span>
                          <p>Days</p>
                        </div>
                        <div className="counter-box">
                          <span className="hours">{String(timeLeft.hours).padStart(2, "0")}</span>
                          <p>Hrs</p>
                        </div>
                        <div className="counter-box">
                          <span className="minutes">{String(timeLeft.minutes).padStart(2, "0")}</span>
                          <p>Min</p>
                        </div>
                        <div className="counter-box">
                          <span className="seconds">{String(timeLeft.seconds).padStart(2, "0")}</span>
                          <p>Sec</p>
                        </div>
                      </div>
                    </div>

                    <div className="limited-offer-btn wow fadeInUp" data-wow-delay="0.2s">
                      <Link to="/shop" className="btn-default">
                        <span>Shop Wholesale</span>
                      </Link>
                    </div>
                  </div>

                  <div className="limited-offer-content-list wow fadeInUp" data-wow-delay="0.4s">
                    <ul>
                      <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                      <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
                      <li><Link to="/refund-policy">Refund & Return Policy</Link></li>
                    </ul>
                  </div>
                </div>

                {/* Side Image */}
                <div className="limited-offer-image">
                  <figure className="image-anime">
                    <img src="/images/lifestyle-display.png" alt="Limited Wholesale Offer" />
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Reel */}
      <div className="our-testimonials py-5">
        <div className="container">
          <div className="row section-row text-center mb-5">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <span className="section-sub-title wow fadeInUp">Client Love</span>
                <h2 className="text-anime-style-3">What Our Customers Say</h2>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {testimonials.map((test, idx) => (
              <div
                key={test.id}
                className="col-lg-4 col-md-6 wow fadeInUp"
                data-wow-delay={`${idx * 0.15}s`}
              >
                <div className="card h-100 border-0 shadow-sm p-4 rounded-4 bg-white">
                  <div className="mb-3 text-warning">
                    {[...Array(test.rating)].map((_, i) => (
                      <i key={i} className="fa-solid fa-star me-1"></i>
                    ))}
                  </div>
                  <h5 className="fw-bold mb-2">"{test.title}"</h5>
                  <p className="text-muted small mb-4 flex-grow-1">{test.content}</p>
                  <div className="d-flex align-items-center gap-3 border-top pt-3">
                    <img
                      src={test.avatar}
                      alt={test.name}
                      className="rounded-circle"
                      style={{ width: "45px", height: "45px", objectFit: "cover" }}
                    />
                    <div>
                      <h6 className="mb-0 fw-bold" style={{ fontSize: "14px" }}>{test.name}</h6>
                      <span className="text-muted small">{test.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Blog Section */}
      <div className="our-blog py-5 bg-light">
        <div className="container">
          <div className="row section-row text-center mb-5">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <span className="section-sub-title wow fadeInUp">Reseller Knowledge Base</span>
                <h2 className="text-anime-style-3">Margins, Guides & Trends</h2>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {blogPosts.map((post, idx) => (
              <div
                key={post.id}
                className="col-lg-4 col-md-6 wow fadeInUp"
                data-wow-delay={`${idx * 0.15}s`}
              >
                <div className="card h-100 border-0 shadow-sm overflow-hidden rounded-4 bg-white">
                  <Link to={`/blog/${post.slug}`}>
                    <img src={post.image} alt={post.title} className="card-img-top" style={{ height: "240px", objectFit: "cover" }} />
                  </Link>
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex align-items-center gap-3 text-muted small mb-2">
                      <span><i className="fa-regular fa-calendar me-1"></i> {post.date}</span>
                      <span><i className="fa-regular fa-user me-1"></i> {post.author}</span>
                    </div>
                    <h5 className="card-title fw-bold mb-3">
                      <Link to={`/blog/${post.slug}`} className="text-dark text-decoration-none">
                        {post.title}
                      </Link>
                    </h5>
                    <p className="card-text text-muted small mb-4 flex-grow-1">{post.excerpt}</p>
                    <Link to={`/blog/${post.slug}`} className="fw-semibold text-decoration-none" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                      Read Article &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  );
}
