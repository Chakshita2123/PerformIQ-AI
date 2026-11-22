# TESTS.md — How to Test Every Endpoint

All examples use standard `curl`. Replace `TOKEN` with the JWT returned by login/register.

---

## 0. Automated Test Suites & Database Isolation

Both test suites are **self-cleaning** and run against the isolated `performiq_test` database:

From the `backend/` directory:
```bash
npm test
```
This runs `scripts/run-tests.js` which:
1. Sets `NODE_ENV=test` in pure Node.js (cross-platform for Windows PowerShell, Bash, CMD).
2. Verifies the connection to `performiq_test` via `GET /api/health`.
3. Runs Phase 1 test suite (41 assertions).
4. Runs Phase 2 & 3 test suite (40 assertions).
5. Cleans up all created test documents automatically.

### Manual Database Clean-Up Tool
If you ever want to scan and remove any test data manually:
```bash
node scripts/cleanTestData.js
```
*(Strictly matches test prefixes like `STU_TEST_`, `STU_P2_`, `alice_\d+@`, etc. and NEVER touches real or seeded students).*

---

## 1. FastAPI ML Service (Port 8000)

### ML Service Health Check
```bash
curl http://127.0.0.1:8000/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "service": "PerformIQ ML Service",
  "model_loaded": true
}
```

### Direct Model Prediction (FastAPI)
```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 18,
    "gender": "Male",
    "previous_exam_score": 75,
    "attendance_percentage": 85,
    "study_hours_per_day": 3.5,
    "sleep_hours": 7.0
  }'
```
*Note: Any missing fields are sent as `null` and automatically imputed by the scikit-learn pipeline.*

**Expected Response:**
```json
{
  "success": true,
  "predicted_score": 65.59
}
```

---

## 2. Authentication

### Register (Teacher)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Alice Teacher\", \"email\": \"alice@school.com\", \"password\": \"secret123\"}"
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"alice@school.com\", \"password\": \"secret123\"}"
```

### Save Token (PowerShell)
```powershell
$resp = curl.exe -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"alice@school.com\",\"password\":\"secret123\"}' | ConvertFrom-Json
$TOKEN = $resp.data.token
```

---

## 3. Predictions & Recommendations (Phase 3 Integration)

### Live Model Prediction via Express
```bash
curl -X POST http://localhost:5000/api/students/STUDENT_ID/predict \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"
```
**What happens behind the scenes:**
1. Express reads student fields from MongoDB.
2. Formats all 37 input columns (nulls for missing fields).
3. Calls `POST http://localhost:8000/predict` on the ML service.
4. Clips score to `0–100` and computes risk level (`High` if < 50, `Medium` if 50–59, `Low` if >= 60).
5. Generates up to 4 recommendations.
6. Saves `Prediction` document with `source: "module1"`.
7. Updates `latestPredictedScore` and `latestRiskLevel` on the `Student` document.

**Expected Response:**
```json
{
  "success": true,
  "message": "Prediction saved",
  "data": {
    "prediction": {
      "student": "STUDENT_ID",
      "predictedScore": 65.59,
      "riskLevel": "Low",
      "recommendations": [
        "Attendance is below 75%. Regular class attendance is strongly linked to exam performance. Try to attend every session."
      ],
      "source": "module1"
    }
  }
}
```

### Admin Manual Override
```bash
# Only works with an admin token
curl -X POST http://localhost:5000/api/students/STUDENT_ID/predict \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"predictedScore\": 45}"
```
**Expected Response:** `source: "manual"`, `predictedScore: 45`, `riskLevel: "High"`.  
*(If a teacher sends `predictedScore`, the manual score is ignored and the ML service is called instead).*

### ML Service Down (503 Error Handling)
If the FastAPI ML service is stopped or unreachable, calling `/predict` returns:
```json
{
  "success": false,
  "message": "ML service unavailable. Please check that the prediction service is running."
}
```
HTTP Status: `503 Service Unavailable`.

---

## 4. Improvement Tracking (`GET /api/interventions/:id/impact`)

```bash
curl http://localhost:5000/api/interventions/INTERVENTION_ID/impact \
  -H "Authorization: Bearer $TOKEN"
```

**Response with Assessment Data:**
```json
{
  "success": true,
  "data": {
    "interventionId": "...",
    "startDate": "2025-02-01T00:00:00.000Z",
    "assessmentsBefore": 1,
    "assessmentsAfter": 1,
    "before": 40.0,
    "after": 80.0,
    "delta": 40.0,
    "verdict": "improved"
  }
}
```

**Response with Missing Assessments (Insufficient Data):**
```json
{
  "success": true,
  "message": "Insufficient data: no assessments recorded before the intervention start date.",
  "data": {
    "interventionId": "...",
    "startDate": "2025-02-01T00:00:00.000Z",
    "assessmentsBefore": 0,
    "assessmentsAfter": 1,
    "before": null,
    "after": null,
    "delta": null,
    "verdict": "insufficient data"
  }
}
```

---

## 5. Dashboard Summary (Aggregation Pipeline)

```bash
curl http://localhost:5000/api/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"
```
**Teacher Scoping Check:**
- Metrics and counts reflect **only** the authenticated teacher's assigned students.
- Unassessed count correctly uses `$ifNull` to identify students without predictions.
- Top 5 recommendations only include each student's **latest** prediction.

---

## 6. OULAD Early Warning & Benchmarks (Module 3)

### At-Risk Students List
```bash
curl "http://localhost:5000/api/oulad/at-risk?page=1&limit=10&code_module=BBB&risk_level=High%20Risk" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id_student": 588713,
        "code_module": "BBB",
        "risk_prob": 0.99,
        "risk_level": "High Risk",
        "total_clicks": 9,
        "click_change": 0,
        "n_missed": 3,
        "avg_score": null,
        "score_trend": null,
        "recommendations": [
          "Missed 2+ assessments -> deadline reminders, contact tutor",
          "Very low platform activity -> encourage use of course materials"
        ]
      }
    ],
    "pagination": {
      "total": 574,
      "page": 1,
      "pages": 58,
      "limit": 10
    }
  }
}
```

### Search by Student ID
```bash
curl "http://localhost:5000/api/oulad/at-risk?search=425136" \
  -H "Authorization: Bearer $TOKEN"
```

### Cutoff Benchmark Performance (ROC-AUC / Recall / Precision)
```bash
curl http://localhost:5000/api/oulad/cutoff-results \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "cutoff_day": 0,
        "students": 29496,
        "at_risk_share": 0.478,
        "ROC_AUC": 0.712,
        "Recall": 0.599,
        "Precision": 0.658
      },
      {
        "cutoff_day": 20,
        "students": 27913,
        "at_risk_share": 0.449,
        "ROC_AUC": 0.758,
        "Recall": 0.568,
        "Precision": 0.694
      }
    ]
  }
}
```

### Weekly Engagement Trends
```bash
curl http://localhost:5000/api/oulad/engagement \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Automated Test Suites & Verification

### Test Summary
- **Phase 1 Test Suite (`test-phase1.js`):** 41 assertions passed
- **Phase 2, 3 & 4 Test Suite (`test-phase2.js`):** 90 assertions passed (including OULAD endpoint testing)
- **Total Assertions:** **131 passed, 0 failed**
- **Test Database:** strictly `performiq_test` via `scripts/run-tests.js`

### ML Model Parity & Imputation Verification (`scripts/verifyPrediction.py`)
- Evaluates 5 random rows from `data/final_student_exam_performance.csv`: direct model vs FastAPI matched to 0.0000 delta.
- Evaluates raw rows where `device_availability == "None"` (parsed with `keep_default_na=False`): direct model with imputation vs FastAPI matched to 0.0000 delta.
- Evaluates student with 29 missing fields: direct model and FastAPI both predict 61.46 (identical and within [0, 100] bounds).
