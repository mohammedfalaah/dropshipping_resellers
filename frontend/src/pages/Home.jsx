import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { blogPosts, testimonials } from "../data/productsData";
import { useProducts } from "../context/ProductContext";
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
  const { products, categories } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quickViewProduct, setQuickViewProduct] = useState(null);

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
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug || cat.id}
                      type="button"
                      className={`product-category-tab ${selectedCategory === cat.slug ? "active" : ""}`}
                      onClick={() => setSelectedCategory(cat.slug)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid Viewport */}
          <div className="row">
            <div className="col-lg-12">
              <div className="product-item-list">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id || product._id}
                    product={product}
                    onQuickView={(p) => setQuickViewProduct(p)}
                  />
                ))}
              </div>
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
