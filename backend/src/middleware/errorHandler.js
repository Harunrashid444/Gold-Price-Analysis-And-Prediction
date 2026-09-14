class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function notFound(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isValidation = Array.isArray(err.errors);

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: isValidation ? "Validation failed" : err.message || "Server error",
    details: isValidation ? err.errors : undefined,
  });
}

module.exports = { HttpError, notFound, errorHandler };
