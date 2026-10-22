import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const { addToast } = useToast();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      addToast("Please enter a valid email address.", "error");
      return;
    }
    addToast("Thank you for subscribing! Check your inbox for 15% off.", "success");
    setNewsletterEmail("");
  };

  return (
    <>
      {/* Footer Benefits Section */}
      <div className="footer-benefits">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="footer-benefit-item-list">
                <div className="footer-benefit-item">
                  <div className="icon-box">
                    <img src="/images/icon-footer-benefit-1.svg" alt="Fast Delivery" />
                  </div>
                  <div className="footer-benefit-item-content">
                    <h2><Link to="/delivery-policy">Fast Delivery</Link></h2>
                    <p>Quick Shipping Worldwide</p>
                  </div>
                </div>

                <div className="footer-benefit-item">
                  <div className="icon-box">
                    <img src="/images/icon-footer-benefit-2.svg" alt="Easy Returns" />
                  </div>
                  <div className="footer-benefit-item-content">
                    <h2><Link to="/refund-policy">Easy Returns</Link></h2>
                    <p>Hassle-Free 30-Day Returns</p>
                  </div>
                </div>

                <div className="footer-benefit-item">
                  <div className="icon-box">
                    <img src="/images/icon-footer-benefit-3.svg" alt="24/7 Assistance" />
                  </div>
                  <div className="footer-benefit-item-content">
                    <h2><Link to="/contact">24/7 Assistance</Link></h2>
                    <p>Always Here For You</p>
                  </div>
                </div>

                <div className="footer-benefit-item">
                  <div className="icon-box">
                    <img src="/images/icon-footer-benefit-4.svg" alt="Flexible Checkout" />
                  </div>
                  <div className="footer-benefit-item-content">
                    <h2><Link to="/checkout">Flexible Checkout</Link></h2>
                    <p>100% Secure Payment Options</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <footer className="main-footer dark-section">
        <div className="container">
          <div className="row">
            <div className="col-xl-5 col-lg-4 mb-4 mb-lg-0">
              <div className="about-footer pe-xl-4">
                <div className="footer-logo mb-3">
                  <Link to="/">
                    <img src="/images/Chrome SPARE PRO Logo.png" alt="SPARE PRO" height="42" />
                  </Link>
                </div>

                <div className="about-footer-content mb-4">
                  <p>
                    Your premier B2B and wholesale reseller platform. We supply high-demand gadgets, luxury timepieces, athletic footwear, and streetwear fashion with competitive bulk margins.
                  </p>
                </div>

                {/* Newsletter Box */}
                <div className="footer-newsletter mb-4">
                  <h6 className="text-white mb-2" style={{ fontSize: "15px", fontWeight: "600" }}>
                    Subscribe to get 15% off your first order:
                  </h6>
                  <form onSubmit={handleSubscribe} className="d-flex gap-2">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter your email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        borderRadius: "8px",
                        fontSize: "14px"
                      }}
                    />
                    <button
                      type="submit"
                      className="btn px-4 fw-semibold text-white"
                      style={{
                        backgroundColor: "var(--accent-color, #FA7EAA)",
                        borderRadius: "8px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Subscribe
                    </button>
                  </form>
                </div>

                <div className="footer-social-links">
                  <ul className="d-flex gap-2 list-unstyled mb-0">
                    <li><a href="#" aria-label="Pinterest"><i className="fa-brands fa-pinterest-p"></i></a></li>
                    <li><a href="#" aria-label="Twitter"><i className="fa-brands fa-x-twitter"></i></a></li>
                    <li><a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook-f"></i></a></li>
                    <li><a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-xl-7 col-lg-8">
              <div className="footer-links-box">
                <div className="footer-links">
                  <h2>Quick Links</h2>
                  <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/about">About Us</Link></li>
                    <li><Link to="/shop">Shop All</Link></li>
                    <li><Link to="/blog">Reseller Blog</Link></li>
                    <li><Link to="/contact">Contact Us</Link></li>
                  </ul>
                </div>

                <div className="footer-links">
                  <h2>Shop Categories</h2>
                  <ul>
                    <li><Link to="/shop?category=gadgets">Gadgets</Link></li>
                    <li><Link to="/shop?category=watches">Watches</Link></li>
                    <li><Link to="/shop?category=footwear">Footwear</Link></li>
                    <li><Link to="/shop?category=fashion">Fashion</Link></li>
                    <li><Link to="/shop">All Products</Link></li>
                  </ul>
                </div>

                <div className="footer-links">
                  <h2>Customer Care</h2>
                  <ul>
                    <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                    <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
                    <li><Link to="/faqs">FAQs</Link></li>
                    <li><Link to="/testimonials">Customer Reviews</Link></li>
                    <li><Link to="/account">My Account</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Copyright */}
        <div className="footer-copyright">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="footer-copyright-box">
                  <div className="footer-copyright-text">
                    <p>Copyright © {new Date().getFullYear()} SPARE PRO. All Rights Reserved.</p>
                  </div>

                  <div className="footer-payment-options">
                    <ul>
                      <li><img src="/images/icon-payment-option-1.svg" alt="Visa" /></li>
                      <li><img src="/images/icon-payment-option-2.svg" alt="Mastercard" /></li>
                      <li><img src="/images/icon-payment-option-3.svg" alt="Amex" /></li>
                      <li><img src="/images/icon-payment-option-4.svg" alt="Apple Pay" /></li>
                      <li><img src="/images/icon-payment-option-5.svg" alt="PayPal" /></li>
                      <li><img src="/images/icon-payment-option-6.svg" alt="Google Pay" /></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
