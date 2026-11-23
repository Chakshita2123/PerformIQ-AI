# PerformIQ API Reference

> **Base URL:** `http://localhost:5000/api`  
> **Authentication:** All protected endpoints require `Authorization: Bearer <token>` header.  
> **Content-Type:** `application/json` for all requests with a body.

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | None | Log in and receive a JWT |
| `GET` | `/auth/me` | Required | Return the authenticated user's profile |

### POST /auth/login

**Request body:**
```json
{ "email": "admin@performiq.dev", "password": "AdminDemo123!" }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "_id": "...", "name": "Admin", "role": "admin" }
  }
}
```

---

## Students

> Teachers see only their own assigned students. Admins see all.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/students` | Required | Paginated student list (search, filter by risk, sort) |
| `POST` | `/students` | Admin | Create a new student |
| `GET` | `/students/:id` | Required | Get one student by MongoDB ObjectId |
| `PUT` | `/students/:id` | Admin | Update student fields |
| `DELETE` | `/students/:id` | Admin | Soft-delete a student |

### GET /students — query parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Partial match on name or studentId |
| `riskLevel` | `High\|Medium\|Low` | Filter by latest risk level |
| `sortBy` | string | Field to sort by (default: `createdAt`) |
| `order` | `asc\|desc` | Sort direction (default: `desc`) |

---

## Assessments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/students/:id/assessments` | Required | List all assessments for a student |
| `POST` | `/students/:id/assessments` | Required | Record a new assessment |
| `DELETE` | `/students/:id/assessments/:aid` | Admin | Delete an assessment |

### POST /students/:id/assessments — body

```json
{ "score": 72.5, "date": "2026-11-01", "notes": "Midterm" }
```

---

## Predictions (Module 1)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/students/:id/predict` | Required | Run ML prediction for a student |
| `GET` | `/students/:id/predictions` | Required | List prediction history |
| `GET` | `/predictions` | Admin | Global prediction list (filter by `risk`) |

### POST /students/:id/predict

Sends the student's current fields to the FastAPI ML service. The model's
predicted score (0–100) is saved as a `Prediction` document and the student's
`latestPredictedScore` / `latestRiskLevel` are updated.

**Optional body (admin only):**
```json
{ "predictedScore": 65.0 }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "predictedScore": 61.42,
    "riskLevel": "Medium",
    "recommendations": ["Increase study hours per day", "..."],
    "missingFieldsCount": 2,
    "source": "ml_service"
  }
}
```

---

## Interventions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/interventions` | Required | Create an intervention for a student |
| `GET` | `/interventions` | Required | Paginated intervention list (filter by status / student) |
| `PATCH` | `/interventions/:id` | Required | Update status or notes |
| `GET` | `/interventions/:id/impact` | Required | Compute pre/post score impact |
| `GET` | `/students/:id/interventions` | Required | All interventions for one student |

### GET /interventions — query parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `status` | `planned\|ongoing\|completed` | Filter by status |
| `student` | ObjectId | Filter by student ID |

### POST /interventions — body

```json
{
  "student": "<student ObjectId>",
  "type": "Academic Support",
  "description": "Weekly tutoring sessions",
  "startDate": "2026-11-01",
  "status": "ongoing"
}
```

### GET /interventions/:id/impact

Returns average assessment score before and after the intervention's `startDate`
and a verdict (`improved`, `declined`, `no_change`, or `insufficient data`).

**Response `200` example:**
```json
{
  "success": true,
  "data": {
    "beforeAvg": 54.3,
    "afterAvg": 68.1,
    "delta": 13.8,
    "verdict": "improved",
    "beforeCount": 3,
    "afterCount": 2
  }
}
```

---

## Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/dashboard/summary` | Required | Aggregated stats for the current user's scope |

**Response fields:**
```json
{
  "success": true,
  "data": {
    "students": {
      "total": 5000,
      "byRiskLevel": { "High": 821, "Medium": 1437, "Low": 2718, "unassessed": 24 },
      "avgPredictedScore": 63.47
    },
    "interventions": { "planned": 300, "ongoing": 1000, "completed": 3250, "total": 4550 },
    "topRecommendations": [
      { "reason": "Increase study hours per day", "count": 712 }
    ]
  }
}
```

---

## OULAD Early Warning (Module 3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/oulad/analytics` | Required | ROC-AUC scores by day cut-off (40, 60, 180) |
| `GET` | `/oulad/at-risk` | Required | High-risk students in OULAD benchmark cohort |

---

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Backend health check (env, DB name) |

---

## Common error codes

| Status | Meaning |
|--------|---------|
| `400` | Validation error or bad input |
| `401` | Missing or invalid JWT |
| `403` | Authorisation denied (teacher accessing admin-only resource) |
| `404` | Resource not found |
| `409` | Duplicate key (e.g. duplicate email) |
| `503` | ML service is unreachable |
| `500` | Unexpected server error |

All errors follow the shape `{ "success": false, "message": "..." }`.
