const express = require('express');
const { body, query } = require('express-validator');
const {
  getStudents,
  createStudent,
  getStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// All student routes require a valid JWT
router.use(protect);

// --- Shared validator sets ---

// Validation rules for POST (create) — studentId and name are required
const createRules = [
  body('studentId').trim().notEmpty().withMessage('studentId is required'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('age').optional().isInt({ min: 10, max: 25 }).withMessage('age must be 10–25'),
  body('gender')
    .optional()
    .isIn(['Female', 'Male', 'Other'])
    .withMessage('gender must be Female, Male or Other'),
  body('education_level')
    .optional()
    .isIn(['High School', 'Undergraduate'])
    .withMessage('Invalid education_level'),
  body('school_type')
    .optional()
    .isIn(['Public', 'Private', 'Charter'])
    .withMessage('Invalid school_type'),
  body('family_income')
    .optional()
    .isIn(['Low', 'Lower-Middle', 'Middle', 'Upper-Middle', 'High'])
    .withMessage('Invalid family_income'),
  body('parent_education')
    .optional()
    .isIn(['High School', 'Associate', 'Bachelor', 'Master', 'Doctorate'])
    .withMessage('Invalid parent_education'),
  body('urban_rural')
    .optional()
    .isIn(['Rural', 'Suburban', 'Urban'])
    .withMessage('Invalid urban_rural'),
  body('previous_exam_score')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('previous_exam_score must be 0–100'),
  body('previous_gpa')
    .optional()
    .isFloat({ min: 0, max: 4.0 })
    .withMessage('previous_gpa must be 0–4.0'),
  body('attendance_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('attendance_percentage must be 0–100'),
  body('assignment_completion_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('assignment_completion_rate must be 0–100'),
  body('class_participation')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid class_participation'),
  body('study_hours_per_day')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('study_hours_per_day must be 0–24'),
  body('study_consistency')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid study_consistency'),
  body('study_environment')
    .optional()
    .isIn(['Quiet', 'Moderate', 'Noisy'])
    .withMessage('Invalid study_environment'),
  body('study_method')
    .optional()
    .isIn(['Flashcards', 'Summarizing', 'Self-Reading', 'Practice Tests', 'Group Study'])
    .withMessage('Invalid study_method'),
  body('revision_frequency')
    .optional()
    .isIn(['Rarely', 'Weekly', 'Daily'])
    .withMessage('Invalid revision_frequency'),
  body('practice_tests_completed')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('practice_tests_completed must be 0–50'),
  body('sleep_hours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('sleep_hours must be 0–24'),
  body('sleep_quality')
    .optional()
    .isIn(['Poor', 'Fair', 'Good', 'Excellent'])
    .withMessage('Invalid sleep_quality'),
  body('stress_level')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('stress_level must be 0–10'),
  body('motivation_level')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid motivation_level'),
  body('exam_difficulty')
    .optional()
    .isIn(['Easy', 'Medium', 'Hard'])
    .withMessage('Invalid exam_difficulty'),
  body('exam_anxiety_level')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('exam_anxiety_level must be 0–10'),
  body('time_management_score')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('time_management_score must be 0–100'),
  body('private_tuition')
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage('private_tuition must be 0 or 1'),
  body('internet_access')
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage('internet_access must be 0 or 1'),
  body('device_availability')
    .optional()
    .isIn(['None', 'Shared', 'Dedicated'])
    .withMessage('Invalid device_availability'),
  body('educational_app_usage')
    .optional()
    .isIn(['Low', 'Moderate', 'High'])
    .withMessage('Invalid educational_app_usage'),
  body('notes_quality')
    .optional()
    .isIn(['Poor', 'Average', 'Excellent'])
    .withMessage('Invalid notes_quality'),
  body('break_frequency')
    .optional()
    .isIn(['Rarely', 'Occasionally', 'Frequently'])
    .withMessage('Invalid break_frequency'),
  body('exam_preparation_days')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('exam_preparation_days must be 0–365'),
];

// Validation rules for PUT (update) — all fields optional, same enum constraints.
// studentId and name are not required on update (partial updates allowed).
// We define this explicitly: express-validator chains can't be mutated after creation.
const updateRules = [
  body('studentId').optional().trim().notEmpty().withMessage('studentId cannot be empty'),
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('age').optional().isInt({ min: 10, max: 25 }).withMessage('age must be 10–25'),
  body('gender').optional().isIn(['Female', 'Male', 'Other']).withMessage('gender must be Female, Male or Other'),
  body('education_level').optional().isIn(['High School', 'Undergraduate']).withMessage('Invalid education_level'),
  body('school_type').optional().isIn(['Public', 'Private', 'Charter']).withMessage('Invalid school_type'),
  body('family_income').optional().isIn(['Low', 'Lower-Middle', 'Middle', 'Upper-Middle', 'High']).withMessage('Invalid family_income'),
  body('parent_education').optional().isIn(['High School', 'Associate', 'Bachelor', 'Master', 'Doctorate']).withMessage('Invalid parent_education'),
  body('urban_rural').optional().isIn(['Rural', 'Suburban', 'Urban']).withMessage('Invalid urban_rural'),
  body('previous_exam_score').optional().isFloat({ min: 0, max: 100 }).withMessage('previous_exam_score must be 0–100'),
  body('previous_gpa').optional().isFloat({ min: 0, max: 4.0 }).withMessage('previous_gpa must be 0–4.0'),
  body('attendance_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('attendance_percentage must be 0–100'),
  body('assignment_completion_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('assignment_completion_rate must be 0–100'),
  body('class_participation').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid class_participation'),
  body('study_hours_per_day').optional().isFloat({ min: 0, max: 24 }).withMessage('study_hours_per_day must be 0–24'),
  body('study_consistency').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid study_consistency'),
  body('study_environment').optional().isIn(['Quiet', 'Moderate', 'Noisy']).withMessage('Invalid study_environment'),
  body('study_method').optional().isIn(['Flashcards', 'Summarizing', 'Self-Reading', 'Practice Tests', 'Group Study']).withMessage('Invalid study_method'),
  body('revision_frequency').optional().isIn(['Rarely', 'Weekly', 'Daily']).withMessage('Invalid revision_frequency'),
  body('practice_tests_completed').optional().isInt({ min: 0, max: 50 }).withMessage('practice_tests_completed must be 0–50'),
  body('sleep_hours').optional().isFloat({ min: 0, max: 24 }).withMessage('sleep_hours must be 0–24'),
  body('sleep_quality').optional().isIn(['Poor', 'Fair', 'Good', 'Excellent']).withMessage('Invalid sleep_quality'),
  body('stress_level').optional().isInt({ min: 0, max: 10 }).withMessage('stress_level must be 0–10'),
  body('motivation_level').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid motivation_level'),
  body('exam_difficulty').optional().isIn(['Easy', 'Medium', 'Hard']).withMessage('Invalid exam_difficulty'),
  body('exam_anxiety_level').optional().isFloat({ min: 0, max: 10 }).withMessage('exam_anxiety_level must be 0–10'),
  body('time_management_score').optional().isFloat({ min: 0, max: 100 }).withMessage('time_management_score must be 0–100'),
  body('private_tuition').optional().isInt({ min: 0, max: 1 }).withMessage('private_tuition must be 0 or 1'),
  body('internet_access').optional().isInt({ min: 0, max: 1 }).withMessage('internet_access must be 0 or 1'),
  body('device_availability').optional().isIn(['None', 'Shared', 'Dedicated']).withMessage('Invalid device_availability'),
  body('educational_app_usage').optional().isIn(['Low', 'Moderate', 'High']).withMessage('Invalid educational_app_usage'),
  body('notes_quality').optional().isIn(['Poor', 'Average', 'Excellent']).withMessage('Invalid notes_quality'),
  body('break_frequency').optional().isIn(['Rarely', 'Occasionally', 'Frequently']).withMessage('Invalid break_frequency'),
  body('exam_preparation_days').optional().isInt({ min: 0, max: 365 }).withMessage('exam_preparation_days must be 0–365'),
];

// GET /api/students
router.get('/', getStudents);

// POST /api/students
router.post('/', createRules, createStudent);

// GET /api/students/:id
router.get('/:id', getStudent);

// PUT /api/students/:id — all fields optional for partial updates
router.put('/:id', updateRules, updateStudent);

// DELETE /api/students/:id — admin only
router.delete('/:id', requireRole('admin'), deleteStudent);

module.exports = router;
