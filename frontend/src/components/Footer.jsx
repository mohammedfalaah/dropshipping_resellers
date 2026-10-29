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

                 
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
