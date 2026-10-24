// studentStore.js
// Handles reading and writing the students.json file.
// Uses Node's built-in 'fs/promises' (async file I/O) and 'path' modules.
// No npm packages needed.

const fs = require('fs/promises'); // fs/promises gives us async read/write
const path = require('path');      // path helps build file paths safely across OS

// __dirname is the folder where THIS file lives (backend/).
// path.join builds the correct path on Windows AND Linux: backend/students.json
const DATA_FILE = path.join(__dirname, 'students.json');

// readStudents: reads the file and returns an array of student objects.
// It is async because file reading takes time; we use async/await so the
// server doesn't freeze while waiting for the disk.
async function readStudents() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8'); // read file as text
    return JSON.parse(raw);                            // convert JSON text → JS array
  } catch (err) {
    // ENOENT means "file not found" — that is okay on first run.
    if (err.code === 'ENOENT') {
      // Create the file with an empty array so it exists next time.
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      return []; // return empty array — no students yet
    }
    // Any other error (e.g. broken/corrupted JSON) is NOT okay.
    // Re-throw it so the server's catch block can handle it and return 500.
    throw err;
  }
}

// writeStudents: saves the given array back to the file.
// JSON.stringify with (null, 2) makes the file human-readable (pretty-printed).
async function writeStudents(students) {
  await fs.writeFile(DATA_FILE, JSON.stringify(students, null, 2), 'utf-8');
}

// module.exports is how CommonJS (Node's default module system) shares
// functions with other files. Any file that does require('./studentStore')
// gets an object with readStudents and writeStudents.
module.exports = { readStudents, writeStudents };
