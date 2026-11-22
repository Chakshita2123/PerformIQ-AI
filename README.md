# PerformIQ AI — Full-Stack Project

## What is PerformIQ?

PerformIQ AI is a **student performance prediction and early-intervention system**.  
Teachers log in, view each student's predicted exam score and risk level, and assign  
interventions (mentoring, extra practice, etc.) to students who are at risk of failing.

**Prediction cycle:** Predict → Identify risk → Assign intervention → Monitor improvement

---

## Tech Stack & Architecture

PerformIQ AI uses a microservices architecture:

| Component | Technology | Responsibility |
|---|---|---|
| **Backend API** | Node.js v22, Express.js, MongoDB Atlas (Mongoose) | Authentication, Student CRUD, Assessments, Interventions, Aggregation Dashboard |
| **ML Service** | Python 3.13, FastAPI, Uvicorn, scikit-learn, pandas | Preprocessing pipeline & HistGradientBoosting score prediction model |
| **Frontend** | React (Vite), Tailwind CSS (Phase 5) | User interface for teachers and administrators |

---

## Pinned ML Environment

The model `ml-service/performiq_model.joblib` is a trained scikit-learn `Pipeline` (`ColumnTransformer` + `HistGradientBoostingRegressor`).
The environment is pinned in `ml-service/requirements.txt`:

```txt
fastapi==0.141.1
uvicorn[standard]==0.52.1
pydantic==2.13.4
scikit-learn==1.9.0
pandas==3.0.5
numpy==2.5.1
joblib==1.5.3
```

---

## Project Structure

```
PerformIQ-AI/
├── backend/
│   ├── server.js                        ← Express entry point & route mounting
│   ├── .env                             ← Secrets (never committed)
│   ├── .env.example                     ← Template — copy to .env
│   ├── test-phase1.js                   ← Phase 1 test suite (Self-cleaning)
│   ├── test-phase2.js                   ← Phase 2 & 3 test suite (Self-cleaning)
│   ├── scripts/
│   │   ├── run-tests.js                 ← Cross-platform test runner (PowerShell/Bash)
│   │   └── cleanTestData.js             ← Strict cleanup tool (never touches real data)
│   └── src/
│       ├── config/db.js                 ← MongoDB connection (with test DB isolation)
│       ├── models/                      ← User, Student, Assessment, Prediction, Intervention, OuladRecord
│       ├── middleware/                  ← auth (protect, requireRole), errorHandler
│       ├── controllers/                 ← auth, student, assessment, prediction, intervention, dashboard
│       ├── routes/                      ← auth, student, assessment, prediction, intervention, dashboard
│       └── utils/                       ← recommendations, scopeCheck
├── ml-service/
│   ├── main.py                          ← FastAPI prediction server (GET /health, POST /predict)
│   ├── performiq_model.joblib           ← Saved scikit-learn pipeline
│   ├── requirements.txt                 ← Pinned dependency versions
│   └── venv/                            ← Python virtual environment
├── data/                                ← CSV datasets (do not modify)
├── notebooks/                           ← ML training notebooks (do not modify)
├── README.md                            ← Project documentation
├── TESTS.md                             ← API testing guide & curl commands
└── VIVA_NOTES.md                        ← Viva preparation & technical concepts
```

---

## How to Start Both Servers

### 1. Start the FastAPI ML Service (Port 8000)
```powershell
# From the project root:
cd ml-service

# Activate virtual environment:
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

# Start Uvicorn server:
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Health check: `http://127.0.0.1:8000/health` → `{"status": "ok", "service": "PerformIQ ML Service", "model_loaded": true}`

### 2. Start the Express Backend API (Port 5000)
```powershell
# Open a second terminal window:
cd backend

# Install dependencies if not already done:
npm install

# Start development server:
npm run dev
# Or for production:
npm start
```
Health check: `http://localhost:5000/api/health`

---

## Running the Automated Test Suite

The test suite runs with **complete database isolation** against `performiq_test` on Windows PowerShell, Command Prompt, and Bash:

```powershell
cd backend
npm test
```
This runs `scripts/run-tests.js`, which guarantees `NODE_ENV=test`, verifies the connection to `performiq_test`, executes all Phase 1, 2, and 3 tests, and cleans up after itself.

---

## API Overview

### ML Service (FastAPI — Port 8000)
- `GET /health` — Service status and model readiness.
- `POST /predict` — Accepts JSON with student feature columns, imputes missing values, and returns `{"success": true, "predicted_score": 65.59}`.

### Backend API (Express — Port 5000)
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Students**: `GET /api/students`, `POST /api/students`, `GET /api/students/:id`, `PUT /api/students/:id`, `DELETE /api/students/:id`
- **Assessments**: `POST /api/students/:id/assessments`, `GET /api/students/:id/assessments`
- **Predictions**:
  - `POST /api/students/:id/predict` — Calls ML service via HTTP; clips score; derives risk level (`High`, `Medium`, `Low`); generates rule-based recommendations; updates `Student` document.
  - *Admin override*: Admins can pass `{ "predictedScore": 55 }` for manual overrides (`source = 'manual'`).
  - *503 Fallback*: If ML service is down or unreachable, returns HTTP `503 Service Unavailable`.
  - `GET /api/students/:id/predictions` — Prediction history for a student.
  - `GET /api/predictions?risk=High` — Scoped list of high-risk students.
- **Interventions**: `POST /api/interventions`, `GET /api/students/:id/interventions`, `PATCH /api/interventions/:id`
- **Impact Tracking**: `GET /api/interventions/:id/impact` — Before vs after score delta & verdict (`improved`, `declined`, `no clear change`, `insufficient data`).
- **Dashboard**: `GET /api/dashboard/summary` — Aggregation pipeline for student counts by risk level, average score, intervention statuses, and top 5 recommendation reasons (scoped to teacher).
- **OULAD Early Warning & Benchmarks (Module 3)**:
  - `GET /api/oulad/at-risk` — Paginated list of at-risk students, filterable by `risk_level`, `code_module`, and searchable by `id_student`.
  - `GET /api/oulad/cutoff-results` — Benchmark performance (ROC_AUC, Recall, Precision) across cutoff days.
  - `GET /api/oulad/engagement` — Weekly VLE click activity across course weeks by final outcome.

---

## Database Seeding (Phase 4)

To populate the database with realistic data for development and demonstration:

```powershell
cd backend
npm run seed
```

### What the Seeder Does
1. **Safety Pre-Checks:** Refuses execution if `NODE_ENV=test` and confirms the FastAPI ML service is online.
2. **Upserts Demo Accounts:** Upserts 1 Admin and 3 Teachers without changing their existing `_id`s.
3. **Re-Run Safety:** Cleans previously seeded records (`{ isSeeded: true }`) and cascades deletion to all referencing predictions, assessments, and interventions without touching manual records.
4. **Imports 5,000 Students:** Samples 5,000 rows deterministically from `final_student_exam_performance.csv` using a fixed PRNG (`SEED_RANDOM_SEED=42`), assigning realistic fake names, unique IDs (`STU_SEED_0001` .. `STU_SEED_5000`), and allocating them evenly across the 3 teachers. Literal `"None"` in `device_availability` is preserved.
5. **Generates Live Predictions:** Obtains predictions through the ML service's `POST /predict-batch` endpoint in chunks of 200, caches `latestPredictedScore` and `latestRiskLevel`, and generates rule-based recommendations.
6. **Generates Simulated Assessments:** Creates 4–6 past assessments per student (`isSimulated: true`) distributed across the past year.
7. **Simulates Interventions & Outcomes:** Creates realistic interventions for High & Medium risk students (`isSimulated: true`) with guaranteed before/after assessments demonstrating diverse outcomes (improved vs declined).
8. **Imports Module 3 OULAD Data:** Imports 2,244 at-risk student records (safely parsing stringified Python recommendations without `eval`), 7 cutoff benchmarks, and 35 weekly engagement trends.
9. **Measures Real Storage:** Measures actual WiredTiger compressed storage usage on MongoDB Atlas.

### Demo Logins
> [!IMPORTANT]
> The demo passwords below are provided for local development and grading purposes only. Before deploying publicly, you MUST change these passwords via the `.env` file (`DEMO_ADMIN_PASSWORD` and `DEMO_TEACHER_PASSWORD`).

| Role | Name | Email | Default Demo Password |
|---|---|---|---|
| **Admin** | System Administrator | `admin@performiq.ai` | `AdminDemo123!` |
| **Teacher 1** | Dr. Sarah Jenkins | `teacher1@performiq.ai` | `TeacherDemo123!` |
| **Teacher 2** | Prof. Marcus Chen | `teacher2@performiq.ai` | `TeacherDemo123!` |
| **Teacher 3** | Ms. Elena Rodriguez | `teacher3@performiq.ai` | `TeacherDemo123!` |

> [!WARNING]
> **Simulated Data Disclaimer:** All seeded past assessments and intervention outcomes are flagged with `isSimulated: true`. They are generated for demonstration, dashboard visualization, and UI evaluation purposes only. They do **NOT** reflect real-world intervention efficacy.

### Atlas Free-Tier Storage Metrics
- **Uncompressed Data Size:** ~14.44 MB
- **Allocated Storage on Disk (WiredTiger compressed):** ~1.85 MB
- **Index Size:** ~1.84 MB
- **Total Atlas Storage Allocated:** ~3.69 MB out of 512 MB (**0.72%** of Free Tier quota)
