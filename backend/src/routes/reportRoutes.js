const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { protect, restrictTo } = require("../middleware/auth");

// All report routes require admin role
router.use(protect, restrictTo("admin"));

router.get("/overview", reportController.getOverview);
router.get("/sales", reportController.getSales);
router.get("/balance-sheet", reportController.getBalanceSheet);
router.get("/export", reportController.exportReport);

module.exports = router;
