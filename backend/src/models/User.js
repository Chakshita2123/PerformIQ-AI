const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User schema — represents teachers and the admin.
 * passwordHash uses select:false so it is NEVER returned in queries
 * unless explicitly re-added with .select('+passwordHash').
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    // select:false — passwordHash is NEVER included in query results by default
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher'],
      default: 'teacher', // public registration always creates a teacher
    },
  },
  { timestamps: true }
);

/**
 * Instance method: compare a plain-text password against the stored hash.
 * Used in the login controller.
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
