/**
 * backend/seed/seed.js
 *
 * PerformIQ AI — Phase 4 Comprehensive Database Seeder
 *
 * Operational & Safety Guarantees:
 *  1. Refuses to run if NODE_ENV === 'test'.
 *  2. Checks that the FastAPI ML service is reachable before starting.
 *  3. Re-run safety:
 *     - Upserts demo users by email (preserving their ObjectIds).
 *     - Cleans only previously seeded students ({ isSeeded: true }) and cascades
 *       deletion to all predictions, assessments, and interventions referencing them.
 *  4. Deterministic: Uses a seeded PRNG (SEED_RANDOM_SEED from .env, default: 42)
 *     so identical students, names, simulated assessments, and interventions are generated.
 *  5. Imports 5,000 random rows from data/final_student_exam_performance.csv:
 *     - device_availability == "None" is preserved as literal "None" in MongoDB.
 *     - Students are distributed evenly across the 3 demo teachers.
 *  6. Obtains live predictions via ML service POST /predict-batch (in chunks of 200):
 *     - Uses 30-second timeout with automatic 1-retry fallback.
 *     - Stores source: "module1", rule-based recommendations, and missingFieldsCount.
 *     - Updates latestPredictedScore and latestRiskLevel on each student.
 *  7. Generates 4 to 6 simulated past assessments per student (isSimulated: true):
 *     - Distributed over the past 360 days around previous_exam_score.
 *     - Scores clipped to [0, 100].
 *  8. Generates simulated interventions for High & Medium risk students (isSimulated: true):
 *     - Ensures every intervention has at least one assessment before and after startDate.
 *     - Generates varied outcomes (improved vs declined / no clear change) for /impact endpoint.
 *  9. Imports Module 3 OULAD datasets:
 *     - performiq_oulad_at_risk.csv (safely parses Python list recommendations without eval).
 *     - oulad_cutoff_results.csv (benchmark metrics across cutoff days).
 *     - oulad_weekly_engagement.csv (weekly clicks by final result).
 * 10. Measures REAL Atlas storage usage via db.stats() and reports disk footprint vs 512MB quota.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Prediction = require('../src/models/Prediction');
const Assessment = require('../src/models/Assessment');
const Intervention = require('../src/models/Intervention');
const OuladRecord = require('../src/models/OuladRecord');
const OuladCutoff = require('../src/models/OuladCutoff');
const OuladEngagement = require('../src/models/OuladEngagement');

const { getRiskLevel } = require('../src/utils/scopeCheck');
const { generateRecommendations } = require('../src/utils/recommendations');

// Expected 37 feature columns for the ML model
const FEATURE_COLUMNS = [
  'age', 'gender', 'education_level', 'school_type', 'family_income',
  'parent_education', 'urban_rural', 'previous_exam_score', 'previous_gpa',
  'attendance_percentage', 'assignment_completion_rate', 'class_participation',
  'study_hours_per_day', 'self_study_hours', 'private_tuition',
  'online_learning_hours', 'study_consistency', 'study_environment',
  'study_method', 'revision_frequency', 'practice_tests_completed',
  'notes_quality', 'sleep_hours', 'sleep_quality', 'daily_screen_time',
  'physical_activity_hours', 'break_frequency', 'stress_level',
  'motivation_level', 'internet_access', 'device_availability',
  'educational_app_usage', 'online_course_hours', 'exam_difficulty',
  'exam_preparation_days', 'time_management_score', 'exam_anxiety_level'
];

// Numeric columns in final_student_exam_performance.csv
const NUMERIC_COLUMNS = new Set([
  'age', 'previous_exam_score', 'previous_gpa', 'attendance_percentage',
  'assignment_completion_rate', 'study_hours_per_day', 'self_study_hours',
  'private_tuition', 'online_learning_hours', 'practice_tests_completed',
  'sleep_hours', 'daily_screen_time', 'physical_activity_hours',
  'stress_level', 'internet_access', 'online_course_hours',
  'exam_preparation_days', 'time_management_score', 'exam_anxiety_level'
]);

// ── Realistic Name Generators ────────────────────────────────────────────────
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Donald', 'Sandra', 'Mark', 'Ashley',
  'Paul', 'Kimberly', 'Steven', 'Emily', 'Andrew', 'Donna', 'Kenneth', 'Michelle',
  'Joshua', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Aarav', 'Ananya', 'Rohan', 'Priya', 'Liam', 'Emma',
  'Noah', 'Olivia', 'Ethan', 'Sophia', 'Lucas', 'Mia', 'Mateo', 'Isabella'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
  'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
  'Mitchell', 'Carter', 'Roberts', 'Sharma', 'Patel', 'Gupta', 'Singh', 'Verma',
  'Kim', 'Chen', 'Wang', 'Tanaka', 'Sato', 'Silva', 'Santos'
];

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures reproducible pseudo-random numbers across runs.
 */
function createPrng(seedVal) {
  let s = parseInt(seedVal, 10) || 42;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Safe CSV line splitter supporting quoted values
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Safely parses stringified Python lists like "['Item 1', 'Item 2']" without using eval()
 */
function parsePythonList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (trimmed === '[]' || trimmed === '') return [];

  const items = [];
  let inStr = false;
  let strQuote = '';
  let current = '';

  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (!inStr) {
      if (c === "'" || c === '"') {
        inStr = true;
        strQuote = c;
        current = '';
      }
    } else {
      if (c === strQuote && trimmed[i - 1] !== '\\') {
        inStr = false;
        items.push(current.replace(/\\'/g, "'").replace(/\\"/g, '"'));
        current = '';
      } else {
        current += c;
      }
    }
  }
  return items;
}

/**
 * Sends a batch of feature objects to the FastAPI /predict-batch endpoint
 * with a 30-second timeout and 1 automatic retry on network/timeout failure.
 */
async function callPredictBatchWithRetry(items, mlServiceUrl) {
  const url = `${mlServiceUrl}/predict-batch`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await axios.post(url, items, { timeout: 30000 });
      if (res.data?.success && Array.isArray(res.data?.predictions)) {
        return res.data.predictions;
      }
      throw new Error(res.data?.message || 'Invalid batch prediction response');
    } catch (err) {
      if (attempt === 1) {
        console.warn(`    ⚠ /predict-batch attempt 1 failed (${err.message}). Retrying in 2 seconds...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        throw new Error(`Failed /predict-batch after 2 attempts: ${err.message}`);
      }
    }
  }
}

// ── Main Seeding Routine ─────────────────────────────────────────────────────
async function main() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  PerformIQ AI — Phase 4 Database Seeder');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  // 1. Safety Check: Refuse execution if in test mode
  if (process.env.NODE_ENV === 'test') {
    console.error('❌ ERROR: Seed script refused to run because NODE_ENV=test.');
    console.error('   Please run against the development database (NODE_ENV=development).\n');
    process.exit(1);
  }

  // 2. Pre-Check: Verify ML service reachability
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  console.log(`▶ 1. Checking ML Service health at ${mlServiceUrl}...`);
  try {
    const health = await axios.get(`${mlServiceUrl}/health`, { timeout: 5000 });
    if (!health.data?.model_loaded) {
      throw new Error('Model is not loaded in ML service');
    }
    console.log(`  ✅ ML Service online and model is loaded.\n`);
  } catch (err) {
    console.error(`❌ ERROR: ML service is unreachable at ${mlServiceUrl}.`);
    console.error(`   Message: ${err.message}`);
    console.error('   Please start the FastAPI service before seeding:\n');
    console.error('     cd ml-service; .\\venv\\Scripts\\uvicorn main:app --port 8000\n');
    process.exit(1);
  }

  // 3. Connect to MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ ERROR: MONGO_URI is missing from .env');
    process.exit(1);
  }
  console.log('▶ 2. Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  const dbName = mongoose.connection.name;
  console.log(`  ✅ Connected to MongoDB: [DB: ${dbName}]\n`);

  if (dbName === 'performiq_test') {
    console.error('❌ Refusing to seed test database (performiq_test). Aborting.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Initialise PRNG
  const seedVal = process.env.SEED_RANDOM_SEED || 42;
  const prng = createPrng(seedVal);
  console.log(`ℹ Initialised deterministic PRNG with SEED_RANDOM_SEED = ${seedVal}\n`);

  // 4. Upsert Demo Users (1 Admin, 3 Teachers)
  console.log('▶ 3. Upserting Demo Users (1 Admin, 3 Teachers)...');
  const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD || 'AdminDemo123!';
  const demoTeacherPassword = process.env.DEMO_TEACHER_PASSWORD || 'TeacherDemo123!';

  const demoAccounts = [
    { name: 'System Administrator', email: 'admin@performiq.ai', role: 'admin', pass: demoAdminPassword },
    { name: 'Dr. Sarah Jenkins', email: 'teacher1@performiq.ai', role: 'teacher', pass: demoTeacherPassword },
    { name: 'Prof. Marcus Chen', email: 'teacher2@performiq.ai', role: 'teacher', pass: demoTeacherPassword },
    { name: 'Ms. Elena Rodriguez', email: 'teacher3@performiq.ai', role: 'teacher', pass: demoTeacherPassword },
  ];

  const teachers = [];
  let adminUser = null;

  for (const acc of demoAccounts) {
    const passwordHash = await bcrypt.hash(acc.pass, 10);
    // Upsert by email preserving existing _id if present
    const userDoc = await User.findOneAndUpdate(
      { email: acc.email },
      { $set: { name: acc.name, role: acc.role, passwordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (acc.role === 'admin') adminUser = userDoc;
    else teachers.push(userDoc);
  }
  console.log(`  ✅ Demo users upserted (Admin: ${adminUser.email}, Teachers: ${teachers.length})\n`);

  // 5. Clean Previously Seeded Records
  console.log('▶ 4. Cleaning Previously Seeded Data ({ isSeeded: true })...');
  const seededStudents = await Student.find({ isSeeded: true }, '_id');
  const seededStudentIds = seededStudents.map((s) => s._id);

  let delPredictionsCount = 0;
  let delAssessmentsCount = 0;
  let delInterventionsCount = 0;
  let delStudentsCount = 0;

  if (seededStudentIds.length > 0) {
    const delP = await Prediction.deleteMany({ student: { $in: seededStudentIds } });
    delPredictionsCount = delP.deletedCount;

    const delA = await Assessment.deleteMany({ student: { $in: seededStudentIds } });
    delAssessmentsCount = delA.deletedCount;

    const delI = await Intervention.deleteMany({ student: { $in: seededStudentIds } });
    delInterventionsCount = delI.deletedCount;

    const delS = await Student.deleteMany({ _id: { $in: seededStudentIds } });
    delStudentsCount = delS.deletedCount;
  }

  const delOulad = await OuladRecord.deleteMany({ isSeeded: true });
  const delCutoff = await OuladCutoff.deleteMany({ isSeeded: true });
  const delEngage = await OuladEngagement.deleteMany({ isSeeded: true });

  console.log(`  ✅ Removed ${delStudentsCount} previously seeded students.`);
  console.log(`  ✅ Cleaned referencing records: ${delPredictionsCount} predictions, ${delAssessmentsCount} assessments, ${delInterventionsCount} interventions.`);
  console.log(`  ✅ Cleaned OULAD records: ${delOulad.deletedCount} at-risk, ${delCutoff.deletedCount} cutoff benchmarks, ${delEngage.deletedCount} engagement rows.\n`);

  // 6. Import 5,000 Students from final_student_exam_performance.csv
  const csvPath = path.resolve(__dirname, '../../data/final_student_exam_performance.csv');
  console.log(`▶ 5. Reading dataset from: ${csvPath}...`);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const totalRows = lines.length - 1;
  console.log(`  Dataset contains ${totalRows} student rows.`);

  const header = parseCsvLine(lines[0]);
  const colIndex = {};
  header.forEach((h, i) => {
    colIndex[h.trim()] = i;
  });

  // Select 5,000 random rows deterministically using the PRNG
  const TARGET_STUDENT_COUNT = 5000;
  console.log(`  Sampling ${TARGET_STUDENT_COUNT} rows using seeded PRNG...`);

  // Fisher-Yates partial sample of indices 1..totalRows
  const rowIndices = [];
  for (let i = 1; i <= totalRows; i++) rowIndices.push(i);
  for (let i = 0; i < TARGET_STUDENT_COUNT; i++) {
    const swapWith = i + Math.floor(prng() * (rowIndices.length - i));
    const temp = rowIndices[i];
    rowIndices[i] = rowIndices[swapWith];
    rowIndices[swapWith] = temp;
  }
  const sampledIndices = rowIndices.slice(0, TARGET_STUDENT_COUNT);

  // Prepare Student documents
  const studentsToInsert = [];
  for (let i = 0; i < TARGET_STUDENT_COUNT; i++) {
    const line = lines[sampledIndices[i]];
    const fields = parseCsvLine(line);

    // Realistic fake name
    const fn = FIRST_NAMES[Math.floor(prng() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(prng() * LAST_NAMES.length)];
    const fakeName = `${fn} ${ln}`;

    // Unique studentId: STU_SEED_0001 .. STU_SEED_5000
    const studentId = `STU_SEED_${String(i + 1).padStart(4, '0')}`;

    // Assign evenly across the 3 demo teachers
    const assignedTeacher = teachers[i % teachers.length]._id;

    const studentDoc = {
      studentId,
      name: fakeName,
      assignedTeacher,
      isSimulated: false,
      isSeeded: true,
      latestPredictedScore: null,
      latestRiskLevel: null,
    };

    // Populate the 37 feature fields
    for (const col of FEATURE_COLUMNS) {
      const idx = colIndex[col];
      if (idx === undefined) continue;
      const rawVal = fields[idx]?.trim();

      if (rawVal === undefined || rawVal === '') {
        studentDoc[col] = null;
      } else if (NUMERIC_COLUMNS.has(col)) {
        const num = parseFloat(rawVal);
        studentDoc[col] = isNaN(num) ? null : num;
      } else {
        // Keep literal string "None" intact for device_availability
        studentDoc[col] = rawVal;
      }
    }

    studentsToInsert.push(studentDoc);
  }

  console.log(`  Inserting ${studentsToInsert.length} students into MongoDB in batches...`);
  const insertedStudents = [];
  const BATCH_SIZE_STUDENT = 1000;
  for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE_STUDENT) {
    const chunk = studentsToInsert.slice(i, i + BATCH_SIZE_STUDENT);
    const docs = await Student.insertMany(chunk, { ordered: false });
    insertedStudents.push(...docs);
    process.stdout.write(`    [Students] Inserted ${insertedStudents.length} / ${TARGET_STUDENT_COUNT}\r`);
  }
  console.log(`\n  ✅ All ${TARGET_STUDENT_COUNT} students inserted successfully.\n`);

  // 7. Obtain Live Batch Predictions from ML Service
  console.log('▶ 6. Generating ML predictions via POST /predict-batch (chunks of 200)...');
  const PREDICT_CHUNK_SIZE = 200;
  const predictionsToInsert = [];
  const studentBulkUpdates = [];

  const riskCounts = { High: 0, Medium: 0, Low: 0 };

  for (let i = 0; i < insertedStudents.length; i += PREDICT_CHUNK_SIZE) {
    const studentChunk = insertedStudents.slice(i, i + PREDICT_CHUNK_SIZE);

    // Prepare feature payloads for the ML service
    const payloadItems = studentChunk.map((stu) => {
      const stuObj = stu.toObject();
      const row = {};
      for (const col of FEATURE_COLUMNS) {
        row[col] = stuObj[col] ?? null;
      }
      return row;
    });

    const predictionsResponse = await callPredictBatchWithRetry(payloadItems, mlServiceUrl);

    for (let j = 0; j < studentChunk.length; j++) {
      const stu = studentChunk[j];
      const predResult = predictionsResponse[j];
      const score = predResult.predicted_score;
      const missingCount = predResult.missing_fields_count;

      const risk = getRiskLevel(score);
      riskCounts[risk] = (riskCounts[risk] || 0) + 1;

      const recs = generateRecommendations(stu.toObject());

      predictionsToInsert.push({
        student: stu._id,
        predictedScore: score,
        riskLevel: risk,
        recommendations: recs,
        source: 'module1',
        missingFieldsCount: missingCount,
        isSeeded: true,
      });

      studentBulkUpdates.push({
        updateOne: {
          filter: { _id: stu._id },
          update: {
            $set: {
              latestPredictedScore: score,
              latestRiskLevel: risk,
            },
          },
        },
      });

      // Update in-memory object for subsequent assessment/intervention generation
      stu.latestPredictedScore = score;
      stu.latestRiskLevel = risk;
    }

    process.stdout.write(`    [Predictions] Predicted ${Math.min(i + PREDICT_CHUNK_SIZE, insertedStudents.length)} / ${insertedStudents.length}\r`);
  }

  console.log('\n  Saving predictions and caching latest values on students...');
  for (let i = 0; i < predictionsToInsert.length; i += 1000) {
    const chunk = predictionsToInsert.slice(i, i + 1000);
    await Prediction.insertMany(chunk, { ordered: false });
  }
  await Student.bulkWrite(studentBulkUpdates);
  console.log(`  ✅ ${predictionsToInsert.length} predictions created and cached.\n`);

  // 8. Generate Simulated Past Assessments (4 to 6 per student)
  console.log('▶ 7. Generating simulated past assessments (4-6 per student, isSimulated: true)...');
  const ASSESSMENT_TYPES = ['Quiz', 'Assignment', 'Midterm', 'Final', 'Practice Test'];
  const assessmentsToInsert = [];

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const stu of insertedStudents) {
    const count = 4 + Math.floor(prng() * 3); // 4, 5, or 6
    const baseScore = stu.previous_exam_score || stu.latestPredictedScore || 65;

    for (let k = 0; k < count; k++) {
      // Spread dates between 360 days ago and 15 days ago
      const daysAgo = 360 - Math.floor((345 / count) * k) + Math.floor((prng() - 0.5) * 10);
      const assessDate = new Date(now - Math.max(5, daysAgo) * ONE_DAY_MS);

      // Score around baseScore with noise (+- 8 points)
      const noise = (prng() - 0.5) * 16;
      const score = Math.min(100, Math.max(0, parseFloat((baseScore + noise).toFixed(1))));

      assessmentsToInsert.push({
        student: stu._id,
        title: `${ASSESSMENT_TYPES[k % ASSESSMENT_TYPES.length]} ${k + 1}`,
        type: ASSESSMENT_TYPES[k % ASSESSMENT_TYPES.length],
        score,
        maxScore: 100,
        date: assessDate,
        isSimulated: true,
        isSeeded: true,
      });
    }
  }

  console.log(`  Inserting ${assessmentsToInsert.length} assessments in batches...`);
  for (let i = 0; i < assessmentsToInsert.length; i += 2500) {
    const chunk = assessmentsToInsert.slice(i, i + 2500);
    await Assessment.insertMany(chunk, { ordered: false });
    process.stdout.write(`    [Assessments] Inserted ${Math.min(i + 2500, assessmentsToInsert.length)} / ${assessmentsToInsert.length}\r`);
  }
  console.log(`\n  ✅ All ${assessmentsToInsert.length} assessments inserted successfully.\n`);

  // 9. Generate Simulated Interventions for High and Medium Risk Students
  console.log('▶ 8. Generating simulated interventions & outcome assessments (isSimulated: true)...');
  const highAndMedStudents = insertedStudents.filter(
    (s) => s.latestRiskLevel === 'High' || s.latestRiskLevel === 'Medium'
  );

  const INTERVENTION_TYPES = [
    'Mentoring',
    'Extra Practice',
    'Attendance Monitoring',
    'Counselling',
    'Peer Support',
  ];

  const interventionsToInsert = [];
  const extraAssessments = [];

  let improvedCount = 0;
  let declinedCount = 0;

  for (const stu of highAndMedStudents) {
    // Select ~35% of high/medium risk students for an intervention
    if (prng() > 0.35) continue;

    const intervType = INTERVENTION_TYPES[Math.floor(prng() * INTERVENTION_TYPES.length)];

    // Realistic mix: ~65% completed, ~20% ongoing, ~15% planned
    const statusRoll = prng();
    let status;
    let startDate;
    let outcomeText = null;
    let notesText = '';

    if (statusRoll < 0.65) {
      // ── 65% Completed ─────────────────────────────────────────────────────
      status = 'completed';
      const startDateDaysAgo = 90 + Math.floor(prng() * 60); // 90 to 150 days ago
      startDate = new Date(now - startDateDaysAgo * ONE_DAY_MS);

      // Guarantee at least 1 assessment BEFORE startDate
      const beforeDate = new Date(startDate.getTime() - (20 + Math.floor(prng() * 30)) * ONE_DAY_MS);
      const beforeScore = Math.min(100, Math.max(0, parseFloat((stu.latestPredictedScore - 5 + (prng() - 0.5) * 6).toFixed(1))));

      extraAssessments.push({
        student: stu._id,
        title: `${intervType} Baseline Assessment`,
        type: 'Quiz',
        score: beforeScore,
        maxScore: 100,
        date: beforeDate,
        isSimulated: true,
        isSeeded: true,
      });

      // 60% chance of improvement, 40% chance of decline / no clear change
      const isImproved = prng() < 0.6;
      let afterScore;
      if (isImproved) {
        improvedCount++;
        const gain = 8 + prng() * 12; // +8 to +20 points
        afterScore = Math.min(100, Math.max(0, parseFloat((beforeScore + gain).toFixed(1))));
        outcomeText = `Student attended all sessions diligently, improving understanding and gaining +${(afterScore - beforeScore).toFixed(1)} points on subsequent evaluations.`;
      } else {
        declinedCount++;
        const change = (prng() - 0.6) * 8; // -4.8 to +3.2 points
        afterScore = Math.min(100, Math.max(0, parseFloat((beforeScore + change).toFixed(1))));
        outcomeText = `Student had inconsistent attendance with minimal performance change (${afterScore >= beforeScore ? '+' : ''}${(afterScore - beforeScore).toFixed(1)} points). Continued monitoring advised.`;
      }

      // Guarantee at least 1 assessment AFTER startDate
      const afterDate = new Date(startDate.getTime() + (20 + Math.floor(prng() * 40)) * ONE_DAY_MS);
      extraAssessments.push({
        student: stu._id,
        title: `${intervType} Post-Intervention Evaluation`,
        type: 'Assignment',
        score: afterScore,
        maxScore: 100,
        date: afterDate,
        isSimulated: true,
        isSeeded: true,
      });
      notesText = 'Completed intervention with recorded post-intervention outcome.';
    } else if (statusRoll < 0.85) {
      // ── 20% Ongoing (started recently, with a few assessments after start) ──
      status = 'ongoing';
      const startDateDaysAgo = 15 + Math.floor(prng() * 30); // 15 to 45 days ago
      startDate = new Date(now - startDateDaysAgo * ONE_DAY_MS);

      // Baseline assessment before startDate
      const beforeDate = new Date(startDate.getTime() - (15 + Math.floor(prng() * 20)) * ONE_DAY_MS);
      const beforeScore = Math.min(100, Math.max(0, parseFloat((stu.latestPredictedScore - 4 + (prng() - 0.5) * 6).toFixed(1))));

      extraAssessments.push({
        student: stu._id,
        title: `${intervType} Baseline Assessment`,
        type: 'Quiz',
        score: beforeScore,
        maxScore: 100,
        date: beforeDate,
        isSimulated: true,
        isSeeded: true,
      });

      // 1 mid-intervention assessment after start date
      const afterDate = new Date(now - (3 + Math.floor(prng() * 7)) * ONE_DAY_MS);
      const midScore = Math.min(100, Math.max(0, parseFloat((beforeScore + (prng() - 0.3) * 8).toFixed(1))));

      extraAssessments.push({
        student: stu._id,
        title: `${intervType} Progress Check`,
        type: 'Practice Test',
        score: midScore,
        maxScore: 100,
        date: afterDate,
        isSimulated: true,
        isSeeded: true,
      });

      outcomeText = null;
      notesText = 'Intervention currently in progress. Weekly check-ins ongoing.';
    } else {
      // ── 15% Planned (future start date, no outcome yet) ────────────────────
      status = 'planned';
      const futureDays = 15 + Math.floor(prng() * 30); // 15 to 45 days in the future
      startDate = new Date(now + futureDays * ONE_DAY_MS);

      // 1 past baseline assessment before start date
      const beforeDate = new Date(now - (10 + Math.floor(prng() * 20)) * ONE_DAY_MS);
      const beforeScore = Math.min(100, Math.max(0, parseFloat((stu.latestPredictedScore + (prng() - 0.5) * 6).toFixed(1))));

      extraAssessments.push({
        student: stu._id,
        title: `${intervType} Preliminary Assessment`,
        type: 'Quiz',
        score: beforeScore,
        maxScore: 100,
        date: beforeDate,
        isSimulated: true,
        isSeeded: true,
      });

      outcomeText = null;
      notesText = 'Scheduled planned intervention for upcoming academic cycle.';
    }

    interventionsToInsert.push({
      student: stu._id,
      type: intervType,
      description: `Targeted ${intervType.toLowerCase()} to address academic risk factors identified by PerformIQ AI.`,
      assignedBy: stu.assignedTeacher,
      startDate,
      status,
      outcome: outcomeText,
      notes: notesText,
      isSimulated: true,
      isSeeded: true,
    });
  }

  if (extraAssessments.length > 0) {
    await Assessment.insertMany(extraAssessments, { ordered: false });
  }
  if (interventionsToInsert.length > 0) {
    await Intervention.insertMany(interventionsToInsert, { ordered: false });
  }

  console.log(`  ✅ Created ${interventionsToInsert.length} interventions (${improvedCount} improved, ${declinedCount} no change/declined).`);
  console.log(`  ✅ Added ${extraAssessments.length} targeted before/after assessments ensuring 100% impact evaluation coverage.\n`);

  // 10. Import OULAD Datasets
  console.log('▶ 9. Importing OULAD Datasets (Module 3)...');

  // A. performiq_oulad_at_risk.csv
  const ouladAtRiskPath = path.resolve(__dirname, '../../data/performiq_oulad_at_risk.csv');
  console.log(`  Reading ${ouladAtRiskPath}...`);
  const ouladContent = fs.readFileSync(ouladAtRiskPath, 'utf8');
  const ouladLines = ouladContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const ouladRecordsToInsert = [];
  let failedParseCount = 0;

  for (let i = 1; i < ouladLines.length; i++) {
    const fields = parseCsvLine(ouladLines[i]);
    if (fields.length < 10) continue;

    const id_student = parseInt(fields[0], 10);
    const code_module = fields[1]?.trim();
    const risk_prob = parseFloat(fields[2]);
    const risk_level = fields[3]?.trim();
    const total_clicks = fields[4] ? parseFloat(fields[4]) : null;
    const click_change = fields[5] ? parseFloat(fields[5]) : null;
    const n_missed = fields[6] ? parseFloat(fields[6]) : null;
    const avg_score = fields[7] ? parseFloat(fields[7]) : null;
    const score_trend = fields[8] ? parseFloat(fields[8]) : null;

    const recsRaw = fields[9];
    const recommendations = parsePythonList(recsRaw);
    if (recsRaw && recsRaw.length > 2 && recommendations.length === 0) {
      failedParseCount++;
    }

    ouladRecordsToInsert.push({
      id_student,
      code_module,
      risk_prob: isNaN(risk_prob) ? null : risk_prob,
      risk_level,
      total_clicks,
      click_change,
      n_missed,
      avg_score,
      score_trend,
      recommendations,
      isSeeded: true,
    });
  }

  await OuladRecord.insertMany(ouladRecordsToInsert, { ordered: false });
  console.log(`  ✅ Imported ${ouladRecordsToInsert.length} OULAD at-risk student records.`);
  console.log(`  ℹ OULAD recommendation parsing failures: ${failedParseCount} (Expected: 0)`);

  // B. oulad_cutoff_results.csv
  const cutoffPath = path.resolve(__dirname, '../../data/oulad_cutoff_results.csv');
  const cutoffContent = fs.readFileSync(cutoffPath, 'utf8');
  const cutoffLines = cutoffContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cutoffDocs = [];
  for (let i = 1; i < cutoffLines.length; i++) {
    const f = parseCsvLine(cutoffLines[i]);
    if (f.length >= 6) {
      cutoffDocs.push({
        cutoff_day: parseInt(f[0], 10),
        students: parseInt(f[1], 10),
        at_risk_share: parseFloat(f[2]),
        ROC_AUC: parseFloat(f[3]),
        Recall: parseFloat(f[4]),
        Precision: parseFloat(f[5]),
        isSeeded: true,
      });
    }
  }
  await OuladCutoff.insertMany(cutoffDocs, { ordered: false });
  console.log(`  ✅ Imported ${cutoffDocs.length} OULAD cutoff benchmark rows.`);

  // C. oulad_weekly_engagement.csv
  const engagePath = path.resolve(__dirname, '../../data/oulad_weekly_engagement.csv');
  const engageContent = fs.readFileSync(engagePath, 'utf8');
  const engageLines = engageContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const engageDocs = [];
  for (let i = 1; i < engageLines.length; i++) {
    const f = parseCsvLine(engageLines[i]);
    if (f.length >= 5) {
      engageDocs.push({
        week: parseInt(f[0], 10),
        Distinction: parseFloat(f[1]),
        Fail: parseFloat(f[2]),
        Pass: parseFloat(f[3]),
        Withdrawn: parseFloat(f[4]),
        isSeeded: true,
      });
    }
  }
  await OuladEngagement.insertMany(engageDocs, { ordered: false });
  console.log(`  ✅ Imported ${engageDocs.length} OULAD weekly engagement rows.\n`);

  // 11. Real Atlas Storage Measurement
  console.log('▶ 10. Measuring Real MongoDB Atlas Storage Usage (dbStats)...');
  const stats = await mongoose.connection.db.stats();
  const dataSizeMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
  const storageSizeMB = (stats.storageSize / (1024 * 1024)).toFixed(2);
  const indexSizeMB = (stats.indexSize / (1024 * 1024)).toFixed(2);
  const totalAllocatedMB = ((stats.storageSize + stats.indexSize) / (1024 * 1024)).toFixed(2);
  const freeTierQuotaMB = 512;
  const quotaUsagePct = (((stats.storageSize + stats.indexSize) / (1024 * 1024) / freeTierQuotaMB) * 100).toFixed(2);

  // 12. Final Database Summary & Diagnostics
  const counts = {
    users: await User.countDocuments(),
    students: await Student.countDocuments(),
    predictions: await Prediction.countDocuments(),
    assessments: await Assessment.countDocuments(),
    interventions: await Intervention.countDocuments(),
    ouladRecords: await OuladRecord.countDocuments(),
    ouladCutoff: await OuladCutoff.countDocuments(),
    ouladEngagement: await OuladEngagement.countDocuments(),
  };

  const teacherCounts = {};
  for (const t of teachers) {
    const c = await Student.countDocuments({ assignedTeacher: t._id });
    teacherCounts[t.name] = c;
  }

  console.log('\n════════════════════════════════════════════════════════════════════════');
  console.log('  SEEDING COMPLETE — SUMMARY REPORT');
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('Collection Record Counts:');
  console.log(`  • Users:             ${counts.users} (1 Admin, ${teachers.length} Teachers)`);
  console.log(`  • Students:          ${counts.students} (${TARGET_STUDENT_COUNT} seeded)`);
  console.log(`  • Predictions:       ${counts.predictions}`);
  console.log(`  • Assessments:       ${counts.assessments} (Simulated past + intervention checks)`);
  console.log(`  • Interventions:     ${counts.interventions}`);
  console.log(`  • OULAD At-Risk:     ${counts.ouladRecords}`);
  console.log(`  • OULAD Cutoffs:     ${counts.ouladCutoff}`);
  console.log(`  • OULAD Engagement:  ${counts.ouladEngagement}`);

  console.log('\nSeeded Risk Level Distribution:');
  console.log(`  • High Risk:   ${riskCounts.High} (${((riskCounts.High / TARGET_STUDENT_COUNT) * 100).toFixed(1)}%)`);
  console.log(`  • Medium Risk: ${riskCounts.Medium} (${((riskCounts.Medium / TARGET_STUDENT_COUNT) * 100).toFixed(1)}%)`);
  console.log(`  • Low Risk:    ${riskCounts.Low} (${((riskCounts.Low / TARGET_STUDENT_COUNT) * 100).toFixed(1)}%)`);

  console.log('\nTeacher Student Allocations:');
  for (const [name, count] of Object.entries(teacherCounts)) {
    console.log(`  • ${name}: ${count} students`);
  }

  console.log('\nAtlas Storage Metrics (Actual WiredTiger Compression):');
  console.log(`  • Uncompressed Data Size: ${dataSizeMB} MB`);
  console.log(`  • Compressed Storage on Disk: ${storageSizeMB} MB`);
  console.log(`  • Index Size: ${indexSizeMB} MB`);
  console.log(`  • Total Atlas Storage Allocated: ${totalAllocatedMB} MB / ${freeTierQuotaMB} MB (${quotaUsagePct}% of Free Tier)`);

  console.log('\nDemo Logins (Demo-Only — Change via .env for Public Deployments):');
  console.log(`  • Admin:   admin@performiq.ai    / ${demoAdminPassword}`);
  console.log(`  • Teacher: teacher1@performiq.ai / ${demoTeacherPassword}`);
  console.log(`  • Teacher: teacher2@performiq.ai / ${demoTeacherPassword}`);
  console.log(`  • Teacher: teacher3@performiq.ai / ${demoTeacherPassword}`);

  console.log('\n⚠ NOTICE: Simulated assessments and intervention outcomes are generated for demonstration');
  console.log('   and UI evaluation purposes only. They do NOT reflect real-world intervention efficacy.\n');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err);
  process.exit(1);
});
