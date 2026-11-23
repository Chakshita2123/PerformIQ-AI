/**
 * recommendations.js
 * Rule-based recommendation engine — re-implements the rules from CLAUDE.md.
 * Returns at most 4 recommendation strings based on a student's input fields.
 *
 * Rules intentionally do NOT reference gender, region, income, or similar
 * demographic features (see CLAUDE.md Rules section).
 *
 * This module is imported by the /predict controller (Phase 3).
 * It is a pure function — no DB access, no side effects.
 */

const RULES = [
  {
    label: 'Attendance under 75%',
    check: (s) => s.attendance_percentage != null && s.attendance_percentage < 75,
    message:
      'Attendance is below 75%. Regular class attendance is strongly linked to exam performance. Try to attend every session.',
  },
  {
    label: 'Assignments under 60%',
    check: (s) =>
      s.assignment_completion_rate != null && s.assignment_completion_rate < 60,
    message:
      'Assignment completion rate is below 60%. Completing assignments reinforces learning and closes knowledge gaps.',
  },
  {
    label: 'Study under 2h a day',
    check: (s) => s.study_hours_per_day != null && s.study_hours_per_day < 2,
    message:
      'Daily study time is under 2 hours. Aim for at least 2–3 focused hours each day to build consistent understanding.',
  },
  {
    label: 'Few practice tests',
    check: (s) =>
      s.practice_tests_completed != null && s.practice_tests_completed < 4,
    message:
      'Few practice tests completed. Regular self-testing (at least 4 tests) boosts retention and exam readiness.',
  },
  {
    label: 'Weak time management',
    check: (s) =>
      s.time_management_score != null && s.time_management_score < 65,
    message:
      'Time management score is low. Consider using a study timetable or the Pomodoro technique to structure your day.',
  },
  {
    label: 'Under 6h sleep',
    check: (s) => s.sleep_hours != null && s.sleep_hours < 6,
    message:
      'Sleep is under 6 hours per night. Adequate sleep (7–9 hours) is essential for memory consolidation and focus.',
  },
  {
    label: 'High exam anxiety',
    check: (s) => s.exam_anxiety_level != null && s.exam_anxiety_level >= 9.5,
    message:
      'Exam anxiety level is very high. Relaxation techniques, mindfulness, or speaking with a counsellor can help manage stress.',
  },
  {
    label: 'Low previous score',
    check: (s) => s.previous_exam_score != null && s.previous_exam_score < 55,
    message:
      'Previous exam performance was below 55. Early revision and seeking help from a teacher or tutor is recommended.',
  },
  {
    label: 'Rare revision',
    check: (s) => s.revision_frequency === 'Rarely',
    message:
      'Revision is very infrequent. Spaced repetition — revising material at increasing intervals — greatly improves long-term recall.',
  },
  {
    label: 'Low study consistency',
    check: (s) => s.study_consistency === 'Low',
    message:
      'Study consistency is low. Setting a fixed daily study routine, even for short periods, produces better results than cramming.',
  },
  {
    label: 'Low class participation',
    check: (s) => s.class_participation === 'Low',
    message:
      'Class participation is low. Engaging in discussions and asking questions deepens understanding of difficult topics.',
  },
];

/**
 * generateRecommendations(studentData) → string[]
 * @param {Object} studentData - plain object with student field values
 * @returns {string[]} - up to 4 recommendation strings
 */
const generateRecommendations = (studentData) => {
  const matched = RULES.filter((rule) => rule.check(studentData)).map(
    (rule) => rule.message
  );
  return matched.slice(0, 4); // return at most 4
};

/**
 * getRecommendationLabel(message) → string
 * Maps a full recommendation sentence to its short label for chips.
 * @param {string} message - full recommendation message
 * @returns {string} - short rule label
 */
const getRecommendationLabel = (message) => {
  if (!message) return '';
  const found = RULES.find((r) => r.message === message || message.includes(r.label));
  if (found) return found.label;

  // Fallback prefix match
  if (message.startsWith('Attendance is below')) return 'Attendance under 75%';
  if (message.startsWith('Assignment completion rate')) return 'Assignments under 60%';
  if (message.startsWith('Daily study time')) return 'Study under 2h a day';
  if (message.startsWith('Few practice tests')) return 'Few practice tests';
  if (message.startsWith('Time management score')) return 'Weak time management';
  if (message.startsWith('Sleep is under')) return 'Under 6h sleep';
  if (message.startsWith('Exam anxiety level')) return 'High exam anxiety';
  if (message.startsWith('Previous exam performance')) return 'Low previous score';
  if (message.startsWith('Revision is very infrequent')) return 'Rare revision';
  if (message.startsWith('Study consistency is low')) return 'Low study consistency';
  if (message.startsWith('Class participation is low')) return 'Low class participation';

  // If already short, return as-is (truncated if needed)
  return message.length > 28 ? message.slice(0, 28) + '...' : message;
};

module.exports = {
  RULES,
  generateRecommendations,
  getRecommendationLabel,
};
