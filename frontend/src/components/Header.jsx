import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useProducts } from "../context/ProductContext";

export default function Header() {
  const { products } = useProducts();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [isSticky, setIsSticky] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchModalOpen(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const filteredSearchResults = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      <div className="site-header-wrapper">
        {/* Topbar Section */}
        <div className="topbar">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-3 col-7">
                <div className="topbar-info-list">
                  <ul>
                    <li>
                      <a href="/contact">
  Become a Reseller
</a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="col-md-6 d-none d-md-block text-center">
                <div className="topbar-info-content">
                  <p>Discover More • Sell Smarter • Grow Faster</p>
                </div>
              </div>

              <div className="col-md-3 col-5 text-end">
                <div className="topbar-info-list topbar-menu">
                  <ul>
                    <li>
                      <Link to="/account">
                        <img src="/images/icon-user-white.svg" alt="User" /> My Account
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <header className={`main-header ${isSticky ? "header-sticky-active" : ""}`}>
          <div className={`header-sticky ${isSticky ? "active" : ""}`}>
            <nav className="navbar navbar-expand-lg">
              <div className="container position-relative">
                {/* Logo */}
                <Link className="navbar-brand" to="/">
                  <img src="/images/Chrome SPARE PRO Logo.png" alt="SPARE PRO" height="42" />
                </Link>

              {/* Desktop Menu */}
              <div className="main-menu d-none d-lg-block">
                <div className="nav-menu-wrapper">
                  <ul className="navbar-nav mr-auto" id="menu">
                    <li className="nav-item">
                      <NavLink className="nav-link" to="/" end>
                        Home
                      </NavLink>
                    </li>
                    <li className="nav-item mega-menu  position-static">
                      <NavLink className="nav-link" to="/shop">
                        Shop 
                      </NavLink>
                      
                    </li>
                    <li className="nav-item">
                      <NavLink className="nav-link" to="/about">
                        About Us
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink className="nav-link" to="/blog">
                        Blog
                      </NavLink>
                    </li>
                    <li className="nav-item submenu">
                      <span className="nav-link cursor-pointer" role="button">
                        Pages <i className="fa-solid fa-angle-down ms-1" style={{ fontSize: "11px" }}></i>
                      </span>
                      <ul>
                        <li className="nav-item"><Link className="nav-link" to="/wishlist">Wishlist</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/cart">Cart</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/checkout">Checkout</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/testimonials">Testimonials</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/faqs">FAQs</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/privacy-policy">Privacy Policy</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/terms-conditions">Terms & Conditions</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/404">404 Error Page</Link></li>
                      </ul>
                    </li>
                    <li className="nav-item">
                      <NavLink className="nav-link" to="/contact">
                        Contact
                      </NavLink>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Icons */}
              <div className="header-action-details">
                <ul className="d-flex align-items-center mb-0 list-unstyled gap-3">
                  {/* Search trigger */}
                  <li>
                    <button
                      type="button"
                      className="border-0 bg-transparent p-0"
                      onClick={() => setSearchModalOpen(true)}
                      aria-label="Search"
                    >
                      <img src="/images/icon-search-primary.svg" alt="Search" />
                    </button>
                  </li>

                  {/* Wishlist */}
                  <li>
                    <Link to="/wishlist" className="position-relative d-inline-block" aria-label="Wishlist">
                      <img src="/images/icon-wishlist-primary.svg" alt="Wishlist" />
                      {wishlistCount > 0 && (
                        <span
                          className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark text-white"
                          style={{ fontSize: "10px", padding: "3px 6px" }}
                        >
                          {wishlistCount}
                        </span>
                      )}
                    </Link>
                  </li>

                  {/* Cart */}
                  <li>
                    <Link to="/cart" className="position-relative d-inline-block" aria-label="Cart">
                      <img src="/images/icon-cart-primary.svg" alt="Cart" />
                      {cartCount > 0 && (
                        <span
                          className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-white"
                          style={{
                            fontSize: "10px",
                            padding: "3px 6px",
                            backgroundColor: "var(--accent-color, #FA7EAA)"
                          }}
                        >
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  </li>

                  {/* Mobile Menu Toggle Button */}
                  <li className="d-lg-none">
                    <button
                      className="border-0 bg-transparent p-1 fs-4"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      aria-label="Toggle Navigation"
                    >
                      <i className={`fa-solid ${mobileMenuOpen ? "fa-xmark" : "fa-bars"}`}></i>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </nav>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="mobile-menu-drawer d-lg-none py-3 px-4 position-relative" style={{ zIndex: 1000 }}>
              <ul className="navbar-nav">
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/" onClick={() => setMobileMenuOpen(false)}>
                    Home
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/shop" onClick={() => setMobileMenuOpen(false)}>
                    Shop All
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/about" onClick={() => setMobileMenuOpen(false)}>
                    About Us
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/blog" onClick={() => setMobileMenuOpen(false)}>
                    Blog
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/wishlist" onClick={() => setMobileMenuOpen(false)}>
                    Wishlist ({wishlistCount})
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/cart" onClick={() => setMobileMenuOpen(false)}>
                    Cart ({cartCount})
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/account" onClick={() => setMobileMenuOpen(false)}>
                    My Account
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/faqs" onClick={() => setMobileMenuOpen(false)}>
                    FAQs
                  </Link>
                </li>
                <li className="nav-item py-1">
                  <Link className="nav-link fw-semibold" to="/contact" onClick={() => setMobileMenuOpen(false)}>
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>
    </div>

      {/* Interactive Search Modal */}
      {searchModalOpen && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 10500 }}
          role="dialog"
          onClick={() => setSearchModalOpen(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content p-4" style={{ borderRadius: "16px" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 fw-bold">Search Products</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSearchModalOpen(false)}
                ></button>
              </div>

              <form onSubmit={handleSearchSubmit}>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control py-2 px-3"
                    placeholder="Search gadgets, watches, footwear, fashion..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn-dark px-4" type="submit">
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </button>
                </div>
              </form>

              {/* Instant Search Results Preview */}
              {searchQuery.trim() && (
                <div className="search-results-preview mt-2" style={{ maxHeight: "280px", overflowY: "auto" }}>
                  {filteredSearchResults.length === 0 ? (
                    <p className="text-muted small mb-0">No products matching "{searchQuery}"</p>
                  ) : (
                    filteredSearchResults.map((prod) => (
                      <div
                        key={prod.id}
                        className="d-flex align-items-center gap-3 py-2 border-bottom cursor-pointer hover-bg-light"
                        onClick={() => {
                          setSearchModalOpen(false);
                          navigate(`/product/${prod.slug}`);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <img
                          src={prod.image}
                          alt={prod.name}
                          style={{ width: "45px", height: "45px", objectFit: "cover", borderRadius: "8px" }}
                        />
                        <div className="flex-grow-1">
                          <h6 className="mb-0" style={{ fontSize: "14px" }}>{prod.name}</h6>
                          <span className="text-muted small">{prod.category}</span>
                        </div>
                        <span className="fw-bold" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                          ${prod.price.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
