/**
 * studentFields.js
 * Shared constants containing the exact categorical enum values and configuration
 * derived from data/final_student_exam_performance.csv and the Mongoose Student schema.
 * Reused across forms, filters, and profile displays for guaranteed schema consistency.
 */

export const GENDER_OPTIONS = ['Female', 'Male', 'Other'];

export const EDUCATION_LEVEL_OPTIONS = ['High School', 'Undergraduate'];

export const SCHOOL_TYPE_OPTIONS = ['Public', 'Private', 'Charter'];

export const FAMILY_INCOME_OPTIONS = ['Low', 'Lower-Middle', 'Middle', 'Upper-Middle', 'High'];

export const PARENT_EDUCATION_OPTIONS = [
  'High School',
  'Associate',
  'Bachelor',
  'Master',
  'Doctorate',
];

export const URBAN_RURAL_OPTIONS = ['Rural', 'Suburban', 'Urban'];

export const CLASS_PARTICIPATION_OPTIONS = ['Low', 'Medium', 'High'];

export const STUDY_CONSISTENCY_OPTIONS = ['Low', 'Medium', 'High'];

export const STUDY_ENVIRONMENT_OPTIONS = ['Quiet', 'Moderate', 'Noisy'];

export const STUDY_METHOD_OPTIONS = [
  'Flashcards',
  'Summarizing',
  'Self-Reading',
  'Practice Tests',
  'Group Study',
];

export const REVISION_FREQUENCY_OPTIONS = ['Rarely', 'Weekly', 'Daily'];

export const NOTES_QUALITY_OPTIONS = ['Poor', 'Average', 'Excellent'];

export const SLEEP_QUALITY_OPTIONS = ['Poor', 'Fair', 'Good', 'Excellent'];

export const BREAK_FREQUENCY_OPTIONS = ['Rarely', 'Occasionally', 'Frequently'];

export const MOTIVATION_LEVEL_OPTIONS = ['Low', 'Medium', 'High'];

// Notice: In the dataset, "None" is a legitimate category string representing no dedicated device
export const DEVICE_AVAILABILITY_OPTIONS = ['None', 'Shared', 'Dedicated'];

export const EDUCATIONAL_APP_USAGE_OPTIONS = ['Low', 'Moderate', 'High'];

export const EXAM_DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

export const INTERVENTION_TYPES = [
  'Mentoring',
  'Extra Practice',
  'Attendance Monitoring',
  'Counselling',
  'Peer Support',
  'Other',
];

export const INTERVENTION_STATUSES = ['planned', 'ongoing', 'completed'];

export const ASSESSMENT_TYPES = ['Quiz', 'Midterm', 'Assignment', 'Final', 'Other'];
