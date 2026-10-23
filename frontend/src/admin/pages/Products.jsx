import React, { useState, useEffect } from "react";
import { productsApi } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const initialForm = {
    name: "",
    sku: "",
    slug: "",
    category: "Gadgets",
    description: "",
    mainImage: "/images/product-earbuds.jpg",
    regularPrice: "",
    resellerPrice: "",
    stockQuantity: 100,
    minOrderQuantity: 1,
    isActive: true,
  };
  const [formData, setFormData] = useState(initialForm);

  const { addToast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, search };
      if (selectedCategory !== "all") params.category = selectedCategory;

      const res = await productsApi.getAll(params);
      const data = res.data?.products ? res.data : res.data?.data || res.data;
      setProducts(data.products || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch catalog products.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      slug: prod.slug,
      category: prod.category?.name || prod.category || "Gadgets",
      description: prod.description || "",
      mainImage: prod.mainImage || "/images/product-earbuds.jpg",
      regularPrice: (prod.regularPricePaise / 100).toFixed(2),
      resellerPrice: (prod.resellerPricePaise / 100).toFixed(2),
      stockQuantity: prod.stockQuantity,
      minOrderQuantity: prod.minOrderQuantity || 1,
      isActive: prod.isActive !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive or delete "${name}"?`)) return;
    try {
      await productsApi.delete(id);
      addToast(`Product "${name}" deleted.`, "info");
      fetchProducts();
    } catch (err) {
      addToast(err.message || "Failed to delete product.", "error");
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      sku: formData.sku,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      category: formData.category,
      description: formData.description,
      mainImage: formData.mainImage,
      regularPrice: parseFloat(formData.regularPrice),
      resellerPrice: parseFloat(formData.resellerPrice),
      stockQuantity: parseInt(formData.stockQuantity, 10),
      minOrderQuantity: parseInt(formData.minOrderQuantity, 10),
      isActive: formData.isActive,
    };

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct._id, payload);
        addToast("Product updated successfully!", "success");
      } else {
        await productsApi.create(payload);
        addToast("New product created successfully!", "success");
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      addToast(err.message || "Failed to save product.", "error");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Product Catalog</h4>
          <p className="text-muted small mb-0">Manage wholesale and dropshipping products, inventory tiers, and pricing</p>
        </div>
        <button className="btn-admin-primary" onClick={handleOpenAdd}>
          <i className="fa-solid fa-plus"></i>
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <form onSubmit={handleSearchSubmit} className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-pill"
                placeholder="Search products by title or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-dark rounded-pill px-3">
                Search
              </button>
            </form>
          </div>
          <div className="col-md-7 d-flex justify-content-md-end gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {["all", "Gadgets", "Watches", "Footwear", "Fashion"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm ${selectedCategory === cat ? "btn-dark" : "btn-light border"}`}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted small mt-2">Loading catalog items...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-boxes-stacked fa-3x text-muted mb-3"></i>
            <h6 className="fw-bold">No Products Found</h6>
            <p className="text-muted small">Try adjusting your category filter or create a new product.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Retail Price</th>
                  <th>Reseller Price</th>
                  <th>Stock Qty</th>
                  <th>MOQ</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <img
                          src={p.mainImage || "/images/product-earbuds.jpg"}
                          alt={p.name}
                          style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }}
                        />
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: "200px" }}>
                          {p.name}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="text-dark small">{p.sku}</code>
                    </td>
                    <td>{p.category?.name || p.category || "General"}</td>
                    <td>₹{(p.regularPricePaise / 100).toFixed(2)}</td>
                    <td className="fw-bold text-success">₹{(p.resellerPricePaise / 100).toFixed(2)}</td>
                    <td>
                      <span className={`fw-semibold ${p.stockQuantity < 20 ? "text-danger" : "text-dark"}`}>
                        {p.stockQuantity}
                      </span>
                    </td>
                    <td>{p.minOrderQuantity || 1}</td>
                    <td>
                      <span className={`admin-badge ${p.isActive !== false ? "admin-badge-success" : "admin-badge-neutral"}`}>
                        {p.isActive !== false ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          title="Edit Product"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <i className="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Delete/Archive Product"
                          onClick={() => handleDelete(p._id, p.name)}
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Showing page {page} of {pagination.pages} ({pagination.total} products)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-outline-secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <form onSubmit={handleSubmitForm}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title fw-bold">
                    {editingProduct ? `Edit Product: ${editingProduct.name}` : "Create Catalog Product"}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-sm-8">
                      <label className="form-label small fw-semibold">Product Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">SKU *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Category *</label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="Gadgets">Gadgets</option>
                        <option value="Watches">Watches</option>
                        <option value="Footwear">Footwear</option>
                        <option value="Fashion">Fashion</option>
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Image URL</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.mainImage}
                        onChange={(e) => setFormData({ ...formData, mainImage: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Regular Retail Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        required
                        value={formData.regularPrice}
                        onChange={(e) => setFormData({ ...formData, regularPrice: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Reseller Wholesale Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        required
                        value={formData.resellerPrice}
                        onChange={(e) => setFormData({ ...formData, resellerPrice: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">Stock Quantity *</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">Minimum Order Qty (MOQ)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.minOrderQuantity}
                        onChange={(e) => setFormData({ ...formData, minOrderQuantity: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-4 d-flex align-items-center mt-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="activeSwitch"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <label className="form-check-label fw-semibold small" htmlFor="activeSwitch">
                          Active in Storefront
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Product Description</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-admin-primary rounded-pill px-4">
                    {editingProduct ? "Save Changes" : "Create Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
