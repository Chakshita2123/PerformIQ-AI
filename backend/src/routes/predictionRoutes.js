const express = require('express');
const { body } = require('express-validator');
const {
  createPrediction,
  getStudentPredictions,
  getAllPredictions,
} = require('../controllers/predictionController');
const { protect } = require('../middleware/auth');

// ── Student-scoped router ────────────────────────────────────────────────────
// Mounted at: /api/students/:studentId
// mergeParams: true so req.params.studentId is available here
const studentRouter = express.Router({ mergeParams: true });
studentRouter.use(protect);

studentRouter.post(
  '/predict',
  [
    body('predictedScore')
      .isFloat({ min: 0, max: 100 })
      .withMessage('predictedScore must be a number between 0 and 100'),
  ],
  createPrediction
);

studentRouter.get('/predictions', getStudentPredictions);

// ── Global predictions router ────────────────────────────────────────────────
// Mounted at: /api/predictions
// Supports optional ?risk=High|Medium|Low query param
const globalRouter = express.Router();
globalRouter.use(protect);
globalRouter.get('/', getAllPredictions);

module.exports = { studentRouter, globalRouter };
