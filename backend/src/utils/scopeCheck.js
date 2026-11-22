const Student = require('../models/Student');

/**
 * getOwnedStudent — shared teacher-scoping helper used by all Phase 2 controllers.
 *
 * Returns:
 *   { student }  — if the user is allowed to access this student
 *   { error, message } — if not found (404) or forbidden (403)
 *
 * Admin can access any student.
 * Teacher can only access students where assignedTeacher == their own id.
 */
const getOwnedStudent = async (studentId, user) => {
  const student = await Student.findById(studentId);

  if (!student) {
    return { error: 404, message: 'Student not found' };
  }

  if (
    user.role === 'teacher' &&
    student.assignedTeacher.toString() !== user._id.toString()
  ) {
    return { error: 403, message: 'Access denied' };
  }

  return { student };
};

/**
 * getRiskLevel — converts a predicted score into a risk category.
 * Rule from CLAUDE.md:
 *   < 50  → High
 *   50-59 → Medium
 *   >= 60 → Low
 */
const getRiskLevel = (score) => {
  if (score < 50) return 'High';
  if (score < 60) return 'Medium';
  return 'Low';
};

module.exports = { getOwnedStudent, getRiskLevel };
