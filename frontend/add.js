// add.js — Controller for Add / Edit Student page.
// Demonstrates: ES6 modules, URLSearchParams, DOM validation, Fetch API, async/await, try/catch.

import { createStudent, getStudent, updateStudent } from './api.js';
import { renderHeaderNav, initClock, show, hide, showToast } from './ui.js';

// ─── State ────────────────────────────────────────────────────────────────────
let editId = null; // null = Add mode; number = Edit mode

// ─── DOM References ───────────────────────────────────────────────────────────
const formCard        = document.getElementById('form-card');
const formHeading     = document.getElementById('form-heading');
const formSubheading  = document.getElementById('form-subheading');
const formIconSvg     = document.getElementById('form-icon-svg');
const studentForm     = document.getElementById('student-form');
const submitBtn       = document.getElementById('submit-btn');
const cancelLink      = document.getElementById('cancel-link');
const formErrors      = document.getElementById('form-errors');
const successBox      = document.getElementById('success-box');
const successMsg      = document.getElementById('success-msg');
const loadingState    = document.getElementById('loading-state');
const notFoundState   = document.getElementById('not-found-state');
const notFoundText    = document.getElementById('not-found-text');

// Form input elements
const inputName       = document.getElementById('input-name');
const inputAttendance = document.getElementById('input-attendance');
const inputStudy      = document.getElementById('input-study');
const inputInternal   = document.getElementById('input-internal');
const inputAssignment = document.getElementById('input-assignment');

// Field error spans
const fieldErrors = {
  name:            document.getElementById('err-name'),
  attendance:      document.getElementById('err-attendance'),
  studyHours:      document.getElementById('err-study'),
  internalMarks:   document.getElementById('err-internal'),
  assignmentMarks: document.getElementById('err-assignment'),
};

// ─── Initialize Header & Navigation ───────────────────────────────────────────
renderHeaderNav('add');
initClock();

// ─── Inline Validation Helpers ────────────────────────────────────────────────
function setFieldError(fieldKey, message) {
  const errSpan = fieldErrors[fieldKey];
  if (!errSpan) return;

  const inputEl = document.querySelector(`[name="${fieldKey}"]`);

  if (message) {
    errSpan.textContent = message; // Safe text
    errSpan.classList.add('visible');
    if (inputEl) inputEl.classList.add('input-error');
  } else {
    errSpan.textContent = '';
    errSpan.classList.remove('visible');
    if (inputEl) inputEl.classList.remove('input-error');
  }
}

function clearAllErrors() {
  Object.keys(fieldErrors).forEach(key => setFieldError(key, ''));
  hide(formErrors);
  formErrors.textContent = '';
}

function showSummaryErrors(errors) {
  formErrors.textContent = '';
  const title = document.createElement('strong');
  title.textContent = 'Please fix the following:';
  formErrors.appendChild(title);

  const ul = document.createElement('ul');
  ul.style.marginTop = '6px';
  ul.style.paddingLeft = '20px';

  errors.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    ul.appendChild(li);
  });

  formErrors.appendChild(ul);
  show(formErrors);
}

// ─── Client-side Validation (Mirrors backend/validation.js) ───────────────────
function validateClient(data) {
  const errors = {};

  if (!data.name || data.name.trim() === '') {
    errors.name = 'Full name is required';
  }

  const numericFields = [
    { key: 'attendance',      label: 'Attendance',       min: 0, max: 100 },
    { key: 'internalMarks',   label: 'Internal Marks',   min: 0, max: 30  },
    { key: 'assignmentMarks', label: 'Assignment Marks', min: 0, max: 20  },
    { key: 'studyHours',      label: 'Study Hours',      min: 0, max: 40  },
  ];

  numericFields.forEach(({ key, label, min, max }) => {
    const val = data[key];
    const rawVal = document.querySelector(`[name="${key}"]`)?.value.trim();
    if (rawVal === '' || isNaN(val) || val < min || val > max) {
      errors[key] = `${label} must be a number between ${min} and ${max}`;
    }
  });

  return errors;
}

// ─── Extract Form Data ────────────────────────────────────────────────────────
function getFormData() {
  return {
    name:            inputName.value.trim(),
    attendance:      Number(inputAttendance.value),
    internalMarks:   Number(inputInternal.value),
    assignmentMarks: Number(inputAssignment.value),
    studyHours:      Number(inputStudy.value),
  };
}

// ─── Switch to Edit Mode ──────────────────────────────────────────────────────
function applyEditModeUI(id) {
  document.title = `Edit Student #${id} — PerformIQ AI`;
  formHeading.textContent = `Edit Student #${id}`;
  formSubheading.textContent = 'Update performance details and save changes.';
  submitBtn.textContent = 'Update Student';
  formCard.classList.add('edit-mode');

  // Pencil icon for edit mode
  if (formIconSvg) {
    formIconSvg.innerHTML = '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>';
  }
}

// ─── Load Student for Edit Mode ───────────────────────────────────────────────
async function initPage() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');

  if (!idParam) {
    // Standard Add mode
    return;
  }

  const id = Number(idParam);
  if (isNaN(id) || id <= 0) {
    showNotFound(`Invalid student ID "${idParam}".`);
    return;
  }

  editId = id;
  show(loadingState);
  hide(formCard);
  hide(notFoundState);

  try {
    const student = await getStudent(id);
    if (!student) {
      showNotFound(`Student with ID #${id} not found.`);
      return;
    }

    // Populate form
    inputName.value       = student.name;
    inputAttendance.value = student.attendance;
    inputInternal.value   = student.internalMarks;
    inputAssignment.value = student.assignmentMarks;
    inputStudy.value      = student.studyHours;

    applyEditModeUI(id);
    show(formCard);
  } catch (err) {
    showNotFound(err.message);
  } finally {
    hide(loadingState);
  }
}

function showNotFound(message) {
  hide(formCard);
  hide(loadingState);
  notFoundText.textContent = message;
  show(notFoundState);
}

// ─── Form Submission ──────────────────────────────────────────────────────────
studentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();
  hide(successBox);

  const data = getFormData();
  const errors = validateClient(data);
  const errorKeys = Object.keys(errors);

  if (errorKeys.length > 0) {
    errorKeys.forEach(key => setFieldError(key, errors[key]));
    // Focus first erroneous input
    const firstInp = document.querySelector(`[name="${errorKeys[0]}"]`);
    if (firstInp) firstInp.focus();
    return;
  }

  // Disable button while processing
  submitBtn.disabled = true;
  submitBtn.textContent = editId ? 'Updating…' : 'Adding…';

  try {
    if (editId) {
      // PUT /api/students/:id
      const updated = await updateStudent(editId, data);
      showToast(`Student #${updated.id} updated successfully!`, 'success');
      successMsg.textContent = `Student #${updated.id} ("${updated.name}") was updated successfully.`;
      show(successBox);
    } else {
      // POST /api/students
      const created = await createStudent(data);
      showToast(`Student "${created.name}" added successfully!`, 'success');
      successMsg.textContent = `Student "${created.name}" (ID #${created.id}) was created successfully.`;
      show(successBox);
      studentForm.reset();
    }
  } catch (err) {
    if (err.errors && err.errors.length > 0) {
      showSummaryErrors(err.errors);
      err.errors.forEach(msg => {
        if (msg.includes('name')) setFieldError('name', msg);
        if (msg.includes('attendance')) setFieldError('attendance', msg);
        if (msg.includes('internalMarks')) setFieldError('internalMarks', msg);
        if (msg.includes('assignmentMarks')) setFieldError('assignmentMarks', msg);
        if (msg.includes('studyHours')) setFieldError('studyHours', msg);
      });
    } else {
      showSummaryErrors([err.message || 'Operation failed']);
    }
    showToast(err.message || 'Operation failed', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? 'Update Student' : 'Add Student';
  }
});

// Clear field errors as user types
['input', 'change'].forEach(evt => {
  studentForm.addEventListener(evt, (e) => {
    const name = e.target.name;
    if (name && fieldErrors[name]) {
      setFieldError(name, '');
    }
  });
});

// Run initialization
initPage();
