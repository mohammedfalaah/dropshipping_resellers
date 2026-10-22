import React from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";

export default function NotFound() {
  return (
    <>
      <Breadcrumb title="Page Not Found" links={[{ label: "404 Error" }]} />

      <div className="error-page py-5 text-center">
        <div className="container py-5">
          <div className="bg-white p-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: "600px" }}>
            <h1 className="display-1 fw-bold mb-3" style={{ color: "var(--accent-color, #FA7EAA)" }}>
              404
            </h1>
            <h3 className="fw-bold mb-3">Oops! Page not found</h3>
            <p className="text-muted mb-4">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Link to="/" className="btn-default">
              <span>Back To Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
