# TESTS.md — How to Test Every Endpoint

All examples use `curl`. Replace `TOKEN` with the JWT returned by login/register.

---

## 0. Health Check

```bash
curl http://localhost:5000/api/health
```
**Expected:**
```json
{ "success": true, "message": "PerformIQ API is running" }
```

---

## 1. Auth

### Register (creates a teacher account)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Alice Teacher\", \"email\": \"alice@school.com\", \"password\": \"secret123\"}"
```
**Expected:** 201, body contains `token` and `user` with `role: "teacher"`

**Security check — role cannot be injected:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Hacker\", \"email\": \"hack@x.com\", \"password\": \"secret123\", \"role\": \"admin\"}"
```
**Expected:** 201 but `role` in response is still `"teacher"`, not `"admin"` ✅

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"alice@school.com\", \"password\": \"secret123\"}"
```
**Expected:** 200, body contains `token`

**Wrong password (same message as wrong email):**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"alice@school.com\", \"password\": \"wrongpassword\"}"
```
**Expected:** 401, `"message": "Invalid email or password"` ✅

**Wrong email:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"nobody@x.com\", \"password\": \"secret123\"}"
```
**Expected:** 401, same message `"Invalid email or password"` ✅

### Get Current User
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** 200, user object without `passwordHash`

### Rate limiting
```bash
# Run this 11 times quickly — the 11th should return 429
for i in 1 2 3 4 5 6 7 8 9 10 11; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"x@x.com\", \"password\": \"x\"}"
done
```

---

## 2. Students

> Save your token first:
> ```bash
> TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
>   -H "Content-Type: application/json" \
>   -d "{\"email\":\"alice@school.com\",\"password\":\"secret123\"}" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).data.token))")
> ```

### Create a student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\": \"STU_000001\",
    \"name\": \"Bob Smith\",
    \"age\": 18,
    \"gender\": \"Male\",
    \"education_level\": \"High School\",
    \"school_type\": \"Public\",
    \"attendance_percentage\": 72,
    \"assignment_completion_rate\": 55,
    \"study_hours_per_day\": 1.5,
    \"sleep_hours\": 5.5,
    \"exam_anxiety_level\": 9.8,
    \"previous_exam_score\": 48,
    \"revision_frequency\": \"Rarely\",
    \"study_consistency\": \"Low\",
    \"class_participation\": \"Low\",
    \"practice_tests_completed\": 2,
    \"time_management_score\": 60
  }"
```
**Expected:** 201, student object. `assignedTeacher` is auto-set to Alice's ID. ✅

### List students (paginated)
```bash
curl "http://localhost:5000/api/students?page=1&limit=5" \
  -H "Authorization: Bearer TOKEN"
```

### Search by name
```bash
curl "http://localhost:5000/api/students?search=Bob" \
  -H "Authorization: Bearer TOKEN"
```

### Filter by risk level
```bash
curl "http://localhost:5000/api/students?riskLevel=High" \
  -H "Authorization: Bearer TOKEN"
```
*(returns empty until a prediction is saved — Phase 3)*

### Sort by name ascending
```bash
curl "http://localhost:5000/api/students?sortBy=name&order=asc" \
  -H "Authorization: Bearer TOKEN"
```

### Get one student
```bash
curl http://localhost:5000/api/students/STUDENT_ID \
  -H "Authorization: Bearer TOKEN"
```

### Update a student
```bash
curl -X PUT http://localhost:5000/api/students/STUDENT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"attendance_percentage\": 85, \"study_hours_per_day\": 3}"
```

### Delete (admin only)
```bash
# This will fail (403) if TOKEN belongs to a teacher
curl -X DELETE http://localhost:5000/api/students/STUDENT_ID \
  -H "Authorization: Bearer TOKEN"
```
**Expected with teacher token:** 403 Forbidden ✅  
**Expected with admin token:** 200 Student deleted

---

## 3. Auth middleware checks

### No token
```bash
curl http://localhost:5000/api/students \
  -H "Authorization: Bearer invalidtoken"
```
**Expected:** 401 "Invalid or expired token"

### Missing token
```bash
curl http://localhost:5000/api/students
```
**Expected:** 401 "Not authenticated"

---

## 4. Validation checks

### Invalid enum value
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\": \"STU_X\", \"name\": \"Test\", \"gender\": \"Unknown\"}"
```
**Expected:** 400 "gender must be Female, Male or Other"

### Missing required field
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"No ID\"}"
```
**Expected:** 400 "studentId is required"
