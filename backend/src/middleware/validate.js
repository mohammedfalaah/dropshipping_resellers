const { errorResponse } = require("../utils/response");

/**
 * Higher-order middleware to validate req.body, req.query, or req.params with a Zod schema
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const formattedErrors = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return errorResponse(
          res,
          "Validation failed. Please check your inputs.",
          "VALIDATION_ERROR",
          422,
          formattedErrors
        );
      }
      return errorResponse(res, err.message, "VALIDATION_ERROR", 422);
    }
  };
};

module.exports = validate;
