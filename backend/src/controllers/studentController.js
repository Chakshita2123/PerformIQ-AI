const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Student = require('../models/Student');

/**
 * GET /api/students
 * Query params:
 *   page       (default 1)
 *   limit      (default 10, max 100)
 *   search     (text search on name / studentId)
 *   riskLevel  (High | Medium | Low) — filters on latestRiskLevel
 *   sortBy     (any field, default createdAt)
 *   order      (asc | desc, default desc)
 *
 * Teacher scoping: a teacher sees ONLY their own students (assignedTeacher = their id).
 * Admin sees all students and may pass assignedTeacher as a query param.
 */
const getStudents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Build the filter query
    const filter = {};

    // Teacher scoping — teacher only sees their own students
    if (req.user.role === 'teacher') {
      filter.assignedTeacher = req.user._id;
    } else if (req.query.assignedTeacher) {
      // Admin can optionally filter by a specific teacher
      filter.assignedTeacher = req.query.assignedTeacher;
    }

    // Risk level filter uses the cached latestRiskLevel field
    if (req.query.riskLevel) {
      filter.latestRiskLevel = req.query.riskLevel;
    }

    // Text search on name and studentId (uses the text index)
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Sort — default: lowest predicted score first (latestPredictedScore: asc)
    const sortBy = req.query.sortBy || 'latestPredictedScore';
    const sortOrderParam = (
      req.query.order ||
      req.query.sortOrder ||
      (sortBy === 'latestPredictedScore' ? 'asc' : 'desc')
    )
      .toString()
      .toLowerCase();
    const order = sortOrderParam === 'desc' ? -1 : 1;
    const sort = { [sortBy]: order };

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedTeacher', 'name email'), // show teacher name, not just ID
      Student.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/students
 * Creates a student. assignedTeacher is set automatically:
 *   - Teacher: always their own ID (they own the student).
 *   - Admin: can optionally pass assignedTeacher in body; defaults to admin's own ID.
 */
const createStudent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: errors.array()[0].msg });
    }

    // Determine who owns this student
    let assignedTeacher = req.user._id; // default: the creator
    if (req.user.role === 'admin' && req.body.assignedTeacher) {
      assignedTeacher = req.body.assignedTeacher;
    }

    const student = await Student.create({
      ...req.body,
      assignedTeacher, // always overwrite whatever was in body for teachers
    });

    res.status(201).json({
      success: true,
      message: 'Student created',
      data: { student },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/:id
 * Teacher: can only view students assigned to them.
 * Admin: can view any student.
 */
const getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).populate(
      'assignedTeacher',
      'name email'
    );

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: 'Student not found' });
    }

    // Teacher scoping check
    if (
      req.user.role === 'teacher' &&
      student.assignedTeacher._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { student } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/students/:id
 * Update a student's details.
 * Teachers can only update students assigned to them.
 * Teachers cannot change assignedTeacher — only admins can reassign.
 */
const updateStudent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: errors.array()[0].msg });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: 'Student not found' });
    }

    // Teacher scoping check
    if (
      req.user.role === 'teacher' &&
      student.assignedTeacher.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied' });
    }

    // Teachers cannot reassign — strip assignedTeacher from body
    const updateData = { ...req.body };
    if (req.user.role === 'teacher') {
      delete updateData.assignedTeacher;
    }

    // {new: true} returns the updated document, runValidators runs schema rules
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTeacher', 'name email');

    res.json({ success: true, message: 'Student updated', data: { student: updated } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/students/:id
 * Admin only (enforced in the route via requireRole middleware).
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStudents, createStudent, getStudent, updateStudent, deleteStudent };
