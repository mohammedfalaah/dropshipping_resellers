import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("sparepro_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unwraps axios response.data directly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "An unexpected error occurred.";
    const code = error.response?.data?.code || "NETWORK_ERROR";
    return Promise.reject({ message, code, status: error.response?.status, response: error.response });
  }
);

// Auth APIs
export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (credentials) => api.post("/auth/login", credentials),
  getMe: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// Products APIs
export const productsApi = {
  getAll: (params) => api.get("/products", { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  getCategories: () => api.get("/products/categories/list"),
  create: (data) => api.post("/products", data),
  update: (id, data) =>
    api.patch(`/products/${id}`, data).catch((err) => {
      if (err?.status === 404 || err?.status === 405) {
        return api.put(`/products/${id}`, data);
      }
      return Promise.reject(err);
    }),
  delete: (id) => api.delete(`/products/${id}`),
  uploadImage: (formData) =>
    api.post("/products/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  bulkImport: (products) => api.post("/products/import", { products }),
};


// Orders APIs
export const ordersApi = {
  create: (data) => api.post("/orders", data),
  getAll: (params) => api.get("/orders", { params }),
  getMyOrders: (params) => api.get("/orders", { params }),
  getById: (id) => api.get(`/orders/${id}`),
};

// Payments & Ledger APIs
export const paymentsApi = {
  getResellerSummary: () => api.get("/payments/reseller-summary"),
  getResellerLedger: (params) => api.get("/payments/reseller-ledger", { params }),
  createRazorpayOrder: (data) => api.post("/payments/create-razorpay-order", data),
  verifyRazorpay: (data) => api.post("/payments/verify-razorpay", data),
  recordManual: (data) => api.post("/payments/record-manual", data),
  recordAdjustment: (data) => api.post("/payments/adjustment", data),
};

// COD APIs
export const codApi = {
  getPending: (params) => api.get("/cod/pending", { params }),
  markCollected: (id, data) => api.patch(`/cod/${id}/collect`, data),
  updateDeliveryStatus: (id, data) => api.patch(`/cod/${id}/delivery-status`, data),
};

// Cart APIs
export const cartApi = {
  get: () => api.get("/cart"),
  add: (productId, quantity = 1) => api.post("/cart/add", { productId, quantity }),
  update: (productId, quantity) => api.patch("/cart/update", { productId, quantity }),
  remove: (productId) => api.delete(`/cart/item/${productId}`),
  clear: () => api.delete("/cart/clear"),
};

// Wishlist APIs
export const wishlistApi = {
  get: () => api.get("/wishlist"),
  toggle: (productId) => api.post("/wishlist/toggle", { productId }),
};

// Admin APIs
export const adminApi = {
  getDashboardStats: () => api.get("/admin/dashboard/stats"),
  getResellers: (params) => api.get("/admin/resellers", { params }),
  getResellerById: (id) => api.get(`/admin/resellers/${id}`),
  approveReseller: (id) => api.patch(`/admin/resellers/${id}/approve`),
  rejectReseller: (id, reason) => api.patch(`/admin/resellers/${id}/reject`, { reason }),
  toggleResellerStatus: (id, status) => api.patch(`/admin/resellers/${id}/status`, { accountStatus: status }),
  getOrders: (params) => api.get("/admin/orders", { params }),
  updateOrderStatus: (id, orderStatus) => api.patch(`/admin/orders/${id}/status`, { orderStatus }),
  getBalanceSheet: (params) => api.get("/admin/reports/balance-sheet", { params }),
  getSalesReport: (params) => api.get("/admin/reports/sales", { params }),
  getCollectionsReport: (params) => api.get("/admin/reports/collections", { params }),
};

export default api;
