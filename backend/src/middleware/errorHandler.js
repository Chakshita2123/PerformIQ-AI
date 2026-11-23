/**
 * Centralised error-handling middleware.
 * Express recognises a 4-argument function as an error handler.
 * Any controller can call next(err) or next(new Error('...')) and
 * this function catches it and sends a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
  // Mongoose duplicate-key error (e.g. duplicate email or studentId)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose validation error (schema-level, e.g. enum mismatch)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
    });
  }

  // Mongoose cast error (e.g. invalid ObjectId in URL)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // JWT errors (handled in auth middleware, but kept here as fallback)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Default: use the status code attached to the error or 500.
  // In production, never leak raw error messages for unexpected 500s.
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'An unexpected error occurred'
        : err.message || 'Server error',
  });
};

module.exports = errorHandler;
