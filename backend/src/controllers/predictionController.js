const { validationResult } = require('express-validator');
const Prediction = require('../models/Prediction');
const Student = require('../models/Student');
const { getOwnedStudent, getRiskLevel } = require('../utils/scopeCheck');
const { generateRecommendations } = require('../utils/recommendations');

/**
 * POST /api/students/:studentId/predict
 *
 * Phase 2 version: accepts a manual predictedScore in the body.
 * Phase 3 will swap this out to call the FastAPI ML service instead.
 *
 * Steps:
 *  1. Scope-check the student (teacher can only predict for their own students)
 *  2. Derive riskLevel from the score (<50=High, 50-59=Medium, >=60=Low)
 *  3. Run rule-based recommendations against the student's current fields
 *  4. Save a Prediction document
 *  5. Update latestRiskLevel and latestPredictedScore on the Student — so the
 *     student list filter works without a join on every request
 */
const createPrediction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { student, error, message } = await getOwnedStudent(req.params.studentId, req.user);
    if (error) return res.status(error).json({ success: false, message });

    const { predictedScore } = req.body;

    // Clamp to 0-100 (matches the FastAPI clip that Phase 3 will add)
    const score = Math.min(100, Math.max(0, predictedScore));
    const riskLevel = getRiskLevel(score);

    // Run recommendation rules against the student's stored fields
    const recommendations = generateRecommendations(student.toObject());

    // Save the prediction record
    const prediction = await Prediction.create({
      student: student._id,
      predictedScore: score,
      riskLevel,
      recommendations,
      source: 'manual', // Phase 3 will change this to 'module1'
    });

    // --- Denormalisation: update the Student document so the list endpoint
    // can filter by latestRiskLevel without touching the Prediction collection ---
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
 * Returns predictions across all students (admin sees all; teacher sees only
 * predictions for students assigned to them).
 *
 * Optional query param:
 *   risk — High | Medium | Low — filters by riskLevel
 */
const getAllPredictions = async (req, res, next) => {
  try {
    // For teacher scoping we need to find their student IDs first
    let studentFilter = {};
    if (req.user.role === 'teacher') {
      const myStudents = await Student.find(
        { assignedTeacher: req.user._id },
        '_id'   // only fetch _id — fast
      );
      const myStudentIds = myStudents.map((s) => s._id);
      studentFilter = { student: { $in: myStudentIds } };
    }

    // Optional risk filter
    const predictionFilter = { ...studentFilter };
    if (req.query.risk) {
      predictionFilter.riskLevel = req.query.risk;
    }

    const predictions = await Prediction.find(predictionFilter)
      .sort({ createdAt: -1 })
      .populate('student', 'name studentId'); // include student name for readability

    res.json({ success: true, data: { predictions } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPrediction, getStudentPredictions, getAllPredictions };
