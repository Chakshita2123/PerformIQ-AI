// server.js
// The HTTP server. Handles all routing manually using Node's built-in 'http' module.
// No Express or any npm package is used.

const http = require('http');
const { readStudents, writeStudents } = require('./studentStore'); // added writeStudents
const appEvents = require('./events');
const { validateStudent } = require('./validation');              // new in Phase 3

const PORT = process.env.PORT || 3000;

// ─── sendJson ────────────────────────────────────────────────────────────────
// Helper to avoid repeating writeHead + JSON.stringify + end everywhere.
// status is the HTTP status code (200, 201, 404, etc.).
// data is any JS value; it is converted to a JSON string.
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// ─── readBody ────────────────────────────────────────────────────────────────
// HTTP request bodies (POST, PUT) arrive as a stream of Buffer chunks.
// This function collects every chunk, joins them with Buffer.concat,
// decodes to a UTF-8 string, then parses as JSON.
// maxBytes stops a client from sending a huge body that fills RAM.
function readBody(req, maxBytes = 100 * 1024) { // 100 KB limit
  return new Promise((resolve, reject) => {
    const chunks = [];  // each chunk is a Buffer
    let totalSize = 0;

    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > maxBytes) {
        const err = new Error('Request body too large');
        err.statusCode = 413;
        reject(err);
        req.destroy(); // stop receiving any more data
        return;
      }
      chunks.push(chunk); // save this chunk
    });

    req.on('end', () => {
      // All chunks received — join them into one Buffer, then decode to string.
      const raw = Buffer.concat(chunks).toString('utf-8');

      if (!raw.trim()) {
        const err = new Error('Request body is empty');
        err.statusCode = 400;
        return reject(err);
      }

      try {
        resolve(JSON.parse(raw)); // convert JSON text → JS object
      } catch {
        const err = new Error('Invalid JSON in request body');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', reject); // network-level error
  });
}

// ─── Write queue ─────────────────────────────────────────────────────────────
// Problem: if two POST requests arrive at the same moment, both call readStudents(),
// both see the same array, both add a student, and both write back.
// The second write overwrites the first — a student is silently lost.
//
// Solution: a promise chain (queue). Each write operation is added to the end
// of the chain and only starts AFTER the previous one finishes.
// It works like a single-lane bridge — only one car crosses at a time.
let writeQueue = Promise.resolve(); // starts as an already-resolved promise

function enqueueWrite(operation) {
  // Chain this operation onto the end of the queue.
  const result = writeQueue.then(() => operation());

  // Always keep writeQueue as a "settled" (not pending) promise so that
  // the NEXT call to enqueueWrite can chain onto it, even if this one failed.
  // We return 'result' (not writeQueue) so the caller sees real errors.
  writeQueue = result.catch(() => {});
  return result;
}

// ─── parseRoute ──────────────────────────────────────────────────────────────
// Turns a raw URL string into a named route so the handler reads cleanly.
// Returns { route, id } where id is only set for /api/students/:id routes.
function parseRoute(url) {
  const path = url.split('?')[0]; // drop any ?query=string

  if (path === '/') return { route: 'root' };
  if (path === '/api/students') return { route: 'students' };

  // /api/students/123 — must be all digits so we don't accept /api/students/abc
  const match = path.match(/^\/api\/students\/(\d+)$/);
  if (match) return { route: 'student', id: Number(match[1]) };

  return { route: 'unknown' };
}

// ─── Request handler ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  appEvents.emit('request', req.method, req.url);

  try {
    const { route, id } = parseRoute(req.url);

    // ── GET / ── health check ───────────────────────────────────────────────
    if (route === 'root') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('PerformIQ AI server is running');
    }

    // ── /api/students ── list all or create one ─────────────────────────────
    if (route === 'students') {

      // GET /api/students — return every student
      if (req.method === 'GET') {
        const students = await readStudents();
        return sendJson(res, 200, students);
      }

      // POST /api/students — add a new student
      if (req.method === 'POST') {
        // Step 1: read and parse the request body from the stream
        let body;
        try {
          body = await readBody(req);
        } catch (err) {
          return sendJson(res, err.statusCode || 400, { error: err.message });
        }

        // Step 2: validate the fields
        const errors = validateStudent(body);
        if (errors.length > 0) return sendJson(res, 400, { errors });

        // Step 3: read-modify-write inside the queue (safe from race conditions)
        const newStudent = await enqueueWrite(async () => {
          const students = await readStudents();
          // Auto-increment id: find the current max id and add 1.
          // If the array is empty, start at 1.
          const nextId = students.length > 0
            ? Math.max(...students.map(s => s.id)) + 1
            : 1;
          const student = {
            id: nextId,
            name: body.name.trim(),
            attendance: body.attendance,
            internalMarks: body.internalMarks,
            assignmentMarks: body.assignmentMarks,
            studyHours: body.studyHours,
          };
          students.push(student);
          await writeStudents(students);
          return student;
        });

        appEvents.emit('studentCreated', newStudent);
        return sendJson(res, 201, newStudent); // 201 Created

      }

      // Wrong method for /api/students (e.g. DELETE /api/students)
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    // ── /api/students/:id ── get, update, or delete one ────────────────────
    if (route === 'student') {

      // GET /api/students/:id — return one student
      if (req.method === 'GET') {
        const students = await readStudents();
        const student = students.find(s => s.id === id); // find by id
        if (!student) return sendJson(res, 404, { error: `Student with id ${id} not found` });
        return sendJson(res, 200, student);
      }

      // PUT /api/students/:id — replace a student's data (full update)
      if (req.method === 'PUT') {
        let body;
        try {
          body = await readBody(req);
        } catch (err) {
          return sendJson(res, err.statusCode || 400, { error: err.message });
        }

        const errors = validateStudent(body);
        if (errors.length > 0) return sendJson(res, 400, { errors });

        // Read-modify-write inside the queue
        const updated = await enqueueWrite(async () => {
          const students = await readStudents();
          const index = students.findIndex(s => s.id === id);
          if (index === -1) return null; // signal: not found

          students[index] = {
            id,                          // keep the same id
            name: body.name.trim(),
            attendance: body.attendance,
            internalMarks: body.internalMarks,
            assignmentMarks: body.assignmentMarks,
            studyHours: body.studyHours,
          };
          await writeStudents(students);
          return students[index];
        });

        if (!updated) return sendJson(res, 404, { error: `Student with id ${id} not found` });
        appEvents.emit('studentUpdated', updated);
        return sendJson(res, 200, updated);
      }

      // DELETE /api/students/:id — remove a student
      if (req.method === 'DELETE') {
        const deleted = await enqueueWrite(async () => {
          const students = await readStudents();
          const index = students.findIndex(s => s.id === id);
          if (index === -1) return null; // signal: not found

          // splice(index, 1) removes 1 element at position index and returns it
          // as a one-element array, so we destructure with [removed].
          const [removed] = students.splice(index, 1);
          await writeStudents(students);
          return removed;
        });

        if (!deleted) return sendJson(res, 404, { error: `Student with id ${id} not found` });
        appEvents.emit('studentDeleted', deleted);
        res.writeHead(204); // 204 No Content — success, but nothing to send back
        return res.end();
      }

      // Wrong method for /api/students/:id (e.g. POST /api/students/1)
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    // ── No route matched ────────────────────────────────────────────────────
    sendJson(res, 404, { error: 'Route not found' });

  } catch (err) {
    appEvents.emit('serverError', err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

// ─── Server-level error handler ──────────────────────────────────────────────
// This handles OS-level errors like port conflicts.
// It is separate from the try/catch inside the request handler.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other server first.`);
  } else {
    console.error('Server error:', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});