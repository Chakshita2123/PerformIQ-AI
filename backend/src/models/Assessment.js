const mongoose = require('mongoose');

/**
 * Assessment — a scored test or assignment for a student.
 * isSimulated must be true for any seeded / dummy data (see CLAUDE.md).
 */
const assessmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['Quiz', 'Assignment', 'Midterm', 'Final', 'Practice Test'],
      required: true,
    },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    isSimulated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

assessmentSchema.index({ student: 1, date: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
