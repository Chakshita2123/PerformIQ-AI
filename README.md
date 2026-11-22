# PerformIQ AI — Backend API

## What is PerformIQ?

PerformIQ AI is a **student performance prediction and early-intervention system**.  
Teachers log in, view each student's predicted exam score and risk level, and assign  
interventions (mentoring, extra practice, etc.) to students who are at risk of failing.

**Prediction cycle:** Predict → Identify risk → Assign intervention → Monitor improvement

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22 |
| Web framework | Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |
| Logging | morgan |

---

## Project Structure

```
backend/
├── server.js                        ← Entry point; mounts all route handlers & error middleware
├── .env                             ← Secrets (never committed)
├── .env.example                     ← Template — copy this to .env
├── test-phase1.js                   ← Phase 1 endpoint test suite
├── test-phase2.js                   ← Phase 2 endpoint test suite
└── src/
    ├── config/
    │   └── db.js                    ← Mongoose.connect()
    ├── models/
    │   ├── User.js                  ← Teachers and admin (passwordHash select: false)
    │   ├── Student.js               ← One row per student; mirrors CSV columns + cached risk fields
    │   ├── Assessment.js            ← Scored tests/quizzes per student
    │   ├── Prediction.js            ← ML prediction records & recommendations
    │   ├── Intervention.js          ← Teacher-assigned corrective actions
    │   └── OuladRecord.js           ← Pre-computed Module 3 data
    ├── middleware/
    │   ├── auth.js                  ← JWT protect + requireRole
    │   └── errorHandler.js          ← Centralised error responses
    ├── controllers/
    │   ├── authController.js        ← register, login, me
    │   ├── studentController.js     ← Full CRUD + pagination/search/filter/sort
    │   ├── assessmentController.js  ← Assessment creation & listing
    │   ├── predictionController.js  ← Predict score, store risk & recommendations
    │   ├── interventionController.js← Interventions CRUD & before/after impact calculation
    │   └── dashboardController.js   ← MongoDB aggregation pipeline summary
    ├── routes/
    │   ├── authRoutes.js            ← Auth endpoints with rate-limiting
    │   ├── studentRoutes.js         ← Student CRUD routes
    │   ├── assessmentRoutes.js      ← /api/students/:studentId/assessments (mergeParams)
    │   ├── predictionRoutes.js      ← /api/students/:studentId/predict & /api/predictions
    │   ├── interventionRoutes.js    ← /api/interventions & /api/students/:studentId/interventions
    │   └── dashboardRoutes.js       ← /api/dashboard/summary
    └── utils/
        ├── recommendations.js       ← Rule-based recommendations (11 rules, max 4 returned)
        └── scopeCheck.js            ← Teacher-scoping verification helper & risk-level mapper
```

---

## Data Notice — Real vs Simulated

| Data | Status |
|---|---|
| `data/final_student_exam_performance.csv` | **Real dataset** — used for ML training |
| `data/performiq_oulad_at_risk.csv` | **Real dataset** — OULAD pre-computed predictions |
| Any student/assessment/intervention records with `isSimulated: true` | **Simulated** — created by seed script for demo purposes |

---

## Setup

### 1. Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas account (free tier is fine)

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
```

### 4. Start the server
```bash
npm start          # production
npm run dev        # development with nodemon (auto-restart)
```

The server starts on `http://localhost:5000`.

---

## API Overview

All responses follow the shape:
```json
{ "success": true|false, "data": {...}, "message": "..." }
```

### 1. Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a teacher account (role locked to teacher) |
| POST | `/api/auth/login` | Public | Obtain a JWT token |
| GET | `/api/auth/me` | Bearer token | Return authenticated user info |

### 2. Student Endpoints

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/students` | Bearer | admin, teacher | List students (paginated, filtered, sorted) |
| POST | `/api/students` | Bearer | admin, teacher | Create student (teacher auto-assigned) |
| GET | `/api/students/:id` | Bearer | admin, teacher | Get student details |
| PUT | `/api/students/:id` | Bearer | admin, teacher | Update student fields |
| DELETE | `/api/students/:id` | Bearer | **admin only** | Delete student record |

### 3. Assessment Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/students/:studentId/assessments` | Bearer | Log an assessment (Quiz, Assignment, Midterm, etc.) |
| GET | `/api/students/:studentId/assessments` | Bearer | List all assessments for a student (oldest first) |

### 4. Prediction Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/students/:studentId/predict` | Bearer | Record prediction, evaluate risk, generate recommendations, & update student record |
| GET | `/api/students/:studentId/predictions` | Bearer | Get all predictions for a student (newest first) |
| GET | `/api/predictions?risk=High` | Bearer | List predictions across students (scoped to teacher) |

### 5. Intervention & Impact Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/interventions` | Bearer | Assign an intervention (Mentoring, Extra Practice, etc.) |
| GET | `/api/students/:studentId/interventions` | Bearer | List interventions for a specific student |
| PATCH | `/api/interventions/:id` | Bearer | Update intervention status (`planned`, `ongoing`, `completed`), notes, outcome |
| GET | `/api/interventions/:id/impact` | Bearer | Calculate before vs after assessment score averages & verdict |

### 6. Dashboard Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Bearer | Aggregated metrics: students by risk, average score, intervention counts, top recommendations |

---

## Role & Scoping Rules

- **admin** — sees all students, can assign/reassign teachers, can delete students, views global dashboard metrics
- **teacher** — sees **only** students where `assignedTeacher == their own ID`. Teacher scoping is enforced across:
  - Student listings and detail lookups
  - Assessment logs and reads
  - Prediction requests and history
  - Intervention assignments and updates
  - Dashboard statistics (aggregates only their assigned students)
