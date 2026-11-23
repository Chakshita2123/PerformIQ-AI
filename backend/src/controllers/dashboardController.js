const Student = require('../models/Student');
const Intervention = require('../models/Intervention');
const Prediction = require('../models/Prediction');
const { getRecommendationLabel } = require('../utils/recommendations');

/**
 * GET /api/dashboard/summary
 *
 * Returns a summary built from THREE separate aggregation pipelines:
 *   A) Student stats — counts by risk level, average predicted score
 *   B) Intervention stats — counts by status
 *   C) Top recommendation reasons — from recent Prediction documents
 *
 * Teacher scoping:
 *   A teacher only sees data for students assigned to them.
 *   An admin sees everything.
 *
 * ─────────────────────────────────────────────────────────────────
 * AGGREGATION PIPELINE EXPLANATION (read with VIVA_NOTES.md)
 * ─────────────────────────────────────────────────────────────────
 * MongoDB aggregation is a pipeline: documents flow through a series
 * of "stages". Each stage transforms the data and passes results to
 * the next stage — like a Unix pipe (cat file | grep | sort | head).
 *
 * Stage operators used here:
 *   $match  — filters documents (like a WHERE clause in SQL)
 *   $group  — groups documents and computes totals (like GROUP BY + SUM)
 *   $unwind — explodes an array field: one doc per array element
 *   $sort   — orders results
 *   $limit  — keeps only the first N results
 *   $lookup — joins another collection (like a SQL LEFT JOIN)
 *   $cond   — inline if/else
 *   $sum    — accumulates a count or sum within a $group
 *   $avg    — computes the average within a $group
 * ─────────────────────────────────────────────────────────────────
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    // ── Build the student scope filter ──────────────────────────────────────
    // This is used in every pipeline below to restrict to the teacher's students.
    const studentMatch =
      req.user.role === 'teacher'
        ? { assignedTeacher: req.user._id }  // teacher sees only their students
        : {};                                  // admin sees all

    // ════════════════════════════════════════════════════════════════════════
    // PIPELINE A: Student stats
    // ════════════════════════════════════════════════════════════════════════
    const studentStats = await Student.aggregate([

      // STAGE 1 — $match
      // Filter the Student collection to only the documents we care about.
      // For a teacher: only documents where assignedTeacher == their ObjectId.
      // For an admin:  {} means "no filter" — all documents pass through.
      { $match: studentMatch },

      // STAGE 2 — $group
      // Collapse all matching student documents into ONE summary document.
      // _id: null means "group everything together" (no sub-groups).
      // Each field in this stage is an accumulator:
      {
        $group: {
          _id: null, // one output doc for the whole collection

          // $sum: 1 counts one for every document → total student count
          total: { $sum: 1 },

          // $avg computes the mean of latestPredictedScore across all students.
          // Documents where latestPredictedScore is null are ignored by $avg.
          avgPredictedScore: { $avg: '$latestPredictedScore' },

          // $cond is an inline if/else: { $cond: [condition, ifTrue, ifFalse] }
          // Here we count students whose latestRiskLevel equals 'High'.
          // If the condition is true we add 1; otherwise we add 0.
          highRisk: {
            $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'High'] }, 1, 0] },
          },
          mediumRisk: {
            $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'Medium'] }, 1, 0] },
          },
          lowRisk: {
            $sum: { $cond: [{ $eq: ['$latestRiskLevel', 'Low'] }, 1, 0] },
          },
          // Students who have never had a prediction yet (missing or null latestRiskLevel)
          // We use $ifNull to treat missing or null latestRiskLevel as null
          unassessed: {
            $sum: {
              $cond: [
                { $eq: [{ $ifNull: ['$latestRiskLevel', null] }, null] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // The result is an array with 0 or 1 elements. If 0 students match, it's [].
    const stats = studentStats[0] || {
      total: 0, avgPredictedScore: null,
      highRisk: 0, mediumRisk: 0, lowRisk: 0, unassessed: 0,
    };

    // ════════════════════════════════════════════════════════════════════════
    // PIPELINE B: Intervention counts by status
    // ════════════════════════════════════════════════════════════════════════
    // For teacher scoping we need to restrict to interventions whose student
    // is in the teacher's set. We use $lookup to join the Student collection.
    const interventionStats = await Intervention.aggregate([

      // STAGE 1 — $lookup (JOIN)
      // Left-join the Student collection into the Intervention documents.
      // For each Intervention document, MongoDB finds Student documents
      // where Student._id == Intervention.student and attaches them as
      // an array called 'studentDoc'.
      {
        $lookup: {
          from: 'students',          // the MongoDB collection name (lowercase plural)
          localField: 'student',     // field in Intervention
          foreignField: '_id',       // field in Student
          as: 'studentDoc',          // name for the joined array
        },
      },

      // STAGE 2 — $unwind
      // $lookup always produces an array. $unwind flattens it: one doc per
      // array element. Since each intervention has exactly one student,
      // this just moves the object out of the array.
      { $unwind: '$studentDoc' },

      // STAGE 3 — $match (teacher scoping on the joined field)
      // Now that the student data is embedded, we can filter by
      // studentDoc.assignedTeacher. Admin gets {} (no filter).
      {
        $match:
          req.user.role === 'teacher'
            ? { 'studentDoc.assignedTeacher': req.user._id }
            : {},
      },

      // STAGE 4 — $group by intervention status
      // Group the filtered interventions by their status field.
      // _id: '$status' means one output doc per distinct status value.
      // count: { $sum: 1 } counts how many interventions have each status.
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert the [{_id:'planned', count:3}, ...] array into a plain object
    // { planned: 3, ongoing: 1, completed: 2 } for a cleaner API response.
    const interventionCounts = { planned: 0, ongoing: 0, completed: 0 };
    interventionStats.forEach(({ _id, count }) => {
      if (_id) interventionCounts[_id] = count;
    });

    // ════════════════════════════════════════════════════════════════════════
    // PIPELINE C: Top 5 recommendation reasons (LATEST prediction per student)
    // ════════════════════════════════════════════════════════════════════════
    const topRecommendations = await Prediction.aggregate([

      // STAGE 1 — $lookup: join students so we can apply teacher scoping
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentDoc',
        },
      },

      // STAGE 2 — $unwind the joined studentDoc array
      { $unwind: '$studentDoc' },

      // STAGE 3 — $match: teacher scoping
      {
        $match:
          req.user.role === 'teacher'
            ? { 'studentDoc.assignedTeacher': req.user._id }
            : {},
      },

      // STAGE 4 — $sort descending by createdAt so newest predictions appear first
      { $sort: { createdAt: -1 } },

      // STAGE 5 — $group by student ID and take the first ($$ROOT) prediction.
      // Because we sorted by createdAt: -1, $first picks only each student's
      // LATEST prediction, ignoring older historical predictions.
      {
        $group: {
          _id: '$student',
          latestPrediction: { $first: '$$ROOT' },
        },
      },

      // STAGE 5b — $match: count only students whose LATEST risk is High or Medium
      {
        $match: {
          'latestPrediction.riskLevel': { $in: ['High', 'Medium'] },
        },
      },

      // STAGE 6 — $unwind the recommendations array of that latest prediction
      { $unwind: '$latestPrediction.recommendations' },

      // STAGE 7 — $group by recommendation text and count occurrences across students
      {
        $group: {
          _id: '$latestPrediction.recommendations',
          count: { $sum: 1 },
        },
      },

      // STAGE 8 — $sort by frequency count descending (most common first)
      { $sort: { count: -1 } },

      // STAGE 9 — $limit to top 5 reasons
      { $limit: 5 },
    ]);

    // ── Build the response ───────────────────────────────────────────────────
    res.json({
      success: true,
      data: {
        students: {
          total: stats.total,
          byRiskLevel: {
            High:       stats.highRisk,
            Medium:     stats.mediumRisk,
            Low:        stats.lowRisk,
            unassessed: stats.unassessed,
          },
          avgPredictedScore: stats.avgPredictedScore
            ? parseFloat(stats.avgPredictedScore.toFixed(2))
            : null,
        },
        interventions: {
          ...interventionCounts,
          total:
            (interventionCounts.planned || 0) +
            (interventionCounts.ongoing || 0) +
            (interventionCounts.completed || 0),
        },
        topRecommendations: topRecommendations.map((r) => ({
          reason: r._id,
          count:  r.count,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/attention
 *
 * Returns up to 5 students with the lowest latestPredictedScore
 * (sorted ascending: score 0 -> 100), including top 2 reasons from each student's
 * latest prediction.
 *
 * Teacher scoping applies:
 *   - Teachers only see their assigned students.
 *   - Admins see across all students.
 */
const getDashboardAttention = async (req, res, next) => {
  try {
    const studentMatch = {
      latestPredictedScore: { $ne: null },
      ...(req.user.role === 'teacher' ? { assignedTeacher: req.user._id } : {}),
    };

    const students = await Student.find(studentMatch)
      .sort({ latestPredictedScore: 1, createdAt: -1 })
      .limit(5)
      .select('_id studentId name latestPredictedScore latestRiskLevel')
      .lean();

    if (students.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const studentIds = students.map((s) => s._id);

    // Fetch the latest prediction for each of these students
    const predictions = await Prediction.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$student',
          recommendations: { $first: '$recommendations' },
        },
      },
    ]);

    const predMap = new Map();
    predictions.forEach((p) => {
      predMap.set(p._id.toString(), p.recommendations || []);
    });

    const data = students.map((s) => {
      const studentRecs = (predMap.get(s._id.toString()) || []).slice(0, 2);
      return {
        _id: s._id,
        studentId: s.studentId,
        name: s.name,
        latestPredictedScore: s.latestPredictedScore,
        latestRiskLevel: s.latestRiskLevel,
        reasons: studentRecs,
        reasonLabels: studentRecs.map(getRecommendationLabel),
      };
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardSummary,
  getDashboardAttention,
};
