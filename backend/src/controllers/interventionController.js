const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Intervention = require('../models/Intervention');
const Assessment = require('../models/Assessment');
const Student = require('../models/Student');
const { getOwnedStudent } = require('../utils/scopeCheck');

/**
 * GET /api/interventions
 * Lists all interventions with pagination, optional status and student filters.
 * Teacher scoping: a teacher sees only interventions for their assigned students.
 * Admin sees all interventions.
 * Populates student (name, studentId) and assignedBy (name, email).
 * Sorted newest first (createdAt: -1).
 */
const getInterventions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // 1. Resolve student filter if provided
    let targetStudentId = null;
    if (req.query.student) {
      if (mongoose.Types.ObjectId.isValid(req.query.student)) {
        targetStudentId = req.query.student;
      } else {
        const found = await Student.findOne({ studentId: req.query.student }).select('_id');
        if (found) targetStudentId = found._id;
        else targetStudentId = new mongoose.Types.ObjectId(); // Non-matching ID
      }
    }

    // 2. Teacher scoping
    if (req.user.role === 'teacher') {
      const myStudents = await Student.find({ assignedTeacher: req.user._id }).select('_id');
      const myStudentIds = myStudents.map((s) => s._id.toString());

      if (targetStudentId) {
        if (!myStudentIds.includes(targetStudentId.toString())) {
          return res.status(403).json({ success: false, message: 'Access denied: student not assigned to you' });
        }
        filter.student = targetStudentId;
      } else {
        filter.student = { $in: myStudentIds };
      }
    } else if (targetStudentId) {
      filter.student = targetStudentId;
    }

    // 3. Status filter
    if (req.query.status && ['planned', 'ongoing', 'completed'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const total = await Intervention.countDocuments(filter);
    const interventions = await Intervention.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('student', 'name studentId')
      .populate('assignedBy', 'name email');

    res.json({
      success: true,
      data: {
        interventions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          limit,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/interventions

 * Creates a new intervention for a student.
 * Teacher scoping: a teacher can only create interventions for their own students.
 * assignedBy is always set to the requesting user (cannot be overridden).
 */
const createIntervention = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { student: studentId, ...rest } = req.body;

    const { student, error, message } = await getOwnedStudent(studentId, req.user);
    if (error) return res.status(error).json({ success: false, message });

    const intervention = await Intervention.create({
      ...rest,
      student: student._id,
      assignedBy: req.user._id, // always the logged-in user — cannot be injected
    });

    res.status(201).json({ success: true, message: 'Intervention created', data: { intervention } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/:studentId/interventions
 * Lists all interventions for one student, newest first.
 * Teacher scoping enforced via getOwnedStudent.
 */
const getStudentInterventions = async (req, res, next) => {
  try {
    const { student, error, message } = await getOwnedStudent(req.params.studentId, req.user);
    if (error) return res.status(error).json({ success: false, message });

    const interventions = await Intervention.find({ student: student._id })
      .sort({ createdAt: -1 })
      .populate('assignedBy', 'name email');

    res.json({ success: true, data: { interventions } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/interventions/:id
 * Partially updates an intervention (status, notes, outcome, etc.).
 * Teacher scoping: teacher can only update interventions for their own students.
 */
const updateIntervention = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const intervention = await Intervention.findById(req.params.id).populate('student');
    if (!intervention) {
      return res.status(404).json({ success: false, message: 'Intervention not found' });
    }

    // Check student ownership for teachers
    if (req.user.role === 'teacher') {
      const student = await Student.findById(intervention.student);
      if (!student || student.assignedTeacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Only allow updating these safe fields (never change student or assignedBy)
    const allowedUpdates = ['status', 'notes', 'outcome', 'description', 'type', 'startDate'];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Intervention.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('assignedBy', 'name email');

    res.json({ success: true, message: 'Intervention updated', data: { intervention: updated } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/interventions/:id/impact
 *
 * Improvement-tracking endpoint.
 * Compares a student's average assessment score BEFORE vs AFTER the
 * intervention's startDate.
 *
 * Returns:
 *   before       — average score of assessments before startDate (null if none)
 *   after        — average score of assessments on/after startDate (null if none)
 *   delta        — after - before (null if either side is missing)
 *   verdict      — 'improved'       if delta > 3
 *                  'declined'       if delta < -3
 *                  'no clear change' otherwise
 */
const getImpact = async (req, res, next) => {
  try {
    const intervention = await Intervention.findById(req.params.id);
    if (!intervention) {
      return res.status(404).json({ success: false, message: 'Intervention not found' });
    }

    // Teacher scoping: confirm the student belongs to this teacher
    const { error, message } = await getOwnedStudent(intervention.student, req.user);
    if (error) return res.status(error).json({ success: false, message });

    const startDate = new Date(intervention.startDate);

    // If the intervention is planned, return "not started yet" gracefully
    if (intervention.status === 'planned') {
      const beforeDocs = await Assessment.find({ student: intervention.student, date: { $lt: startDate } });
      const avgScore = beforeDocs.length > 0
        ? parseFloat((beforeDocs.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / beforeDocs.length).toFixed(2))
        : null;

      return res.json({
        success: true,
        message: 'Intervention is planned and has not started yet.',
        data: {
          interventionId: intervention._id,
          type: intervention.type,
          status: 'planned',
          isSimulated: intervention.isSimulated || false,
          startDate: intervention.startDate,
          assessmentsBefore: beforeDocs.length,
          assessmentsAfter: 0,
          before: avgScore,
          after: null,
          delta: null,
          verdict: 'not started yet',
        },
      });
    }

    // Fetch all assessments for this student split by the intervention date
    const [beforeDocs, afterDocs] = await Promise.all([
      Assessment.find({ student: intervention.student, date: { $lt: startDate } }),
      Assessment.find({ student: intervention.student, date: { $gte: startDate } }),
    ]);

    // Calculate average score (score as % of maxScore) for each group
    const avg = (docs) => {
      if (docs.length === 0) return null;
      const total = docs.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0);
      return parseFloat((total / docs.length).toFixed(2));
    };

    // Check if we have assessments on both sides of the intervention start date
    if (beforeDocs.length === 0 || afterDocs.length === 0) {
      const missing =
        beforeDocs.length === 0 && afterDocs.length === 0
          ? 'both before and after'
          : beforeDocs.length === 0
          ? 'before'
          : 'after';

      const isOngoing = intervention.status === 'ongoing';
      const msg = isOngoing && afterDocs.length === 0
        ? 'Intervention is ongoing, but no assessments have been recorded since it started.'
        : `Insufficient data: no assessments recorded ${missing} the intervention start date.`;

      return res.json({
        success: true,
        message: msg,
        data: {
          interventionId: intervention._id,
          type: intervention.type,
          status: intervention.status,
          isSimulated: intervention.isSimulated || false,
          startDate: intervention.startDate,
          assessmentsBefore: beforeDocs.length,
          assessmentsAfter:  afterDocs.length,
          before: beforeDocs.length > 0 ? avg(beforeDocs) : null,
          after: null,
          delta: null,
          verdict: 'insufficient data',
        },
      });
    }

    const before = avg(beforeDocs);
    const after  = avg(afterDocs);
    const delta  = parseFloat((after - before).toFixed(2));

    let verdict = 'no clear change';
    if (delta > 3)  verdict = 'improved';
    else if (delta < -3) verdict = 'declined';

    const impactMessage = intervention.status === 'ongoing'
      ? 'Intervention is ongoing (preliminary impact).'
      : 'Impact calculated successfully.';

    res.json({
      success: true,
      message: impactMessage,
      data: {
        interventionId: intervention._id,
        type: intervention.type,
        status: intervention.status,
        isSimulated: intervention.isSimulated || false,
        startDate: intervention.startDate,
        assessmentsBefore: beforeDocs.length,
        assessmentsAfter:  afterDocs.length,
        before,
        after,
        delta,
        verdict,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInterventions,
  createIntervention,
  getStudentInterventions,
  updateIntervention,
  getImpact,
};
