# Phase 5 — Test script
# Run all of these from a SECOND terminal (keep the server running in the first one).
# Server must be started with: cd backend && npm start

# ── Test 1: Browser page loads ──────────────────────────────────────────────
# Open http://localhost:3000 in browser. Expected: HTML page with student table.
# Server terminal should log: [request] GET /

# ── Test 2: GET all students ─────────────────────────────────────────────────
curl http://localhost:3000/api/students
# Expected: JSON array with 3 students (Aarav, Simran, Rohan)

# ── Test 3: GET one student ──────────────────────────────────────────────────
curl http://localhost:3000/api/students/1
# Expected: {"id":1,"name":"Aarav Sharma",...}

curl http://localhost:3000/api/students/999
# Expected: {"error":"Student with id 999 not found"}  (404)

# ── Test 4: POST — valid new student ────────────────────────────────────────
curl -X POST http://localhost:3000/api/students `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Test Student\",\"attendance\":75,\"internalMarks\":20,\"assignmentMarks\":15,\"studyHours\":12}"
# Expected: {"id":4,"name":"Test Student",...}  (201)
# Server terminal: [request] POST /api/students  AND  [studentCreated] id=4 name="Test Student"

# ── Test 5: POST — invalid data (bad fields) ─────────────────────────────────
curl -X POST http://localhost:3000/api/students `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"\",\"attendance\":150,\"internalMarks\":\"hello\"}"
# Expected: {"errors":["name must be a non-empty string","attendance must be a number...","internalMarks..."]}  (400)

# ── Test 6: POST — empty body ────────────────────────────────────────────────
curl -X POST http://localhost:3000/api/students `
  -H "Content-Type: application/json" `
  -d ""
# Expected: {"error":"Request body is empty"}  (400)

# ── Test 7: POST — broken JSON ───────────────────────────────────────────────
curl -X POST http://localhost:3000/api/students `
  -H "Content-Type: application/json" `
  -d "not json at all"
# Expected: {"error":"Invalid JSON in request body"}  (400)

# ── Test 8: PUT — update student 4 ──────────────────────────────────────────
curl -X PUT http://localhost:3000/api/students/4 `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Updated Student\",\"attendance\":80,\"internalMarks\":25,\"assignmentMarks\":18,\"studyHours\":20}"
# Expected: {"id":4,"name":"Updated Student",...}  (200)
# Server terminal: [studentUpdated] id=4 name="Updated Student"

# ── Test 9: PUT — update non-existent id ─────────────────────────────────────
curl -X PUT http://localhost:3000/api/students/999 `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Nobody\",\"attendance\":80,\"internalMarks\":25,\"assignmentMarks\":18,\"studyHours\":20}"
# Expected: {"error":"Student with id 999 not found"}  (404)

# ── Test 10: DELETE — delete student 4 ──────────────────────────────────────
curl -X DELETE http://localhost:3000/api/students/4
# Expected: (no body, just HTTP 204 status)
# Server terminal: [studentDeleted] id=4 name="Updated Student"

curl http://localhost:3000/api/students/4
# Expected: {"error":"Student with id 4 not found"}  (404)

# ── Test 11: Wrong method ──────────────────────────────────────────────────
curl -X DELETE http://localhost:3000/api/students
# Expected: {"error":"Method not allowed"}  (405)

curl -X POST http://localhost:3000/api/students/1 `
  -H "Content-Type: application/json" -d "{}"
# Expected: {"error":"Method not allowed"}  (405)

# ── Test 12: Unknown route ────────────────────────────────────────────────
curl http://localhost:3000/api/foo
# Expected: {"error":"Route not found"}  (404)

# ── Test 13: Persistence ──────────────────────────────────────────────────
# Stop the server (Ctrl+C in server terminal), restart it, then:
curl http://localhost:3000/api/students
# Expected: still 3 students (Aarav, Simran, Rohan — student 4 was deleted)

# ── Test 14: Missing students.json ───────────────────────────────────────
# Stop server. Delete students.json. Restart. Then:
#   del backend\students.json
#   npm start (in backend/)
curl http://localhost:3000/api/students
# Expected: []   AND students.json is recreated automatically

# ── Test 15: Corrupted students.json ─────────────────────────────────────
# Stop server. Overwrite students.json with garbage:
#   echo "not json" > backend\students.json
#   npm start (in backend/)
curl http://localhost:3000/api/students
# Expected: {"error":"Internal server error"}  (500)
# Server terminal: [error] Unexpected token ...
# Restore: copy the original JSON back into backend\students.json and restart.

# ── Test 16: Port already in use ─────────────────────────────────────────
# With server running, open a THIRD terminal:
#   cd backend && node server.js
# Expected: Port 3000 is already in use. Stop the other server first.
