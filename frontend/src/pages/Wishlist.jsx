import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMoveToCart = (product) => {
    if (!isAuthenticated) {
      addToast("Please log in as a reseller to add products to your cart.", "info");
      navigate("/login", { state: { from: location } });
      return;
    }
    addToCart(product, 1);
    removeFromWishlist(product.id || product._id);
    addToast(`Moved ${product.name} to cart!`, "success");
  };

  if (wishlist.length === 0) {
    return (
      <>
        <Breadcrumb title="My Wishlist" links={[{ label: "Wishlist" }]} />
        <div className="empty-wishlist py-5 text-center">
          <div className="container py-5">
            <div className="bg-white p-5 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: "560px" }}>
              <div className="mb-4">
                <i className="fa-regular fa-heart text-muted" style={{ fontSize: "72px" }}></i>
              </div>
              <h2 className="fw-bold mb-3">Your wishlist is empty</h2>
              <p className="text-muted mb-4">
                Explore our catalog and click the heart icon on any item to save it for later.
              </p>
              <Link to="/shop" className="btn-default">
                <span>Discover Products</span>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title="My Wishlist" links={[{ label: "Wishlist" }]} />

      <div className="wishlist-page py-4 py-md-5">
        <div className="container">
          <div className="bg-white p-3 p-md-4 rounded-4 shadow-sm border">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
              <div>
                <h4 className="fw-bold mb-0 text-dark">Saved Products</h4>
                <span className="text-muted small">{wishlist.length} item{wishlist.length > 1 ? "s" : ""} saved</span>
              </div>
              <Link to="/shop" className="btn btn-sm btn-outline-dark rounded-pill px-3">
                <i className="fa-solid fa-store me-1"></i> Shop
              </Link>
            </div>

            {/* Mobile Wishlist Card View (< 768px) */}
            <div className="d-block d-md-none">
              {wishlist.map((item) => (
                <div key={item.id} className="card rounded-4 p-3 mb-3 border shadow-sm bg-white">
                  <div className="d-flex gap-3 align-items-start mb-3">
                    <Link to={`/product/${item.slug || "product"}`} className="flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="rounded-3 border"
                        style={{ width: "64px", height: "64px", objectFit: "contain", backgroundColor: "#f9fafb" }}
                      />
                    </Link>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex justify-content-between align-items-start gap-1">
                        <h6 className="fw-bold mb-1 text-truncate" style={{ fontSize: "14px", maxWidth: "180px" }}>
                          <Link to={`/product/${item.slug || "product"}`} className="text-dark text-decoration-none">
                            {item.name}
                          </Link>
                        </h6>
                        <button
                          type="button"
                          className="btn btn-sm text-danger p-0 border-0"
                          onClick={() => {
                            removeFromWishlist(item.id);
                            addToast(`Removed ${item.name} from wishlist`, "info");
                          }}
                          title="Remove item"
                          style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#fee2e2" }}
                        >
                          <i className="fa-solid fa-trash-can" style={{ fontSize: "11px" }}></i>
                        </button>
                      </div>
                      <span className="badge bg-light text-muted border mb-2" style={{ fontSize: "10px" }}>
                        {item.category}
                      </span>
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="fw-bold text-dark fs-6">
                          ₹{Number(item.price).toLocaleString("en-IN")}
                        </span>
                        <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "10px" }}>
                          In Stock
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-dark w-100 rounded-pill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    style={{ fontSize: "13px" }}
                    onClick={() => handleMoveToCart(item)}
                  >
                    <i className={`fa-solid ${isAuthenticated ? "fa-cart-plus" : "fa-lock"}`}></i>
                    <span>{isAuthenticated ? "Move to Cart" : "Login to Add"}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="d-none d-md-block table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: "90px" }}>Image</th>
                    <th scope="col">Product</th>
                    <th scope="col">Wholesale Price</th>
                    <th scope="col">Stock Status</th>
                    <th scope="col" className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wishlist.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/product/${item.slug || "product"}`}>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="rounded-3 border"
                            style={{ width: "60px", height: "60px", objectFit: "contain", backgroundColor: "#f9fafb" }}
                          />
                        </Link>
                      </td>
                      <td>
                        <h6 className="mb-1" style={{ fontSize: "14px" }}>
                          <Link
                            to={`/product/${item.slug || "product"}`}
                            className="text-dark text-decoration-none fw-semibold"
                          >
                            {item.name}
                          </Link>
                        </h6>
                        <span className="badge bg-light text-muted border" style={{ fontSize: "11px" }}>{item.category}</span>
                      </td>
                      <td>
                        <span className="fw-bold text-dark fs-6">
                          ₹{Number(item.price).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          In Stock
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-dark btn-sm rounded-pill px-3 me-2 fw-semibold"
                          onClick={() => handleMoveToCart(item)}
                        >
                          <i className={`fa-solid ${isAuthenticated ? "fa-cart-plus" : "fa-lock"} me-1`}></i> {isAuthenticated ? "Add to Cart" : "Login to Add"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm rounded-circle p-0"
                          style={{ width: "32px", height: "32px" }}
                          onClick={() => {
                            removeFromWishlist(item.id);
                            addToast(`Removed ${item.name} from wishlist`, "info");
                          }}
                          title="Remove from wishlist"
                        >
                          <i className="fa-solid fa-trash-can small"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
