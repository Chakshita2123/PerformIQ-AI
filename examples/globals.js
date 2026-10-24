// examples/globals.js
// Demonstrates Node.js global objects and process properties.
// Run with: node examples/globals.js hello world
// (the extra words "hello world" show up in process.argv)

// ─── __dirname and __filename ───────────────────────────────────────────────
// These are NOT truly global — they are injected by Node into every CommonJS
// module automatically. They tell you WHERE this file is on disk.

console.log('=== __dirname and __filename ===');
console.log('__dirname  :', __dirname);   // folder that contains this file
console.log('__filename :', __filename);  // full path including the file itself

// ─── process.argv ───────────────────────────────────────────────────────────
// process is a true global (no require needed).
// process.argv is an array of strings:
//   [0] = path to node executable
//   [1] = path to this script
//   [2+] = any extra arguments you typed after the filename
console.log('\n=== process.argv ===');
console.log('Full argv array:', process.argv);
console.log('Extra args you passed:', process.argv.slice(2)); // everything after the script name

// ─── process.env ────────────────────────────────────────────────────────────
// process.env holds all environment variables set in your OS/shell.
// We read PORT (used by server.js) and USERNAME (set by Windows).
console.log('\n=== process.env (selected) ===');
console.log('PORT env var :', process.env.PORT || '(not set, server.js uses 3000)');
console.log('USERNAME     :', process.env.USERNAME || process.env.USER || '(not found)');

// ─── process.platform and process.version ───────────────────────────────────
// Useful for writing code that works on both Windows and Linux.
console.log('\n=== process.platform and process.version ===');
console.log('Platform :', process.platform);  // 'win32' on Windows, 'linux' on Linux
console.log('Node ver :', process.version);   // e.g. v20.11.0

// ─── globalThis ─────────────────────────────────────────────────────────────
// globalThis was added in ES2020. In a browser it equals window.
// In Node.js it equals the global object. It is the same object in both environments.
// This makes it useful for writing code that runs in both places.
console.log('\n=== globalThis ===');
console.log('globalThis === global :', globalThis === global); // true in Node
console.log('typeof globalThis     :', typeof globalThis);

// You can attach properties to globalThis (like a browser's window.myVar)
// but avoid this in real projects — it pollutes the global scope.
globalThis.myDemoVar = 'hello from globalThis';
console.log('globalThis.myDemoVar :', globalThis.myDemoVar);
