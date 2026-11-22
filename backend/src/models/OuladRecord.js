const mongoose = require('mongoose');

/**
 * OuladRecord — one row from data/performiq_oulad_at_risk.csv.
 * These are pre-computed predictions from Module 3 (OULAD dataset).
 * They are imported once by the seed script; never updated at runtime.
 * recommendations is stored as an array (parsed from Python list string).
 */
const ouladRecordSchema = new mongoose.Schema(
  {
    id_student: { type: Number, required: true },
    code_module: { type: String, required: true },
    risk_prob: { type: Number, min: 0, max: 1 },
    risk_level: { type: String, enum: ['High Risk', 'Medium Risk', 'Low Risk', 'High', 'Medium', 'Low'] },
    total_clicks: { type: Number },
    click_change: { type: Number },
    n_missed: { type: Number },
    avg_score: { type: Number },
    score_trend: { type: Number },
    recommendations: [{ type: String }],
    isSeeded: { type: Boolean, default: true },
  },
  { timestamps: false }
);

ouladRecordSchema.index({ id_student: 1, code_module: 1 });

module.exports = mongoose.model('OuladRecord', ouladRecordSchema);
