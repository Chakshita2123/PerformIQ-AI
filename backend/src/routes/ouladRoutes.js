const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAtRisk,
  getCutoffResults,
  getEngagement,
} = require('../controllers/ouladController');

// All OULAD routes require authentication (both teachers and admins permitted)
router.use(protect);

router.get('/at-risk', getAtRisk);
router.get('/cutoff-results', getCutoffResults);
router.get('/engagement', getEngagement);

module.exports = router;
