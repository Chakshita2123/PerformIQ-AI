const mongoose = require('mongoose');

/**
 * OuladEngagement — weekly VLE click metrics by final outcome from data/oulad_weekly_engagement.csv.
 * Used to render engagement comparison charts across course weeks.
 */
const ouladEngagementSchema = new mongoose.Schema(
  {
    week: { type: Number, required: true },
    Distinction: { type: Number, default: 0 },
    Fail: { type: Number, default: 0 },
    Pass: { type: Number, default: 0 },
    Withdrawn: { type: Number, default: 0 },
    isSeeded: { type: Boolean, default: true },
  },
  { timestamps: false }
);

ouladEngagementSchema.index({ week: 1 });

module.exports = mongoose.model('OuladEngagement', ouladEngagementSchema);
