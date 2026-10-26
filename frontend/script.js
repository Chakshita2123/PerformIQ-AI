// script.js
// Frontend logic for PerformIQ AI.
// Syllabus concepts demonstrated:
//   • DOM manipulation (createElement, textContent, classList, dataset)
//   • Event listeners (addEventListener, event delegation)
//   • Fetch API + async/await + try/catch
//   • Promises (used inside confirmDialog)
//   • Form validation (client-side mirrors server-side)
// IMPORTANT: textContent is used (not innerHTML) wherever user data is displayed.

// ─── API base URL ──────────────────────────────────────────────────────────────
const API = '/api/students';

// ─── State ────────────────────────────────────────────────────────────────────
let editingId = null;        // null = "Add" mode; a number = "Edit" mode
let allStudents = [];        // full list from server; filtered for display

// ─── DOM references ───────────────────────────────────────────────────────────
// Collected once at startup — faster than repeated getElementById calls.
const form          = document.getElementById('student-form');
const formSection   = document.getElementById('form-section');
const formHeading   = document.getElementById('form-heading');
const submitBtn     = document.getElementById('submit-btn');
const cancelBtn     = document.getElementById('cancel-btn');
const formErrors    = document.getElementById('form-errors');

const loadingState  = document.getElementById('loading-state');
const fetchErrorEl  = document.getElementById('fetch-error');
const emptyState    = document.getElementById('empty-state');
const tableWrapper  = document.getElementById('table-wrapper');
const studentsBody  = document.getElementById('students-body');
const studentCount  = document.getElementById('student-count');

const detailPanel   = document.getElementById('detail-panel');
const detailContent = document.getElementById('detail-content');
const closeDetailBtn= document.getElementById('close-detail-btn');

const searchInput   = document.getElementById('search-input');
const sortSelect    = document.getElementById('sort-select');

const toastContainer = document.getElementById('toast-container');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmOkBtn   = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

// Stat card value elements
const statTotalVal      = document.getElementById('stat-total-val');
const statAttendanceVal = document.getElementById('stat-attendance-val');
const statLowVal        = document.getElementById('stat-low-val');
const statMarksVal      = document.getElementById('stat-marks-val');

// Inline field error spans (one per field)
const fieldErrors = {
  name:           document.getElementById('err-name'),
  attendance:     document.getElementById('err-attendance'),
  internalMarks:  document.getElementById('err-internal'),
  assignmentMarks:document.getElementById('err-assignment'),
  studyHours:     document.getElementById('err-study'),
};

// ─── Helpers: show / hide elements ────────────────────────────────────────────
function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true;  }

// ─── Live clock in the header ─────────────────────────────────────────────────
// Updates every second — demonstrates setInterval (not a syllabus item but harmless).
(function startClock() {
  const clock = document.getElementById('header-clock');
  if (!clock) return;
  function tick() {
    clock.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 60000); // update every minute
})();

// ─── Toast notifications (replaces alert) ─────────────────────────────────────
// type: 'success' | 'error'
// Uses DOM manipulation — no innerHTML for user data.
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.setAttribute('role', 'status');

  // Icon: checkmark for success, warning for error
  const iconPath = type === 'success'
    ? 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'  // checkmark
    : 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'; // warning
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', iconPath);
  svg.appendChild(path);

  const txt = document.createElement('span');
  txt.textContent = message;  // textContent — safe even if message has special chars

  toast.appendChild(svg);
  toast.appendChild(txt);
  toastContainer.appendChild(toast);

  // Auto-remove after 3.5 s with a fade-out animation
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3500);
}

// ─── Custom confirm dialog (replaces window.confirm) ──────────────────────────
// Returns a Promise<boolean> — resolves true if user confirms, false if they cancel.
// This demonstrates Promises explicitly (a syllabus concept).
function confirmDialog(title, body) {
  return new Promise((resolve) => {
    // Fill in the dialog text using textContent
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent  = body;

    // Show the overlay
    confirmOverlay.classList.remove('hidden');
    confirmOkBtn.focus(); // keyboard: focus the destructive button

    // One-time listeners — removed after the dialog closes so they don't stack up
    function onOk() {
      close(true);
    }
    function onCancel() {
      close(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') close(false); // Escape closes the dialog
    }

    confirmOkBtn.addEventListener('click', onOk, { once: true });
    confirmCancelBtn.addEventListener('click', onCancel, { once: true });
    document.addEventListener('keydown', onKey, { once: true });

    function close(result) {
      confirmOverlay.classList.add('hidden');
      confirmOkBtn.removeEventListener('click', onOk);
      confirmCancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      resolve(result); // the Promise resolves here with true or false
    }
  });
}

// ─── Summary stat cards ───────────────────────────────────────────────────────
// Calculated purely from the already-fetched allStudents array — no extra API calls.
function updateStats(students) {
  const n = students.length;
  statTotalVal.textContent = n;

  if (n === 0) {
    statAttendanceVal.textContent = '—';
    statLowVal.textContent        = '—';
    statMarksVal.textContent      = '—';
    return;
  }

  // Average attendance — reduce sums all values, then divide
  const avgAtt = (students.reduce((s, st) => s + st.attendance, 0) / n).toFixed(1);
  statAttendanceVal.textContent = avgAtt + '%';

  // Count students below 75% attendance
  const lowCount = students.filter(st => st.attendance < 75).length;
  statLowVal.textContent = lowCount;

  // Average internal marks
  const avgMarks = (students.reduce((s, st) => s + st.internalMarks, 0) / n).toFixed(1);
  statMarksVal.textContent = avgMarks;
}

// ─── Filter & sort the in-memory list ─────────────────────────────────────────
// Called whenever the search text or sort order changes.
// Does NOT make any new fetch — uses the already-fetched allStudents array.
function getFilteredSorted() {
  const q    = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;

  // 1. Filter by name (case-insensitive substring match)
  let list = allStudents.filter(s => s.name.toLowerCase().includes(q));

  // 2. Sort — uses Array.prototype.sort (in-place on the filtered copy)
  if (sort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'attendance-desc') {
    list.sort((a, b) => b.attendance - a.attendance);
  } else if (sort === 'attendance-asc') {
    list.sort((a, b) => a.attendance - b.attendance);
  } else if (sort === 'marks-desc') {
    list.sort((a, b) => b.internalMarks - a.internalMarks);
  }
  // 'default' keeps server order

  return list;
}

// ─── Loading state ────────────────────────────────────────────────────────────
function setLoading(yes) {
  if (yes) {
    show(loadingState);
    hide(fetchErrorEl);
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
// Builds a styled error block with SVG icon — textContent for the message.
function showFetchError(message) {
  fetchErrorEl.textContent = ''; // clear old content safely

  // Build the error block with DOM API — no innerHTML
  const box = document.createElement('div');
  box.className = 'fetch-error-box';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z');
  svg.appendChild(path);

  const strong = document.createElement('strong');
  strong.textContent = 'Could not reach the server';

  const p = document.createElement('p');
  p.textContent = message; // textContent — safe for user data

  box.appendChild(svg);
  box.appendChild(strong);
  box.appendChild(p);
  fetchErrorEl.appendChild(box);
  show(fetchErrorEl);
}

// ─── Inline field-level validation errors ─────────────────────────────────────
// fieldKey matches the keys in fieldErrors above.
function setFieldError(fieldKey, message) {
  const el    = fieldErrors[fieldKey];
  const input = el ? el.previousElementSibling : null;
  if (!el) return;

  if (message) {
    el.textContent = message; // textContent — never innerHTML
    el.classList.add('visible');
    // Find the input (may have a hint span in between, so walk up)
    const inp = document.querySelector(`[aria-describedby="${el.id}"]`);
    if (inp) inp.classList.add('input-error');
  } else {
    el.textContent = '';
    el.classList.remove('visible');
    const inp = document.querySelector(`[aria-describedby="${el.id}"]`);
    if (inp) inp.classList.remove('input-error');
  }
}

// Clear all inline field errors
function clearFieldErrors() {
  Object.keys(fieldErrors).forEach(k => setFieldError(k, ''));
  hide(formErrors);
  formErrors.textContent = '';
}

// ─── Show validation errors in the form area ──────────────────────────────────
// Used for server-side errors that don't map to a specific field.
function showFormErrors(errors) {
  formErrors.textContent = '';
  const title = document.createElement('p');
  title.textContent = 'Please fix the following:';
  formErrors.appendChild(title);
  const ul = document.createElement('ul');
  errors.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg; // textContent — never innerHTML for user data
    ul.appendChild(li);
  });
  formErrors.appendChild(ul);
  show(formErrors);
}

// ─── Client-side validation ────────────────────────────────────────────────────
// Mirrors server-side validateStudent() — must stay in sync with backend/validation.js.
// Now returns errors mapped to field keys for inline display.
function validateForm(data) {
  const fieldErrs = {};

  if (!data.name || data.name.trim() === '') {
    fieldErrs.name = 'Name is required';
  }

  const numericFields = [
    { key: 'attendance',       label: 'Attendance',        min: 0, max: 100 },
    { key: 'internalMarks',    label: 'Internal Marks',    min: 0, max: 30  },
    { key: 'assignmentMarks',  label: 'Assignment Marks',  min: 0, max: 20  },
    { key: 'studyHours',       label: 'Study Hours',       min: 0, max: 40  },
  ];
  numericFields.forEach(({ key, label, min, max }) => {
    const val = data[key];
    if (val === '' || val === null || isNaN(val) || val < min || val > max) {
      fieldErrs[key] = `Enter a number between ${min} and ${max}`;
    }
  });

  return fieldErrs; // object: { fieldKey: 'error message' }
}

// ─── Read form values ──────────────────────────────────────────────────────────
function getFormData() {
  return {
    name:            document.getElementById('input-name').value,
    attendance:      Number(document.getElementById('input-attendance').value),
    internalMarks:   Number(document.getElementById('input-internal').value),
    assignmentMarks: Number(document.getElementById('input-assignment').value),
    studyHours:      Number(document.getElementById('input-study').value),
  };
}

// ─── Reset form to "Add" mode ──────────────────────────────────────────────────
function resetForm() {
  editingId = null;
  form.reset();
  clearFieldErrors();
  hide(cancelBtn);
  formHeading.textContent  = 'Add Student';
  submitBtn.textContent    = 'Add Student';
  formSection.classList.remove('edit-mode'); // remove the accent border
}

// ─── Attendance level helper ───────────────────────────────────────────────────
// Returns 'ok', 'warn', or 'low' based on the value.
function attLevel(pct) {
  if (pct >= 75) return 'ok';
  if (pct >= 60) return 'warn';
  return 'low';
}

// ─── Build one table row ───────────────────────────────────────────────────────
// Creates DOM elements from scratch — never uses innerHTML for student data.
function createRow(student) {
  const tr = document.createElement('tr');
  if (student.attendance < 75) tr.classList.add('low-attendance');
  tr.dataset.id = student.id;

  // ID cell
  const tdId = document.createElement('td');
  tdId.textContent = student.id;
  tr.appendChild(tdId);

  // Name cell
  const tdName = document.createElement('td');
  tdName.textContent = student.name; // textContent — user data, never innerHTML
  tr.appendChild(tdName);

  // ── Attendance cell: progress bar + colour badge ──────────────────────────
  const tdAtt = document.createElement('td');
  tdAtt.className = 'att-cell';

  const level = attLevel(student.attendance);
  const label = level === 'ok' ? 'Good' : level === 'warn' ? 'Warning' : 'Low';

  const barWrap = document.createElement('div');
  barWrap.className = 'att-bar-wrap';

  const track = document.createElement('div');
  track.className = 'att-bar-track';
  const fill = document.createElement('div');
  fill.className = 'att-bar-fill ' + level;
  fill.style.width = student.attendance + '%'; // dynamic width from JS
  track.appendChild(fill);

  const badge = document.createElement('span');
  badge.className = 'att-badge ' + level;
  badge.textContent = student.attendance + '%';

  barWrap.appendChild(track);
  barWrap.appendChild(badge);
  tdAtt.appendChild(barWrap);
  tr.appendChild(tdAtt);

  // Marks / hours cells
  ['internalMarks', 'assignmentMarks', 'studyHours'].forEach(key => {
    const td = document.createElement('td');
    td.textContent = student[key];
    tr.appendChild(td);
  });

  // ── Actions cell: View, Edit, Delete ──────────────────────────────────────
  const tdActions = document.createElement('td');
  tdActions.className = 'action-cell';

  [
    { action: 'view',   text: 'View',   cls: 'btn-outline-primary' },
    { action: 'edit',   text: 'Edit',   cls: 'btn-ghost'           },
    { action: 'delete', text: 'Delete', cls: 'btn-danger'          },
  ].forEach(({ action, text, cls }) => {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm ${cls}`;
    btn.textContent = text;
    btn.dataset.action = action; // picked up by event delegation
    btn.dataset.id     = student.id;
    tdActions.appendChild(btn);
  });

  tr.appendChild(tdActions);
  return tr;
}

// ─── Render the table from a list of students ──────────────────────────────────
function renderTable(students) {
  studentsBody.textContent = ''; // clear — faster and safer than innerHTML = ''
  studentCount.textContent = students.length + ' student' + (students.length !== 1 ? 's' : '');

  if (students.length === 0) {
    const q = searchInput ? searchInput.value.trim() : '';
    const titleEl = emptyState.querySelector('strong');
    const descEl  = emptyState.querySelector('p');

    if (q) {
      if (titleEl) titleEl.textContent = 'No matching students';
      if (descEl)  descEl.textContent  = `No student records match "${q}".`;
    } else {
      if (titleEl) titleEl.textContent = 'No students yet';
      if (descEl)  descEl.textContent  = 'Add the first one using the form on the left.';
    }

    show(emptyState);
    hide(tableWrapper);
    return;
  }
  hide(emptyState);
  show(tableWrapper);
  students.forEach(s => studentsBody.appendChild(createRow(s))); // DOM manipulation
}

// ─── Re-apply search+sort and re-render without a new fetch ───────────────────
function applyFilterAndRender() {
  renderTable(getFilteredSorted());
}

// ─── Load all students from the API ───────────────────────────────────────────
// Fetch API + async/await + try/catch demonstrates the full async pattern.
async function loadStudents() {
  setLoading(true);
  try {
    const res = await fetch(API); // GET /api/students — Promise returned by fetch
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Server error ${res.status}`);
    }
    allStudents = await res.json(); // parse JSON → JS array (another await)
    updateStats(allStudents);       // compute summary cards
    applyFilterAndRender();         // apply current search/sort and draw the table
    hide(fetchErrorEl);
  } catch (err) {
    showFetchError(err.message); // network failure or bad HTTP status
  } finally {
    // finally always runs — even if catch ran — so the spinner is always removed
    setLoading(false);
  }
}

// ─── Show student detail panel ─────────────────────────────────────────────────
async function showDetail(id) {
  try {
    const res = await fetch(API + '/' + id); // GET /api/students/:id
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Could not load student details');
    }
    const s = await res.json();

    // Build detail panel using DOM methods — no innerHTML
    detailContent.textContent = '';

    const fields = [
      { label: 'Student Name',     value: s.name,                    full: true,  warn: false },
      { label: 'Attendance',       value: s.attendance + '%',         full: false, warn: s.attendance < 75 },
      { label: 'Internal Marks',   value: s.internalMarks + ' / 30', full: false, warn: false },
      { label: 'Assignment Marks', value: s.assignmentMarks + ' / 20',full: false, warn: false },
      { label: 'Study Hours/week', value: s.studyHours + ' hrs',     full: false, warn: false },
      { label: 'Student ID',       value: '#' + s.id,                full: false, warn: false },
    ];

    fields.forEach(({ label, value, full, warn }) => {
      const item = document.createElement('div');
      item.className = 'detail-item' + (full ? ' full-width' : '');

      const lbl = document.createElement('span');
      lbl.className = 'detail-label';
      lbl.textContent = label; // our own string — textContent still correct practice

      const val = document.createElement('span');
      val.className = 'detail-value' + (full ? ' name-value' : '') + (warn ? ' warn-value' : '');
      val.textContent = value; // user data — textContent mandatory

      item.appendChild(lbl);
      item.appendChild(val);
      detailContent.appendChild(item);
    });

    show(detailPanel);
    detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showFetchError(err.message);
    showToast('Could not load student details', 'error');
  }
}

// ─── Populate the form for editing ────────────────────────────────────────────
async function startEdit(id) {
  try {
    const res = await fetch(API + '/' + id);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Could not load student for editing');
    }
    const s = await res.json();

    // Fill form fields with current values
    document.getElementById('input-name').value       = s.name;
    document.getElementById('input-attendance').value  = s.attendance;
    document.getElementById('input-internal').value    = s.internalMarks;
    document.getElementById('input-assignment').value  = s.assignmentMarks;
    document.getElementById('input-study').value       = s.studyHours;

    editingId = s.id;
    formHeading.textContent = 'Edit Student #' + s.id;
    submitBtn.textContent   = 'Save Changes';
    show(cancelBtn);
    clearFieldErrors();
    formSection.classList.add('edit-mode'); // adds accent left border via CSS

    form.scrollIntoView({ behavior: 'smooth', block: 'start' }); // scroll on mobile
  } catch (err) {
    showFetchError(err.message);
    showToast('Could not load student for editing', 'error');
  }
}

// ─── Delete a student ──────────────────────────────────────────────────────────
async function deleteStudent(id) {
  // Custom confirm dialog replaces window.confirm — returns a Promise<boolean>
  const confirmed = await confirmDialog(
    'Delete this student?',
    'This action cannot be undone. The student record will be permanently removed.'
  );
  if (!confirmed) return; // user clicked Cancel

  try {
    const res = await fetch(API + '/' + id, { method: 'DELETE' }); // DELETE /api/students/:id
    if (!res.ok && res.status !== 404) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    if (!detailPanel.hidden) hide(detailPanel);
    showToast('Student deleted successfully', 'success'); // replaces alert
    await loadStudents(); // reload to reflect the deletion
  } catch (err) {
    showFetchError(err.message);
    showToast(err.message, 'error');
  }
}

// ─── Form submit handler ───────────────────────────────────────────────────────
// Handles both "Add" (POST) and "Save Changes" (PUT) depending on editingId.
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // stop the browser from reloading the page

  clearFieldErrors();
  const data = getFormData();

  // Client-side validation — instant feedback before any network round-trip
  const fieldErrs = validateForm(data);
  const hasErrors = Object.keys(fieldErrs).length > 0;

  if (hasErrors) {
    // Show each error next to its field
    Object.entries(fieldErrs).forEach(([key, msg]) => setFieldError(key, msg));
    // Focus the first broken field
    const firstKey = Object.keys(fieldErrs)[0];
    const firstEl  = document.querySelector(`[aria-describedby="err-${firstKey === 'name' ? 'name' : firstKey.replace('Marks','').replace('Hours','')}"]`);
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
        body: JSON.stringify(data), // JS object → JSON string for the request body
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

    // Success path
    const action = editingId ? 'updated' : 'added';
    resetForm();
    await loadStudents();
    showToast(`Student ${action} successfully`, 'success'); // replaces alert

  } catch (err) {
    // Network failure (server offline, etc.)
    showFormErrors([err.message]);
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? 'Save Changes' : 'Add Student';
  }
});

// ─── Cancel edit ──────────────────────────────────────────────────────────────
cancelBtn.addEventListener('click', resetForm);

// ─── Close detail panel ───────────────────────────────────────────────────────
closeDetailBtn.addEventListener('click', () => hide(detailPanel));

// ─── Table actions — event delegation ─────────────────────────────────────────
// ONE listener on the table body handles clicks for ALL rows.
// This is "event delegation" — avoids adding/removing listeners per-row.
studentsBody.addEventListener('click', (e) => {
  const btn    = e.target.closest('button'); // walk up to find the nearest button
  if (!btn) return;

  const action = btn.dataset.action; // 'view', 'edit', or 'delete'
  const id     = Number(btn.dataset.id);

  if (action === 'view')   showDetail(id);
  if (action === 'edit')   startEdit(id);
  if (action === 'delete') deleteStudent(id);
});

// ─── Search + sort (client-side, no new fetch) ────────────────────────────────
// Every keystroke or sort change just re-renders from allStudents.
searchInput.addEventListener('input',  applyFilterAndRender);
sortSelect.addEventListener('change',  applyFilterAndRender);

// ─── Keyboard: Escape closes detail panel ─────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !detailPanel.hidden) {
    hide(detailPanel);
  }
});

// ─── Initial load ─────────────────────────────────────────────────────────────
// 'defer' in <script defer> ensures the DOM is ready before this runs.
loadStudents();
