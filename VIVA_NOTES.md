# VIVA_NOTES.md — Plain-English Explanation of Every Concept

This file is your study guide. For every concept used in Phase 1, you get:
- **What it is** in plain English
- **Why we use it**
- **Likely viva question + short answer**

---

## 1. REST API

**What it is:**  
REST (Representational State Transfer) is a style for designing web APIs. You use standard HTTP methods to do things with resources:
- `GET` → read
- `POST` → create
- `PUT` → update/replace
- `PATCH` → partial update
- `DELETE` → delete

**Why we use it:**  
It's the most widely understood API style. Any frontend, mobile app or tool (like Postman/curl) can talk to it.

**Viva Q: What is a RESTful API?**  
> An API that uses HTTP methods and standard status codes to operate on resources identified by URLs. It is stateless — each request carries all the information needed; the server does not remember previous requests.

---

## 2. Express.js

**What it is:**  
A minimal web framework for Node.js. It wraps Node's built-in `http` module and lets you define routes, middleware and error handlers cleanly.

**Key concepts:**
- `app.use(fn)` — registers middleware for every request
- `app.get('/path', fn)` — registers a route handler
- `req` — the incoming request (headers, body, params, query)
- `res` — the outgoing response (`res.json()`, `res.status()`)
- `next` — passes control to the next middleware or error handler

**Viva Q: What is middleware in Express?**  
> A function with signature `(req, res, next)` that runs between the incoming request and the route handler. It can read/modify `req` and `res`, end the request, or call `next()` to continue.

---

## 3. MongoDB & Mongoose

**What MongoDB is:**  
A NoSQL database that stores documents (like JSON objects) instead of rows in tables. Each collection is like a table; each document is a row but can have flexible fields.

**What Mongoose is:**  
An ODM (Object Document Mapper) for MongoDB in Node.js. It lets you define a **schema** (the shape and rules of your documents) and provides methods like `find()`, `create()`, `findByIdAndUpdate()`.

**Viva Q: Why use Mongoose instead of the raw MongoDB driver?**  
> Mongoose adds schemas and validation on top of MongoDB. Without it, you can store any shape of data — Mongoose enforces types, required fields, enum values and min/max ranges, catching errors before bad data hits the database.

**Viva Q: What is an index in MongoDB?**  
> An index is a data structure that makes queries faster. Without an index, MongoDB scans every document (a "collection scan"). With an index on `latestRiskLevel`, it jumps straight to matching documents. We also use a `text` index on `name` and `studentId` to support the search query.

---

## 4. Mongoose Schemas & Models

**Schema** — defines the shape of documents: field names, types, required, default, enum, min, max.  
**Model** — a class compiled from the schema. `Student.find()`, `Student.create()` etc. are model methods.

```js
const studentSchema = new mongoose.Schema({ name: { type: String, required: true } });
const Student = mongoose.model('Student', studentSchema);
```

**`select: false`** on `passwordHash`:  
Mongoose will NOT include that field in any query result by default. You must explicitly opt in with `.select('+passwordHash')`. This means the hash can never accidentally leak into API responses.

**Viva Q: What is `select: false` and why do we use it on passwordHash?**  
> `select: false` tells Mongoose to exclude a field from all query results unless explicitly requested. We use it on `passwordHash` so it can never accidentally be returned in an API response — it stays hidden even if a developer forgets to exclude it manually.

---

## 5. JWT (JSON Web Token)

**What it is:**  
A compact, URL-safe token with three parts separated by dots:  
`HEADER.PAYLOAD.SIGNATURE`

- **Header** — algorithm used (HS256)
- **Payload** — claims (data) like `{ id: "user_id", iat: 1234, exp: 5678 }`
- **Signature** — HMAC of header+payload using the server's secret key

**Flow:**
1. User logs in → server creates a JWT signed with `JWT_SECRET`, sends it to the client
2. Client stores the token (memory or localStorage) and sends it on every request: `Authorization: Bearer <token>`
3. Server verifies the signature — if valid and not expired, the user is authenticated

**Viva Q: What are the three parts of a JWT?**  
> Header (algorithm), Payload (data/claims), Signature (HMAC of header+payload with the secret). The signature is what makes it tamper-proof — changing the payload invalidates the signature.

**Viva Q: Is the JWT payload encrypted?**  
> No. It is only Base64-encoded, not encrypted. Anyone can decode it. Never put sensitive data (like a password) in the payload. The signature only proves the payload hasn't been changed.

**Viva Q: Why do JWTs have an expiry?**  
> If a token is stolen, it can be used forever without expiry. An expiry (e.g. 7 days) limits the damage window. After expiry, the user must log in again.

---

## 6. Bcrypt Password Hashing

**What it is:**  
A slow, one-way hashing algorithm specifically designed for passwords. It adds a **salt** (random data) before hashing, so two identical passwords produce different hashes.

**Why not MD5 or SHA-256?**  
Those are fast — an attacker can try billions of guesses per second. Bcrypt is intentionally slow (you control this with salt rounds; we use 12). With 12 rounds, one hash takes ~300 ms — fine for login, but makes brute-force attacks ~1 trillion times slower.

**Viva Q: What is bcrypt and why is it used for passwords?**  
> Bcrypt is a slow password hashing algorithm that adds a random salt and applies many rounds of hashing. Its slowness prevents brute-force attacks. We store only the hash, never the plain password.

**Viva Q: Why do we use the same error message for a wrong email and a wrong password?**  
> To prevent **email enumeration**. If we said "email not found" vs "wrong password", an attacker could probe which emails are registered. Using one message ("Invalid email or password") reveals nothing.

---

## 7. Roles & Authorization

**Authentication** — proving who you are (JWT)  
**Authorization** — deciding what you are allowed to do (role check)

**Our roles:**
- `admin` — created only by the seed script; can see all students, delete students, reassign teachers
- `teacher` — created by public register; sees only their own students (`assignedTeacher == their id`)

**Viva Q: What is the difference between authentication and authorization?**  
> Authentication verifies identity (are you who you say you are?). Authorization checks permissions (are you allowed to do this?). JWT handles authentication; our `requireRole` middleware handles authorization.

**Viva Q: Why can't a user set their own role to admin at registration?**  
> The register controller ignores `req.body.role` and always hardcodes `role: 'teacher'`. The admin account is only created by the seed script running directly with DB access.

---

## 8. Middleware Chain

Request flow in our app:
```
Request
  → helmet (sets security headers)
  → cors (checks origin)
  → morgan (logs the request)
  → express.json() (parses body)
  → router (matches route)
     → authLimiter (rate limit, auth routes only)
     → express-validator (validate body)
     → protect (verify JWT)
     → requireRole (check role)
     → controller (business logic)
  → errorHandler (catches any error)
Response
```

**Viva Q: What happens if you call `next(err)` in a controller?**  
> Express skips all remaining regular middleware and jumps straight to the error-handling middleware (the one with 4 parameters: `err, req, res, next`). Our `errorHandler` then sends a consistent `{ success: false, message }` response.

---

## 9. Helmet

**What it is:**  
A collection of small middleware functions that set security-related HTTP response headers.  
Examples:
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `Strict-Transport-Security` — forces HTTPS

**Viva Q: Why do we use Helmet?**  
> Helmet adds security headers that browsers use to protect users. Without them, attackers can exploit vulnerabilities like clickjacking or cross-site scripting more easily.

---

## 10. CORS (Cross-Origin Resource Sharing)

**What it is:**  
Browsers block requests from one origin (e.g. `localhost:5173`) to a different origin (e.g. `localhost:5000`) unless the server explicitly allows it. CORS headers tell the browser "this origin is allowed".

**Viva Q: Why do we need CORS?**  
> Our React frontend runs on port 5173 and the API on port 5000 — different origins. Without CORS headers, the browser refuses to send the request. The `cors` package adds the right `Access-Control-Allow-Origin` headers.

---

## 11. Rate Limiting

**What it is:**  
Restricting how many requests an IP can make in a time window. We apply it only to auth routes (10 requests per 15 minutes).

**Viva Q: Why rate-limit auth endpoints?**  
> Without rate limiting, an attacker can try thousands of password guesses per minute (brute force). Rate limiting makes this impractical — after 10 wrong attempts, the IP is blocked for 15 minutes.

---

## 12. Pagination

**What it is:**  
Instead of returning all 100,000 students at once, we return a page at a time.

```js
const skip = (page - 1) * limit;
Student.find(filter).skip(skip).limit(limit);
```

**Viva Q: How does pagination work in Mongoose?**  
> `.skip(n)` skips the first n documents, `.limit(m)` returns at most m documents. For page 3 with limit 10: skip = (3-1)*10 = 20, so documents 21–30 are returned. We also return `total` and `totalPages` so the frontend can render page controls.

---

## 13. Teacher Scoping Pattern

```js
// In every list/get query:
if (req.user.role === 'teacher') {
  filter.assignedTeacher = req.user._id;
}
```

**Why not check in the route?**  
The logic lives in the controller where the DB query is built — this is the right place. The route only maps URLs to controllers.

**Viva Q: How do you ensure a teacher cannot see another teacher's students?**  
> Every query adds `assignedTeacher: req.user._id` to the filter when the caller is a teacher. MongoDB only returns documents matching that filter, so records belonging to other teachers are never returned.

---

## 14. latestRiskLevel — Denormalisation

**Why store risk level on the Student document?**  
If we didn't, filtering students by `riskLevel=High` would require joining (`populate`) the Prediction collection and filtering in JavaScript — slow for 100,000 students.

By caching `latestRiskLevel` and `latestPredictedScore` on the Student document, we can filter and sort at the database level in one fast query.

**Viva Q: What is denormalisation and when is it acceptable?**  
> Denormalisation means storing redundant data in multiple places to avoid expensive joins. It is acceptable when: the data is read far more often than it is written, and consistency can be maintained (we update it atomically whenever a prediction is saved).

---

## Likely Additional Viva Questions

**Q: What HTTP status codes do you use and why?**  
> 200 OK (success), 201 Created (new resource), 400 Bad Request (validation error), 401 Unauthorized (not authenticated), 403 Forbidden (authenticated but not allowed), 404 Not Found, 409 Conflict (duplicate), 429 Too Many Requests, 500 Server Error.

**Q: What is `express-validator` and how do you use it?**  
> It is a middleware library that validates request body/query/params using a chain of rules (e.g. `body('email').isEmail()`). We call `validationResult(req)` in the controller to check for errors and return 400 if any exist.

**Q: What is an ODM?**  
> Object Document Mapper — maps JavaScript objects to MongoDB documents. Mongoose is the ODM. The equivalent for SQL is an ORM (Object Relational Mapper).

**Q: What does `{ new: true, runValidators: true }` do in `findByIdAndUpdate`?**  
> `new: true` makes Mongoose return the updated document (not the old one). `runValidators: true` applies the schema's validation rules to the update — without it, Mongoose skips validation on updates.
