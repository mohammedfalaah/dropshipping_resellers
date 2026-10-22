/**
 * Unified API Response standardizer
 */
const successResponse = (res, message = "Operation completed successfully", data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = "An error occurred", code = "ERROR", statusCode = 400, errors = null) => {
  const payload = {
    success: false,
    message,
    code,
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse,
};
