import React from "react";
import { Link } from "react-router-dom";

export default function Breadcrumb({ title, links = [] }) {
  return (
    <div className="page-header dark-section" style={{ backgroundImage: "url('/images/page-header-bg-image.png')" }}>
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="page-header-box">
              <h1 className="text-white mb-3" style={{ fontSize: "48px", fontWeight: "700" }}>{title}</h1>
              <nav>
                <ol className="breadcrumb justify-content-center mb-0">
                  <li className="breadcrumb-item">
                    <Link to="/" className="text-white text-decoration-none">Home</Link>
                  </li>
                  {links.map((link, idx) => (
                    <li
                      key={idx}
                      className={`breadcrumb-item ${idx === links.length - 1 ? "active text-white-50" : ""}`}
                      aria-current={idx === links.length - 1 ? "page" : undefined}
                    >
                      {link.to && idx !== links.length - 1 ? (
                        <Link to={link.to} className="text-white text-decoration-none">{link.label}</Link>
                      ) : (
                        <span>{link.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
