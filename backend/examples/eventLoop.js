// examples/eventLoop.js
// Demonstrates the Node.js event loop execution order.
// Run with: node examples/eventLoop.js
//
// EXPECTED OUTPUT ORDER:
//   1  [sync]         Start of script
//   2  [sync]         End of script
//   3  [nextTick]     process.nextTick callback
//   4  [promise]      Resolved promise (.then callback)
//   5  [setTimeout]   setTimeout with 0ms delay
//
// WHY this order? — the event loop has priority queues:
//
//   Phase 0 (before anything else): Run ALL synchronous code top to bottom.
//   Phase 1 (microtask queue - highest priority async):
//            First drain process.nextTick queue (all of them),
//            then drain Promise .then / async callbacks (all of them).
//   Phase 2 (macro task / timer queue):
//            Run setTimeout / setInterval callbacks.
//
// process.nextTick fires BEFORE Promises even though both are "microtasks"
// because Node gives nextTick its own special queue that is checked first.

console.log('[sync]      1 - Start of script');  // runs immediately, synchronous

// setTimeout with 0ms does NOT run immediately.
// It is placed in the "timer" phase of the event loop.
// The event loop only checks timers AFTER all microtasks are done.
setTimeout(() => {
  console.log('[setTimeout] 5 - setTimeout 0ms callback');
}, 0);

// process.nextTick schedules a callback to run at the END of the current
// operation, BEFORE the event loop moves to the next phase.
// It is the highest-priority async callback.
process.nextTick(() => {
  console.log('[nextTick]   3 - process.nextTick callback');
});

// Promise.resolve() creates an already-resolved promise.
// The .then() callback goes into the "microtask queue" (lower priority than nextTick).
Promise.resolve().then(() => {
  console.log('[promise]    4 - Resolved promise .then callback');
});

console.log('[sync]      2 - End of script');  // still synchronous, runs before any async
