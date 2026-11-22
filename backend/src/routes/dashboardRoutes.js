const express = require('express');
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/dashboard/summary
router.get('/summary', getDashboardSummary);

module.exports = router;
