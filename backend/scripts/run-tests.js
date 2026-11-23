/**
 * scripts/run-tests.js
 * Cross-platform test runner for Windows PowerShell, Bash, CMD, and macOS.
 *
 * Guarantees that tests run strictly against performiq_test:
 * 1. Sets process.env.NODE_ENV = 'test' directly in Node.js (independent of shell syntax).
 * 2. Checks if an Express server is already running on port 5000.
 *    - If running and connected to performiq_test, reuses it.
 *    - If not running or connected to a different DB, starts a test server on port 5000.
 * 3. Executes test-phase1.js and test-phase2.js.
 * 4. Ensures strict cleanup and proof of database isolation.
 */

process.env.NODE_ENV = 'test';

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/health', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ running: true, db: json.database });
        } catch {
          resolve({ running: true, db: null });
        }
      });
    });
    req.on('error', () => resolve({ running: false, db: null }));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve({ running: false, db: null });
    });
  });
}

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script ${scriptPath} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('──────────────────────────────────────────────────────');
  console.log('  PerformIQ Test Runner (Cross-Platform / PowerShell)');
  console.log('  Environment: NODE_ENV=test');
  console.log('──────────────────────────────────────────────────────\n');

  const status = await checkServer();
  let serverProcess = null;

  if (status.running && status.db === 'performiq_test') {
    console.log('✅ Server already running and connected to: performiq_test\n');
  } else {
    if (status.running) {
      console.log(`ℹ Server on port 5000 is connected to '${status.db}'.`);
      console.log('  Restarting server in test mode (NODE_ENV=test) to connect to performiq_test...\n');
    } else {
      console.log('ℹ Starting Express server in test mode...\n');
    }

    // Start server in test mode
    serverProcess = spawn('node', ['server.js'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' },
    });

    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('MongoDB connected') || msg.includes('Server running')) {
        process.stdout.write('  [Server] ' + msg);
      }
    });

    serverProcess.stderr.on('data', (d) => {
      process.stderr.write('  [Server Error] ' + d.toString());
    });

    // Wait until server is ready (up to 45 s — Atlas cold connections can take ~20 s)
    let attempts = 0;
    let ready = false;
    while (attempts < 90) {
      await new Promise((r) => setTimeout(r, 500));
      const s = await checkServer();
      if (s.running && s.db === 'performiq_test') {
        console.log('\n✅ Server ready and verified connected to: performiq_test\n');
        ready = true;
        break;
      }
      attempts++;
    }
    if (!ready) {
      throw new Error('Test server failed to start or connect to performiq_test within 45 seconds.');
    }
  }

  try {
    console.log('▶ Running Phase 1 Test Suite...');
    await runScript('test-phase1.js');

    console.log('\n▶ Running Phase 2 & 3 Test Suite...');
    await runScript('test-phase2.js');

    console.log('\n════════════════════════════════════════════════════');
    console.log('  ALL TESTS PASSED WITH COMPLETE DATABASE ISOLATION');
    console.log('════════════════════════════════════════════════════');
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Test run failed:', err.message);
  process.exit(1);
});
