import React, { useState } from "react";

export default function WhatsAppFloating() {
  const [isHovered, setIsHovered] = useState(false);

  // SPARE PRO Reseller Support WhatsApp number
  const phoneNumber = "8139808004";
  const internationalNumber = "918139808004";
  const defaultMessage = encodeURIComponent(
    "Hello SPARE PRO Support, I need assistance with reseller orders."
  );
  const whatsappUrl = `https://wa.me/${internationalNumber}?text=${defaultMessage}`;

  return (
    <aside
      className="whatsapp-floating-wrapper"
      aria-label="WhatsApp Reseller Support"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-floating-btn"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Chat with Support on WhatsApp: +91 8139808004"
        title="Chat with Support on WhatsApp (+91 8139808004)"
      >
        {/* Radar pulsing ring effects */}
        <span className="whatsapp-pulse-ring" aria-hidden="true"></span>
        <span className="whatsapp-pulse-ring-2" aria-hidden="true"></span>

        {/* Live Active Status Indicator Dot */}
        <span className="whatsapp-online-dot" title="Support Online"></span>

        {/* Official FontAwesome Brand WhatsApp Icon */}
        <i className="fa-brands fa-whatsapp whatsapp-icon" aria-hidden="true"></i>

        {/* Floating Tooltip Pill */}
        <span className={`whatsapp-tooltip ${isHovered ? "show" : ""}`}>
          <span className="whatsapp-tooltip-title">Chat with Us</span>
          <span className="whatsapp-tooltip-num">+91 {phoneNumber}</span>
        </span>
      </a>
    </aside>
  );
}
