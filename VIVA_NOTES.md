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

---

## 7. Database Seeding & Production Engineering (Phase 4)

### Deterministic Pseudo-Random Generation (PRNG)
In JavaScript, `Math.random()` cannot be seeded. To ensure the seed script produces identical student samples, names, and simulated values on every re-run, we implemented **Mulberry32**, a fast, 32-bit state generator initialized from `SEED_RANDOM_SEED` (default: `42`).

### Upserting vs Recreating Users
When seeding demo users, deleting and re-inserting them would generate new MongoDB `_id` values on every run, breaking any existing references or saved JWT tokens. Instead, the script uses `User.findOneAndUpdate({ email }, { $set: ... }, { upsert: true, new: true })`. This keeps the existing `_id` intact across multiple seed runs.

### Batch ML Predictions vs Single-Request Overhead
Generating 5,000 predictions via individual HTTP calls (`POST /predict`) would require 5,000 separate TCP handshakes and round-trips (~2–5 minutes). By sending chunks of 200 students to `POST /predict-batch`, pandas constructs a 200-row DataFrame, scikit-learn runs vectorized batch inference, and network round-trips are reduced by 99.5%, completing all 5,000 predictions in seconds with a 30s timeout and automatic 1-retry resilience.

### Safe String Parsing vs `eval()`
In `data/performiq_oulad_at_risk.csv`, recommendations are formatted as Python list representations (e.g. `"['Missed 2+ assessments...', 'Low average score...']"`). Calling JavaScript's `eval()` on external file strings is a critical security vulnerability (Arbitrary Code Execution). We wrote `parsePythonList()`, a deterministic character scanner that safely extracts single- and double-quoted strings while respecting escape characters, achieving 100% parsing accuracy with zero `eval()` calls.

### Real MongoDB Atlas Storage (WiredTiger Compression)
MongoDB Atlas uses the **WiredTiger storage engine**, which applies Snappy compression to collections and prefix compression to indexes:
- **`dataSize` (Uncompressed):** The logical size of all raw documents in memory (~14.44 MB).
- **`storageSize` (On-Disk):** The actual compressed bytes written to disk (~1.85 MB, ~7.8x compression ratio).
- **`indexSize`:** Space consumed by B-tree indexes (~1.84 MB).
- **`totalSize`:** `storageSize + indexSize` (~3.69 MB). On Atlas Free Tier (M0, 512 MB limit), this accounts for only **0.72%** of total quota.

---

## 8. Likely Viva Questions & Answers (Phase 4)

**Q: Why do you flag simulated assessments and interventions with `isSimulated: true`?**  
> Academic integrity and data transparency. Simulated data is necessary during prototype development to populate dashboards and verify the `/impact` calculation logic. Flagging simulated records ensures they are never mistaken for real-world empirical findings regarding intervention efficacy.

**Q: Why should `eval()` never be used to parse stringified Python lists from CSVs?**  
> `eval()` executes any arbitrary JavaScript code contained in the string with the full privileges of the Node.js process. If the dataset were modified or user-supplied, it would allow Remote Code Execution (RCE). A dedicated string parser extracts items safely without executing code.

**Q: How does the seed script prevent accidental deletion of manual student data?**  
> The seeder marks all seeded students with `{ isSeeded: true }`. On re-run, it only selects and deletes students matching `{ isSeeded: true }` and cascades deletion strictly to predictions, assessments, and interventions referencing those specific IDs. Manually created students and teachers have `isSeeded: false` and are never touched.

**Q: What is the difference between MongoDB `dataSize` and `storageSize`?**  
> `dataSize` is the uncompressed logical volume of all BSON documents. `storageSize` is the physical disk space allocated by the WiredTiger storage engine, which compresses documents using Snappy. In PerformIQ, 14.44 MB of logical data occupies just 1.85 MB of disk space.

---

## 9. React Frontend Architecture & Core Concepts (Phase 5a)

### 1. Components
In React, a component is an independent, reusable piece of user interface (UI) written as a JavaScript function that returns JSX (HTML-like syntax). Examples: `Layout`, `DashboardPage`, `StudentsPage`.

### 2. Props (Properties)
Props are read-only inputs passed from a parent component to a child component, similar to function arguments. Data flows strictly in one direction (unidirectional data flow: parent to child).

### 3. State (`useState`)
State represents internal data that can change over time based on user interactions or API responses. When state updates via its setter function (e.g. `setStudents(...)`), React triggers a re-render of that component and its descendants.

### 4. Side Effects (`useEffect`)
`useEffect` lets components perform side effects (fetching data from backend APIs, setting timers, or subscribing to events) after rendering. The dependency array `[dependency]` controls when the effect re-runs (an empty array `[]` runs once on component mount).

### 5. Client-Side Routing (React Router)
Standard web applications request a new HTML page from the server on every link click (full page reload). **React Router** enables a Single-Page Application (SPA): it intercepts URL changes, updates the browser history, and swaps components dynamically in the browser without reloading the page.

### 6. Context API (`createContext`, `useContext`)
In complex applications, passing state down through multiple intermediate components ("prop drilling") becomes unmaintainable. React Context provides a global state store. In PerformIQ, `AuthContext` provides `user`, `token`, `login()`, `logout()`, `isAdmin`, and `isTeacher` to any component in the component tree.

### 7. Controlled Inputs
Form elements (`<input>`, `<select>`) whose values are controlled by React state rather than the browser DOM. Every keystroke fires an `onChange` handler that updates state, making the component the "single source of truth".

### 8. JWT Storage & The Security Trade-off (localStorage vs httpOnly Cookies)
- **Our Implementation (`localStorage`):** The JWT is saved in the browser's `localStorage` and attached to requests via Axios request interceptors (`Authorization: Bearer <token>`).
- **The XSS Risk:** Any malicious JavaScript script injected into the page (Cross-Site Scripting, or XSS) can access `localStorage.getItem('performiq_token')` and exfiltrate the token.
- **The Alternative (`httpOnly` Cookies):** Storing the token in an `httpOnly, Secure, SameSite=Strict` cookie prevents JavaScript from reading the token, eliminating direct XSS token theft. However, cookies are vulnerable to **CSRF (Cross-Site Request Forgery)**, requiring anti-CSRF tokens or strict `SameSite` policies.
- **Why `localStorage` was chosen here:** In single-page architectures with decoupled microservices, `localStorage` simplifies cross-origin API calls without complex cookie domains or pre-flight CORS cookie negotiation, while XSS is mitigated through sanitized inputs, absence of `eval()`, and standard React JSX automatic string escaping.

---

## 10. Likely Viva Questions & Answers (Frontend)

**Q: What is a Single Page Application (SPA)?**  
> An SPA loads a single HTML shell (`index.html`) once. When the user navigates between pages, React Router intercepts the URL and dynamically re-renders components in the DOM via JavaScript without requesting a full page reload from the web server.

**Q: What is the purpose of Axios Interceptors in PerformIQ?**  
> We use a **request interceptor** to automatically inject the Bearer JWT token into every outgoing API call, and a **response interceptor** to monitor for HTTP `401 Unauthorized`. If the token expires or becomes invalid, the interceptor automatically purges `localStorage` and redirects the user to `/login`.

**Q: What happens if an unauthorized user attempts to access a protected route?**  
> Our `<ProtectedRoute />` wrapper checks `isAuthenticated` from `AuthContext`. If false, it renders `<Navigate to="/login" replace />`, redirecting unauthenticated users before any protected page component mounts.

**Q: How does PerformIQ achieve role-aware navigation on the frontend?**  
> `AuthContext` decodes the authenticated user's `role` property (`'admin'` vs `'teacher'`). The dashboard and student directory dynamically adapt: teachers see their personal assigned students and scoped metrics, while admins see global metrics and assigned teacher indicators.

---

## 11. Dashboard Aggregations, Seeder Distributions & Edge Cases

### 1. Handling "Planned" and "Ongoing" Interventions in `/api/interventions/:id/impact`
- If an intervention is marked as `planned`, no outcome has occurred yet. Calling `/impact` returns HTTP `200 OK` with:
  ```json
  {
    "verdict": "not started yet",
    "message": "Intervention is planned and has not started yet.",
    "before": null,
    "after": null,
    "delta": null
  }
  ```
- If an intervention has begun (`ongoing`) but does not yet have assessments after its start date, it returns `verdict: "insufficient data"`.

### 2. High & Medium Risk Recommendation Filtering (Pipeline C)
- Why filter recommendations to High and Medium risk students? Low-risk students (predicted score ≥ 65) do not require targeted remedial interventions. Generating recommendations from low-risk profiles pollutes the dashboard action items with minor optimizations rather than urgent remedial steps.
- In `dashboardController.js` (Pipeline C), Stage 5b applies:
  `{ $match: { 'latestPrediction.riskLevel': { $in: ['High', 'Medium'] } } }` immediately after grouping by student to get the latest prediction.

### 3. Score Formatting & Display (Two Decimals, No Percentage)
- The ML model outputs a continuous regression score representing a mark out of 100.
- It is formatted strictly with `.toFixed(2)` and without a `%` symbol to avoid false impressions of fractional boundaries (e.g., preventing `49.96` from rendering as `50.0%` right beside a `High Risk` badge when the threshold is `< 50`).

### 4. Realistic Seeder Distribution (65% / 20% / 15%)
- Seed script (`backend/seed/seed.js`) assigns interventions to High and Medium risk students with a deterministic split:
  - **65% Completed:** Historical start dates (-90 to -150 days), with both pre- and post-intervention assessments, and realistic improvement/decline outcomes.
  - **20% Ongoing:** Recent start dates (-15 to -45 days), with baseline pre-assessments and ongoing progress assessments, `outcome: null`.
  - **15% Planned:** Future start dates (+15 to +45 days), baseline pre-assessments in place, `outcome: null`.

