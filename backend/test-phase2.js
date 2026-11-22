/**
 * test-phase2.js — Complete Phase 2 & Phase 3 endpoint tests
 * Self-cleaning: cleans up all test students, assessments, predictions,
 * interventions, and users created during the test run.
 *
 * Full test suite preserving every check from Phase 2 + all Phase 3 additions:
 *  - Health check & database isolation verification (performiq_test)
 *  - Assessments CRUD, sorting & validation
 *  - Live ML prediction via FastAPI ML Service (source: 'module1')
 *  - Prediction history listing (newest first)
 *  - Global predictions query (?risk=...)
 *  - Out-of-range prediction validation (400)
 *  - Admin manual predictedScore override (source: 'manual')
 *  - Teacher cannot manually override score (ML service called)
 *  - Student latestRiskLevel & latestPredictedScore caching
 *  - Interventions CRUD, listing, status update & validation (400)
 *  - Improvement tracking (/impact) with delta calculation
 *  - Improvement tracking (/impact) insufficient data branch
 *  - Dashboard summary with unassessed ($ifNull)
 *  - Dashboard top recommendations deduplication (latest-prediction only)
 *  - Dashboard top recommendations STRICT teacher scoping (Teacher 1 vs Teacher 2 separation)
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
  const EMAIL_T1 = `teacher2_${ts}@school.com`;
  const EMAIL_T2 = `teacher_scoping_${ts}@school.com`;
  const EMAIL_ADMIN = `admin_${ts}@school.com`;
  const STU   = `STU_P2_${ts}`;
  const STU2  = `STU_P2_EXTRA_${ts}`;
  const STU_T2 = `STU_T2_SCOPING_${ts}`;

  console.log('\n════════════════════════════════════════════════════');
  console.log('  PerformIQ Phase 2 & 3 — Complete Test Suite');
  console.log('════════════════════════════════════════════════════\n');

  // ── 0. Health & DB Isolation Verification ─────────────────────────────────
  console.log('【0】 Health Check & Database Isolation');
  const h = await request('GET', '/api/health');
  check('200 OK', h.status === 200, h.status);
  check('connected to performiq_test', h.body.database === 'performiq_test', h.body.database);
  console.log(`  ℹ Verified database: ${h.body.database} (Environment: ${h.body.environment})\n`);

  // ── Setup: register Teacher 1, Teacher 2, and Admin ───────────────────────
  await request('POST', '/api/auth/register', { name: 'Teacher 1', email: EMAIL_T1, password: 'secret123' });
  const loginR1 = await request('POST', '/api/auth/login', { email: EMAIL_T1, password: 'secret123' });
  const token = loginR1.body.data?.token;

  await request('POST', '/api/auth/register', { name: 'Teacher 2', email: EMAIL_T2, password: 'secret123' });
  const loginR2 = await request('POST', '/api/auth/login', { email: EMAIL_T2, password: 'secret123' });
  const tokenT2 = loginR2.body.data?.token;

  // Create an admin user directly in MongoDB for testing admin overrides
  await request('POST', '/api/auth/register', { name: 'Admin User', email: EMAIL_ADMIN, password: 'secret123' });
  let uri = process.env.MONGO_URI;
  if (process.env.NODE_ENV === 'test' || h.body.database === 'performiq_test') {
    uri = process.env.MONGO_URI_TEST || uri.replace(/\/performiq(\?|$)/, '/performiq_test$1');
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  await db.collection('users').updateOne({ email: EMAIL_ADMIN }, { $set: { role: 'admin' } });
  await mongoose.disconnect();

  const loginAdmin = await request('POST', '/api/auth/login', { email: EMAIL_ADMIN, password: 'secret123' });
  const adminToken = loginAdmin.body.data?.token;

  // ── Create primary student for Teacher 1 ──────────────────────────────────
  const csR = await request('POST', '/api/students', {
    studentId: STU, name: 'Test Student P2',
    attendance_percentage: 95,
    assignment_completion_rate: 90,
    study_hours_per_day: 4,
    sleep_hours: 4.5,                // < 6 -> triggers recommendation for sleep
    exam_anxiety_level: 9.8,         // >= 9.5 -> triggers recommendation for anxiety
    previous_exam_score: 78,
    revision_frequency: 'Daily',
    study_consistency: 'High',
    class_participation: 'High',
    practice_tests_completed: 8,
    time_management_score: 85,
  }, token);
  const studentId = csR.body.data?.student?._id;

  // ── Create unassessed student for Teacher 1 ───────────────────────────────
  const csR2 = await request('POST', '/api/students', {
    studentId: STU2, name: 'Unassessed Student',
  }, token);
  const studentId2 = csR2.body.data?.student?._id;

  // ── Create student for Teacher 2 (for teacher-scoping verification) ────────
  const csRT2 = await request('POST', '/api/students', {
    studentId: STU_T2, name: 'Student of Teacher 2',
    attendance_percentage: 60,       // < 75 -> triggers recommendation for attendance
    assignment_completion_rate: 45,  // < 60 -> triggers recommendation for assignment
    study_hours_per_day: 1.0,        // < 2 -> triggers recommendation for study time
    sleep_hours: 8,
    exam_anxiety_level: 5.0,
    previous_exam_score: 50,
  }, tokenT2);
  const studentIdT2 = csRT2.body.data?.student?._id;

  console.log(`  ℹ Students created: T1(${studentId}, ${studentId2}), T2(${studentIdT2})\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ASSESSMENTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('【1】 POST /api/students/:id/assessments — create');
  const a1 = await request('POST', `/api/students/${studentId}/assessments`, {
    title: 'Quiz 1', type: 'Quiz', score: 40, maxScore: 100, date: '2025-01-10',
  }, token);
  check('201 Created',          a1.status === 201,                        a1.status);
  check('title stored',         a1.body.data?.assessment?.title === 'Quiz 1', a1.body.data?.assessment?.title);

  const a2 = await request('POST', `/api/students/${studentId}/assessments`, {
    title: 'Quiz 2', type: 'Quiz', score: 75, maxScore: 100, date: '2025-03-20',
  }, token);
  check('second assessment created', a2.status === 201, a2.status);

  console.log('\n【2】 GET /api/students/:id/assessments — list');
  const aList = await request('GET', `/api/students/${studentId}/assessments`, null, token);
  check('200 OK',                   aList.status === 200,                          aList.status);
  check('returns array',            Array.isArray(aList.body.data?.assessments),   aList.body.data);
  check('has 2 assessments',        aList.body.data?.assessments?.length === 2,    aList.body.data?.assessments?.length);
  check('ordered oldest first',     aList.body.data?.assessments?.[0]?.title === 'Quiz 1', aList.body.data?.assessments?.[0]?.title);

  console.log('\n【3】 Assessment validation — invalid type → 400');
  const badA = await request('POST', `/api/students/${studentId}/assessments`, {
    title: 'Bad', type: 'Essay', score: 10, maxScore: 100, date: '2025-01-01',
  }, token);
  check('400 Bad Request', badA.status === 400, badA.status);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PREDICTIONS (LIVE ML SERVICE + OVERRIDES + RESTORED CHECKS)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【4】 POST /api/students/:id/predict — Live prediction via FastAPI ML service');
  const pLive = await request('POST', `/api/students/${studentId}/predict`, {}, token);
  check('201 Created',                pLive.status === 201,                                pLive.status);
  check('source = module1',           pLive.body.data?.prediction?.source === 'module1',   pLive.body.data?.prediction?.source);
  check('predictedScore is a number', typeof pLive.body.data?.prediction?.predictedScore === 'number', pLive.body.data?.prediction?.predictedScore);
  check('score between 0 and 100',    pLive.body.data?.prediction?.predictedScore >= 0 &&
                                      pLive.body.data?.prediction?.predictedScore <= 100, pLive.body.data?.prediction?.predictedScore);
  check('has recommendations (<= 4)', Array.isArray(pLive.body.data?.prediction?.recommendations) &&
                                      pLive.body.data?.prediction?.recommendations?.length <= 4, pLive.body.data?.prediction?.recommendations);
  check('missingFieldsCount returned',typeof pLive.body.data?.prediction?.missingFieldsCount === 'number', pLive.body.data?.prediction?.missingFieldsCount);

  console.log('\n【5】 Student cached fields updated from ML service');
  const stuLive = await request('GET', `/api/students/${studentId}`, null, token);
  check('latestPredictedScore updated', typeof stuLive.body.data?.student?.latestPredictedScore === 'number', stuLive.body.data?.student?.latestPredictedScore);
  check('latestRiskLevel is High/Medium/Low', ['High', 'Medium', 'Low'].includes(stuLive.body.data?.student?.latestRiskLevel), stuLive.body.data?.student?.latestRiskLevel);

  console.log('\n【6】 POST /api/students/:id/predict — Admin manual predictedScore override');
  const pAdmin = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 45 }, adminToken);
  check('201 Created',                pAdmin.status === 201,                             pAdmin.status);
  check('source = manual',            pAdmin.body.data?.prediction?.source === 'manual', pAdmin.body.data?.prediction?.source);
  check('predictedScore = 45',        pAdmin.body.data?.prediction?.predictedScore === 45, pAdmin.body.data?.prediction?.predictedScore);
  check('riskLevel = High',           pAdmin.body.data?.prediction?.riskLevel === 'High', pAdmin.body.data?.prediction?.riskLevel);

  console.log('\n【7】 Admin manual override — Medium risk (55)');
  const pAdminMed = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 55 }, adminToken);
  check('201 Created',          pAdminMed.status === 201,                               pAdminMed.status);
  check('riskLevel = Medium',   pAdminMed.body.data?.prediction?.riskLevel === 'Medium', pAdminMed.body.data?.prediction?.riskLevel);

  console.log('\n【8】 Admin manual override — Low risk (72)');
  const pAdminLow = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 72 }, adminToken);
  check('201 Created',          pAdminLow.status === 201,                            pAdminLow.status);
  check('riskLevel = Low',      pAdminLow.body.data?.prediction?.riskLevel === 'Low', pAdminLow.body.data?.prediction?.riskLevel);

  console.log('\n【9】 Teacher cannot manually override score (ML service called instead)');
  const pTeacherOverride = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 30 }, token);
  check('source = module1 (not manual)', pTeacherOverride.body.data?.prediction?.source === 'module1', pTeacherOverride.body.data?.prediction?.source);
  check('score not overridden to 30',    pTeacherOverride.body.data?.prediction?.predictedScore !== 30, pTeacherOverride.body.data?.prediction?.predictedScore);

  console.log('\n【10】 GET /api/students/:id/predictions — list');
  const pList = await request('GET', `/api/students/${studentId}/predictions`, null, token);
  check('200 OK',              pList.status === 200,                          pList.status);
  check('multiple predictions',pList.body.data?.predictions?.length >= 3,     pList.body.data?.predictions?.length);
  check('newest first',        pList.body.data?.predictions?.[0]?.source === 'module1', pList.body.data?.predictions?.[0]?.source);

  console.log('\n【11】 GET /api/predictions?risk=High — global filtered list');
  const gPred = await request('GET', '/api/predictions?risk=High', null, token);
  check('200 OK',         gPred.status === 200,          gPred.status);
  check('all High risk',  gPred.body.data?.predictions?.every(p => p.riskLevel === 'High'), gPred.body.data?.predictions?.map(p => p.riskLevel));

  console.log('\n【12】 Predict — out-of-range score → 400');
  const badP = await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 150 }, adminToken);
  check('400 Bad Request', badP.status === 400, badP.status);

  // Predict for Teacher 2's student (for teacher-scoping test)
  await request('POST', `/api/students/${studentIdT2}/predict`, {}, tokenT2);

  // Set latest prediction for Teacher 1's student to High risk (48) so recommendations are active
  await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 48 }, adminToken);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. INTERVENTIONS & IMPACT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【13】 POST /api/interventions — create');
  const iv1 = await request('POST', '/api/interventions', {
    student: studentId,
    type: 'Mentoring',
    description: 'Weekly 1-on-1 sessions',
    startDate: '2025-02-01',
    status: 'ongoing',
  }, token);
  check('201 Created',           iv1.status === 201,                           iv1.status);
  check('type stored',           iv1.body.data?.intervention?.type === 'Mentoring', iv1.body.data?.intervention?.type);
  check('assignedBy = requester',!!iv1.body.data?.intervention?.assignedBy,    iv1.body.data?.intervention?.assignedBy);
  const intId = iv1.body.data?.intervention?._id;

  const ivNoData = await request('POST', '/api/interventions', {
    student: studentId2,
    type: 'Extra Practice',
    startDate: '2025-02-01',
    status: 'planned',
  }, token);
  const intIdNoData = ivNoData.body.data?.intervention?._id;

  console.log('\n【14】 GET /api/students/:id/interventions — list');
  const ivList = await request('GET', `/api/students/${studentId}/interventions`, null, token);
  check('200 OK',         ivList.status === 200,                              ivList.status);
  check('1 intervention', ivList.body.data?.interventions?.length === 1,      ivList.body.data?.interventions?.length);

  console.log('\n【15】 PATCH /api/interventions/:id — update status');
  const ivUp = await request('PATCH', `/api/interventions/${intId}`, {
    status: 'completed', outcome: 'Student improved attendance to 90%',
  }, token);
  check('200 OK',             ivUp.status === 200,              ivUp.status);
  check('status = completed', ivUp.body.data?.intervention?.status === 'completed', ivUp.body.data?.intervention?.status);
  check('outcome saved',      !!ivUp.body.data?.intervention?.outcome, ivUp.body.data?.intervention?.outcome);

  console.log('\n【16】 PATCH — invalid status → 400');
  const badIv = await request('PATCH', `/api/interventions/${intId}`, { status: 'cancelled' }, token);
  check('400 Bad Request', badIv.status === 400, badIv.status);

  console.log('\n【17】 GET /api/interventions/:id/impact — improvement tracking with data');
  const impact = await request('GET', `/api/interventions/${intId}/impact`, null, token);
  check('200 OK',                   impact.status === 200,                           impact.status);
  check('before = 40 (40/100)',     impact.body.data?.before === 40,                 impact.body.data?.before);
  check('after = 75 (75/100)',      impact.body.data?.after === 75,                  impact.body.data?.after);
  check('delta = 35',               impact.body.data?.delta === 35,                  impact.body.data?.delta);
  check('verdict = improved',       impact.body.data?.verdict === 'improved',        impact.body.data?.verdict);
  check('assessmentsBefore = 1',    impact.body.data?.assessmentsBefore === 1,       impact.body.data?.assessmentsBefore);
  check('assessmentsAfter = 1',     impact.body.data?.assessmentsAfter === 1,        impact.body.data?.assessmentsAfter);

  console.log('\n【18】 GET /api/interventions/:id/impact — planned intervention branch');
  const impactNoData = await request('GET', `/api/interventions/${intIdNoData}/impact`, null, token);
  check('200 OK',                        impactNoData.status === 200,                             impactNoData.status);
  check('verdict = not started yet',      impactNoData.body.data?.verdict === 'not started yet',   impactNoData.body.data?.verdict);
  check('before is null',                impactNoData.body.data?.before === null,                 impactNoData.body.data?.before);
  check('after is null',                 impactNoData.body.data?.after === null,                  impactNoData.body.data?.after);
  check('delta is null',                 impactNoData.body.data?.delta === null,                  impactNoData.body.data?.delta);
  check('informative message returned',  typeof impactNoData.body.message === 'string' &&
                                         impactNoData.body.message.includes('not started yet'),   impactNoData.body.message);

  console.log('\n【18b】 GET /api/interventions/:id/impact — ongoing without after assessments (insufficient data)');
  const ivOngoing = await request('POST', '/api/interventions', {
    student: studentId2,
    type: 'Mentoring',
    startDate: '2025-01-01',
    status: 'ongoing',
  }, token);
  const intIdOngoing = ivOngoing.body.data?.intervention?._id;
  const impactOngoing = await request('GET', `/api/interventions/${intIdOngoing}/impact`, null, token);
  check('200 OK',                        impactOngoing.status === 200,                               impactOngoing.status);
  check('verdict = insufficient data',   impactOngoing.body.data?.verdict === 'insufficient data',   impactOngoing.body.data?.verdict);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. DASHBOARD & TEACHER SCOPING
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【19】 GET /api/dashboard/summary — Teacher 1');
  const dash1 = await request('GET', '/api/dashboard/summary', null, token);
  check('200 OK',                        dash1.status === 200,                              dash1.status);
  check('has students object',           !!dash1.body.data?.students,                       dash1.body.data);
  check('avgPredictedScore is a number', typeof dash1.body.data?.students?.avgPredictedScore === 'number', dash1.body.data?.students?.avgPredictedScore);
  check('unassessed count == 1 ($ifNull)',dash1.body.data?.students?.byRiskLevel?.unassessed === 1,
    dash1.body.data?.students?.byRiskLevel?.unassessed);
  check('total students == 2 for Teacher 1', dash1.body.data?.students?.total === 2,        dash1.body.data?.students?.total);
  check('has interventions object',      !!dash1.body.data?.interventions,                  dash1.body.data);
  check('completed == 1',                dash1.body.data?.interventions?.completed === 1,   dash1.body.data?.interventions);
  check('planned == 1',                  dash1.body.data?.interventions?.planned === 1,     dash1.body.data?.interventions);
  check('interventions total matches status sum', dash1.body.data?.interventions?.total === (dash1.body.data?.interventions?.completed + dash1.body.data?.interventions?.planned + dash1.body.data?.interventions?.ongoing), dash1.body.data?.interventions?.total);
  check('topRecommendations is array',   Array.isArray(dash1.body.data?.topRecommendations), dash1.body.data);
  check('topRecommendations has entries',dash1.body.data?.topRecommendations?.length >= 1,  dash1.body.data?.topRecommendations?.length);

  console.log('\n【20】 Dashboard — Deduplication & High/Medium Risk Filtering');
  check('topRecommendations count <= 4', dash1.body.data?.topRecommendations?.length <= 4, dash1.body.data?.topRecommendations?.length);

  // Test Low-risk student filtering: if latest prediction is Low risk, it must NOT appear in topRecommendations
  await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 80 }, adminToken);
  const dashLow = await request('GET', '/api/dashboard/summary', null, token);
  check('Low-risk students are excluded from top recommendations', dashLow.body.data?.topRecommendations?.length === 0, dashLow.body.data?.topRecommendations);

  // Restore High-risk prediction for teacher-scoping verification in 【22】
  await request('POST', `/api/students/${studentId}/predict`, { predictedScore: 48 }, adminToken);

  console.log('\n【21】 Dashboard — Teacher scoping: counts only own students');
  const myStudents = await request('GET', '/api/students', null, token);
  const myCount = myStudents.body.data?.pagination?.total;
  check('dashboard total == my students count', dash1.body.data?.students?.total === myCount, { dash: dash1.body.data?.students?.total, list: myCount });

  console.log('\n【22】 Dashboard — STRICT Teacher Scoping on Top Recommendations');
  const dash2 = await request('GET', '/api/dashboard/summary', null, tokenT2);
  check('Teacher 2 dashboard 200 OK', dash2.status === 200, dash2.status);
  check('Teacher 2 sees only their 1 student', dash2.body.data?.students?.total === 1, dash2.body.data?.students?.total);

  const t1Reasons = dash1.body.data?.topRecommendations?.map(r => r.reason) || [];
  const t2Reasons = dash2.body.data?.topRecommendations?.map(r => r.reason) || [];

  const t1HasT2Attendance = t1Reasons.some(r => r.includes('Attendance is below 75%'));
  check('Teacher 1 recommendations DO NOT contain Teacher 2 student reasons', !t1HasT2Attendance, t1Reasons);

  const t2HasT1Sleep = t2Reasons.some(r => r.includes('Sleep is under 6 hours'));
  check('Teacher 2 recommendations DO NOT contain Teacher 1 student reasons', !t2HasT1Sleep, t2Reasons);

  console.log('\n【23】 POST /api/students/:id/predict — student with device_availability = "None"');
  const stuNoneRes = await request('POST', '/api/students', {
    studentId: `STU_P2_NONE_${ts}`,
    name: 'Device None Student',
    device_availability: 'None',
    previous_exam_score: 70,
    attendance_percentage: 88,
  }, token);
  const studentIdNone = stuNoneRes.body.data?.student?._id;
  check('201 Created for None device student', stuNoneRes.status === 201, stuNoneRes.status);

  const pNone = await request('POST', `/api/students/${studentIdNone}/predict`, {}, token);
  check('201 Created for predict with None device', pNone.status === 201, pNone.status);
  check('source = module1', pNone.body.data?.prediction?.source === 'module1', pNone.body.data?.prediction?.source);
  check('valid predictedScore (0-100)', typeof pNone.body.data?.prediction?.predictedScore === 'number' &&
    pNone.body.data?.prediction?.predictedScore >= 0 && pNone.body.data?.prediction?.predictedScore <= 100, pNone.body.data?.prediction?.predictedScore);
  check('missingFieldsCount tracked', typeof pNone.body.data?.prediction?.missingFieldsCount === 'number' &&
    pNone.body.data?.prediction?.missingFieldsCount >= 1, pNone.body.data?.prediction?.missingFieldsCount);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. OULAD EARLY WARNING & BENCHMARKS (MODULE 3)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n【24】 Insert OULAD test fixtures into performiq_test');
  await mongoose.connect(uri);
  const dbTest = mongoose.connection.db;

  const testOuladIds = [999901, 999902, 999903];
  await dbTest.collection('ouladrecords').insertMany([
    {
      id_student: 999901,
      code_module: 'BBB',
      risk_prob: 0.95,
      risk_level: 'High Risk',
      total_clicks: 120,
      click_change: -10,
      n_missed: 2,
      avg_score: 45,
      score_trend: -5,
      recommendations: ['Missed 2+ assessments -> deadline reminders', 'Low average score -> remedial practice'],
      isSeeded: false,
    },
    {
      id_student: 999902,
      code_module: 'DDD',
      risk_prob: 0.75,
      risk_level: 'Medium Risk',
      total_clicks: 340,
      click_change: 5,
      n_missed: 1,
      avg_score: 58,
      score_trend: 2,
      recommendations: ['Low average score -> subject guidance'],
      isSeeded: false,
    },
    {
      id_student: 999903,
      code_module: 'BBB',
      risk_prob: 0.30,
      risk_level: 'Low Risk',
      total_clicks: 650,
      click_change: 20,
      n_missed: 0,
      avg_score: 75,
      score_trend: 8,
      recommendations: [],
      isSeeded: false,
    },
  ]);

  await dbTest.collection('ouladcutoffs').insertMany([
    { cutoff_day: 0, students: 29496, at_risk_share: 0.478, ROC_AUC: 0.712, Recall: 0.599, Precision: 0.658, isSeeded: false },
    { cutoff_day: 20, students: 27913, at_risk_share: 0.449, ROC_AUC: 0.758, Recall: 0.568, Precision: 0.694, isSeeded: false },
  ]);

  await dbTest.collection('ouladengagements').insertMany([
    { week: 0, Distinction: 113.6, Fail: 44.7, Pass: 81.1, Withdrawn: 34.7, isSeeded: false },
    { week: 1, Distinction: 101.5, Fail: 38.6, Pass: 73.9, Withdrawn: 30.0, isSeeded: false },
  ]);
  await mongoose.disconnect();
  check('OULAD fixtures inserted', true, true);

  console.log('\n【25】 GET /api/oulad/at-risk — list, filter & search');
  const ouladAuthFail = await request('GET', '/api/oulad/at-risk', null, null);
  check('401 Unauthorized without token', ouladAuthFail.status === 401, ouladAuthFail.status);

  const ouladList = await request('GET', '/api/oulad/at-risk', null, token);
  check('200 OK with token',            ouladList.status === 200,                              ouladList.status);
  check('returns records array',         Array.isArray(ouladList.body.data?.records),          ouladList.body.data?.records);
  check('returns pagination object',     !!ouladList.body.data?.pagination?.total,             ouladList.body.data?.pagination);

  const ouladFilterMod = await request('GET', '/api/oulad/at-risk?code_module=BBB', null, token);
  check('filters by code_module=BBB',   ouladFilterMod.body.data?.records?.every(r => r.code_module === 'BBB'), ouladFilterMod.body.data?.records);

  const ouladFilterRisk = await request('GET', '/api/oulad/at-risk?risk_level=High%20Risk', null, token);
  check('filters by risk_level=High Risk', ouladFilterRisk.body.data?.records?.every(r => r.risk_level === 'High Risk'), ouladFilterRisk.body.data?.records);

  const ouladSearch = await request('GET', '/api/oulad/at-risk?search=999902', null, token);
  check('finds student 999902',          ouladSearch.body.data?.records?.some(r => r.id_student === 999902), ouladSearch.body.data?.records);

  console.log('\n【26】 GET /api/oulad/cutoff-results');
  const cutoffRes = await request('GET', '/api/oulad/cutoff-results', null, token);
  check('200 OK',                        cutoffRes.status === 200,                             cutoffRes.status);
  check('returns results array',         Array.isArray(cutoffRes.body.data?.results) && cutoffRes.body.data?.results?.length >= 2, cutoffRes.body.data?.results?.length);
  check('has ROC_AUC metric',            typeof cutoffRes.body.data?.results?.[0]?.ROC_AUC === 'number', cutoffRes.body.data?.results?.[0]?.ROC_AUC);

  console.log('\n【27】 GET /api/oulad/engagement');
  const engageRes = await request('GET', '/api/oulad/engagement', null, token);
  check('200 OK',                        engageRes.status === 200,                             engageRes.status);
  check('returns engagement array',      Array.isArray(engageRes.body.data?.engagement) && engageRes.body.data?.engagement?.length >= 2, engageRes.body.data?.engagement?.length);
  check('has Distinction metric',        typeof engageRes.body.data?.engagement?.[0]?.Distinction === 'number', engageRes.body.data?.engagement?.[0]?.Distinction);

  // ── Teardown / Cleanup ─────────────────────────────────────────────────────
  console.log('\n【Cleanup】 Removing test records...');
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const testStudentIds = [studentId, studentId2, studentIdT2, studentIdNone].filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
    await db.collection('assessments').deleteMany({ student: { $in: testStudentIds } });
    await db.collection('predictions').deleteMany({ student: { $in: testStudentIds } });
    await db.collection('interventions').deleteMany({ student: { $in: testStudentIds } });
    await db.collection('students').deleteMany({ _id: { $in: testStudentIds } });
    await db.collection('users').deleteMany({ email: { $in: [EMAIL_T1, EMAIL_T2, EMAIL_ADMIN] } });

    // Clean up OULAD test fixtures
    await db.collection('ouladrecords').deleteMany({ id_student: { $in: testOuladIds } });
    await db.collection('ouladcutoffs').deleteMany({ cutoff_day: { $in: [0, 20] }, isSeeded: false });
    await db.collection('ouladengagements').deleteMany({ week: { $in: [0, 1] }, isSeeded: false });

    console.log('  ✅ Cleaned up created test assessments, predictions, interventions, students, OULAD fixtures, and users.');
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.warn('  ⚠ Cleanup notice:', cleanErr.message);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log(`  Results: ${pass} passed, ${fail} failed`);
  console.log('════════════════════════════════════════════════════\n');
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => { console.error('Test error:', err); process.exit(1); });
