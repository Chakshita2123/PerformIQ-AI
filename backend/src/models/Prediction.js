const mongoose = require('mongoose');

/**
 * Prediction — one ML prediction run for a student.
 * source = 'module1' (live FastAPI) or 'manual' (future use).
 * riskLevel is derived from predictedScore: <50=High, 50-59=Medium, >=60=Low.
 * recommendations is an array of plain-English strings (max 4).
 */
const predictionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    predictedScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      required: true,
    },
    recommendations: [{ type: String }],
    source: {
      type: String,
      enum: ['module1', 'manual'],
      default: 'module1',
    },
  },
  { timestamps: true }
);

predictionSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
