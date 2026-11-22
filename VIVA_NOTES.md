# VIVA_NOTES.md — Plain-English Explanation of Every Concept

This file is your complete viva preparation guide. Every concept used in Phase 1 & Phase 2 is explained with:
- **What it is** in plain English
- **Why we use it**
- **Line-by-line explanation of complex code (like the Aggregation Pipeline)**
- **Likely viva questions with concise, high-scoring answers**

---

## 1. REST API & Architecture

**What it is:**  
REST (Representational State Transfer) is an architectural style for networked applications. You interact with resources (students, assessments, interventions) using standard HTTP methods:
- `GET` — read / retrieve
- `POST` — create new resource
- `PUT` — complete replace or update of a resource
- `PATCH` — partial update of specific fields
- `DELETE` — remove resource

**Status Codes in PerformIQ:**
- `200 OK` — successful query or update
- `201 Created` — resource successfully created
- `400 Bad Request` — validation error (e.g., negative score, invalid enum)
- `401 Unauthorized` — missing or invalid JWT
- `403 Forbidden` — authenticated, but forbidden from resource (e.g., teacher trying to delete student)
- `404 Not Found` — resource doesn't exist
- `409 Conflict` — duplicate key (e.g., email or studentId already registered)
- `429 Too Many Requests` — rate limit exceeded

---

## 2. Express.js Routing & Sub-Routers (`mergeParams: true`)

**What it is:**  
In Phase 2, assessment routes look like:
`/api/students/:studentId/assessments`

When nesting an Express router under a parent router path containing URL parameters (like `:studentId`), by default Express creates a fresh params object, hiding `:studentId` from the child router!

**Why `mergeParams: true` is crucial:**
```javascript
const router = express.Router({ mergeParams: true });
```
With `mergeParams: true`, the child router inherits `req.params.studentId` from the parent route path.

**Viva Q: Why do we pass `{ mergeParams: true }` to `express.Router()`?**  
> By default, child routers cannot see URL parameters declared in the parent router's path. Setting `mergeParams: true` ensures parent route params (like `:studentId`) are preserved and accessible in the child router handlers.

---

## 3. MongoDB Aggregation Pipeline (Deep Dive)

### What is an Aggregation Pipeline?
Think of MongoDB aggregation like an **assembly line** or a **Unix pipeline** (`cat | grep | sort | head`):
- Raw documents enter Stage 1.
- Stage 1 filters or transforms them and passes the output to Stage 2.
- Stage 2 processes that output and passes it to Stage 3, until the final formatted document emerges.

In `dashboardController.js`, we use three aggregation pipelines to compute the dashboard statistics in real time.

---

### Pipeline A: Student Stats Line-by-Line

```javascript
const studentStats = await Student.aggregate([
  // STAGE 1: $match
  { $match: studentMatch },

  // STAGE 2: $group
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      avgPredictedScore: { $avg: '$latestPredictedScore' },
      highRisk: {
        $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'High'] }, 1, 0] },
      },
      mediumRisk: {
        $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'Medium'] }, 1, 0] },
      },
      lowRisk: {
        $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'Low'] }, 1, 0] },
      },
      // Students who have never had a prediction yet (missing or null latestRiskLevel)
      unassessed: {
        $sum: {
          $cond: [
            { $eq: [{ $ifNull: ['$latestRiskLevel', null] }, null] },
            1,
            0,
          ],
        },
      },
    },
  },
]);
```

#### Line-by-Line Explanation:
1. `Student.aggregate([...])` — Runs a native MongoDB aggregation on the `students` collection.
2. `{ $match: studentMatch }` — Equivalent to SQL `WHERE`. If a teacher is logged in, `studentMatch` is `{ assignedTeacher: req.user._id }`. Only that teacher's students pass to the next stage. For admin, it's `{}` (all students).
3. `{ $group: { _id: null, ... } }` — Groups all matching documents into **one single summary document** (`_id: null` means no partitioning).
4. `total: { $sum: 1 }` — Adds 1 for every document that reaches this stage, producing the total count.
5. `avgPredictedScore: { $avg: '$latestPredictedScore' }` — Computes the mathematical mean of `latestPredictedScore`. Mongoose/MongoDB automatically ignores `null` values so unassessed students don't distort the average.
6. `highRisk` / `mediumRisk` / `lowRisk`: Counts students by matching their `latestRiskLevel`.
7. `unassessed: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$latestRiskLevel', null] }, null] }, 1, 0] } }` — Uses `$ifNull` to treat missing or `null` values as `null`. When matched, it contributes 1 to the unassessed count.

---

### Pipeline B: Intervention Counts Line-by-Line

```javascript
const interventionStats = await Intervention.aggregate([
  // STAGE 1: $lookup
  {
    $lookup: {
      from: 'students',
      localField: 'student',
      foreignField: '_id',
      as: 'studentDoc',
    },
  },
  // STAGE 2: $unwind
  { $unwind: '$studentDoc' },
  // STAGE 3: $match
  {
    $match: req.user.role === 'teacher'
      ? { 'studentDoc.assignedTeacher': req.user._id }
      : {},
  },
  // STAGE 4: $group
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
    },
  },
]);
```

#### Line-by-Line Explanation:
1. `{ $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentDoc' } }` — Equivalent to SQL `LEFT JOIN`. Since interventions only store the student's ObjectId, we join the `students` collection to check who the assigned teacher is.
2. `{ $unwind: '$studentDoc' }` — `$lookup` always returns an array `[ { ... } ]`. `$unwind` deconstructs the array so `studentDoc` becomes a direct embedded object.
3. `{ $match: { 'studentDoc.assignedTeacher': req.user._id } }` — Filters the interventions based on the joined student's assigned teacher.
4. `{ $group: { _id: '$status', count: { $sum: 1 } } }` — SQL `GROUP BY status`. Produces separate documents for each distinct status (e.g. `{ _id: 'planned', count: 3 }`, `{ _id: 'ongoing', count: 2 }`).

---

### Pipeline C: Top 5 Recommendations (Only Latest Prediction per Student)

```javascript
const topRecommendations = await Prediction.aggregate([
  // STAGE 1: $lookup to join student details
  {
    $lookup: {
      from: 'students',
      localField: 'student',
      foreignField: '_id',
      as: 'studentDoc',
    },
  },
  // STAGE 2: $unwind joined studentDoc
  { $unwind: '$studentDoc' },
  // STAGE 3: $match teacher scoping
  {
    $match: req.user.role === 'teacher'
      ? { 'studentDoc.assignedTeacher': req.user._id }
      : {},
  },
  // STAGE 4: $sort by createdAt descending (newest predictions first)
  { $sort: { createdAt: -1 } },
  // STAGE 5: $group by student, picking only their LATEST prediction ($first)
  {
    $group: {
      _id: '$student',
      latestPrediction: { $first: '$$ROOT' },
    },
  },
  // STAGE 6: $unwind the recommendations array of that latest prediction only
  { $unwind: '$latestPrediction.recommendations' },
  // STAGE 7: $group by recommendation string and count across students
  {
    $group: {
      _id: '$latestPrediction.recommendations',
      count: { $sum: 1 },
    },
  },
  // STAGE 8: $sort descending by frequency
  { $sort: { count: -1 } },
  // STAGE 9: $limit top 5
  { $limit: 5 },
]);
```

#### Line-by-Line Explanation:
1. `Stages 1–3` — Joins the student document and scopes to the teacher's students.
2. `STAGE 4: { $sort: { createdAt: -1 } }` — Orders predictions newest first.
3. `STAGE 5: { $group: { _id: '$student', latestPrediction: { $first: '$$ROOT' } } }` — **Crucial deduplication step!** Groups predictions by student ID. Because the stream was sorted newest first, `{ $first: '$$ROOT' }` retains ONLY the student's most recent prediction and discards older historical predictions.
4. `STAGE 6: { $unwind: '$latestPrediction.recommendations' }` — Unwinds the recommendations array from only that latest prediction into separate documents.
5. `STAGE 7: { $group: { _id: '$latestPrediction.recommendations', count: { $sum: 1 } } }` — Groups by the recommendation text and counts occurrences across students.
6. `STAGE 8 & 9` — Sorts descending by count and limits the output to the top 5 reasons.

---

## 4. Improvement Tracking Logic (`GET /api/interventions/:id/impact`)

**How it works:**
1. An intervention has a `startDate`.
2. All assessments for the student are split into two groups based on the intervention date:
   - **Before:** `date < startDate`
   - **After:** `date >= startDate`
3. If `beforeDocs.length === 0 || afterDocs.length === 0`:
   - Returns `verdict: "insufficient data"`
   - Returns `before: null`, `after: null`, `delta: null` (never NaN or 0)
   - Returns a clear human-readable message specifying whether assessments were missing before, after, or both.
4. If assessments exist on both sides:
   - Computes percentage score for each assessment: `(score / maxScore) * 100`.
   - Computes average percentage for both groups: `delta = afterAvg - beforeAvg`.
   - **Verdict criteria:**
     - `delta > 3` → `'improved'`
     - `delta < -3` → `'declined'`
     - otherwise → `'no clear change'`

**Viva Q: Why compare percentage score rather than raw score in impact tracking?**  
> Assessments have different `maxScore` values (e.g., a quiz out of 20 vs an exam out of 100). Converting all scores to a normalized percentage `(score / maxScore) * 100` allows fair before-and-after comparison.

---

## 5. Denormalisation on Student Document

When a prediction is saved:
```javascript
await Student.findByIdAndUpdate(student._id, {
  latestPredictedScore: score,
  latestRiskLevel: riskLevel,
});
```

**Viva Q: Why duplicate latestRiskLevel onto the Student model instead of querying the Prediction collection?**  
> Query optimization. The student list endpoint supports pagination, text search, and filtering by risk level (`?riskLevel=High`). If risk level was only in the `predictions` collection, listing students filtered by risk would require joining collections or performing two queries on every page load. Caching `latestRiskLevel` on `Student` allows an indexed, single-query filter.

---

## 6. Likely Viva Questions & Answers

**Q: What is the difference between `$match` in an aggregation pipeline and `find()`?**  
> `find()` queries documents and returns them directly to the Node.js application. `$match` is a pipeline stage inside the database engine that filters documents before passing them to downstream stages (like `$group` or `$sort`), reducing memory and network overhead.

**Q: What does `$unwind` do in MongoDB?**  
> `$unwind` deconstructs an array field from input documents to output a document for each element in the array. For example, if an array has 3 elements, `$unwind` produces 3 documents.

**Q: What is the purpose of `$lookup`?**  
> `$lookup` performs an equality match (left outer join) between fields in the current collection and a target collection, attaching matching documents as an array.

**Q: How do you prevent a teacher from accessing another teacher's student in nested endpoints?**  
> We use the `getOwnedStudent(studentId, req.user)` helper. It verifies that the student exists and, if the logged-in user has role `'teacher'`, confirms that `student.assignedTeacher.toString() === req.user._id.toString()`. If not, it returns `403 Forbidden`.

**Q: Why do we clamp predicted scores to 0–100?**  
> Regression models can occasionally output values slightly below 0 or above 100 due to extreme feature values. Clamping with `Math.min(100, Math.max(0, score))` guarantees that exam scores stay within realistic boundaries.
