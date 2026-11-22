const { validationResult } = require('express-validator');
const Assessment = require('../models/Assessment');
const { getOwnedStudent } = require('../utils/scopeCheck');

/**
 * POST /api/students/:studentId/assessments
 * Creates a new assessment for a student.
 * Teacher scoping: teacher can only add assessments to their own students.
 */
const createAssessment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    // Scope check — confirm this student belongs to the requesting user
    const { student, error, message } = await getOwnedStudent(req.params.studentId, req.user);
    if (error) return res.status(error).json({ success: false, message });

    const assessment = await Assessment.create({
      ...req.body,
      student: student._id,
    });

    res.status(201).json({ success: true, message: 'Assessment created', data: { assessment } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/:studentId/assessments
 * Returns all assessments for a student, ordered oldest first.
 * Teacher scoping: teacher can only view assessments of their own students.
 */
const getAssessments = async (req, res, next) => {
  try {
    const { student, error, message } = await getOwnedStudent(req.params.studentId, req.user);
    if (error) return res.status(error).json({ success: false, message });

    const assessments = await Assessment.find({ student: student._id }).sort({ date: 1 });

    res.json({ success: true, data: { assessments } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createAssessment, getAssessments };
