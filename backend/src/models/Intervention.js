const mongoose = require('mongoose');

/**
 * Intervention — a corrective action assigned by a teacher to a student.
 * status lifecycle: planned → ongoing → completed
 * isSimulated must be true for seeded / dummy records.
 */
const interventionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'Mentoring',
        'Extra Practice',
        'Attendance Monitoring',
        'Counselling',
        'Peer Support',
        'Other',
      ],
      required: true,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['planned', 'ongoing', 'completed'],
      default: 'planned',
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    outcome: { type: String, trim: true, maxlength: 1000 },
    isSimulated: { type: Boolean, default: false },
    isSeeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

interventionSchema.index({ student: 1, startDate: 1 });

module.exports = mongoose.model('Intervention', interventionSchema);
