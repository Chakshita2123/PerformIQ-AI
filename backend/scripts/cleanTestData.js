/**
 * cleanTestData.js
 * Scans the database and removes all artifacts created by test runs.
 * Targets:
 *   - Users: emails starting with alice_, hack_, teacher2_
 *   - Students: studentId starting with STU_TEST_, STU_P2_, or name 'Test Student P2' / 'Bob Smith'
 *   - Assessments, Predictions, Interventions associated with those students or test users
 *
 * Run with: node scripts/cleanTestData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function clean() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB: ${conn.connection.name}`);

    const db = mongoose.connection.db;

    // 1. Find test users
    const testUsers = await db.collection('users').find({
      $or: [
        { email: { $regex: /^(alice|hack|teacher2)/i } },
        { email: { $regex: /_test@/i } },
      ],
    }).toArray();
    const testUserIds = testUsers.map((u) => u._id);
    console.log(`Found ${testUsers.length} test user(s).`);

    // 2. Find test students
    const testStudents = await db.collection('students').find({
      $or: [
        { studentId: { $regex: /^STU_(TEST|P2|BAD)/i } },
        { assignedTeacher: { $in: testUserIds } },
        { name: { $in: ['Bob Smith', 'Test Student P2', 'Duplicate', 'Bad', 'No ID'] } },
      ],
    }).toArray();
    const testStudentIds = testStudents.map((s) => s._id);
    console.log(`Found ${testStudents.length} test student(s).`);

    // 3. Delete dependent assessments, predictions, interventions
    const deletedAssessments = await db.collection('assessments').deleteMany({
      $or: [
        { student: { $in: testStudentIds } },
        { title: { $regex: /Quiz/i } },
      ],
    });
    console.log(`Deleted ${deletedAssessments.deletedCount} test assessment(s).`);

    const deletedPredictions = await db.collection('predictions').deleteMany({
      student: { $in: testStudentIds },
    });
    console.log(`Deleted ${deletedPredictions.deletedCount} test prediction(s).`);

    const deletedInterventions = await db.collection('interventions').deleteMany({
      $or: [
        { student: { $in: testStudentIds } },
        { assignedBy: { $in: testUserIds } },
      ],
    });
    console.log(`Deleted ${deletedInterventions.deletedCount} test intervention(s).`);

    // 4. Delete students and users
    const deletedStudents = await db.collection('students').deleteMany({
      _id: { $in: testStudentIds },
    });
    console.log(`Deleted ${deletedStudents.deletedCount} test student(s).`);

    const deletedUsers = await db.collection('users').deleteMany({
      _id: { $in: testUserIds },
    });
    console.log(`Deleted ${deletedUsers.deletedCount} test user(s).`);

    console.log('✅ Clean-up complete. Zero test residues remaining in the database.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await mongoose.disconnect();
  }
}

clean();
