const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — verifies the JWT in the Authorization header.
 * If valid, it loads the user from DB and attaches them to req.user.
 * select('-passwordHash') ensures the hash is never exposed downstream.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authenticated' });
  }

  try {
    // Verify signature and expiry using the secret from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load fresh user data (catches deleted users)
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User no longer exists' });
    }

    req.user = user; // available in all subsequent middleware and controllers
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * requireRole(...roles) — factory that returns a middleware checking
 * req.user.role. Must be used AFTER protect().
 * Usage: router.delete('/:id', protect, requireRole('admin'), controller)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

module.exports = { protect, requireRole };
