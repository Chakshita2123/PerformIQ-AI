// events.js
// Creates a shared EventEmitter instance used across the whole app.
// EventEmitter is Node's built-in publish/subscribe system —
// one part of the code "emits" an event, another part "listens" for it.

const EventEmitter = require('events'); // built-in Node module, no install needed

// Create ONE shared emitter for the whole app.
// By exporting this single instance, every file that require('./events')
// gets the SAME object, so listeners registered here fire for events
// emitted anywhere else.
const appEvents = new EventEmitter();

// Listener for 'request' event.
// server.js emits: appEvents.emit('request', method, url)
// This listener receives (method, url) as arguments and logs them.
appEvents.on('request', (method, url) => {
  console.log(`[request] ${method} ${url}`);
});

// Listener for 'serverError' event.
// server.js emits: appEvents.emit('serverError', err)
// err is a JavaScript Error object; err.message is the human-readable text.
appEvents.on('serverError', (err) => {
  console.error(`[error] ${err.message}`);
});

// Export the single shared instance.
module.exports = appEvents;
