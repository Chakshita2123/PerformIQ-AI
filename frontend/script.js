// script.js
// Frontend logic for PerformIQ AI.
// Uses the Fetch API, async/await, DOM manipulation, and event listeners.
// IMPORTANT: textContent is used (not innerHTML) wherever user data is displayed,
// to prevent XSS (cross-site scripting) attacks.

// ─── API base URL ─────────────────────────────────────────────────────────────
// Because the frontend is served by the same Node server on the same port,
// we don't need a full URL — a path is enough. No CORS headers needed.
const API = '/api/students';

// ─── State ────────────────────────────────────────────────────────────────────
// editingId tracks whether we are editing an existing student (id) or adding (null).
let editingId = null;

// ─── DOM element references ───────────────────────────────────────────────────
// Collected once at startup and reused — faster than calling getElementById repeatedly.
const form          = document.getElementById('student-form');
const formHeading   = document.getElementById('form-heading');
const submitBtn     = document.getElementById('submit-btn');
const cancelBtn     = document.getElementById('cancel-btn');
const formErrors    = document.getElementById('form-errors');

const loadingState  = document.getElementById('loading-state');
const fetchError    = document.getElementById('fetch-error');
const emptyState    = document.getElementById('empty-state');
const tableWrapper  = document.getElementById('table-wrapper');
const studentsBody  = document.getElementById('students-body');
const studentCount  = document.getElementById('student-count');

const detailPanel   = document.getElementById('detail-panel');
const detailContent = document.getElementById('detail-content');
const closeDetailBtn = document.getElementById('close-detail-btn');

// ─── Helpers: show / hide elements ───────────────────────────────────────────
function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true;  }

// ─── Loading state ────────────────────────────────────────────────────────────
// While waiting for a fetch, show a spinner and disable the submit button.
function setLoading(yes) {
  if (yes) {
    show(loadingState);
    hide(fetchError);
    hide(emptyState);
    hide(tableWrapper);
    submitBtn.disabled = true;
    submitBtn.textContent = editingId ? 'Saving…' : 'Adding…';
  } else {
    hide(loadingState);
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? 'Save Changes' : 'Add Student';
  }
}

// ─── Show a fetch/server error in the table area ──────────────────────────────
function showFetchError(message) {
  fetchError.textContent = '';  // clear old content safely
  const p = document.createElement('p');
  p.textContent = '⚠ ' + message; // textContent — safe even if message contains HTML
  fetchError.appendChild(p);
  show(fetchError);
}

// ─── Show validation errors in the form area ─────────────────────────────────
// errors is an array of strings returned by the server, or built client-side.
function showFormErrors(errors) {
  formErrors.textContent = ''; // clear old errors

  const title = document.createElement('p');
  title.textContent = 'Please fix the following:';
  formErrors.appendChild(title);

  const ul = document.createElement('ul');
  errors.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg; // textContent — never innerHTML for user-originated data
    ul.appendChild(li);
  });
  formErrors.appendChild(ul);
  show(formErrors);
}

// ─── Client-side validation ───────────────────────────────────────────────────
// Mirrors the server-side validateStudent() so the user gets instant feedback
// before a request is even sent. Must stay in sync with backend/validation.js.
function validateForm(data) {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Name must be a non-empty string');
  }
  const numericFields = [
    { key: 'attendance',      label: 'Attendance',       min: 0,  max: 100 },
    { key: 'internalMarks',   label: 'Internal Marks',   min: 0,  max: 30  },
    { key: 'assignmentMarks', label: 'Assignment Marks', min: 0,  max: 20  },
    { key: 'studyHours',      label: 'Study Hours',      min: 0,  max: 40  },
  ];
  numericFields.forEach(({ key, label, min, max }) => {
    const val = data[key];
    if (val === '' || val === null || isNaN(val) || val < min || val > max) {
      errors.push(`${label} must be a number between ${min} and ${max}`);
    }
  });
  return errors;
}

// ─── Read form values ─────────────────────────────────────────────────────────
// Number() converts the string from an <input type="number"> to a JS number.
function getFormData() {
  return {
    name:            document.getElementById('input-name').value,
    attendance:      Number(document.getElementById('input-attendance').value),
    internalMarks:   Number(document.getElementById('input-internal').value),
    assignmentMarks: Number(document.getElementById('input-assignment').value),
    studyHours:      Number(document.getElementById('input-study').value),
  };
}

// ─── Reset form to "Add" mode ─────────────────────────────────────────────────
function resetForm() {
  editingId = null;
  form.reset();                          // clear all input values
  hide(formErrors);
  hide(cancelBtn);
  formHeading.textContent = 'Add Student';
  submitBtn.textContent   = 'Add Student';
}

// ─── Build one table row ──────────────────────────────────────────────────────
// Creates DOM elements from scratch — never uses innerHTML for student data.
function createRow(student) {
  const tr = document.createElement('tr');

  // Low attendance row: add a CSS class that turns the row amber/yellow.
  if (student.attendance < 75) {
    tr.classList.add('low-attendance');
  }

  // Store the student id on the row so event listeners can read it later.
  tr.dataset.id = student.id;

  // ── ID cell
  const tdId = document.createElement('td');
  tdId.textContent = student.id;
  tr.appendChild(tdId);

  // ── Name cell
  const tdName = document.createElement('td');
  tdName.textContent = student.name;   // textContent — user data, never innerHTML
  tr.appendChild(tdName);

  // ── Attendance cell with colour pill
  const tdAtt = document.createElement('td');
  tdAtt.className = 'attendance-cell';
  const pill = document.createElement('span');
  pill.className = 'att-pill ' + (student.attendance < 75 ? 'low' : 'ok');
  pill.textContent = student.attendance + '%';
  tdAtt.appendChild(pill);
  tr.appendChild(tdAtt);

  // ── Marks cells
  ['internalMarks', 'assignmentMarks', 'studyHours'].forEach(key => {
    const td = document.createElement('td');
    td.textContent = student[key];
    tr.appendChild(td);
  });

  // ── Actions cell: View + Edit + Delete buttons
  const tdActions = document.createElement('td');
  tdActions.className = 'action-cell';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-sm btn-outline-primary';
  viewBtn.textContent = 'View';
  viewBtn.dataset.action = 'view';     // picked up by event delegation below
  viewBtn.dataset.id = student.id;
  tdActions.appendChild(viewBtn);

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-sm btn-ghost';
  editBtn.textContent = 'Edit';
  editBtn.dataset.action = 'edit';
  editBtn.dataset.id = student.id;
  tdActions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-sm btn-danger';
  delBtn.textContent = 'Delete';
  delBtn.dataset.action = 'delete';
  delBtn.dataset.id = student.id;
  tdActions.appendChild(delBtn);

  tr.appendChild(tdActions);
  return tr;
}

// ─── Render the full students table ──────────────────────────────────────────
function renderTable(students) {
  // Clear existing rows
  studentsBody.textContent = ''; // faster and safer than innerHTML = ''

  // Update count badge
  studentCount.textContent = students.length + ' student' + (students.length !== 1 ? 's' : '');

  if (students.length === 0) {
    show(emptyState);
    hide(tableWrapper);
    return;
  }

  hide(emptyState);
  show(tableWrapper);
  students.forEach(s => studentsBody.appendChild(createRow(s)));
}

// ─── Load all students from the API ──────────────────────────────────────────
// Uses fetch + async/await. fetch() returns a Promise; we await it.
// The try/catch handles both network errors and bad HTTP status codes.
async function loadStudents() {
  setLoading(true);
  try {
    const res = await fetch(API);    // GET /api/students
    if (!res.ok) {
      const data = await res.json(); // server sends { error: '...' }
      throw new Error(data.error || `Server error ${res.status}`);
    }
    const students = await res.json(); // parse JSON body → JS array
    renderTable(students);
    hide(fetchError);
  } catch (err) {
    // err.message contains either the server's error text or a network failure message
    showFetchError(err.message);
  } finally {
    // finally always runs — even if catch ran — so we always remove the spinner
    setLoading(false);
  }
}

// ─── Show student detail panel ────────────────────────────────────────────────
async function showDetail(id) {
  try {
    const res = await fetch(API + '/' + id); // GET /api/students/:id
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Could not load student details');
    }
    const s = await res.json();

    // Build detail panel using DOM methods — no innerHTML
    detailContent.textContent = ''; // clear old content

    const fields = [
      { label: 'Name',             value: s.name,            cls: 'name-value', warn: false },
      { label: 'Attendance',       value: s.attendance + '%', cls: '', warn: s.attendance < 75 },
      { label: 'Internal Marks',   value: s.internalMarks + ' / 30', cls: '', warn: false },
      { label: 'Assignment Marks', value: s.assignmentMarks + ' / 20', cls: '', warn: false },
      { label: 'Study Hours/week', value: s.studyHours + ' h', cls: '', warn: false },
      { label: 'Student ID',       value: '#' + s.id,        cls: '', warn: false },
    ];

    fields.forEach(({ label, value, cls, warn }) => {
      const dt = document.createElement('dt');
      dt.textContent = label;   // label is our own string, but textContent is still correct

      const dd = document.createElement('dd');
      dd.textContent = value;   // value contains user data — textContent is mandatory here
      if (cls)  dd.classList.add(cls);
      if (warn) dd.classList.add('warn');

      detailContent.appendChild(dt);
      detailContent.appendChild(dd);
    });

    show(detailPanel);
  } catch (err) {
    showFetchError(err.message);
  }
}

// ─── Populate the form for editing ───────────────────────────────────────────
async function startEdit(id) {
  try {
    const res = await fetch(API + '/' + id);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Could not load student for editing');
    }
    const s = await res.json();

    // Fill the form fields with current values
    document.getElementById('input-name').value       = s.name;
    document.getElementById('input-attendance').value  = s.attendance;
    document.getElementById('input-internal').value    = s.internalMarks;
    document.getElementById('input-assignment').value  = s.assignmentMarks;
    document.getElementById('input-study').value       = s.studyHours;

    editingId = s.id;
    formHeading.textContent = 'Edit Student #' + s.id;
    submitBtn.textContent   = 'Save Changes';
    show(cancelBtn);
    hide(formErrors);

    // Scroll the form into view on mobile
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showFetchError(err.message);
  }
}

// ─── Delete a student ─────────────────────────────────────────────────────────
async function deleteStudent(id) {
  // Ask for confirmation before destroying data
  if (!confirm('Delete this student? This cannot be undone.')) return;

  try {
    const res = await fetch(API + '/' + id, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    // If the detail panel is showing this student, close it
    if (detailPanel.hidden === false) hide(detailPanel);
    // Reload the table to reflect the deletion
    await loadStudents();
  } catch (err) {
    showFetchError(err.message);
  }
}

// ─── Form submit handler ──────────────────────────────────────────────────────
// Handles both "Add" (POST) and "Save Changes" (PUT) depending on editingId.
form.addEventListener('submit', async (e) => {
  e.preventDefault();  // stop the browser from reloading the page

  hide(formErrors);
  const data = getFormData();

  // Client-side validation first — instant feedback, no round-trip needed
  const clientErrors = validateForm(data);
  if (clientErrors.length > 0) {
    showFormErrors(clientErrors);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? 'Saving…' : 'Adding…';

  try {
    let res;
    if (editingId === null) {
      // Create — POST /api/students
      res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),  // JS object → JSON string for the request body
      });
    } else {
      // Update — PUT /api/students/:id
      res = await fetch(API + '/' + editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }

    if (!res.ok) {
      const result = await res.json();
      // Server may return { error: '...' } or { errors: [...] }
      const msgs = result.errors || [result.error || 'Unknown error'];
      showFormErrors(msgs);
      return;
    }

    // Success: reset form and reload the table
    resetForm();
    await loadStudents();

  } catch (err) {
    // Network failure (server offline, etc.)
    showFormErrors([err.message]);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? 'Save Changes' : 'Add Student';
  }
});

// ─── Cancel edit ─────────────────────────────────────────────────────────────
cancelBtn.addEventListener('click', resetForm);

// ─── Close detail panel ───────────────────────────────────────────────────────
closeDetailBtn.addEventListener('click', () => hide(detailPanel));

// ─── Table actions (event delegation) ────────────────────────────────────────
// Instead of adding a click listener to every button in every row
// (which would waste memory and break when rows are re-rendered),
// we add ONE listener to the table body and check which button was clicked.
// This is called "event delegation" — a common ES6+ pattern.
studentsBody.addEventListener('click', (e) => {
  // e.target is the actual element clicked.
  // .closest('button') walks up the DOM to find the nearest <button> ancestor.
  const btn = e.target.closest('button');
  if (!btn) return; // click was not on a button

  const action = btn.dataset.action; // 'view', 'edit', or 'delete'
  const id     = Number(btn.dataset.id);

  if (action === 'view')   showDetail(id);
  if (action === 'edit')   startEdit(id);
  if (action === 'delete') deleteStudent(id);
});

// ─── Initial load ─────────────────────────────────────────────────────────────
// When the page first opens, fetch and display all students.
// 'defer' in <script defer> ensures this runs after the DOM is ready.
loadStudents();
