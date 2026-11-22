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
├── server.js                        ← Entry point; sets up Express, middleware, routes
├── .env                             ← Secrets (never committed)
├── .env.example                     ← Template — copy this to .env
└── src/
    ├── config/
    │   └── db.js                    ← Mongoose.connect()
    ├── models/
    │   ├── User.js                  ← Teachers and admin
    │   ├── Student.js               ← One row per student; mirrors CSV columns
    │   ├── Assessment.js            ← Scored tests per student
    │   ├── Prediction.js            ← ML prediction results
    │   ├── Intervention.js          ← Teacher-assigned actions
    │   └── OuladRecord.js           ← Pre-computed Module 3 data
    ├── middleware/
    │   ├── auth.js                  ← JWT protect + requireRole
    │   └── errorHandler.js          ← Centralised error responses
    ├── controllers/
    │   ├── authController.js        ← register, login, me
    │   └── studentController.js     ← Full CRUD + pagination/search/filter/sort
    ├── routes/
    │   ├── authRoutes.js
    │   └── studentRoutes.js
    └── utils/
        └── recommendations.js       ← Rule-based recommendations (11 rules, max 4 returned)
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

### Auth endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a teacher account |
| POST | `/api/auth/login` | Public | Get a JWT token |
| GET | `/api/auth/me` | Bearer token | Get current user |

### Student endpoints

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/students` | Bearer | admin, teacher | List students (paginated) |
| POST | `/api/students` | Bearer | admin, teacher | Create a student |
| GET | `/api/students/:id` | Bearer | admin, teacher | Get one student |
| PUT | `/api/students/:id` | Bearer | admin, teacher | Update a student |
| DELETE | `/api/students/:id` | Bearer | **admin only** | Delete a student |

#### Query parameters for GET /api/students

| Param | Example | Description |
|---|---|---|
| `page` | `?page=2` | Page number (default 1) |
| `limit` | `?limit=20` | Items per page (default 10, max 100) |
| `search` | `?search=Alice` | Full-text search on name / studentId |
| `riskLevel` | `?riskLevel=High` | Filter by High / Medium / Low |
| `sortBy` | `?sortBy=name` | Field to sort by (default: createdAt) |
| `order` | `?order=asc` | asc or desc (default: desc) |

---

## Role Rules

- **admin** — sees all students, can assign/reassign teachers, can delete students
- **teacher** — sees only students where `assignedTeacher == their own id`; cannot change `assignedTeacher`
- Public `register` always creates a **teacher**; the admin is created by the seed script only

---

## Security Measures

| Measure | Library | Where |
|---|---|---|
| Secure HTTP headers | helmet | server.js |
| CORS whitelist | cors | server.js |
| Rate limiting (10/15 min) | express-rate-limit | authRoutes.js |
| Password hashing (bcrypt, 12 rounds) | bcryptjs | authController.js |
| JWT (signed with secret + expiry) | jsonwebtoken | authController.js |
| Input validation | express-validator | all routes |
| `passwordHash select:false` | Mongoose | User.js |
| Generic "Invalid email or password" | manual | authController.js |
