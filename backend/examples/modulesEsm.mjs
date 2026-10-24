// examples/modulesEsm.mjs
// Demonstrates ES Modules (ESM) in Node.js, and importing a CommonJS module from ESM.
// Run with: node examples/modulesEsm.mjs
//
// The .mjs extension tells Node "treat this file as an ES Module".
// You can also use .js with "type": "module" in package.json, but .mjs is explicit.

// ─── CommonJS vs ES Modules ──────────────────────────────────────────────────
//
// CommonJS (CJS) — the OLD Node.js module system (what server.js uses):
//   const x = require('./someFile');       // load a module
//   module.exports = { myFunction };       // export from a module
//   - Loads synchronously (blocking).
//   - Works in any .js file by default in Node.
//   - __dirname and __filename are available automatically.
//
// ES Modules (ESM) — the MODERN standard (also used in browsers):
//   import x from './someFile.js';         // load a module (must include extension)
//   export function myFunction() { ... }   // export from a module
//   - Loads asynchronously.
//   - Supports top-level await (used below).
//   - __dirname and __filename are NOT available — you use import.meta.url instead.
//   - CAN import CommonJS modules (Node handles the conversion automatically).
//
// KEY RULE: ESM can import CJS, but CJS cannot require() ESM.

// ─── Importing a CommonJS module from ESM ────────────────────────────────────
// studentStore.js uses module.exports (CommonJS).
// In ESM, we import it with 'import'. Node gives us the module.exports object
// as the default export. We must write the full path with extension (.js).
import studentStore from '../studentStore.js';

const { readStudents } = studentStore; // destructure the two exported functions

// ─── import.meta.url — ESM's replacement for __filename ──────────────────────
// In ESM, __dirname and __filename don't exist.
// import.meta.url gives you the URL of the current file (e.g. file:///C:/...)
console.log('=== import.meta.url (replaces __filename in ESM) ===');
console.log('import.meta.url:', import.meta.url);

// ─── Top-level await ─────────────────────────────────────────────────────────
// In CommonJS you CANNOT use await at the top level — you must wrap it in
// an async function. ES Modules allow await directly at the top level.
// This is one of the big advantages of ESM.
console.log('\n=== Top-level await: reading students ===');

const students = await readStudents(); // top-level await — only works in ESM!

console.log(`Found ${students.length} student(s):`);
students.forEach((s) => {
  console.log(`  - ${s.name} (id: ${s.id})`);
});

console.log('\n=== Summary: CJS vs ESM ===');
console.log('CJS  → require() / module.exports, sync, default in .js files');
console.log('ESM  → import / export, async, top-level await, .mjs or "type":"module"');
console.log('Both → Node supports both; ESM can import CJS modules');
