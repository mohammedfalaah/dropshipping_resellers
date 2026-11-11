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
          <div className="row g-3 g-md-4 mb-4 mb-md-5">
            <div className="col-6 col-md-3 wow fadeInUp" data-wow-delay="0s">
              <div className="card h-100 border-0 shadow-sm p-3 p-md-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "52px", height: "52px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-phone fs-5"></i>
                </div>
                <h5 className="fw-bold mb-1" style={{ fontSize: "15px" }}>Call Us</h5>
                <p className="text-muted small mb-0">+91 8139808004</p>
                <p className="text-muted small mb-0">8139808004</p>
              </div>
            </div>

            <div className="col-6 col-md-3 wow fadeInUp" data-wow-delay="0.15s">
              <div className="card h-100 border-0 shadow-sm p-3 p-md-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "52px", height: "52px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-envelope fs-5"></i>
                </div>
                <h5 className="fw-bold mb-1" style={{ fontSize: "15px" }}>Email Us</h5>
                <p className="text-muted small mb-0">support@thesparepro.com</p>
                <p className="text-muted small mb-0">info@thesparepro.com</p>
              </div>
            </div>

            <div className="col-6 col-md-3 wow fadeInUp" data-wow-delay="0.3s">
              <div className="card h-100 border-0 shadow-sm p-3 p-md-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "52px", height: "52px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-location-dot fs-5"></i>
                </div>
                <h5 className="fw-bold mb-1" style={{ fontSize: "15px" }}>Warehouse</h5>
                <p className="text-muted small mb-0">Thazepalam, Tirur</p>
                <p className="text-muted small mb-0">Kerala - 676107</p>
              </div>
            </div>

            <div className="col-6 col-md-3 wow fadeInUp" data-wow-delay="0.45s">
              <div className="card h-100 border-0 shadow-sm p-3 p-md-4 rounded-4 text-center bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "52px", height: "52px", backgroundColor: "rgba(250, 126, 170, 0.15)", color: "var(--accent-color, #FA7EAA)" }}
                >
                  <i className="fa-solid fa-clock fs-5"></i>
                </div>
                <h5 className="fw-bold mb-1" style={{ fontSize: "15px" }}>Working Hours</h5>
                <p className="text-muted small mb-0">Mon – Fri: 9am – 8pm</p>
                <p className="text-muted small mb-0">Sat – Sun: 10am – 6pm</p>
              </div>
            </div>
          </div>

          {/* Form & Map */}
          <div className="row g-4 g-lg-5 align-items-center">
            <div className="col-lg-6 wow fadeInLeft">
              <div className="bg-white p-3 p-md-5 rounded-4 shadow-sm border">
                <h3 className="fw-bold mb-2">Send us a message</h3>
                <p className="text-muted small mb-4">
                  Have questions about bulk wholesale pricing, dropship orders, or product catalogs? Drop us a note below.
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
                  src="https://maps.google.com/maps?q=Thazepalam,%20Tirur,%20Kerala%20676107&t=&z=15&ie=UTF8&iwloc=&output=embed"
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
