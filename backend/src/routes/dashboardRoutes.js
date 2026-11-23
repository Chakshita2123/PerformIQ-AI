const express = require('express');
const {
  getDashboardSummary,
  getDashboardAttention,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/dashboard/summary
router.get('/summary', getDashboardSummary);

// GET /api/dashboard/attention
router.get('/attention', getDashboardAttention);

module.exports = router;
