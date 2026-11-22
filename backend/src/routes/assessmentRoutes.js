const express = require('express');
const { body } = require('express-validator');
const { createAssessment, getAssessments } = require('../controllers/assessmentController');
const { protect } = require('../middleware/auth');

// mergeParams: true is REQUIRED when this router is mounted under a path
// that contains params (e.g. /api/students/:studentId/assessments).
// Without it, req.params.studentId would be undefined inside this router.
const router = express.Router({ mergeParams: true });

router.use(protect);

const assessmentRules = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('type')
    .isIn(['Quiz', 'Assignment', 'Midterm', 'Final', 'Practice Test'])
    .withMessage('type must be Quiz, Assignment, Midterm, Final or Practice Test'),
  body('score').isFloat({ min: 0 }).withMessage('score must be a non-negative number'),
  body('maxScore').isFloat({ min: 1 }).withMessage('maxScore must be at least 1'),
  body('date').isISO8601().withMessage('date must be a valid ISO date (e.g. 2025-01-15)'),
];

// POST /api/students/:studentId/assessments
router.post('/', assessmentRules, createAssessment);

// GET /api/students/:studentId/assessments
router.get('/', getAssessments);

module.exports = router;
