const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

/** Helper: sign a JWT for a user document */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * POST /api/auth/register
 * Public. Role is ALWAYS 'teacher' — it cannot be set via the API.
 * The admin account is created by the seed script only.
 */
const register = async (req, res, next) => {
  try {
    // express-validator errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Email already registered' });
    }

    // Hash password with bcrypt (salt rounds = 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // role is intentionally NOT taken from req.body — always 'teacher'
    const user = await User.create({ name, email, passwordHash, role: 'teacher' });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Returns the SAME error message whether the email or password is wrong
 * — this prevents email enumeration attacks.
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const INVALID_MSG = 'Invalid email or password'; // same message for both cases

    // We need passwordHash — use +passwordHash to override select:false
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: INVALID_MSG });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: INVALID_MSG });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Protected. Returns the currently logged-in user (no password hash).
 */
const getMe = async (req, res) => {
  // req.user is set by the protect middleware; passwordHash is excluded
  res.json({
    success: true,
    data: { user: req.user },
  });
};

module.exports = { register, login, getMe };
