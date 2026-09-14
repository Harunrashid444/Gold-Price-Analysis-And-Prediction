const jwt = require("jsonwebtoken");
const { HttpError } = require("./errorHandler");

function getToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return next(new HttpError(401, "Authentication required"));
  }

  try {
    const payload = jwt.verify(token, req.app.locals.env.jwtSecret);
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired session"));
  }
}

module.exports = { requireAuth, getToken };
