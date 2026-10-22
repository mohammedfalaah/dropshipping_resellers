const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  registerResellerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require("../validators/authValidator");

router.post("/register", validate(registerResellerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", protect, authController.getMe);
router.get("/profile", protect, authController.getMe);
router.patch("/profile", protect, validate(updateProfileSchema), authController.updateProfile);
router.put("/profile", protect, validate(updateProfileSchema), authController.updateProfile);
router.patch("/change-password", protect, validate(changePasswordSchema), authController.changePassword);
router.put("/change-password", protect, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
