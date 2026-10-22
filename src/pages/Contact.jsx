import React, { useState } from "react";
import Breadcrumb from "../components/Breadcrumb";
import { useToast } from "../context/ToastContext";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      addToast("Please fill in your name, email, and message.", "error");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      addToast("Message sent successfully! Our reseller account specialists will contact you within 24 hours.", "success");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 600);
  };

  return (
    <>
      <Breadcrumb title="Contact Us" links={[{ label: "Contact Us" }]} />

      <div className="contact-page py-5">
        <div className="container">
          {/* Top Info Cards */}
          <div className="row g-4 mb-5">
            <div className="col-md-3 col-sm-6 wow fadeInUp" data-wow-delay="0s">
              <div className="card h-100 border-0 shadow-sm p-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "60px", height: "60px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-phone fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">Call Us</h5>
                <p className="text-muted small mb-0">+91 1234 56789</p>
                <p className="text-muted small mb-0">+1 (800) 555-0199</p>
              </div>
            </div>

            <div className="col-md-3 col-sm-6 wow fadeInUp" data-wow-delay="0.15s">
              <div className="card h-100 border-0 shadow-sm p-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "60px", height: "60px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-envelope fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">Email Us</h5>
                <p className="text-muted small mb-0">support@sparepro.com</p>
                <p className="text-muted small mb-0">wholesale@sparepro.com</p>
              </div>
            </div>

            <div className="col-md-3 col-sm-6 wow fadeInUp" data-wow-delay="0.3s">
              <div className="card h-100 border-0 shadow-sm p-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "60px", height: "60px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-location-dot fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">Visit Atelier</h5>
                <p className="text-muted small mb-0">124 Regent Street</p>
                <p className="text-muted small mb-0">London, W1B 5SR, UK</p>
              </div>
            </div>

            <div className="col-md-3 col-sm-6 wow fadeInUp" data-wow-delay="0.45s">
              <div className="card h-100 border-0 shadow-sm p-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "60px", height: "60px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-clock fs-4"></i>
                </div>
                <h5 className="fw-bold mb-2">Working Hours</h5>
                <p className="text-muted small mb-0">Mon – Fri: 9am – 8pm</p>
                <p className="text-muted small mb-0">Sat – Sun: 10am – 6pm</p>
              </div>
            </div>
          </div>

          {/* Form & Map */}
          <div className="row g-5 align-items-center">
            <div className="col-lg-6 wow fadeInLeft">
              <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border">
                <h3 className="fw-bold mb-2">Send us a message</h3>
                <p className="text-muted small mb-4">
                  Have questions about ingredients, shades, or custom orders? Drop us a note below.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Your Name *</label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Your Email *</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        className="form-control"
                        value={formData.subject}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Message *</label>
                      <textarea
                        name="message"
                        rows="4"
                        className="form-control"
                        value={formData.message}
                        onChange={handleChange}
                        required
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-dark rounded-pill px-5 py-3 fw-semibold w-100"
                        disabled={submitting}
                      >
                        {submitting ? "Sending..." : "Send Message"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="rounded-4 overflow-hidden shadow-sm border" style={{ height: "460px" }}>
                <iframe
                  title="Google Maps"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3512.278209478427!2d-0.12231632580492868!3d51.503019584494716!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487604b900d26973%3A0x4291f3172409ea92!2sLondon%20Eye!5e0!3m2!1sen!2sin!4v1776256795824!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
