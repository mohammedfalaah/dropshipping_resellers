import React, { useState, useEffect } from "react";
import { productsApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Categories() {
  const [categories, setCategories] = useState([
    {
      name: "Gadgets",
      slug: "gadgets",
      description: "Smart wearables, ANC audio accessories, magnetic charging hubs, and smart home electronics.",
      image: "/images/category-gadgets.jpg",
      productCount: 4,
      status: "Active",
    },
    {
      name: "Watches",
      slug: "watches",
      description: "Chronographs, minimalist dress timepieces, and automatic stainless steel watches.",
      image: "/images/category-watches.jpg",
      productCount: 2,
      status: "Active",
    },
    {
      name: "Footwear",
      slug: "footwear",
      description: "Breathable knit sneakers, lightweight running trainers, and athletic lifestyle shoes.",
      image: "/images/category-footwear.jpg",
      productCount: 2,
      status: "Active",
    },
    {
      name: "Fashion",
      slug: "fashion",
      description: "Apparel essentials, heavyweight cotton tees, oversized streetwear, and outerwear.",
      image: "/images/category-fashion.jpg",
      productCount: 2,
      status: "Active",
    },
  ]);

  const { addToast } = useToast();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Product Categories</h4>
          <p className="text-muted small mb-0">Organize and manage the four core dropshipping wholesale departments</p>
        </div>
        <button
          className="btn-admin-primary"
          onClick={() => addToast("Category hierarchy fixed to: Gadgets, Watches, Footwear, Fashion.", "info")}
        >
          <i className="fa-solid fa-plus"></i>
          <span>Add Category</span>
        </button>
      </div>

      <div className="row g-4">
        {categories.map((cat) => (
          <div key={cat.slug} className="col-md-6 col-xl-3">
            <div className="admin-card h-100 p-0 overflow-hidden d-flex flex-column">
              <div style={{ height: "140px", overflow: "hidden", backgroundColor: "#F1F5F9" }}>
                <img
                  src={cat.image}
                  alt={cat.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div className="p-3 flex-grow-1 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold text-dark mb-0">{cat.name}</h6>
                    <span className="admin-badge admin-badge-success">{cat.status}</span>
                  </div>
                  <p className="text-muted small mb-3" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                    {cat.description}
                  </p>
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <span className="small text-muted">{cat.productCount} Active SKUs</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border rounded-pill px-3"
                    onClick={() => addToast(`Category "${cat.name}" details loaded.`, "info")}
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
