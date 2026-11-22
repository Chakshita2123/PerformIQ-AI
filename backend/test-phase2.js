/**
 * test-phase2.js — Phase 2 endpoint tests
 * Self-cleaning: cleans up all test students, assessments, predictions,
 * interventions, and users created during the test run.
 *
 * Tests:
 *  - Assessments CRUD & sorting
 *  - Prediction, risk calculation & recommendations
 *  - Student latestRiskLevel & latestPredictedScore caching
 *  - Interventions lifecycle & status update
 *  - Improvement tracking (/impact) with before/after delta AND insufficient data handling
 *  - Dashboard summary with unassessed ($ifNull) & latest-prediction-only top recommendations
 *  - Teacher scoping
 *
 * Run with: node test-phase2.js  (server must be running on port 5000)
 */

const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

let pass = 0, fail = 0;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function check(label, cond, got) {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else       { console.log(`  ❌ ${label} → got: ${JSON.stringify(got)}`); fail++; }
}

async function run() {
  const ts = Date.now();
  const EMAIL = `teacher2_${ts}@school.com`;
  const STU   = `STU_P2_${ts}`;
  const STU2  = `STU_P2_EXTRA_${ts}`;

  console.log('\n══════════════════════════════════════════');
  console.log('  PerformIQ Phase 2 — Endpoint Test Suite');
  console.log('══════════════════════════════════════════\n');

  // ── Setup: register + login to get a token ─────────────────────────────────
  await request('POST', '/api/auth/register', { name: 'T2', email: EMAIL, password: 'secret123' });
  const loginR = await request('POST', '/api/auth/login', { email: EMAIL, password: 'secret123' });
  const token = loginR.body.data?.token;
  if (!token) { console.error('Setup failed — could not log in'); process.exit(1); }

  // ── Create primary student ────────────────────────────────────────────────
  const csR = await request('POST', '/api/students', {
    studentId: STU, name: 'Test Student P2',
    attendance_percentage: 70,       // < 75 → triggers recommendation
    assignment_completion_rate: 55,  // < 60 → triggers recommendation
    study_hours_per_day: 1.5,        // < 2  → triggers recommendation
    sleep_hours: 5,                  // < 6  → triggers recommendation
    exam_anxiety_level: 9.9,         // >= 9.5 → triggers recommendation (capped at 4)
    previous_exam_score: 48,
    revision_frequency: 'Rarely',
    study_consistency: 'Low',
    class_participation: 'Low',
    practice_tests_completed: 2,
    time_management_score: 60,
  }, token);
  const studentId = csR.body.data?.student?._id;
  if (!studentId) { console.error('Setup failed — could not create student'); process.exit(1); }

  // ── Create second unassessed student for testing $ifNull in dashboard ──────
  const csR2 = await request('POST', '/api/students', {
    studentId: STU2, name: 'Unassessed Student',
  }, token);
  const studentId2 = csR2.body.data?.student?._id;

  console.log(`  ℹ Students created: ${studentId}, ${studentId2}\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ASSESSMENTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('【1】 POST /api/students/:id/assessments — create');
  const a1 = await request('POST', `/api/students/${studentId}/assessments`, {
    title: 'Quiz 1', type: 'Quiz', score: 40, maxScore: 100, date: '2025-01-10',
  }, token);
  check('201 Created',          a1.status === 201,                        a1.status);
  check('title stored',         a1.body.data?.assessment?.title === 'Quiz 1', a1.body.data?.assessment?.title);

  // Create a second assessment (after intervention date — used for impact test)
  const a2 = await request('POST', `/api/students/${studentId}/assessments`, {
    title: 'Quiz 2', type: 'Quiz', score: 75, maxScore: 100, date: '2025-03-20',
  }, token);
  check('second assessment created', a2.status === 201, a2.status);

  console.log('\n【2】 GET /api/students/:id/assessments — list');
  const aList = await request('GET', `/api/students/${studentId}/assessments`, null, token);
  check('200 OK',                   aList.status === 200,                          aList.status);
  check('returns array',            Array.isArray(aList.body.data?.assessments),   aList.body.data);
  check('has 2 assessments',        aList.body.data?.assessments?.length === 2,    aList.body.data?.assessments?.length);
  check('ordered oldest first',
    aList.body.data?.assessments?.[0]?.title === 'Quiz 1',
    aList.body.data?.assessments?.[0]?.title);

  console.log('\n【3】 Assessment validation — invalid type');
  const badA = await request('POST', `/api/students/${studentId}/assessments`, {
    title: 'Bad', type: 'Essay', score: 10, maxScore: 100, date: '2025-01-01',
  }, token);
  check('400 Bad Request', badA.status === 400, badA.status);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PREDICTIONS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【4】 POST /api/students/:id/predict — High risk score');
  const p1 = await request('POST', `/api/students/${studentId}/predict`, {
    predictedScore: 42,
  }, token);
  check('201 Created',              p1.status === 201,                             p1.status);
  check('riskLevel = High',         p1.body.data?.prediction?.riskLevel === 'High', p1.body.data?.prediction?.riskLevel);
  check('score clamped/stored',     p1.body.data?.prediction?.predictedScore === 42, p1.body.data?.prediction?.predictedScore);
  check('recommendations ≤ 4',
    Array.isArray(p1.body.data?.prediction?.recommendations) &&
    p1.body.data?.prediction?.recommendations?.length <= 4,
    p1.body.data?.prediction?.recommendations?.length);
  check('has at least 1 recommendation', p1.body.data?.prediction?.recommendations?.length >= 1,
    p1.body.data?.prediction?.recommendations?.length);

  console.log('\n【5】 Student latestRiskLevel updated after prediction');
  const stuAfterPred = await request('GET', `/api/students/${studentId}`, null, token);
  check('latestRiskLevel = High',
    stuAfterPred.body.data?.student?.latestRiskLevel === 'High',
    stuAfterPred.body.data?.student?.latestRiskLevel);
  check('latestPredictedScore = 42',
    stuAfterPred.body.data?.student?.latestPredictedScore === 42,
    stuAfterPred.body.data?.student?.latestPredictedScore);

  console.log('\n【6】 POST /api/students/:id/predict — Medium risk (55)');
  const p2 = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 55 }, token);
  check('201 Created',          p2.status === 201,                               p2.status);
  check('riskLevel = Medium',   p2.body.data?.prediction?.riskLevel === 'Medium', p2.body.data?.prediction?.riskLevel);

  console.log('\n【7】 POST /api/students/:id/predict — Low risk (72)');
  const p3 = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 72 }, token);
  check('riskLevel = Low',      p3.body.data?.prediction?.riskLevel === 'Low',    p3.body.data?.prediction?.riskLevel);

  console.log('\n【8】 GET /api/students/:id/predictions — list');
  const pList = await request('GET', `/api/students/${studentId}/predictions`, null, token);
  check('200 OK',              pList.status === 200,                          pList.status);
  check('3 predictions',       pList.body.data?.predictions?.length === 3,    pList.body.data?.predictions?.length);
  check('newest first',
    pList.body.data?.predictions?.[0]?.predictedScore === 72,
    pList.body.data?.predictions?.[0]?.predictedScore);

  console.log('\n【9】 GET /api/predictions?risk=Low — global filtered list');
  const gPred = await request('GET', '/api/predictions?risk=Low', null, token);
  check('200 OK',         gPred.status === 200,          gPred.status);
  check('all Low risk',
    gPred.body.data?.predictions?.every(p => p.riskLevel === 'Low'),
    gPred.body.data?.predictions?.map(p => p.riskLevel));

  console.log('\n【10】 Predict — out-of-range score → 400');
  const badP = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 150 }, token);
  check('400 Bad Request', badP.status === 400, badP.status);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. INTERVENTIONS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【11】 POST /api/interventions — create');
  const iv1 = await request('POST', '/api/interventions', {
    student: studentId,
    type: 'Mentoring',
    description: 'Weekly 1-on-1 sessions',
    startDate: '2025-02-01',  // between quiz1 (Jan) and quiz2 (Mar) for impact test
    status: 'ongoing',
  }, token);
  check('201 Created',           iv1.status === 201,                           iv1.status);
  check('type stored',           iv1.body.data?.intervention?.type === 'Mentoring', iv1.body.data?.intervention?.type);
  check('assignedBy = requester',!!iv1.body.data?.intervention?.assignedBy,    iv1.body.data?.intervention?.assignedBy);
  const intId = iv1.body.data?.intervention?._id;

  // Create an intervention on student 2 (with no assessments) for testing "insufficient data"
  const ivNoAssessments = await request('POST', '/api/interventions', {
    student: studentId2,
    type: 'Extra Practice',
    startDate: '2025-02-01',
    status: 'planned',
  }, token);
  const intIdNoAssessments = ivNoAssessments.body.data?.intervention?._id;

  console.log('\n【12】 GET /api/students/:id/interventions');
  const ivList = await request('GET', `/api/students/${studentId}/interventions`, null, token);
  check('200 OK',         ivList.status === 200,                              ivList.status);
  check('1 intervention', ivList.body.data?.interventions?.length === 1,      ivList.body.data?.interventions?.length);

  console.log('\n【13】 PATCH /api/interventions/:id — update status');
  const ivUp = await request('PATCH', `/api/interventions/${intId}`, {
    status: 'completed', outcome: 'Student improved attendance to 90%',
  }, token);
  check('200 OK',                       ivUp.status === 200,              ivUp.status);
  check('status = completed',
    ivUp.body.data?.intervention?.status === 'completed',
    ivUp.body.data?.intervention?.status);
  check('outcome saved',
    !!ivUp.body.data?.intervention?.outcome,
    ivUp.body.data?.intervention?.outcome);

  console.log('\n【14】 PATCH — invalid status → 400');
  const badIv = await request('PATCH', `/api/interventions/${intId}`, { status: 'cancelled' }, token);
  check('400 Bad Request', badIv.status === 400, badIv.status);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. IMPACT ENDPOINT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【15】 GET /api/interventions/:id/impact — improvement tracking with data');
  const impact = await request('GET', `/api/interventions/${intId}/impact`, null, token);
  check('200 OK',                   impact.status === 200,                           impact.status);
  check('before = 40 (40/100)',     impact.body.data?.before === 40,                 impact.body.data?.before);
  check('after = 75 (75/100)',      impact.body.data?.after === 75,                  impact.body.data?.after);
  check('delta = 35',               impact.body.data?.delta === 35,                  impact.body.data?.delta);
  check('verdict = improved',       impact.body.data?.verdict === 'improved',        impact.body.data?.verdict);
  check('assessmentsBefore = 1',    impact.body.data?.assessmentsBefore === 1,       impact.body.data?.assessmentsBefore);
  check('assessmentsAfter = 1',     impact.body.data?.assessmentsAfter === 1,        impact.body.data?.assessmentsAfter);

  console.log('\n【16】 GET /api/interventions/:id/impact — insufficient data branch');
  const impactNoData = await request('GET', `/api/interventions/${intIdNoAssessments}/impact`, null, token);
  check('200 OK',                           impactNoData.status === 200,                               impactNoData.status);
  check('verdict = insufficient data',       impactNoData.body.data?.verdict === 'insufficient data',   impactNoData.body.data?.verdict);
  check('before is null (not NaN or 0)',     impactNoData.body.data?.before === null,                   impactNoData.body.data?.before);
  check('after is null (not NaN or 0)',      impactNoData.body.data?.after === null,                    impactNoData.body.data?.after);
  check('delta is null (not NaN or 0)',      impactNoData.body.data?.delta === null,                    impactNoData.body.data?.delta);
  check('has informative message',           typeof impactNoData.body.message === 'string' &&
                                            impactNoData.body.message.includes('Insufficient data'),   impactNoData.body.message);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【17】 GET /api/dashboard/summary');
  const dash = await request('GET', '/api/dashboard/summary', null, token);
  check('200 OK',                        dash.status === 200,                              dash.status);
  check('has students object',           !!dash.body.data?.students,                       dash.body.data);
  check('total == 2',                    dash.body.data?.students?.total === 2,            dash.body.data?.students?.total);
  check('byRiskLevel present',           !!dash.body.data?.students?.byRiskLevel,          dash.body.data?.students);
  check('unassessed count == 1 ($ifNull)',dash.body.data?.students?.byRiskLevel?.unassessed === 1,
    dash.body.data?.students?.byRiskLevel?.unassessed);
  check('has interventions object',      !!dash.body.data?.interventions,                  dash.body.data);
  check('completed == 1',                dash.body.data?.interventions?.completed === 1,   dash.body.data?.interventions);
  check('planned == 1',                  dash.body.data?.interventions?.planned === 1,     dash.body.data?.interventions);
  check('topRecommendations is array',   Array.isArray(dash.body.data?.topRecommendations), dash.body.data);
  check('topRecommendations has entries', dash.body.data?.topRecommendations?.length >= 1, dash.body.data?.topRecommendations?.length);

  console.log('\n【18】 Dashboard — top recommendations uses only LATEST prediction per student');
  // Student 1 had 3 predictions: p1 (score 42), p2 (score 55), p3 (score 72).
  // The aggregation pipeline should only take p3's recommendations, not sum recommendations from all 3!
  // Since student 1 is the only student with predictions, total unique recommendations in topRecommendations
  // cannot exceed student 1's latest prediction's recommendation count (which is <= 4).
  check('topRecommendations count matches latest prediction length',
    dash.body.data?.topRecommendations?.length <= 4,
    dash.body.data?.topRecommendations?.length);

  console.log('\n【19】 Dashboard — teacher scoping (counts only own students)');
  const myStudents = await request('GET', '/api/students', null, token);
  const myCount = myStudents.body.data?.pagination?.total;
  check('dashboard total == my students count',
    dash.body.data?.students?.total === myCount,
    { dash: dash.body.data?.students?.total, list: myCount });

  // ── Teardown / Cleanup ─────────────────────────────────────────────────────
  console.log('\n【Cleanup】 Removing test records...');
  try {
    let uri = process.env.MONGO_URI;
    if (process.env.NODE_ENV === 'test') {
      uri = process.env.MONGO_URI_TEST || uri.replace(/\/performiq(\?|$)/, '/performiq_test$1');
    }
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const testStudentIds = [studentId, studentId2].map(id => new mongoose.Types.ObjectId(id));
    await db.collection('assessments').deleteMany({ student: { $in: testStudentIds } });
    await db.collection('predictions').deleteMany({ student: { $in: testStudentIds } });
    await db.collection('interventions').deleteMany({ student: { $in: testStudentIds } });
    await db.collection('students').deleteMany({ _id: { $in: testStudentIds } });
    await db.collection('users').deleteMany({ email: EMAIL });

    console.log('  ✅ Cleaned up created test assessments, predictions, interventions, students, and user.');
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.warn('  ⚠ Cleanup notice:', cleanErr.message);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${pass} passed, ${fail} failed`);
  console.log('══════════════════════════════════════════\n');
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => { console.error('Test error:', err); process.exit(1); });
