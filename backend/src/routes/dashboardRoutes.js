const express = require('express');
const {
  getDashboardSummary,
  getDashboardAttention,
  getDashboardFollowups,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/dashboard/summary
router.get('/summary', getDashboardSummary);

// GET /api/dashboard/attention
router.get('/attention', getDashboardAttention);

// GET /api/dashboard/followups
router.get('/followups', getDashboardFollowups);

module.exports = router;
