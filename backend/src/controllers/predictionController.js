const { validationResult } = require('express-validator');
const axios = require('axios');
const Prediction = require('../models/Prediction');
const Student = require('../models/Student');
const { getOwnedStudent, getRiskLevel } = require('../utils/scopeCheck');
const { generateRecommendations } = require('../utils/recommendations');

// The 37 input features expected by the scikit-learn pipeline (HistGradientBoostingRegressor)
const FEATURE_COLUMNS = [
  'age', 'gender', 'education_level', 'school_type', 'family_income',
  'parent_education', 'urban_rural', 'previous_exam_score', 'previous_gpa',
  'attendance_percentage', 'assignment_completion_rate', 'class_participation',
  'study_hours_per_day', 'self_study_hours', 'private_tuition',
  'online_learning_hours', 'study_consistency', 'study_environment',
  'study_method', 'revision_frequency', 'practice_tests_completed',
  'notes_quality', 'sleep_hours', 'sleep_quality', 'daily_screen_time',
  'physical_activity_hours', 'break_frequency', 'stress_level',
  'motivation_level', 'internet_access', 'device_availability',
  'educational_app_usage', 'online_course_hours', 'exam_difficulty',
  'exam_preparation_days', 'time_management_score', 'exam_anxiety_level'
];

/**
 * POST /api/students/:studentId/predict
 *
 * Calls the FastAPI ML service to predict exam score using the trained model.
 * If user is admin AND provides predictedScore in body, allows manual override.
 *
 * Steps:
 *  1. Teacher scoping check
 *  2. If admin manual override -> use provided score (source: 'manual')
 *     Else -> send student's 37 features to FastAPI POST /predict (source: 'module1')
 *  3. Handle ML service down with 503 error
 *  4. Clip score to 0-100, calculate riskLevel (<50=High, 50-59=Medium, >=60=Low)
 *  5. Generate rule-based recommendations (max 4)
 *  6. Save Prediction document
 *  7. Denormalise latestRiskLevel and latestPredictedScore onto Student document
 */
const createPrediction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { student, error, message } = await getOwnedStudent(req.params.studentId, req.user);
    if (error) return res.status(error).json({ success: false, message });

    let score;
    let source = 'module1';
    let missingFieldsCount = 0;

    // Gather student's features (missing fields sent as null so pipeline can impute them)
    const studentObj = student.toObject();
    const payload = {};
    for (const col of FEATURE_COLUMNS) {
      const val = studentObj[col];
      const isMissing = (val === undefined || val === null || val === '');
      payload[col] = isMissing ? null : val;
      // In dataset, device_availability "None" acts as a missing/imputed feature
      if (isMissing || (col === 'device_availability' && val === 'None')) {
        missingFieldsCount++;
      }
    }

    // Manual predictedScore option is only available for admins
    if (req.user.role === 'admin' && req.body.predictedScore !== undefined) {
      score = Math.min(100, Math.max(0, req.body.predictedScore));
      source = 'manual';
    } else {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

      try {
        const response = await axios.post(`${mlServiceUrl}/predict`, payload, {
          timeout: 5000,
        });

        score = response.data?.predicted_score;
        if (typeof score !== 'number' || isNaN(score)) {
          throw new Error('Invalid score returned from ML service');
        }
        score = Math.min(100, Math.max(0, score));
        score = parseFloat(score.toFixed(2));

        if (typeof response.data?.missing_fields_count === 'number') {
          missingFieldsCount = response.data.missing_fields_count;
        }
      } catch (err) {
        return res.status(503).json({
          success: false,
          message: 'ML service unavailable. Please check that the prediction service is running.',
        });
      }
    }

    const riskLevel = getRiskLevel(score);
    const recommendations = generateRecommendations(student.toObject());

    const prediction = await Prediction.create({
      student: student._id,
      predictedScore: score,
      riskLevel,
      recommendations,
      source,
      missingFieldsCount,
    });

    // Update cached fields on the Student document
    await Student.findByIdAndUpdate(student._id, {
      latestPredictedScore: score,
      latestRiskLevel: riskLevel,
    });

    res.status(201).json({
      success: true,
      message: 'Prediction saved',
      data: { prediction },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/:studentId/predictions
 * Returns all predictions for one student, newest first.
 */
const getStudentPredictions = async (req, res, next) => {
  try {
    const { student, error, message } = await getOwnedStudent(req.params.studentId, req.user);
    if (error) return res.status(error).json({ success: false, message });

    const predictions = await Prediction.find({ student: student._id }).sort({ createdAt: -1 });

    res.json({ success: true, data: { predictions } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/predictions?risk=High
 * Returns predictions across all students (scoped to teacher).
 */
const getAllPredictions = async (req, res, next) => {
  try {
    let studentFilter = {};
    if (req.user.role === 'teacher') {
      const myStudents = await Student.find(
        { assignedTeacher: req.user._id },
        '_id'
      );
      const myStudentIds = myStudents.map((s) => s._id);
      studentFilter = { student: { $in: myStudentIds } };
    }

    const predictionFilter = { ...studentFilter };
    if (req.query.risk) {
      predictionFilter.riskLevel = req.query.risk;
    }

    const predictions = await Prediction.find(predictionFilter)
      .sort({ createdAt: -1 })
      .populate('student', 'name studentId');

    res.json({ success: true, data: { predictions } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPrediction, getStudentPredictions, getAllPredictions };
