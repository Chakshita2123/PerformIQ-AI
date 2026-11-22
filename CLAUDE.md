# PerformIQ AI: Full-Stack Project

## What this project is
PerformIQ AI is a student performance prediction and early-intervention system.
Teachers can see each student's predicted exam score, a risk level (High / Medium / Low),
rule-based recommendations, assign interventions (mentoring, extra practice, attendance
monitoring, etc.) and track whether the student improves afterwards.
Cycle: prediction -> identification -> intervention -> monitoring.

This one project is used for three things:
1. A Machine Learning evaluation (notebooks already done)
2. A Backend Development evaluation (Node.js, Express.js, MongoDB, Mongoose, REST APIs)
3. My resume / portfolio (so it must look professional on GitHub, with a live demo)

## How to work with me (IMPORTANT)
- I am a student and must be able to explain every line in a viva. Keep code simple, readable
  and MVC-style. No unnecessary abstractions, no extra libraries beyond the stack below.
- Add short comments for anything non-obvious.
- Work ONE PHASE at a time. Before coding, show a short plan. After finishing a phase, explain
  in plain English what was built, why, and exactly how I can test it (curl or Postman examples).
  Then STOP and wait for my confirmation. Do not build ahead.
- Run the code yourself to check it works before saying a phase is done.
- Never commit secrets. Use .env and provide .env.example. Make sure .gitignore covers
  node_modules, .env, __pycache__, venv.
- Keep three study files updated as the project grows and write them for a beginner:
  README.md (project docs), TESTS.md (how to test every endpoint), VIVA_NOTES.md (plain-English
  explanation of every concept used: middleware, JWT, hashing, Mongoose schemas, aggregation,
  validation, REST, CORS, etc., plus likely viva questions with short answers).

## Tech stack
- Backend: Node.js, Express.js, MongoDB (Atlas), Mongoose, REST API. Allowed libraries:
  express, mongoose, jsonwebtoken, bcryptjs, express-validator, cors, helmet, morgan, dotenv,
  express-rate-limit, axios (to call the ML service). Plain JavaScript, no TypeScript.
- ML service: Python FastAPI that loads the saved model and serves predictions.
- Frontend (phase 5): React (Vite), Tailwind CSS, Recharts, React Router, axios. Keep components
  small and simple.

## Repo structure (monorepo)
PerformIQ-AI/
  backend/        src/{config,models,controllers,routes,middleware,utils}, seed/, server.js
  ml-service/     FastAPI app, requirements.txt, performiq_model.joblib
  frontend/       React app (later)
  notebooks/      my two ML notebooks (do not modify)
  data/           CSV files (do not modify)
  docs/           API docs, Postman collection
  README.md  TESTS.md  VIVA_NOTES.md

## Existing ML assets (do not retrain or modify)
**Module 1: score prediction (live API).**
- ml-service/performiq_model.joblib is a scikit-learn Pipeline (preprocessing +
  HistGradientBoostingRegressor). It takes a pandas DataFrame with the RAW columns and returns the
  predicted exam_score. Clip predictions to 0-100.
- Input columns = every column in data/final_student_exam_performance.csv EXCEPT: exam_score,
  student_id, questions_attempted, questions_correct, performance_grade, pass_status,
  performance_level (removed in training to avoid data leakage). Read the CSV header and the
  notebook to get the exact list and value types. Missing values are allowed (the pipeline imputes).
- Risk level from predicted score: < 50 = High Risk, 50 to < 60 = Medium Risk, >= 60 = Low Risk.
- Recommendation rules (re-implement in backend/src/utils/recommendations.js):
  attendance_percentage < 75; assignment_completion_rate < 60; study_hours_per_day < 2;
  practice_tests_completed < 4; time_management_score < 65; sleep_hours < 6;
  exam_anxiety_level >= 9.5; previous_exam_score < 55; revision_frequency == "Rarely";
  study_consistency == "Low"; class_participation == "Low". Each maps to a suggested action text.
  Return at most 4 recommendations.

**Module 3: OULAD early warning (pre-computed, NOT live).**
- Predictions are already computed. Import data/performiq_oulad_at_risk.csv (columns: id_student,
  code_module, risk_prob, risk_level, total_clicks, click_change, n_missed, avg_score, score_trend,
  recommendations as a stringified Python list: parse it).
- data/oulad_cutoff_results.csv (ROC-AUC etc. by cutoff day) and data/oulad_weekly_engagement.csv
  (avg weekly clicks per final result) are for charts. These two files may be added later,
  before Phase 4.

## Data models (Mongoose)
- User: name, email (unique), passwordHash, role ("admin" | "teacher"), timestamps
- Student: studentId (unique), name, all Module 1 input fields, assignedTeacher (ref User), isSimulated
- Assessment: student (ref), title, type, score, maxScore, date, isSimulated
- Prediction: student (ref), predictedScore, riskLevel, recommendations [String], source, createdAt
- Intervention: student (ref), type, description, assignedBy (ref User), startDate,
  status ("planned" | "ongoing" | "completed"), notes, outcome, isSimulated
- OuladRecord: the imported Module 3 rows

## API (REST, JSON, consistent shape { success, data, message })
- Auth: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- Students: GET (pagination, search, filter by riskLevel, sort), POST, GET/:id, PUT/:id, DELETE/:id
- Assessments: POST /api/students/:id/assessments, GET /api/students/:id/assessments
- Predictions: POST /api/students/:id/predict, GET /api/students/:id/predictions,
  GET /api/predictions?risk=High
- Interventions: POST /api/interventions, GET /api/students/:id/interventions,
  PATCH /api/interventions/:id
- Improvement tracking: GET /api/interventions/:id/impact. Compare the student's average assessment
  score before vs after the intervention start date. Return before, after, delta and a verdict
  (improved if delta > 3, declined if delta < -3, otherwise no clear change).
- Dashboard: GET /api/dashboard/summary using MongoDB aggregation (counts by risk level, average
  predicted score, top recommendation reasons, interventions by status)
- OULAD: GET /api/oulad/at-risk, GET /api/oulad/cutoff-results, GET /api/oulad/engagement

## Rules
- JWT auth on all routes except register/login. Roles: admin sees everything and manages teachers;
  a teacher only sees students assigned to them.
- Validate input (express-validator), centralised error handler, proper HTTP status codes.
- Use helmet, cors, rate limiting on auth routes, bcrypt for passwords.
- Simulated data (assessment history, interventions) must always be flagged isSimulated and the
  README must say clearly which data is real and which is simulated.
- Do not use gender, region, income or similar as a reason for a risk flag or recommendation.

## Phases (I will tell you which to start)
1. Backend foundation: setup, DB connection, models, auth, Student CRUD
2. Assessments, risk/recommendation logic, interventions, improvement tracking, dashboard summary
3. ML service (FastAPI) and the /predict integration
4. Seed script and OULAD import
5. React frontend
6. Polish, README, Postman collection, deployment