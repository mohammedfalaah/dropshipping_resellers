const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const orderController = require("../controllers/orderController");
const productController = require("../controllers/productController");
const categoryController = require("../controllers/categoryController");
const codController = require("../controllers/codController");
const paymentController = require("../controllers/paymentController");
const reportController = require("../controllers/reportController");
const { protect, restrictTo } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  resellerApprovalSchema,
  createResellerAdminSchema,
  updateResellerAdminSchema,
} = require("../validators/resellerAdminValidator");
const {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} = require("../validators/productValidator");
const { updateOrderStatusSchema } = require("../validators/orderValidator");

// All routes in this router require admin role
router.use(protect, restrictTo("admin"));

// Dashboard Statistics (support both /dashboard and /dashboard/stats)
router.get("/dashboard", adminController.getDashboardStats);
router.get("/dashboard/stats", adminController.getDashboardStats);

// Resellers Management
router.get("/resellers", adminController.getAllResellers);
router.get("/resellers/:id", adminController.getResellerById);
router.post("/resellers", validate(createResellerAdminSchema), adminController.createReseller);
router.patch("/resellers/:id", validate(updateResellerAdminSchema), adminController.updateReseller);
router.patch("/resellers/:id/approve", adminController.approveReseller);
router.patch("/resellers/:id/reject", adminController.rejectReseller);
router.patch("/resellers/:id/toggle-status", adminController.toggleAccountStatus);
router.patch("/resellers/:id/status", adminController.toggleAccountStatus);
router.get("/resellers/:id/ledger", adminController.getResellerLedger);

// Products & Categories (admin views)
router.get("/products", productController.getProducts);
router.post("/products", validate(createProductSchema), productController.createProduct);
router.patch("/products/:id", validate(updateProductSchema), productController.updateProduct);
router.put("/products/:id", validate(updateProductSchema), productController.updateProduct);
router.patch("/products/:id/stock", validate(updateStockSchema), productController.updateStock);
router.delete("/products/:id", productController.deleteProduct);
router.get("/categories", categoryController.getCategories);
router.post("/categories", categoryController.createCategory);
router.put("/categories/:id", categoryController.updateCategory);
router.patch("/categories/:id", categoryController.updateCategory);
router.delete("/categories/:id", categoryController.deleteCategory);

// Orders Management
router.get("/orders", orderController.getAllOrders);
router.patch("/orders/:id/status", validate(updateOrderStatusSchema), orderController.updateOrderStatus);

// COD Pending Management
router.get("/cod", codController.getCodList);
router.get("/cod/pending", codController.getCodList);
router.patch("/cod/:id/collect", codController.recordCollection);
router.patch("/cod/:id/delivery-status", codController.updateDeliveryStatus);

// Payments & Balances
router.get("/payments", paymentController.getAllPayments);
router.post("/payments", paymentController.recordPayment);
router.post("/payments/record-manual", paymentController.recordPayment);
router.post("/payments/:id/reverse", paymentController.reversePayment);
router.post("/payments/adjustment", paymentController.recordAdjustment);
router.get("/balances", adminController.getAllResellers);

// Reports
router.get("/reports/overview", reportController.getOverview);
router.get("/reports/sales", reportController.getSales);
router.get("/reports/balance-sheet", reportController.getBalanceSheet);
router.get("/reports/export", reportController.exportReport);
router.get("/reports/sales/csv", reportController.exportReport);

module.exports = router;
