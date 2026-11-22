const OuladRecord = require('../models/OuladRecord');
const OuladCutoff = require('../models/OuladCutoff');
const OuladEngagement = require('../models/OuladEngagement');

/**
 * GET /api/oulad/at-risk
 * Returns paginated list of at-risk students from Module 3 OULAD analysis.
 * Supports filters: risk_level, code_module, and search by id_student.
 */
const getAtRisk = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.risk_level) {
      filter.risk_level = req.query.risk_level;
    }
    if (req.query.code_module) {
      filter.code_module = req.query.code_module.toUpperCase();
    }
    if (req.query.search) {
      const searchNum = parseInt(req.query.search, 10);
      if (!isNaN(searchNum)) {
        filter.id_student = searchNum;
      }
    }

    const [records, total] = await Promise.all([
      OuladRecord.find(filter)
        .sort({ risk_prob: -1, id_student: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OuladRecord.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page,
          pages,
          limit,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/oulad/cutoff-results
 * Returns cutoff benchmark metrics (ROC_AUC, Recall, Precision) across cutoff days.
 */
const getCutoffResults = async (req, res, next) => {
  try {
    const results = await OuladCutoff.find().sort({ cutoff_day: 1 }).lean();
    res.json({
      success: true,
      data: { results },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/oulad/engagement
 * Returns weekly engagement metrics by final outcome across course weeks.
 */
const getEngagement = async (req, res, next) => {
  try {
    const engagement = await OuladEngagement.find().sort({ week: 1 }).lean();
    res.json({
      success: true,
      data: { engagement },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAtRisk,
  getCutoffResults,
  getEngagement,
};
