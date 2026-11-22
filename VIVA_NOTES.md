# VIVA_NOTES.md — Plain-English Explanation of Every Concept

This file is your complete study and viva preparation guide. Every concept across Phase 1, Phase 2, and Phase 3 is explained with:
- **What it is** in plain English
- **Why we use it**
- **Architecture & line-by-line code explanation**
- **Likely viva questions with concise, high-scoring answers**

---

## 1. REST API & Architecture

**What it is:**  
REST (Representational State Transfer) is an architectural style for web services where clients interact with resources using standard HTTP methods:
- `GET` — read / retrieve resource
- `POST` — create new resource
- `PUT` — complete update / replace
- `PATCH` — partial update of specific fields
- `DELETE` — remove resource

**HTTP Status Codes in PerformIQ:**
- `200 OK` — successful query or update
- `201 Created` — resource successfully created
- `400 Bad Request` — input validation error
- `401 Unauthorized` — missing or invalid JWT
- `403 Forbidden` — authenticated, but forbidden from resource (e.g. teacher trying to delete student or view another teacher's student)
- `404 Not Found` — resource doesn't exist
- `409 Conflict` — duplicate unique key (e.g. duplicate email or studentId)
- `429 Too Many Requests` — rate limit exceeded
- `503 Service Unavailable` — ML prediction microservice is offline or unreachable

---

## 2. Microservice Communication & Resilience (Node.js ↔ FastAPI)

**What it is:**  
PerformIQ uses a **microservices pattern**:
- The **Node.js Express API** handles authentication, database persistence, teacher scoping, and business logic.
- The **Python FastAPI service** loads the ML model into memory and serves predictions.

**How they communicate:**
1. Express calls FastAPI using `axios.post('http://localhost:8000/predict', payload)`.
2. A strict **timeout** (`5000ms`) prevents a hung Python process from blocking Node.js event loop workers.
3. If the Python service is offline, crashes, or returns an error, Express catches the exception and returns **`503 Service Unavailable`** with a clear message: `"ML service unavailable. Please check that the prediction service is running."`

**Viva Q: Why separate the ML model into a Python service instead of running it in Node.js?**  
> Machine learning libraries like scikit-learn, pandas, and numpy are natively built for Python with optimized C/Fortran backends. Decoupling ML into a dedicated FastAPI microservice keeps the Express server lightweight, allows independent scaling, and avoids blocking Node's single-threaded event loop during CPU-intensive inference.

**Viva Q: What happens if the ML service is down?**  
> The Express backend wraps the external HTTP call in a `try/catch` block with a 5-second timeout. If the call fails or times out, it gracefully responds with HTTP status `503 Service Unavailable` rather than crashing or throwing an unhandled 500 error.

---

## 3. Machine Learning Pipeline (Module 1)

### The Saved Model (`performiq_model.joblib`)
The model is a scikit-learn `Pipeline` consisting of two main stages:
1. **Preprocessor (`ColumnTransformer`)**:
   - **Numeric features** (e.g. `age`, `previous_exam_score`, `study_hours_per_day`):
     - `SimpleImputer(strategy="median")` — fills missing numeric values with the training median.
     - `StandardScaler()` — scales features to zero mean and unit variance.
   - **Categorical features** (e.g. `gender`, `study_environment`, `revision_frequency`):
     - `SimpleImputer(strategy="most_frequent")` — fills missing text with the mode.
     - `OneHotEncoder(handle_unknown="ignore")` — converts categories into binary indicator vectors.
2. **Regressor (`HistGradientBoostingRegressor`)**:
   - A histogram-based gradient boosting algorithm inspired by LightGBM.
   - It bins continuous numerical features into integer bins (e.g. 256 bins), making training and inference dramatically faster than traditional Gradient Boosting.

### Data Leakage Prevention
**What is Data Leakage?**  
When information from outside the training dataset (especially information that would only be available *after* the event you are trying to predict) is mistakenly used to train the model.

**Excluded Columns:**
- `questions_correct` (Correlation ~0.97 with exam score — if you know questions correct, you already know the score!)
- `questions_attempted`
- `performance_grade`
- `pass_status`
- `performance_level`
- `student_id` (Identifier, not a feature)
- `exam_score` (Target variable)

**Viva Q: What is data leakage and how did you prevent it?**  
> Data leakage occurs when variables that reveal the outcome are included as model inputs. In our dataset, `questions_correct`, `questions_attempted`, `pass_status`, and `performance_grade` are only determined *during or after* the exam. We strictly dropped them prior to training so the model only learns from predictive behaviors available before the exam (such as attendance, study hours, previous GPA, and anxiety).

**Viva Q: How does the pipeline handle missing values during inference?**  
> The scikit-learn pipeline includes `SimpleImputer` transformers. Missing numeric features are imputed with the median, and categorical features with the most frequent value learned from the training set. Therefore, if a student has incomplete records, the ML service imputes the missing fields rather than rejecting the request.

---

## 4. MongoDB Aggregation Pipeline Line-by-Line

### Pipeline A: Student Risk & Score Counts
```javascript
{ $match: studentMatch },
{
  $group: {
    _id: null,
    total: { $sum: 1 },
    avgPredictedScore: { $avg: '$latestPredictedScore' },
    highRisk:   { $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'High'] }, 1, 0] } },
    mediumRisk: { $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'Medium'] }, 1, 0] } },
    lowRisk:    { $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'Low'] }, 1, 0] } },
    unassessed: {
      $sum: {
        $cond: [
          { $eq: [{ $ifNull: ['$latestRiskLevel', null] }, null] },
          1,
          0,
        ],
      },
    },
  }
}
```
- `$match`: Filters by `assignedTeacher: req.user._id` for teachers; `{}` for admin.
- `_id: null`: Groups all matching records into one summary object.
- `$avg: '$latestPredictedScore'`: Automatically ignores nulls and computes mean score.
- `$ifNull: ['$latestRiskLevel', null]`: Gracefully handles both missing fields and explicit `null` values to accurately count unassessed students.

### Pipeline C: Top 5 Recommendations (Latest Prediction Only)
```javascript
// STAGE 1: Join student details
{ $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentDoc' } },
// STAGE 2: Flatten joined array
{ $unwind: '$studentDoc' },
// STAGE 3: Filter by teacher (teacher scoping)
{ $match: req.user.role === 'teacher' ? { 'studentDoc.assignedTeacher': req.user._id } : {} },
// STAGE 4: Sort newest predictions first
{ $sort: { createdAt: -1 } },
// STAGE 5: Group by student, taking only the first (latest) prediction
{ $group: { _id: '$student', latestPrediction: { $first: '$$ROOT' } } },
// STAGE 6: Explode the recommendations array of only that latest prediction
{ $unwind: '$latestPrediction.recommendations' },
// STAGE 7: Group by recommendation string and count occurrences
{ $group: { _id: '$latestPrediction.recommendations', count: { $sum: 1 } } },
// STAGE 8 & 9: Sort descending and limit to top 5
{ $sort: { count: -1 } },
{ $limit: 5 }
```
**Why Stage 5 is vital:**  
If a student was predicted 3 times over the semester, older predictions are discarded via `{ $first: '$$ROOT' }` so their historical recommendations are not double-counted.

---

## 5. Improvement Tracking (`/impact`)

1. Splits assessments into `date < startDate` (before) and `date >= startDate` (after).
2. Converts scores to percentage: `(score / maxScore) * 100`.
3. If either `beforeDocs.length === 0` or `afterDocs.length === 0`:
   - Returns `verdict: "insufficient data"`.
   - Returns `before: null`, `after: null`, `delta: null` (never 0 or NaN).
4. If data exists on both sides:
   - `delta = afterAvg - beforeAvg`
   - `delta > 3` → `'improved'`
   - `delta < -3` → `'declined'`
   - otherwise → `'no clear change'`

---

## 6. Likely Viva Questions & Answers

**Q: What is the purpose of FastAPI and Uvicorn?**  
> FastAPI is a modern, high-performance web framework for building APIs with Python based on standard Python type hints. Uvicorn is an ASGI (Asynchronous Server Gateway Interface) web server implementation used to run FastAPI applications asynchronously.

**Q: How does the FastAPI service load the model?**  
> We use FastAPI's `@asynccontextmanager` (`lifespan`), which loads `performiq_model.joblib` once into memory when the server boots up. Subsequent prediction requests reuse the cached model instance rather than re-reading the file from disk on every request.

**Q: Why do we clip the predicted score to 0–100?**  
> Regression models estimate a continuous function and can theoretically predict numbers outside the target domain (e.g. -2.5 or 103.2) on extreme feature inputs. Clamping with `np.clip(score, 0, 100)` ensures predictions adhere to realistic academic scoring boundaries.

**Q: How do you verify database isolation during automated testing?**  
> We configured `scripts/run-tests.js` to set `NODE_ENV=test`, which switches Mongoose's connection from `performiq` to `performiq_test`. In addition, both test suites verify via `GET /api/health` that `database === 'performiq_test'` and execute self-cleanup hooks at the end of each run.

**Q: Explain the `device_availability: "None"` edge case and how you solved it.**  
> In our dataset (`data/final_student_exam_performance.csv`), 2,965 rows have the literal text `"None"` to indicate a student without access to a device. During model training in Jupyter notebook, pandas `read_csv` parsed the string `"None"` as `NaN` by default, which our pipeline's `SimpleImputer(strategy="most_frequent")` imputed. In live inference, sending `"None"` as a string caused scikit-learn's `OneHotEncoder` to treat `"None"` as an unseen category rather than a missing value. We resolved this in FastAPI (`clean_features`) by converting `"None"` to `None` (`null`) before calling `model.predict()`, restoring exact parity with how the model was trained, while keeping `"None"` as a valid user-facing category in MongoDB and Express validators.

**Q: What is `missingFieldsCount` and why is it stored with each Prediction?**  
> `missingFieldsCount` records how many of the 37 model input features were omitted or missing (`null`) when the prediction was generated. Tracking this allows the frontend UI to display confidence ratings (e.g. flagging predictions as "low confidence" when 10+ fields are missing and imputed) and provides transparency to teachers about data completeness.
