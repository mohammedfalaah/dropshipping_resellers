const { errorResponse } = require("../utils/response");

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "";
    return errorResponse(
      res,
      `Duplicate value entered for ${field}: '${value}'. Please use another value.`,
      "DUPLICATE_KEY_ERROR",
      409
    );
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    return errorResponse(
      res,
      `Resource not found with id: ${err.value}`,
      "INVALID_ID",
      404
    );
  }

  // Mongoose ValidationError
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    return errorResponse(
      res,
      "Validation failed",
      "VALIDATION_ERROR",
      422,
      errors
    );
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const code = err.errorCode || "INTERNAL_ERROR";

  return errorResponse(res, message, code, statusCode);
};

module.exports = errorHandler;
