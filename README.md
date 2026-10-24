# PerformIQ AI — Student Performance Analytics Platform

A backend engineering project built with **plain Node.js** (no frameworks, no npm dependencies). Demonstrates core Node.js and web fundamentals concepts.

---

## How to Run

```bash
# Go into the backend folder
cd backend

# Start the server (runs node server.js)
npm start
```

Server starts at **http://localhost:3000**

To run on a different port:
```bash
# Windows PowerShell
$env:PORT=4000; node server.js
```

---

## Folder Structure

```
PerformIQ-AI/
├── .gitignore
├── README.md
├── VIVA_NOTES.md           # viva Q&A reference
├── backend/
│   ├── package.json        # npm config, "start" script
│   ├── server.js           # HTTP server, routing, static files, error handling
│   ├── studentStore.js     # fs/promises read/write for students.json
│   ├── validation.js       # field validation, returns error list
│   ├── events.js           # shared EventEmitter instance + listeners
│   ├── students.json       # data file (persisted student records)
│   └── examples/           # isolated demos, each runnable with node
│       ├── globals.js          # __dirname, process, globalThis
│       ├── eventLoop.js        # event loop execution order
│       ├── streamsBuffers.js   # Buffers, createReadStream, pipe
│       └── modulesEsm.mjs     # ES modules, top-level await, CJS vs ESM
└── frontend/
    ├── index.html          # page structure — form, table, detail panel
    ├── style.css           # CSS design system
    └── script.js           # Fetch API, DOM, events, async/await
```

---

## API Endpoints

| Method | URL | Success | Body required | Description |
|--------|-----|---------|--------------|-------------|
| GET | `/` | 200 text | — | Health check |
| GET | `/api/students` | 200 JSON | — | List all students |
| POST | `/api/students` | 201 JSON | Student fields | Create a student |
| GET | `/api/students/:id` | 200 JSON | — | Get one student |
| PUT | `/api/students/:id` | 200 JSON | Student fields | Replace a student |
| DELETE | `/api/students/:id` | 204 (no body) | — | Delete a student |

**Error responses:** `400` invalid/missing fields, `404` student not found, `405` wrong HTTP method, `500` server error.

**Student body shape:**
```json
{
  "name": "Aarav Sharma",
  "attendance": 82,
  "internalMarks": 24,
  "assignmentMarks": 17,
  "studyHours": 18
}
```

---

## Syllabus Topic → File Mapping

| Syllabus Topic | File(s) that demonstrate it |
|---|---|
| HTML, CSS | `frontend/` (Phase 4) |
| DOM & events, ES6 | `frontend/script.js` (Phase 4) |
| Fetch API, async/await, promises | `frontend/script.js` (Phase 4) |
| NPM, package.json, npm scripts | `backend/package.json` |
| Git / GitHub | `.gitignore`, commit history |
| Node REPL | See **REPL section** below |
| Global objects (`process`, `__dirname`, `globalThis`) | `backend/examples/globals.js` |
| Event loop | `backend/examples/eventLoop.js` |
| CommonJS vs ES Modules | `backend/examples/modulesEsm.mjs` |
| `fs` module (fs/promises) | `backend/studentStore.js` |
| `path` module | `backend/studentStore.js` |
| Streams and Buffers | `backend/examples/streamsBuffers.js` |
| `http` module, request/response | `backend/server.js` |
| EventEmitter | `backend/events.js`, `backend/server.js` |
| Error handling (try/catch, err.code) | `backend/studentStore.js`, `backend/server.js` |

---

## Using the Node.js REPL

The **REPL** (Read–Evaluate–Print Loop) is an interactive Node.js shell. You type one line of JavaScript, press Enter, Node runs it, and prints the result — then waits for the next line. It is great for quick experiments without writing a file.

### Start the REPL

Open a terminal anywhere and type:

```bash
node
```

You will see a `>` prompt. You are now inside the REPL.

### Useful things to try in the REPL

```js
// Arithmetic — result prints immediately
> 2 + 3
5

// String methods
> 'PerformIQ'.toUpperCase()
'PERFORMIQ'

// Built-in modules work in the REPL — just require() them
> const path = require('path')
undefined                          // assignment returns undefined, that's normal
> path.join('backend', 'students.json')
'backend\\students.json'           // Windows uses backslash

// Inspect global objects
> process.version
'v20.x.x'
> process.platform
'win32'

// Read a JSON file interactively
> const fs = require('fs')
> const data = fs.readFileSync('students.json', 'utf-8')
> JSON.parse(data).length
3

// Multi-line code: press Enter after an open brace — REPL shows '...'
> function add(a, b) {
...   return a + b;
... }
undefined
> add(10, 20)
30
```

### Exit the REPL

Press **Ctrl + C** twice, or type `.exit` and press Enter.

### REPL special commands

| Command | What it does |
|---|---|
| `.help` | List all REPL commands |
| `.exit` | Exit the REPL |
| `.save filename.js` | Save everything you typed to a file |
| `.load filename.js` | Load and run a JS file line by line |
| `Tab` key | Autocomplete variable or method names |
| ↑ / ↓ arrows | Navigate command history |

---

## Running the Example Demos

All demos are in `backend/examples/`. Run them from the `backend/` folder:

```bash
# Global objects and process
node examples/globals.js hello world

# Event loop order (sync → nextTick → promise → setTimeout)
node examples/eventLoop.js

# Buffers and streams
node examples/streamsBuffers.js

# ES Modules + top-level await (importing CJS from ESM)
node examples/modulesEsm.mjs
```

---

## 3-Minute Demo Script

1. **(0:00)** `cd backend && npm start`. Show `Server running at http://localhost:3000`.
2. **(0:15)** Open browser → `http://localhost:3000`. Page loads with all students. Point out amber rows for attendance < 75%.
3. **(0:35)** Fill the form, click **Add Student**. New row appears instantly.
4. **(0:50)** Click **View** → detail panel opens. Click **Edit** → form fills with that student's data. Update and save.
5. **(1:05)** Click **Delete** → confirm → row disappears. Restart server, reload page → data persists (students.json).
6. **(1:25)** Open second terminal: `curl http://localhost:3000/api/students` → JSON. `curl -X DELETE http://localhost:3000/api/students` → 405. Point out `[request]` logs from EventEmitter.
7. **(1:45)** Open `server.js` → explain `parseRoute`, `readBody` (Buffer chunks), `enqueueWrite` (queue).
8. **(2:00)** Open `studentStore.js` → explain `fs/promises`, `path.join`, ENOENT handling.
9. **(2:15)** Open `events.js` → explain `.on()` / `.emit()`, single shared instance via `require` cache.
10. **(2:30)** Run `node examples/eventLoop.js` → explain numbered output order.
11. **(2:45)** Run `node examples/streamsBuffers.js` → show chunks. Mention this is the same mechanism used in `serveStatic` and `readBody`.
12. **(2:55)** Open REPL: `node` → `require('path').join('a','b')` → `.exit`.
