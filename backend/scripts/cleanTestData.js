/**
 * cleanTestData.js
 * Strictly removes ONLY test data with unambiguous test prefixes.
 * Designed to NEVER touch real students, real teachers, or seeded datasets.
 *
 * Safe Test Patterns:
 *   - Users: emails starting with alice_<timestamp>@, hack_<timestamp>@, teacher2_<timestamp>@,
 *            or ending with @test.com / @school.test
 *   - Students: studentId matching ^STU_TEST_\d+ or ^STU_P2_\d+ or ^STU_BAD_
 *   - Assessments, Predictions, Interventions: only deleted if linked to the matched test students or users.
 *
 * Run with: node scripts/cleanTestData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function clean() {
  try {
    let uri = process.env.MONGO_URI;
    if (process.env.NODE_ENV === 'test') {
      uri = process.env.MONGO_URI_TEST || uri.replace(/\/performiq(\?|$)/, '/performiq_test$1');
    }

    const conn = await mongoose.connect(uri);
    console.log(`Connected to MongoDB: ${conn.connection.name}`);

    const db = mongoose.connection.db;

    // 1. Find STRICTLY test users (never touch real admins or teachers)
    const testUsers = await db.collection('users').find({
      $or: [
        { email: { $regex: /^(alice|hack|teacher2)_\d+@/i } },
        { email: { $regex: /_test@/i } },
        { email: { $regex: /@(test\.com|school\.test)$/i } },
      ],
    }).toArray();
    const testUserIds = testUsers.map((u) => u._id);
    console.log(`Found ${testUsers.length} strict test user(s).`);

    // 2. Find STRICTLY test students by explicit test studentId prefix
    const testStudents = await db.collection('students').find({
      $or: [
        { studentId: { $regex: /^STU_(TEST|P2|BAD)/i } },
        { assignedTeacher: { $in: testUserIds } },
      ],
    }).toArray();
    const testStudentIds = testStudents.map((s) => s._id);
    console.log(`Found ${testStudents.length} strict test student(s).`);

    if (testStudentIds.length === 0 && testUserIds.length === 0) {
      console.log('✅ Database is already clean. No test records found.');
      return;
    }

    // 3. Delete ONLY dependent records belonging to these specific test students/users
    if (testStudentIds.length > 0) {
      const deletedAssessments = await db.collection('assessments').deleteMany({
        student: { $in: testStudentIds },
      });
      console.log(`Deleted ${deletedAssessments.deletedCount} test assessment(s).`);

      const deletedPredictions = await db.collection('predictions').deleteMany({
        student: { $in: testStudentIds },
      });
      console.log(`Deleted ${deletedPredictions.deletedCount} test prediction(s).`);
    }

    const deletedInterventions = await db.collection('interventions').deleteMany({
      $or: [
        { student: { $in: testStudentIds } },
        { assignedBy: { $in: testUserIds } },
      ],
    });
    console.log(`Deleted ${deletedInterventions.deletedCount} test intervention(s).`);

    // 4. Delete the test students and users
    if (testStudentIds.length > 0) {
      const deletedStudents = await db.collection('students').deleteMany({
        _id: { $in: testStudentIds },
      });
      console.log(`Deleted ${deletedStudents.deletedCount} test student(s).`);
    }

    if (testUserIds.length > 0) {
      const deletedUsers = await db.collection('users').deleteMany({
        _id: { $in: testUserIds },
      });
      console.log(`Deleted ${deletedUsers.deletedCount} test user(s).`);
    }

    console.log('✅ Strict test data clean-up complete.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await mongoose.disconnect();
  }
}

clean();
