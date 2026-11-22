/**
 * test-phase1.js — Phase 1 endpoint tests
 * Uses unique-per-run emails/studentIds (timestamp suffix) so the test is re-runnable.
 * Run with: node test-phase1.js  (server must be running on port 5000)
 */

const http = require('http');

let pass = 0, fail = 0;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 5000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function check(label, condition, got) {
  if (condition) { console.log(`  ✅ ${label}`); pass++; }
  else { console.log(`  ❌ ${label} → got: ${JSON.stringify(got)}`); fail++; }
}

async function run() {
  // Unique suffix so this test is fully re-runnable without manual DB cleanup
  const ts = Date.now();
  const EMAIL_ALICE = `alice_${ts}@school.com`;
  const EMAIL_HACK  = `hack_${ts}@x.com`;
  const STU_ID      = `STU_TEST_${ts}`;

  console.log('\n══════════════════════════════════════════');
  console.log('  PerformIQ Phase 1 — Endpoint Test Suite');
  console.log('══════════════════════════════════════════\n');

  let token, teacherId, studentId;

  // ── 1. Health ──────────────────────────────────────────────────────────────
  console.log('【1】 Health check');
  const h = await request('GET', '/api/health');
  check('200 OK',        h.status === 200,       h.status);
  check('success: true', h.body.success === true, h.body);

  // ── 2. Register ────────────────────────────────────────────────────────────
  console.log('\n【2】 Register (creates teacher)');
  const r = await request('POST', '/api/auth/register', {
    name: 'Alice Teacher', email: EMAIL_ALICE, password: 'secret123'
  });
  check('201 Created',         r.status === 201,                   r.status);
  check('token returned',      !!r.body.data?.token,               r.body);
  check('role is teacher',     r.body.data?.user?.role === 'teacher', r.body.data?.user);
  check('no passwordHash',     !r.body.data?.user?.passwordHash,   r.body.data?.user);
  token     = r.body.data?.token;
  teacherId = r.body.data?.user?._id;

  // ── 3. Role injection ─────────────────────────────────────────────────────
  console.log('\n【3】 Role injection (register with role:admin)');
  const ri = await request('POST', '/api/auth/register', {
    name: 'Hacker', email: EMAIL_HACK, password: 'secret123', role: 'admin'
  });
  check('201 (accepted but)',  ri.status === 201,                       ri.status);
  check('role still teacher',  ri.body.data?.user?.role === 'teacher',  ri.body.data?.user);

  // ── 4. Duplicate email ─────────────────────────────────────────────────────
  console.log('\n【4】 Duplicate email → 409');
  const dup = await request('POST', '/api/auth/register', {
    name: 'Alice Again', email: EMAIL_ALICE, password: 'secret123'
  });
  check('409 Conflict', dup.status === 409, dup.status);

  // ── 5. Login ───────────────────────────────────────────────────────────────
  console.log('\n【5】 Login');
  const l = await request('POST', '/api/auth/login', {
    email: EMAIL_ALICE, password: 'secret123'
  });
  check('200 OK',         l.status === 200,       l.status);
  check('token returned', !!l.body.data?.token,   l.body);
  token = l.body.data?.token;

  // ── 6. Generic login error ─────────────────────────────────────────────────
  console.log('\n【6】 Login security (generic error message)');
  const lw = await request('POST', '/api/auth/login', { email: EMAIL_ALICE, password: 'wrongpassword' });
  const le = await request('POST', '/api/auth/login', { email: 'nobody@nowhere.com', password: 'secret123' });
  check('wrong password → 401',  lw.status === 401, lw.status);
  check('wrong email → 401',     le.status === 401, le.status);
  check('same message for both', lw.body.message === le.body.message,
    { wpMsg: lw.body.message, weMsg: le.body.message });

  // ── 7. GET /me ─────────────────────────────────────────────────────────────
  console.log('\n【7】 GET /api/auth/me');
  const me = await request('GET', '/api/auth/me', null, token);
  check('200 OK',          me.status === 200,                   me.status);
  check('returns user',    !!me.body.data?.user,                me.body);
  check('no passwordHash', !me.body.data?.user?.passwordHash,   me.body.data?.user);

  // ── 8. No token ────────────────────────────────────────────────────────────
  console.log('\n【8】 Protected route — no token');
  const noTok = await request('GET', '/api/students');
  check('401 Not authenticated', noTok.status === 401, noTok.status);

  // ── 9. Bad token ───────────────────────────────────────────────────────────
  console.log('\n【9】 Protected route — bad token');
  const badTok = await request('GET', '/api/students', null, 'bad.token.here');
  check('401 Invalid token', badTok.status === 401, badTok.status);

  // ── 10. Create student ─────────────────────────────────────────────────────
  console.log('\n【10】 POST /api/students — create');
  const cs = await request('POST', '/api/students', {
    studentId: STU_ID, name: 'Bob Smith', age: 18, gender: 'Male',
    education_level: 'High School', school_type: 'Public',
    attendance_percentage: 72, assignment_completion_rate: 55,
    study_hours_per_day: 1.5, sleep_hours: 5.5, exam_anxiety_level: 9.8,
    previous_exam_score: 48, revision_frequency: 'Rarely',
    study_consistency: 'Low', class_participation: 'Low',
    practice_tests_completed: 2, time_management_score: 60
  }, token);
  check('201 Created',               cs.status === 201,                           cs.status);
  check('studentId stored',          cs.body.data?.student?.studentId === STU_ID, cs.body.data?.student?.studentId);
  check('assignedTeacher auto-set',  !!cs.body.data?.student?.assignedTeacher,    cs.body.data?.student);
  check('latestRiskLevel is null',   cs.body.data?.student?.latestRiskLevel === null, cs.body.data?.student?.latestRiskLevel);
  studentId = cs.body.data?.student?._id;
  console.log(`  ℹ studentId (Mongo _id): ${studentId}`);

  // ── 11. Validation — invalid enum ─────────────────────────────────────────
  console.log('\n【11】 POST /api/students — invalid enum → 400');
  const badEnum = await request('POST', '/api/students', {
    studentId: `STU_BAD_${ts}`, name: 'Bad', gender: 'Unknown'
  }, token);
  check('400 Bad Request', badEnum.status === 400, badEnum.status);
  check('mentions gender', badEnum.body.message?.toLowerCase().includes('gender'), badEnum.body.message);

  // ── 12. Missing studentId ──────────────────────────────────────────────────
  console.log('\n【12】 POST /api/students — missing studentId → 400');
  const noId = await request('POST', '/api/students', { name: 'No ID' }, token);
  check('400 Bad Request',    noId.status === 400, noId.status);
  check('mentions studentId', noId.body.message?.toLowerCase().includes('studentid'), noId.body.message);

  // ── 13. Duplicate studentId ────────────────────────────────────────────────
  console.log('\n【13】 POST /api/students — duplicate studentId → 409');
  const dupS = await request('POST', '/api/students', { studentId: STU_ID, name: 'Duplicate' }, token);
  check('409 Conflict', dupS.status === 409, dupS.status);

  // ── 14. List students ──────────────────────────────────────────────────────
  console.log('\n【14】 GET /api/students — list with pagination');
  const ls = await request('GET', '/api/students?page=1&limit=5', null, token);
  check('200 OK',             ls.status === 200,                     ls.status);
  check('has students array', Array.isArray(ls.body.data?.students), ls.body.data);
  check('has pagination',     !!ls.body.data?.pagination?.total,     ls.body.data?.pagination);

  // ── 15. Get one student ────────────────────────────────────────────────────
  console.log('\n【15】 GET /api/students/:id');
  if (!studentId) { console.log('  ⚠ Skipped — no studentId (create failed)'); }
  else {
    const gs = await request('GET', `/api/students/${studentId}`, null, token);
    check('200 OK',          gs.status === 200,                              gs.status);
    check('correct student', gs.body.data?.student?.studentId === STU_ID,   gs.body.data?.student?.studentId);
  }

  // ── 16. Update student ─────────────────────────────────────────────────────
  console.log('\n【16】 PUT /api/students/:id — partial update');
  if (!studentId) { console.log('  ⚠ Skipped — no studentId'); }
  else {
    const us = await request('PUT', `/api/students/${studentId}`, {
      attendance_percentage: 90, study_hours_per_day: 3
    }, token);
    check('200 OK',                        us.status === 200, us.status);
    check('attendance_percentage updated',
      us.body.data?.student?.attendance_percentage === 90,
      us.body.data?.student?.attendance_percentage);
  }

  // ── 17. Teacher cannot reassign ────────────────────────────────────────────
  console.log('\n【17】 Teacher cannot change assignedTeacher');
  if (!studentId) { console.log('  ⚠ Skipped — no studentId'); }
  else {
    const originalTeacher = (await request('GET', `/api/students/${studentId}`, null, token))
      .body.data?.student?.assignedTeacher?._id;
    await request('PUT', `/api/students/${studentId}`, {
      assignedTeacher: '000000000000000000000000'
    }, token);
    const after = await request('GET', `/api/students/${studentId}`, null, token);
    check('assignedTeacher unchanged',
      after.body.data?.student?.assignedTeacher?._id === originalTeacher,
      after.body.data?.student?.assignedTeacher);
  }

  // ── 18. DELETE — teacher gets 403 ─────────────────────────────────────────
  console.log('\n【18】 DELETE /api/students/:id — teacher → 403');
  if (!studentId) { console.log('  ⚠ Skipped — no studentId'); }
  else {
    const del = await request('DELETE', `/api/students/${studentId}`, null, token);
    check('403 Forbidden for teacher', del.status === 403, del.status);
  }

  // ── 19. 404 for unknown route ──────────────────────────────────────────────
  console.log('\n【19】 Unknown route → 404');
  const nf = await request('GET', '/api/doesnotexist');
  check('404 Not Found', nf.status === 404, nf.status);

  // ── 20. Text search ────────────────────────────────────────────────────────
  console.log('\n【20】 GET /api/students?search=Bob');
  const search = await request('GET', '/api/students?search=Bob', null, token);
  check('200 OK',    search.status === 200, search.status);
  check('finds Bob', search.body.data?.students?.some(s => s.name === 'Bob Smith'),
    search.body.data?.students?.map(s => s.name));

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${pass} passed, ${fail} failed`);
  console.log('══════════════════════════════════════════\n');
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => { console.error('Test runner error:', err); process.exit(1); });
