/**
 * modelMetrics.js
 * Score predictor specifications and dataset provenance.
 * Sourced directly from README.md ML evaluation results.
 */

export const SCORE_PREDICTOR_METRICS = {
  algorithm: 'HistGradientBoostingRegressor (scikit-learn pipeline)',
  mae: 7.3,
  r2: 0.66,
  testSplit: '80/20 train/test split',
  totalFeatures: 37,
  featureGroups: [
    {
      name: 'Academic background & study habits',
      details: 'Previous exam score, study hours, attendance, assignments, practice tests, study consistency, and revision frequency.',
    },
    {
      name: 'Health, wellbeing & lifestyle',
      details: 'Sleep hours, sleep quality, physical activity, screen time, stress level, and exam anxiety level.',
    },
    {
      name: 'Learning environment & support',
      details: 'Study environment, tutoring, parental education, school type, and family income tier.',
    },
  ],
};

export const DATA_PROVENANCE = [
  {
    name: 'Roster students',
    description: 'Demo student records sampled from the training dataset (data/final_student_exam_performance.csv) with isSeeded: true.',
    isReal: false,
    badge: 'Demo data',
  },
  {
    name: 'Assessments & intervention outcomes',
    description: 'Simulated timeline evaluations and post-intervention score checks generated with isSimulated: true for demonstration.',
    isReal: false,
    badge: 'Simulated data',
  },
  {
    name: 'OULAD early warning study',
    description: 'Real, empirical benchmark study conducted on the Open University Learning Analytics Dataset (VLE interactions); completely separate from student rosters.',
    isReal: true,
    badge: 'Real benchmark study',
  },
];

export const WORKFLOW_LOOP_REMINDER =
  'The PerformIQ loop: Identify at-risk students early → Understand underlying lifestyle and academic drivers → Act with targeted support interventions → Review measured score changes to close the feedback loop.';
