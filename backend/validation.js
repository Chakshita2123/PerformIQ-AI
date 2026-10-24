// validation.js
// Validates the fields of a student object sent in a request body.
// Returns an array of error message strings.
// If the array is empty, the data is valid.
// No npm packages needed — pure JavaScript logic.

function validateStudent(data) {
  const errors = [];

  // ── name ──────────────────────────────────────────────────────────────────
  // Must be a string and must not be empty or only spaces.
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('name must be a non-empty string');
  }

  // ── numeric fields ────────────────────────────────────────────────────────
  // Each entry says: which field, what is the minimum, what is the maximum.
  const numericFields = [
    { key: 'attendance',      min: 0,  max: 100 },
    { key: 'internalMarks',   min: 0,  max: 30  },
    { key: 'assignmentMarks', min: 0,  max: 20  },
    { key: 'studyHours',      min: 0,  max: 40  },
  ];

  for (const { key, min, max } of numericFields) {
    const val = data[key];
    // typeof check: the value must be a JavaScript number (not a string, not null).
    // Number.isFinite check: rejects NaN and Infinity (typeof NaN === 'number' is true!).
    // Range check: must be within [min, max] inclusive.
    if (typeof val !== 'number' || !Number.isFinite(val) || val < min || val > max) {
      errors.push(`${key} must be a number between ${min} and ${max}`);
    }
  }

  return errors; // empty array means valid; non-empty means invalid
}

module.exports = { validateStudent };
