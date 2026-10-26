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

  // Image Upload & Compression state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importing, setImporting] = useState(false);

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
    setUploadStats(null);
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
    setUploadStats(null);
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

  // Image Upload and Backend Compression Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append("image", file);

    setUploadingImage(true);
    try {
      const res = await productsApi.uploadImage(data);
      if (res.success && res.data) {
        setFormData((prev) => ({ ...prev, mainImage: res.data.url }));
        setUploadStats(res.data);
        addToast(
          `Image imported & compressed: ${res.data.originalSizeFormatted} → ${res.data.compressedSizeFormatted} (${res.data.savingsPercent} smaller)`,
          "success"
        );
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      addToast(err.message || "Failed to compress and upload image.", "error");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.mainImage) {
      addToast("Please upload or provide a main image for this product.", "warning");
      return;
    }

    const payload = {
      name: formData.name,
      sku: formData.sku,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      category: formData.category,
      description: formData.description || formData.name,
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

  // Handle Bulk Product Import
  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!importJsonText.trim()) {
      addToast("Please paste JSON or CSV product data.", "warning");
      return;
    }

    let parsedList = [];
    try {
      parsedList = JSON.parse(importJsonText);
      if (!Array.isArray(parsedList)) {
        throw new Error("JSON must be an array of product objects.");
      }
    } catch (parseErr) {
      addToast("Invalid JSON format. Please verify the JSON array structure: " + parseErr.message, "error");
      return;
    }

    setImporting(true);
    try {
      const res = await productsApi.bulkImport(parsedList);
      if (res.success) {
        addToast(res.message || `Imported ${res.data?.importedCount} products!`, "success");
        setShowImportModal(false);
        setImportJsonText("");
        fetchProducts();
      }
    } catch (err) {
      addToast(err.message || "Bulk import failed.", "error");
    } finally {
      setImporting(false);
    }
  };

  const sampleImportJson = JSON.stringify(
    [
      {
        name: "Aura Pro Wireless Earbuds",
        sku: "GAD-AURA-01",
        category: "Gadgets",
        description: "Active Noise Cancellation with 32hr battery life.",
        mainImage: "/images/product-earbuds.jpg",
        regularPrice: 2499,
        resellerPrice: 1299,
        stockQuantity: 150,
        minOrderQuantity: 2,
      },
      {
        name: "Chronos Elite Sapphire Watch",
        sku: "WAT-CHRONO-02",
        category: "Watches",
        description: "Automatic movement with sapphire crystal glass and genuine leather strap.",
        mainImage: "/images/product-luxury-watch.jpg",
        regularPrice: 4999,
        resellerPrice: 2899,
        stockQuantity: 80,
        minOrderQuantity: 1,
      },
    ],
    null,
    2
  );

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Product Catalog</h4>
          <p className="text-muted small mb-0">Manage wholesale and dropshipping products, inventory tiers, and pricing</p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-dark btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
            onClick={() => {
              setImportJsonText(sampleImportJson);
              setShowImportModal(true);
            }}
          >
            <i className="fa-solid fa-file-import"></i>
            <span>Import Products</span>
          </button>
          <button className="btn-admin-primary" onClick={handleOpenAdd}>
            <i className="fa-solid fa-plus"></i>
            <span>Add New Product</span>
          </button>
        </div>
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
      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table table align-middle">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Retail Price</th>
                <th>Reseller Price</th>
                <th>Profit Margin</th>
                <th>Stock</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                    Loading catalog inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const retail = prod.regularPricePaise / 100;
                  const reseller = prod.resellerPricePaise / 100;
                  const margin = retail > 0 ? (((retail - reseller) / retail) * 100).toFixed(1) : 0;
                  const isLowStock = prod.stockQuantity <= 15;

                  return (
                    <tr key={prod._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={prod.mainImage || "/images/product-earbuds.jpg"}
                            alt={prod.name}
                            className="rounded-3 border"
                            style={{ width: "44px", height: "44px", objectFit: "cover" }}
                          />
                          <div>
                            <div className="fw-bold text-dark">{prod.name}</div>
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              MOQ: {prod.minOrderQuantity || 1} units
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace">{prod.sku}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-muted border">{prod.category?.name || prod.category}</span>
                      </td>
                      <td className="fw-semibold text-muted">₹{retail.toLocaleString("en-IN")}</td>
                      <td className="fw-bold text-dark">₹{reseller.toLocaleString("en-IN")}</td>
                      <td>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          {margin}% Margin
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`fw-bold ${isLowStock ? "text-danger" : "text-dark"}`}>
                            {prod.stockQuantity}
                          </span>
                          {isLowStock && (
                            <span className="badge bg-danger text-white" style={{ fontSize: "10px" }}>
                              Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {prod.isActive !== false ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary border">Archived</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-light border"
                            title="Edit Product"
                            onClick={() => handleOpenEdit(prod)}
                          >
                            <i className="fa-solid fa-pen text-primary"></i>
                          </button>
                          <button
                            className="btn btn-light border text-danger"
                            title="Delete / Archive Product"
                            onClick={() => handleDelete(prod._id, prod.name)}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Showing page {page} of {pagination.pages} ({pagination.total} products)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-light border"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="btn btn-light border"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <form onSubmit={handleSubmitForm}>
                <div className="modal-header border-bottom px-4 py-3">
                  <h5 className="modal-title fw-bold text-dark">
                    {editingProduct ? "Edit Product" : "Add New Wholesale Product"}
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
                        placeholder="e.g. Wireless Noise-Cancelling Earbuds"
                      />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold">SKU *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        placeholder="e.g. GAD-AURA-01"
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
                      <label className="form-label small fw-semibold">Regular Retail Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        required
                        value={formData.regularPrice}
                        onChange={(e) => setFormData({ ...formData, regularPrice: e.target.value })}
                        placeholder="e.g. 2499"
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
                        placeholder="e.g. 1499"
                      />
                    </div>
                    <div className="col-sm-3">
                      <label className="form-label small fw-semibold">Stock Quantity *</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-3">
                      <label className="form-label small fw-semibold">Min Order Qty (MOQ)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.minOrderQuantity}
                        onChange={(e) => setFormData({ ...formData, minOrderQuantity: e.target.value })}
                      />
                    </div>

                    {/* Image Import & Backend Compression */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold d-flex justify-content-between align-items-center">
                        <span>Product Image *</span>
                        <span className="text-success small fw-semibold">
                          <i className="fa-solid fa-compress me-1"></i> Auto-Reduced in Backend (Sharp WebP)
                        </span>
                      </label>

                      {/* File Upload Box */}
                      <div
                        className="border border-2 border-dashed rounded-3 p-3 text-center mb-2"
                        style={{ backgroundColor: "#F9FAFB", borderColor: "#D1D5DB" }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          id="productImageUpload"
                          className="d-none"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        <label
                          htmlFor="productImageUpload"
                          className="d-block m-0"
                          style={{ cursor: uploadingImage ? "not-allowed" : "pointer" }}
                        >
                          {uploadingImage ? (
                            <div className="py-2 text-primary">
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              <span className="small fw-semibold">Importing & reducing image size in backend...</span>
                            </div>
                          ) : (
                            <div className="d-flex flex-column align-items-center gap-1 py-1">
                              <i className="fa-solid fa-cloud-arrow-up text-primary fs-3 mb-1"></i>
                              <span className="small fw-bold text-dark">
                                Click to Import Image File (Auto-Compressed)
                              </span>
                              <span className="text-muted" style={{ fontSize: "11px" }}>
                                Supports JPG, PNG, WebP, HEIC up to 15MB — automatically resized & reduced to ~80KB
                              </span>
                            </div>
                          )}
                        </label>
                      </div>

                      {/* Image Preview & Compression Stats */}
                      {formData.mainImage && (
                        <div className="d-flex align-items-center gap-3 p-2 bg-light border rounded-3 mb-2">
                          <img
                            src={formData.mainImage}
                            alt="Preview"
                            className="rounded border"
                            style={{ width: "50px", height: "50px", objectFit: "cover" }}
                          />
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="small fw-semibold text-truncate">
                              {formData.mainImage.startsWith("data:")
                                ? "Optimized WebP Base64"
                                : formData.mainImage}
                            </div>
                            {uploadStats ? (
                              <div
                                className="badge bg-success-subtle text-success border border-success-subtle mt-1"
                                style={{ fontSize: "11px" }}
                              >
                                <i className="fa-solid fa-bolt me-1"></i>
                                {uploadStats.originalSizeFormatted} → {uploadStats.compressedSizeFormatted} (
                                {uploadStats.savingsPercent} smaller)
                              </div>
                            ) : (
                              <span className="text-muted" style={{ fontSize: "11px" }}>
                                Current product image
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger border-0"
                            onClick={() => {
                              setFormData({ ...formData, mainImage: "" });
                              setUploadStats(null);
                            }}
                            title="Remove image"
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </div>
                      )}

                      {/* Manual Image URL Option */}
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-white text-muted" style={{ fontSize: "11px" }}>
                          Or URL
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Paste external image URL (e.g. /images/product.jpg or https://...)"
                          value={formData.mainImage}
                          onChange={(e) => setFormData({ ...formData, mainImage: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="activeSwitch"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <label className="form-check-label fw-semibold small" htmlFor="activeSwitch">
                          Active in Storefront Catalog
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
                  <button type="submit" className="btn-admin-primary rounded-pill px-4" disabled={uploadingImage}>
                    {editingProduct ? "Save Changes" : "Create Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Products Modal */}
      {showImportModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <form onSubmit={handleBulkImportSubmit}>
                <div className="modal-header border-bottom px-4 py-3">
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="fa-solid fa-file-import text-primary"></i>
                    <span>Bulk Import Products</span>
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowImportModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 px-3 small border-0 rounded-3 mb-3">
                    <i className="fa-solid fa-circle-info me-2"></i>
                    Paste a JSON array of products below. Each item requires <code>name</code> and <code>sku</code>. Prices are in Indian Rupees (₹).
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Product Data (JSON Array)</label>
                    <textarea
                      className="form-control font-monospace"
                      rows="10"
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder="Paste JSON array of products here..."
                      style={{ fontSize: "12px" }}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light rounded-pill px-4"
                    onClick={() => setShowImportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-admin-primary rounded-pill px-4 d-flex align-items-center gap-2"
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Importing Catalog...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Start Import</span>
                      </>
                    )}
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
