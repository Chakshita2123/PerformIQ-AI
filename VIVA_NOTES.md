# VIVA_NOTES.md — PerformIQ AI

Short answers to likely viva questions, organized by syllabus topic.
For each answer: **one-sentence answer first**, then a slightly deeper explanation.

---

## 1. Web Fundamentals

**Q: What is the DOM?**
The DOM (Document Object Model) is a tree of objects that represents the HTML page in memory, which JavaScript can read and modify.
> When the browser loads `index.html`, it builds a tree where every HTML element is a node (object). JS can find nodes with `getElementById`, change their `.textContent`, or attach `.addEventListener` to them. When JS modifies a node, the browser updates the page immediately — without reloading.

---

**Q: What is an event listener and how does it work?**
An event listener is a function you register with `addEventListener` that runs automatically when a specific thing happens (like a click or form submit).
> `form.addEventListener('submit', fn)` tells the browser: "when this form is submitted, call `fn`". Inside `fn`, we call `e.preventDefault()` to stop the default browser behavior (page reload) and handle it ourselves with `fetch`.

---

**Q: What is event delegation, and why is it useful?**
Event delegation is attaching ONE listener to a parent element instead of many listeners to each child — the parent sees all clicks because events "bubble up" the DOM.
> In `script.js`, we attach one `click` listener to the `<tbody>`. When any button inside a row is clicked, the event bubbles up to `<tbody>`. We use `e.target.closest('button')` to find which button was clicked and `btn.dataset.action` to know what to do. This is better than adding a listener to every button because the buttons are re-created each time the table reloads.

---

**Q: What is the Fetch API?**
`fetch(url)` is a browser built-in function that makes HTTP requests and returns a Promise.
> `const res = await fetch('/api/students')` sends a GET request to our server. `res.ok` is true if the status is 200–299. `await res.json()` reads and parses the response body. For POST/PUT we pass a second argument: `{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }`.

---

**Q: What is async/await? How is it different from callbacks?**
`async/await` is syntax that lets you write asynchronous code that reads like synchronous code, without nesting.
> A `callback` is a function you pass to another function to call later — deeply nested callbacks become "callback hell". A `Promise` is an object that represents a future value. `await` pauses an `async` function until the Promise resolves and gives you the value directly. So `const data = await fetch(url).then(r => r.json())` replaces a chain of `.then()` calls and is much easier to read and debug.

---

**Q: What is a Promise?**
A Promise is an object that represents the eventual result of an asynchronous operation — it is either pending, fulfilled (value), or rejected (error).
> `fetch()` returns a Promise. You can either chain `.then(fn).catch(fn)` onto it or use `await` inside an `async` function (which is just cleaner syntax for the same thing). A Promise avoids blocking the thread: the rest of the code keeps running while we wait for the network response.

---

**Q: What does `defer` do on a `<script>` tag?**
`defer` tells the browser to download the script in the background but only run it after the full HTML has been parsed.
> Without `defer`, a `<script>` at the top of `<body>` would run before the form and table exist, and `document.getElementById(...)` would return `null`. With `defer`, the script runs after all DOM elements are ready — same effect as putting `<script>` at the bottom of `<body>`, but cleaner.

---

**Q: What is `textContent` vs `innerHTML`, and why do you use `textContent`?**
`textContent` inserts plain text; `innerHTML` parses HTML. Using `innerHTML` with user data is a security risk (XSS).
> If a student's name were `<img src=x onerror=alert(1)>`, setting `td.innerHTML = name` would execute that JavaScript. `td.textContent = name` treats the whole string as literal text, so `<img ...>` appears as the characters `<img ...>` on screen — completely safe.

---

**Q: What is ES6? Name three features used in this project.**
ES6 (ES2015) is a major update to JavaScript that added many modern features.
> Three features used: (1) **Arrow functions** `(x) => x + 1` — shorter function syntax with lexical `this`. (2) **Template literals** `` `Hello ${name}` `` — string interpolation with backticks. (3) **Destructuring** `const { id, name } = student` — unpack object properties into variables. Others used: `const`/`let`, `for...of`, `Array.find`, `Array.findIndex`, spread, default parameters.

---

**Q: What is NPM and what does `package.json` do?**
NPM is Node's package manager; `package.json` describes the project and its scripts/dependencies.
> `package.json` has the project name, version, and a `scripts` section. `"start": "node server.js"` means `npm start` runs `node server.js`. This project has zero `dependencies` — no npm packages are installed. The file also serves as documentation: anyone who clones the repo knows how to start the project.

---

**Q: What is Git and what is the purpose of `.gitignore`?**
Git tracks changes to files over time; `.gitignore` lists files Git should never track.
> `.gitignore` contains `node_modules/`. This folder holds installed npm packages and can contain thousands of files. We don't commit it because anyone can recreate it by running `npm install`. Committing it would make the repo huge and slow to clone.

---

## 2. Node.js Fundamentals

**Q: What is Node.js?**
Node.js is a JavaScript runtime built on Chrome's V8 engine that lets you run JavaScript on a server (outside a browser).
> It uses an event-driven, non-blocking I/O model: instead of creating a new thread for every request (like Apache), it runs everything on a single thread and delegates slow tasks (file reads, network calls) to the OS. Callbacks/Promises notify the thread when the task is done.

---

**Q: What is the Node.js REPL?**
The REPL (Read–Evaluate–Print Loop) is an interactive shell where you type JS and see results immediately.
> Type `node` in any terminal to enter it. You see `>`. Type `2+2` and press Enter → `4`. It's useful for quickly testing a function or exploring a module without writing a file. Type `.exit` or Ctrl+C twice to leave.

---

**Q: What is a global object in Node.js? Give examples.**
A global object is available in every file without `require`; in Node, the global object is called `global` (or `globalThis`).
> Unlike browser JS where `window` is the global, Node has `global`. True globals: `process`, `console`, `setTimeout`, `Buffer`, `globalThis`. Quasi-globals (actually injected by the CommonJS wrapper): `__dirname`, `__filename`, `require`, `module`, `exports`. In a browser, `globalThis === window`; in Node, `globalThis === global`.

---

**Q: What does `process.env` do, and how is it used in this project?**
`process.env` is an object containing all environment variables from the operating system.
> In `server.js`: `const PORT = process.env.PORT || 3000`. If you set `$env:PORT=4000` in PowerShell before starting the server, it listens on 4000. Otherwise it defaults to 3000. This is the standard way to configure Node apps without hardcoding values — the same technique is used in production deployments (Heroku, Railway, etc.).

---

**Q: What is the event loop in Node.js?**
The event loop is the mechanism that lets Node run non-blocking I/O on a single thread by using a queue of callbacks.
> Node runs your synchronous code first. Then it continuously checks "queues": (1) nextTick queue — `process.nextTick` callbacks, highest priority; (2) microtask queue — `Promise.then` callbacks; (3) timer queue — `setTimeout`/`setInterval` callbacks; (4) I/O queue — file/network callbacks. Demonstrated in `examples/eventLoop.js`: even `setTimeout(fn, 0)` runs AFTER promises.

---

**Q: What is CommonJS? How is it different from ES Modules?**
CommonJS (CJS) uses `require()` and `module.exports`; ES Modules (ESM) uses `import` and `export`.
> CJS is Node's original system, loads synchronously, works in `.js` files by default. ESM is the modern browser standard, loads asynchronously, supports top-level `await`, uses `.mjs` or `"type":"module"` in `package.json`. KEY RULE: ESM can import CJS, but CJS cannot `require()` ESM. Demonstrated in `examples/modulesEsm.mjs` which imports the CJS `studentStore.js`.

---

**Q: What does `require()` do, and what is the module cache?**
`require(path)` loads a module file, runs it, and returns `module.exports`. Node caches the result so the file only runs once.
> First `require('./events')`: Node reads `events.js`, runs it, stores the result. Second `require('./events')` anywhere else: Node returns the cached object without re-running the file. This is why all files that `require('./events')` share the **same** `EventEmitter` instance — listeners added in one place fire from emits in another place.

---

**Q: What is `fs/promises` and why is it used instead of `fs.readFile` with a callback?**
`fs/promises` is Node's built-in async file I/O module that returns Promises instead of using callbacks.
> Old style: `fs.readFile(path, 'utf-8', (err, data) => { ... })` — a callback. Nested callbacks become "callback hell". With `fs/promises`: `const data = await fs.readFile(path, 'utf-8')` — clean, flat, works with try/catch. Used in `studentStore.js`.

---

**Q: What is `path.join` and why use it instead of string concatenation?**
`path.join` builds a file path correctly for the current operating system.
> On Windows, the path separator is `\`; on Linux/Mac it is `/`. String concat `'backend' + '/' + 'students.json'` would fail on Windows. `path.join('backend', 'students.json')` produces `backend\students.json` on Windows and `backend/students.json` on Linux — automatically correct.

---

**Q: What is `__dirname`?**
`__dirname` is the absolute path of the folder that contains the current file.
> In `studentStore.js`, `path.join(__dirname, 'students.json')` always finds `students.json` in the same folder as `studentStore.js`, no matter from which directory you run `node`. Without `__dirname`, a relative path like `'./students.json'` would resolve from wherever you ran the `node` command, which might not be the `backend/` folder.

---

**Q: What is a stream in Node.js, and why is it useful?**
A stream processes data in small chunks instead of loading the entire file into memory at once.
> `fs.createReadStream(file)` reads a file piece by piece, emitting a `'data'` event for each chunk. `stream.pipe(res)` connects the readable file stream to the writable HTTP response — data flows automatically. This is how `serveStatic` in `server.js` serves HTML/CSS/JS files. The same chunk concept is used in `readBody` to collect HTTP request body data.

---

**Q: What is a Buffer in Node.js?**
A Buffer is a fixed-size chunk of raw binary memory — it holds bytes, not Unicode strings.
> JavaScript strings are Unicode text. But file I/O and network data are raw bytes. Node uses `Buffer` to hold those bytes. `Buffer.from('hello', 'utf-8')` converts a string to bytes. `Buffer.concat([buf1, buf2])` joins two buffers. `.toString('utf-8')` decodes bytes back to a string. In `readBody`, each `chunk` received from `req.on('data')` is a Buffer; we concat them all at the end.

---

**Q: What is EventEmitter? How is it used in this project?**
`EventEmitter` is a Node built-in class that implements the publish/subscribe pattern: `.emit(name, data)` fires an event, `.on(name, fn)` registers a listener for it.
> `events.js` creates one shared `appEvents = new EventEmitter()` and registers listeners. `server.js` calls `appEvents.emit('request', method, url)` on every request — the listener in `events.js` prints `[request] GET /api/students`. Custom events `studentCreated`, `studentUpdated`, `studentDeleted` also log whenever a CRUD operation succeeds.

---

**Q: What is error handling in Node.js? How do you handle ENOENT?**
Node uses try/catch for async errors (with async/await) and error-code checks for OS errors.
> `err.code` is a string like `'ENOENT'` ("Entry Not Found" — file doesn't exist) or `'EADDRINUSE'` (port already taken). In `studentStore.js`, `readStudents` catches `ENOENT` specifically (first run — create the file and return `[]`) but re-throws all other errors (broken JSON → 500). The server's `try/catch` around the route handler catches any re-thrown error and returns a 500 response.

---

**Q: What is `http.createServer`? Explain the request/response cycle.**
`http.createServer(callback)` creates an HTTP server; Node calls `callback(req, res)` for every incoming request.
> `req` is a readable stream containing the request method (`GET`, `POST`, etc.), URL, headers, and body. `res` is a writable stream. We call `res.writeHead(status, headers)` to send the HTTP status line and headers, then `res.end(body)` to send the body and close the connection. The server itself listens with `server.listen(PORT)`.

---

**Q: How does this project avoid CORS issues?**
The Node server serves both the HTML page AND the API on the same port, so they share the same origin.
> CORS (Cross-Origin Resource Sharing) is a browser security rule: a page on `http://localhost:3000` can only `fetch` from the same origin (`http://localhost:3000`) by default. Because our `GET /` serves `index.html` and `GET /api/students` serves JSON — all on port 3000 — there is no cross-origin request and no CORS header is needed.

---

**Q: What are npm scripts? How do you run this project?**
npm scripts are shell commands defined in `package.json` under `"scripts"` and run with `npm run <name>`.
> `package.json` has `"start": "node server.js"`. Running `npm start` (from the `backend/` folder) executes `node server.js`. It is a shortcut — you could also type `node server.js` directly. In larger projects, scripts can include build steps, tests, linters, etc.

---

## 3. About This Project Specifically

**Q: Walk me through what happens when the browser opens `http://localhost:3000`.**
> 1. Browser sends `GET /` to Node's HTTP server. 2. `parseRoute('/')` returns `{ route: 'root' }`. 3. `serveStatic(res, 'index.html')` opens `frontend/index.html` as a readable stream. 4. The stream pipes chunks of the HTML file into the HTTP response. 5. Browser receives HTML, sees `<link href="/style.css">` and `<script src="/script.js" defer>`, makes two more GET requests. 6. After HTML is parsed, `script.js` runs, calls `loadStudents()`, which `fetch`es `/api/students`, gets JSON back, and calls `renderTable()` to build DOM elements.

---

**Q: How does the write queue prevent data loss?**
> Without it: two simultaneous POST requests both call `readStudents()` and get the same array, both add a student, and both call `writeStudents()` — the second write overwrites the first's student. The queue (a chained Promise) forces each write operation to wait for the previous one to finish: `writeQueue = writeQueue.then(() => operation())`. The "single-lane bridge" analogy — only one operation crosses at a time.

---

**Q: How does path traversal protection work in `serveStatic`?**
> A client could send `GET /../backend/students.json`. `path.resolve(FRONTEND_DIR, '../backend/students.json')` returns the true absolute path. We then check: does it start with `FRONTEND_DIR + path.sep`? If not — it's outside the frontend folder — we return 403 Forbidden. This prevents private server files from being downloaded.

---

**Q: What is the difference between `res.end()` with a 200, a 204, and a 404?**
> HTTP status codes are 3-digit numbers. `200 OK` — request succeeded, body contains the result. `201 Created` — POST succeeded, body contains the new resource. `204 No Content` — request succeeded but there is nothing to send back (used for DELETE). `400 Bad Request` — client sent invalid data. `404 Not Found` — the resource doesn't exist. `405 Method Not Allowed` — the URL is valid but not with that HTTP method. `500 Internal Server Error` — the server crashed.
