const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const { HttpError } = require("../middleware/errorHandler");
const { hashPassword, verifyPassword } = require("../services/userStore");

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function signToken(app, userId) {
  return jwt.sign({ sub: userId }, app.locals.env.jwtSecret, {
    expiresIn: app.locals.env.jwtExpiresIn,
  });
}

function registerValidators() {
  return [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2–80 characters"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Za-z]/)
      .withMessage("Password must include a letter")
      .matches(/\d/)
      .withMessage("Password must include a number"),
  ];
}

function loginValidators() {
  return [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ];
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const existing = await req.app.locals.users.findByEmail(email, true);
    if (existing) {
      throw new HttpError(409, "An account with this email already exists");
    }
    const passwordHash = await hashPassword(password);
    const user = await req.app.locals.users.create({ name, email, passwordHash });
    const token = signToken(req.app, user.id);
    res.cookie("token", token, cookieOptions());
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await req.app.locals.users.findByEmail(email, true);
    if (!user || !user.passwordHash) {
      throw new HttpError(401, "Invalid email or password");
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new HttpError(401, "Invalid email or password");
    }
    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    const token = signToken(req.app, user.id);
    res.cookie("token", token, cookieOptions());
    res.json({ user: publicUser, token });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
}

async function me(req, res, next) {
  try {
    const user = await req.app.locals.users.findById(req.userId);
    if (!user) {
      throw new HttpError(401, "Session is no longer valid");
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await req.app.locals.users.findById(req.userId, true);
    if (!user || !user.passwordHash) {
      throw new HttpError(401, "Session is no longer valid");
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      throw new HttpError(400, "Current password is incorrect");
    }
    const passwordHash = await hashPassword(newPassword);
    await req.app.locals.users.updatePassword(user.id, passwordHash);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const env = req.app.locals.env;
    const user = await req.app.locals.users.findByEmail(email, true);
    // Always succeed to avoid email enumeration
    if (user) {
      const raw = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
      const expires = new Date(Date.now() + env.resetTokenHours * 60 * 60 * 1000);
      await req.app.locals.users.setResetToken(email, tokenHash, expires);
      const resetUrl = `${env.clientUrl}/reset-password?token=${raw}`;
      if (!env.smtpHost) {
        console.warn(
          "[password-reset] SMTP is not configured. Reset link (dev only):",
          resetUrl
        );
      }
    }
    res.json({
      ok: true,
      emailProviderPending: !req.app.locals.env.smtpHost,
      message:
        "If an account exists for that email, a reset link has been prepared. Email delivery is pending SMTP configuration.",
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await req.app.locals.users.findByResetToken(tokenHash);
    if (!user) {
      throw new HttpError(400, "Reset link is invalid or has expired");
    }
    const passwordHash = await hashPassword(password);
    const id = user.id || user._id.toString();
    await req.app.locals.users.updatePassword(id, passwordHash);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  registerValidators,
  loginValidators,
};
