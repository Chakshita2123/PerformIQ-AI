// server.js
// The HTTP server. Handles all routing manually using Node's built-in 'http' module.
// Also serves static frontend files (HTML, CSS, JS) from the frontend/ directory.
// No Express or any npm package is used.

const http = require('http');
const fs = require('fs');           // for createReadStream (static file serving)
const path = require('path');         // for path.join, resolve, extname, sep
const { readStudents, writeStudents } = require('./studentStore');
const appEvents = require('./events');
const { validateStudent } = require('./validation');

const PORT = process.env.PORT || 3000;

// Absolute path to the frontend/ folder (one level up from backend/).
// path.join(__dirname, '..', 'frontend') builds the correct path on Windows.
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Maps file extensions to the correct HTTP Content-Type header value.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

// ─── sendJson ────────────────────────────────────────────────────────────────
// Helper to avoid repeating writeHead + JSON.stringify + end everywhere.
function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// ─── serveStatic ─────────────────────────────────────────────────────────────
// Reads a file from the frontend/ directory and pipes it to the HTTP response.
// Uses fs.createReadStream (a readable stream) — data flows in chunks, not all at once.
//
// PATH TRAVERSAL PROTECTION:
// A client could send a URL like /../backend/students.json to read private files.
// path.resolve() collapses ../ segments and gives the true absolute path.
// We then check that it still starts with FRONTEND_DIR — if not, we refuse (403).
function serveStatic(res, filename) {
  return new Promise((resolve, reject) => {
    const fullPath = path.resolve(FRONTEND_DIR, filename);

    // Security check: resolved path must be inside FRONTEND_DIR.
    // path.sep is '\' on Windows and '/' on Linux — ensures we match whole folder names.
    if (!fullPath.startsWith(FRONTEND_DIR + path.sep)) {
      sendJson(res, 403, { error: 'Forbidden' });
      return resolve();
    }

    const ext = path.extname(fullPath);                        // e.g. '.html'
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const stream = fs.createReadStream(fullPath);

    // 'error' fires if the file cannot be opened (e.g. it doesn't exist).
    stream.on('error', (err) => {
      if (err.code === 'ENOENT') {
        sendJson(res, 404, { error: 'File not found' });
        resolve();
      } else {
        reject(err); // unexpected error → outer catch → 500
      }
    });

    // 'open' fires when the file is successfully opened and ready to stream.
    // We set the headers here because we only know the file exists at this point.
    stream.on('open', () => {
      res.writeHead(200, { 'Content-Type': contentType });
      stream.pipe(res); // pipe: data flows automatically from file → HTTP response
    });

    // 'finish' fires on the response when all data has been sent.
    res.on('finish', resolve);
  });
}

// ─── readBody ────────────────────────────────────────────────────────────────
// HTTP request bodies (POST, PUT) arrive as a stream of Buffer chunks.
// We collect every chunk, join them with Buffer.concat, decode to UTF-8, parse JSON.
function readBody(req, maxBytes = 100 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > maxBytes) {
        const err = new Error('Request body too large');
        err.statusCode = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw.trim()) {
        const err = new Error('Request body is empty');
        err.statusCode = 400;
        return reject(err);
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error('Invalid JSON in request body');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

// ─── Write queue ─────────────────────────────────────────────────────────────
// Prevents race conditions: each write-to-file operation waits for the
// previous one to finish before starting. Like a single-lane bridge.
let writeQueue = Promise.resolve();

function enqueueWrite(operation) {
  const result = writeQueue.then(() => operation());
  writeQueue = result.catch(() => { }); // keep queue alive even if op throws
  return result;
}

// ─── parseRoute ──────────────────────────────────────────────────────────────
// Turns a raw URL string into a named route object.
// NOTE: 'urlPath' is used as the local variable to avoid shadowing the
// 'path' module imported at the top.
function parseRoute(url) {
  const urlPath = url.split('?')[0]; // strip query string

  if (urlPath === '/') return { route: 'root' };
  if (urlPath === '/api/students') return { route: 'students' };

  const match = urlPath.match(/^\/api\/students\/(\d+)$/);
  if (match) return { route: 'student', id: Number(match[1]) };

  // Serve frontend static files (.html, .css, .js)
  const ext = path.extname(urlPath);
  if (['.html', '.css', '.js'].includes(ext)) {
    return { route: 'static', file: urlPath.replace(/^\//, '') };
  }

  return { route: 'unknown' };
}

// ─── Request handler ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  appEvents.emit('request', req.method, req.url);

  try {
    const parsed = parseRoute(req.url);
    const { route, id } = parsed;

    // ── GET / ── serve the frontend HTML page ──────────────────────────────
    // Changed from Phase 2A plain text: now serves index.html so the page
    // and API share the same origin (no CORS needed).
    if (route === 'root') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
      await serveStatic(res, 'index.html');
      return;
    }

    // ── Static files (style.css, script.js) ───────────────────────────────
    if (route === 'static') {
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
      await serveStatic(res, parsed.file);
      return;
    }

    // ── /api/students ── list all or create one ────────────────────────────
    if (route === 'students') {

      if (req.method === 'GET') {
        const students = await readStudents();
        return sendJson(res, 200, students);
      }

      if (req.method === 'POST') {
        let body;
        try {
          body = await readBody(req);
        } catch (err) {
          return sendJson(res, err.statusCode || 400, { error: err.message });
        }

        const errors = validateStudent(body);
        if (errors.length > 0) return sendJson(res, 400, { errors });

        const newStudent = await enqueueWrite(async () => {
          const students = await readStudents();
          const nextId = students.length ? Math.max(...students.map(s => s.id)) + 1 : 1;
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
        return sendJson(res, 201, newStudent);
      }

      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    // ── /api/students/:id ── get, update, or delete one ───────────────────
    if (route === 'student') {

      if (req.method === 'GET') {
        const students = await readStudents();
        const student = students.find(s => s.id === id);
        if (!student) return sendJson(res, 404, { error: `Student with id ${id} not found` });
        return sendJson(res, 200, student);
      }

      if (req.method === 'PUT') {
        let body;
        try {
          body = await readBody(req);
        } catch (err) {
          return sendJson(res, err.statusCode || 400, { error: err.message });
        }

        const errors = validateStudent(body);
        if (errors.length > 0) return sendJson(res, 400, { errors });

        const updated = await enqueueWrite(async () => {
          const students = await readStudents();
          const index = students.findIndex(s => s.id === id);
          if (index === -1) return null;

          students[index] = {
            id,
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

      if (req.method === 'DELETE') {
        const deleted = await enqueueWrite(async () => {
          const students = await readStudents();
          const index = students.findIndex(s => s.id === id);
          if (index === -1) return null;

          const [removed] = students.splice(index, 1);
          await writeStudents(students);
          return removed;
        });

        if (!deleted) return sendJson(res, 404, { error: `Student with id ${id} not found` });
        appEvents.emit('studentDeleted', deleted);
        res.writeHead(204);
        return res.end();
      }

      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    // ── No route matched ───────────────────────────────────────────────────
    sendJson(res, 404, { error: 'Route not found' });

  } catch (err) {
    appEvents.emit('serverError', err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

// ─── Server-level error handler ───────────────────────────────────────────────
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