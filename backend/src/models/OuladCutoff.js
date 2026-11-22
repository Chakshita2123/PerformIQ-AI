const mongoose = require('mongoose');

/**
 * OuladCutoff — cutoff benchmark performance metrics from data/oulad_cutoff_results.csv.
 * Evaluates model discrimination (ROC_AUC, Recall, Precision) across cutoff days.
 */
const ouladCutoffSchema = new mongoose.Schema(
  {
    cutoff_day: { type: Number, required: true },
    students: { type: Number, required: true },
    at_risk_share: { type: Number },
    ROC_AUC: { type: Number },
    Recall: { type: Number },
    Precision: { type: Number },
    isSeeded: { type: Boolean, default: true },
  },
  { timestamps: false }
);

ouladCutoffSchema.index({ cutoff_day: 1 });

module.exports = mongoose.model('OuladCutoff', ouladCutoffSchema);
