const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

const { FRONTEND_URL, NODE_ENV } = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const { successResponse, errorResponse } = require("./utils/response");

// Route imports
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const codRoutes = require("./routes/codRoutes");
const reportRoutes = require("./routes/reportRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

const app = express();

const connectDB = require("./config/db");

// Security HTTP headers
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS configuration supporting local dev, FRONTEND_URL and Vercel deployments
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or tests)
      if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith(".vercel.app"))) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not permitted`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Auto-connect to database (essential for Vercel / serverless execution)
app.use(async (req, res, next) => {
  if (NODE_ENV === "test") return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[Serverless DB Error]:", err.message);
    return res.status(503).json({
      success: false,
      message: "Database connection failed. Check MONGODB_URI in Vercel environment variables.",
      code: "DB_CONNECTION_ERROR",
    });
  }
});


// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
app.use("/api", limiter);

// Strict Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many login/registration attempts. Please wait 15 minutes.",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// HTTP Logger
if (NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health Check API
app.get("/api/health", (req, res) => {
  return successResponse(res, "SPARE PRO Backend API is healthy and operational.", {
    service: "sparepro-api",
    version: "1.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/reports", reportRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/cod", codRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/categories", categoryRoutes);

// 404 Handler
app.use("*", (req, res) => {
  return errorResponse(res, `Route '${req.originalUrl}' not found on this server.`, "NOT_FOUND", 404);
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
