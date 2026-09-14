const express = require("express");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/authController");

const router = express.Router();

router.post("/register", ctrl.registerValidators(), validate, ctrl.register);
router.post("/login", ctrl.loginValidators(), validate, ctrl.login);
router.post("/logout", ctrl.logout);
router.get("/me", requireAuth, ctrl.me);
router.post(
  "/change-password",
  requireAuth,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters")
      .matches(/[A-Za-z]/)
      .withMessage("New password must include a letter")
      .matches(/\d/)
      .withMessage("New password must include a number"),
  ],
  validate,
  ctrl.changePassword
);
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required")],
  validate,
  ctrl.forgotPassword
);
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Za-z]/)
      .withMessage("Password must include a letter")
      .matches(/\d/)
      .withMessage("Password must include a number"),
  ],
  validate,
  ctrl.resetPassword
);

module.exports = router;
