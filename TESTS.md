# TESTS.md — How to Test Every Endpoint

All examples use standard `curl`. Replace `TOKEN` with the JWT returned by login/register.

---

## 0. Automated Test Suites & Database Isolation

Both test suites are **self-cleaning**: they automatically remove all test users, students, assessments, predictions, and interventions created during the run, leaving zero residue in the database.

From the `backend/` directory:
```bash
node test-phase1.js   # Runs Phase 1 test suite (Auth & Student CRUD)
node test-phase2.js   # Runs Phase 2 test suite (Assessments, Predict, Interventions, Impact, Dashboard)
```

To run against a dedicated test database (e.g. `performiq_test`):
```bash
# In Bash:
NODE_ENV=test node test-phase1.js
NODE_ENV=test node test-phase2.js

# In PowerShell:
$env:NODE_ENV="test"; node test-phase1.js; node test-phase2.js; Remove-Item Env:\NODE_ENV
```

### Manual Database Clean-Up Tool
If any test data was previously created and you want to clean it up:
```bash
node scripts/cleanTestData.js
```

---

## 1. Authentication

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

### Save Token to Environment Variable (Bash / PowerShell)
```bash
# In Bash:
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@school.com\",\"password\":\"secret123\"}" | jq -r '.data.token')

# In PowerShell:
$resp = curl.exe -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"alice@school.com\",\"password\":\"secret123\"}' | ConvertFrom-Json
$TOKEN = $resp.data.token
```

---

## 2. Students CRUD

### Create Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"STU_000001\",
    \"name\": \"Bob Smith\",
    \"age\": 18,
    \"gender\": \"Male\",
    \"education_level\": \"High School\",
    \"school_type\": \"Public\",
    \"attendance_percentage\": 70,
    \"assignment_completion_rate\": 55,
    \"study_hours_per_day\": 1.5,
    \"sleep_hours\": 5,
    \"exam_anxiety_level\": 9.8,
    \"previous_exam_score\": 48,
    \"revision_frequency\": \"Rarely\",
    \"study_consistency\": \"Low\",
    \"class_participation\": \"Low\",
    \"practice_tests_completed\": 2,
    \"time_management_score\": 60
  }"
```

### List Students (with Pagination & Filter)
```bash
curl "http://localhost:5000/api/students?page=1&limit=10&riskLevel=High" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Assessments

### Add Assessment Before Intervention
```bash
curl -X POST http://localhost:5000/api/students/STUDENT_ID/assessments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Diagnostic Quiz 1\",
    \"type\": \"Quiz\",
    \"score\": 40,
    \"maxScore\": 100,
    \"date\": \"2025-01-15\"
  }"
```

### Add Assessment After Intervention
```bash
curl -X POST http://localhost:5000/api/students/STUDENT_ID/assessments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Post-Intervention Quiz 2\",
    \"type\": \"Quiz\",
    \"score\": 80,
    \"maxScore\": 100,
    \"date\": \"2025-03-25\"
  }"
```

### List Assessments for a Student
```bash
curl http://localhost:5000/api/students/STUDENT_ID/assessments \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Predictions & Recommendations

### Create Prediction (Manual Score in Phase 2)
```bash
curl -X POST http://localhost:5000/api/students/STUDENT_ID/predict \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"predictedScore\": 45}"
```
**Expected Response:**
- `riskLevel`: `"High"` (since score < 50)
- `recommendations`: Up to 4 tailored action strings based on student's low attendance, sleep, study hours, etc.
- Also updates `latestPredictedScore` and `latestRiskLevel` on the Student document!

### Get Predictions for One Student
```bash
curl http://localhost:5000/api/students/STUDENT_ID/predictions \
  -H "Authorization: Bearer $TOKEN"
```

### Query High-Risk Predictions (Global)
```bash
curl "http://localhost:5000/api/predictions?risk=High" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Interventions & Impact Tracking

### Create an Intervention
```bash
curl -X POST http://localhost:5000/api/interventions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"student\": \"STUDENT_ID\",
    \"type\": \"Mentoring\",
    \"description\": \"Weekly 1-on-1 academic coaching\",
    \"startDate\": \"2025-02-01\",
    \"status\": \"ongoing\"
  }"
```

### Update Intervention Status
```bash
curl -X PATCH http://localhost:5000/api/interventions/INTERVENTION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"completed\",
    \"notes\": \"Student attended all sessions\",
    \"outcome\": \"Attendance and confidence noticeably improved\"
  }"
```

### Check Intervention Impact (Improvement Tracking)
```bash
curl http://localhost:5000/api/interventions/INTERVENTION_ID/impact \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
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
*Note: If delta > 3 → `improved`; delta < -3 → `declined`; else → `no clear change`.*

**Expected Response when assessments are missing (Insufficient Data):**
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

## 6. Dashboard Summary (Aggregation Pipeline)

```bash
curl http://localhost:5000/api/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "students": {
      "total": 5,
      "byRiskLevel": {
        "High": 2,
        "Medium": 1,
        "Low": 1,
        "unassessed": 1
      },
      "avgPredictedScore": 54.33
    },
    "interventions": {
      "planned": 1,
      "ongoing": 2,
      "completed": 1
    },
    "topRecommendations": [
      {
        "reason": "Attendance is below 75%. Regular class attendance is strongly linked to exam performance. Try to attend every session.",
        "count": 3
      },
      {
        "reason": "Daily study time is under 2 hours. Aim for at least 2–3 focused hours each day to build consistent understanding.",
        "count": 3
      }
    ]
  }
}
```
*Teacher Scoping Check: For a teacher, metrics reflect ONLY their assigned students.*
