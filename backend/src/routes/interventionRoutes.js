const express = require('express');
const { body } = require('express-validator');
const {
  getInterventions,
  createIntervention,
  getStudentInterventions,
  updateIntervention,
  getImpact,
} = require('../controllers/interventionController');
const { protect } = require('../middleware/auth');

// ── Main interventions router (/api/interventions) ───────────────────────────
const router = express.Router();
router.use(protect);

const createRules = [
  body('student').notEmpty().withMessage('student ID is required'),
  body('type')
    .isIn(['Mentoring', 'Extra Practice', 'Attendance Monitoring', 'Counselling', 'Peer Support', 'Other'])
    .withMessage('Invalid intervention type'),
  body('startDate').isISO8601().withMessage('startDate must be a valid ISO date'),
];

const updateRules = [
  body('status')
    .optional()
    .isIn(['planned', 'ongoing', 'completed'])
    .withMessage('status must be planned, ongoing or completed'),
];

// GET /api/interventions
router.get('/', getInterventions);

// POST /api/interventions
router.post('/', createRules, createIntervention);

// PATCH /api/interventions/:id
router.patch('/:id', updateRules, updateIntervention);

// GET /api/interventions/:id/impact
router.get('/:id/impact', getImpact);

// ── Student-scoped sub-router (/api/students/:studentId/interventions) ────────
// mergeParams: true gives access to req.params.studentId
const studentRouter = express.Router({ mergeParams: true });
studentRouter.use(protect);
studentRouter.get('/', getStudentInterventions);

module.exports = { router, studentRouter };
