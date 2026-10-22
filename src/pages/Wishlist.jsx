import React from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { addToast } = useToast();

  const handleMoveToCart = (product) => {
    addToCart(product, 1);
    removeFromWishlist(product.id);
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

      <div className="wishlist-page py-5">
        <div className="container">
          <div className="bg-white p-4 rounded-4 shadow-sm border">
            <h4 className="fw-bold mb-4">Saved Products ({wishlist.length})</h4>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: "90px" }}>Image</th>
                    <th scope="col">Product</th>
                    <th scope="col">Unit Price</th>
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
                            style={{ width: "65px", height: "65px", objectFit: "contain" }}
                          />
                        </Link>
                      </td>
                      <td>
                        <h6 className="mb-1">
                          <Link
                            to={`/product/${item.slug || "product"}`}
                            className="text-dark text-decoration-none fw-semibold"
                          >
                            {item.name}
                          </Link>
                        </h6>
                        <span className="text-muted small">{item.category}</span>
                      </td>
                      <td>
                        <span className="fw-bold" style={{ color: "var(--accent-color, #FA7EAA)" }}>
                          ${item.price.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success">
                          In Stock
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-dark btn-sm rounded-pill px-3 me-2"
                          onClick={() => handleMoveToCart(item)}
                        >
                          <i className="fa-solid fa-cart-plus me-1"></i> Add to Cart
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm rounded-circle p-2"
                          style={{ width: "35px", height: "35px" }}
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
