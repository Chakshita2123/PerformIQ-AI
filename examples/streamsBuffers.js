// examples/streamsBuffers.js
// Demonstrates Buffers and readable streams in Node.js.
// Run with: node examples/streamsBuffers.js
//
// A Buffer is a fixed-size chunk of raw binary memory (bytes).
// It exists because JavaScript strings are Unicode text, but
// network packets, files, and streams are raw bytes.
// Node needs a way to hold raw bytes before converting them to text.

const fs = require('fs');
const path = require('path');

// ─── Part 1: Buffers ────────────────────────────────────────────────────────
console.log('=== Part 1: Buffers ===\n');

// Buffer.from(string, encoding) — convert a JS string into raw bytes.
// 'utf-8' means each English character takes 1 byte.
const buf1 = Buffer.from('Hello, ', 'utf-8');
const buf2 = Buffer.from('PerformIQ!', 'utf-8');

console.log('buf1:', buf1);           // shows raw byte values in hex: <Buffer 48 65 6c ...>
console.log('buf2:', buf2);

// Buffer.concat([...buffers]) — join multiple buffers into one.
// Useful when reading a file or HTTP body in chunks: you collect each chunk
// (which arrives as a Buffer) and then concat them all at the end.
const combined = Buffer.concat([buf1, buf2]);
console.log('combined:', combined);

// Buffer.toString(encoding) — convert raw bytes back to a JS string.
console.log('combined.toString():', combined.toString('utf-8'));

// byteLength vs string .length — they can differ for non-ASCII characters.
const emoji = Buffer.from('🎓', 'utf-8');
console.log('\nEmoji "🎓" as string length   :', '🎓'.length, '(JS counts UTF-16 code units)');
console.log('Emoji "🎓" as Buffer byteLength:', emoji.byteLength, '(actual bytes on disk/network)');

// ─── Part 2: Readable Stream with chunks ────────────────────────────────────
console.log('\n=== Part 2: fs.createReadStream (chunks) ===\n');

// fs.createReadStream reads a file in pieces called "chunks" instead of
// loading the whole file into memory at once.
// highWaterMark sets the maximum bytes per chunk (here: 64 bytes).
// students.json is in the parent folder (backend/), __dirname is backend/examples/
const filePath = path.join(__dirname, '..', 'students.json');

const readStream = fs.createReadStream(filePath, {
  highWaterMark: 64,   // read at most 64 bytes at a time
  encoding: 'utf-8',  // automatically decode each chunk to string
});

let chunkIndex = 0;

// The 'data' event fires every time a new chunk is ready.
// If the file is large, this event fires many times.
// Here students.json is small (~400 bytes), so we get a few chunks.
readStream.on('data', (chunk) => {
  chunkIndex++;
  console.log(`Chunk #${chunkIndex} (${chunk.length} chars): ${chunk.replace(/\n/g, '↵')}`);
});

// The 'end' event fires once all chunks have been read.
readStream.on('end', () => {
  console.log(`\nStream finished. Total chunks: ${chunkIndex}`);

  // ─── Part 3: pipe ─────────────────────────────────────────────────────────
  // pipe(destination) connects a readable stream to a writable stream.
  // process.stdout is a writable stream (the terminal).
  // Data flows automatically from source → destination.
  console.log('\n=== Part 3: pipe to stdout ===\n');
  console.log('(students.json piped directly to terminal below)\n');

  // Create a fresh read stream and pipe it to stdout.
  fs.createReadStream(filePath).pipe(process.stdout);
});

readStream.on('error', (err) => {
  console.error('Stream error:', err.message);
});
