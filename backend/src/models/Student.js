const mongoose = require('mongoose');

/**
 * Student schema — mirrors the Module 1 ML input columns exactly.
 * Column names and allowed values are taken directly from
 * data/final_student_exam_performance.csv (see VIVA_NOTES.md for details).
 *
 * Excluded from this schema (data-leakage / post-exam targets):
 *   exam_score, questions_attempted, questions_correct,
 *   performance_grade, pass_status, performance_level
 *
 * latestPredictedScore and latestRiskLevel are written by the
 * /predict endpoint (Phase 3) so the student list can be filtered
 * without joining the Prediction collection on every request.
 */
const studentSchema = new mongoose.Schema(
  {
    // --- Identity ---
    studentId: {
      type: String,
      required: [true, 'studentId is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      maxlength: [150, 'name cannot exceed 150 characters'],
    },

    // --- Demographics (not used as risk reason per CLAUDE.md rules) ---
    age: { type: Number, min: 10, max: 25 },
    gender: { type: String, enum: ['Female', 'Male', 'Other'] },
    education_level: {
      type: String,
      enum: ['High School', 'Undergraduate'],
    },
    school_type: { type: String, enum: ['Public', 'Private', 'Charter'] },
    family_income: {
      type: String,
      enum: ['Low', 'Lower-Middle', 'Middle', 'Upper-Middle', 'High'],
    },
    parent_education: {
      type: String,
      enum: ['High School', 'Associate', 'Bachelor', 'Master', 'Doctorate'],
      // nullable — allowed to be missing
    },
    urban_rural: { type: String, enum: ['Rural', 'Suburban', 'Urban'] },

    // --- Academic history ---
    previous_exam_score: { type: Number, min: 0, max: 100 },
    previous_gpa: { type: Number, min: 0, max: 4.0 }, // nullable

    // --- Attendance & engagement ---
    attendance_percentage: { type: Number, min: 0, max: 100 }, // nullable
    assignment_completion_rate: { type: Number, min: 0, max: 100 },
    class_participation: { type: String, enum: ['Low', 'Medium', 'High'] },

    // --- Study habits ---
    study_hours_per_day: { type: Number, min: 0, max: 24 },
    self_study_hours: { type: Number, min: 0, max: 24 },
    private_tuition: { type: Number, min: 0, max: 1 }, // 0 = No, 1 = Yes
    online_learning_hours: { type: Number, min: 0, max: 24 },
    study_consistency: { type: String, enum: ['Low', 'Medium', 'High'] },
    study_environment: { type: String, enum: ['Quiet', 'Moderate', 'Noisy'] },
    study_method: {
      type: String,
      enum: [
        'Flashcards',
        'Summarizing',
        'Self-Reading',
        'Practice Tests',
        'Group Study',
      ],
    },
    revision_frequency: {
      type: String,
      enum: ['Rarely', 'Weekly', 'Daily'],
    },
    practice_tests_completed: { type: Number, min: 0, max: 50 },
    notes_quality: { type: String, enum: ['Poor', 'Average', 'Excellent'] }, // nullable

    // --- Sleep & wellbeing ---
    sleep_hours: { type: Number, min: 0, max: 24 },
    sleep_quality: {
      type: String,
      enum: ['Poor', 'Fair', 'Good', 'Excellent'],
    }, // nullable
    daily_screen_time: { type: Number, min: 0, max: 24 },
    physical_activity_hours: { type: Number, min: 0, max: 24 },
    break_frequency: {
      type: String,
      enum: ['Rarely', 'Occasionally', 'Frequently'],
    },
    stress_level: { type: Number, min: 0, max: 10 },
    motivation_level: { type: String, enum: ['Low', 'Medium', 'High'] },

    // --- Technology access ---
    internet_access: { type: Number, min: 0, max: 1 }, // 0 = No, 1 = Yes
    device_availability: {
      type: String,
      enum: ['None', 'Shared', 'Dedicated'],
    },
    educational_app_usage: { type: String, enum: ['Low', 'Moderate', 'High'] },
    online_course_hours: { type: Number, min: 0, max: 24 },

    // --- Exam context ---
    exam_difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
    exam_preparation_days: { type: Number, min: 0, max: 365 },
    time_management_score: { type: Number, min: 0, max: 100 }, // nullable
    exam_anxiety_level: { type: Number, min: 0, max: 10 },

    // --- Relationships & flags ---
    // Teacher who owns this student record (auto-set on create)
    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'assignedTeacher is required'],
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },

    // --- Cached prediction (updated by POST /api/students/:id/predict) ---
    // Stored here so the student list can be filtered by risk without
    // joining the Prediction collection on every paginated request.
    latestPredictedScore: { type: Number, default: null },
    latestRiskLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low', null],
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast text search on name and studentId
studentSchema.index({ name: 'text', studentId: 'text' });
// Index for the most common filter
studentSchema.index({ latestRiskLevel: 1 });
studentSchema.index({ assignedTeacher: 1 });

module.exports = mongoose.model('Student', studentSchema);
