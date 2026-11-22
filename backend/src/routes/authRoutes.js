const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * Rate limiter specifically for auth endpoints.
 * 10 requests per 15 minutes in production — prevents brute-force login attacks.
 * We read the limit from env so it can be raised during local testing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT || '10', 10),
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules for register
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Validation rules for login
const loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// POST /api/auth/register — public, rate-limited
router.post('/register', authLimiter, registerRules, register);

// POST /api/auth/login — public, rate-limited
router.post('/login', authLimiter, loginRules, login);

// GET /api/auth/me — protected (requires valid JWT)
router.get('/me', protect, getMe);

module.exports = router;
