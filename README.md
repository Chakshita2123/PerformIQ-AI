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
