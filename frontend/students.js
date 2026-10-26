// students.js — Controller for All Students directory page.
// Demonstrates: ES6 modules (import), DOM events, Event delegation, async/await, Fetch API, HTML5 <dialog>.

import { getStudents, deleteStudent } from './api.js';
import { renderHeaderNav, initClock, show, hide, showToast } from './ui.js';

// ─── State ────────────────────────────────────────────────────────────────────
let allStudents = [];
let pendingDeleteId = null;

// ─── DOM References ───────────────────────────────────────────────────────────
const loadingState     = document.getElementById('loading-state');
const errorState       = document.getElementById('error-state');
const emptyState       = document.getElementById('empty-state');
const searchEmptyState = document.getElementById('search-empty-state');
const searchEmptyText  = document.getElementById('search-empty-text');
const tableWrapper     = document.getElementById('table-wrapper');
const studentsBody     = document.getElementById('students-body');
const studentCounter   = document.getElementById('student-counter');
const searchInput      = document.getElementById('search-input');
const sortSelect       = document.getElementById('sort-select');

// Dialog elements
const detailDialog     = document.getElementById('detail-dialog');
const detailContent    = document.getElementById('detail-content');
const closeDetailBtn   = document.getElementById('close-detail-btn');
const deleteDialog     = document.getElementById('delete-dialog');
const cancelDeleteBtn  = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// ─── Initialize Header & Live Clock ───────────────────────────────────────────
renderHeaderNav('students');
initClock();

// ─── Debounce Helper ──────────────────────────────────────────────────────────
// Syllabus concept: Closures, Functions, Timers
function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Error Display ────────────────────────────────────────────────────────────
function showError(message) {
  errorState.textContent = '';
  const box = document.createElement('div');
  box.className = 'fetch-error-box';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z');
  svg.appendChild(path);

  const strong = document.createElement('strong');
  strong.textContent = 'Could not load student records';

  const p = document.createElement('p');
  p.textContent = message;

  box.appendChild(svg);
  box.appendChild(strong);
  box.appendChild(p);
  errorState.appendChild(box);

  show(errorState);
  hide(tableWrapper);
  hide(emptyState);
  hide(searchEmptyState);
}

// ─── Filter & Sort ────────────────────────────────────────────────────────────
function getFilteredAndSorted() {
  const query = (searchInput?.value || '').trim().toLowerCase();
  const sort = sortSelect?.value || 'default';

  // 1. Filter by name
  let filtered = allStudents.filter(s => s.name.toLowerCase().includes(query));

  // 2. Sort
  if (sort === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'attendance-desc') {
    filtered.sort((a, b) => b.attendance - a.attendance);
  } else if (sort === 'attendance-asc') {
    filtered.sort((a, b) => a.attendance - b.attendance);
  } else if (sort === 'marks-desc') {
    filtered.sort((a, b) => b.internalMarks - a.internalMarks);
  } else {
    // Default by ID ascending
    filtered.sort((a, b) => a.id - b.id);
  }

  return { filtered, query };
}

// ─── Render Table ─────────────────────────────────────────────────────────────
function renderTable() {
  const { filtered, query } = getFilteredAndSorted();

  // Update student counter
  const total = allStudents.length;
  studentCounter.textContent = `${total} student${total !== 1 ? 's' : ''}`;

  if (total === 0) {
    hide(tableWrapper);
    hide(searchEmptyState);
    show(emptyState);
    return;
  }

  if (filtered.length === 0) {
    hide(tableWrapper);
    hide(emptyState);
    searchEmptyText.textContent = `No students found matching "${query}".`;
    show(searchEmptyState);
    return;
  }

  hide(emptyState);
  hide(searchEmptyState);
  show(tableWrapper);

  // Clear existing rows safely
  studentsBody.textContent = '';

  filtered.forEach(student => {
    const tr = document.createElement('tr');
    if (student.attendance < 75) {
      tr.classList.add('low-attendance');
    }

    // ID
    const tdId = document.createElement('td');
    tdId.textContent = student.id;
    tr.appendChild(tdId);

    // Name
    const tdName = document.createElement('td');
    tdName.textContent = student.name;
    tr.appendChild(tdName);

    // Attendance with progress bar & badge
    const tdAtt = document.createElement('td');
    tdAtt.className = 'att-cell';
    const barWrap = document.createElement('div');
    barWrap.className = 'att-bar-wrap';

    const track = document.createElement('div');
    track.className = 'att-bar-track';
    const fill = document.createElement('div');
    const level = student.attendance >= 75 ? 'ok' : student.attendance >= 60 ? 'warn' : 'low';
    fill.className = `att-bar-fill ${level}`;
    fill.style.width = `${Math.min(100, Math.max(0, student.attendance))}%`;
    track.appendChild(fill);

    const badge = document.createElement('span');
    badge.className = `att-badge ${level}`;
    badge.textContent = `${student.attendance}%`;

    barWrap.appendChild(track);
    barWrap.appendChild(badge);
    tdAtt.appendChild(barWrap);
    tr.appendChild(tdAtt);

    // Internal Marks
    const tdInternal = document.createElement('td');
    tdInternal.textContent = student.internalMarks;
    tr.appendChild(tdInternal);

    // Assignment Marks
    const tdAssignment = document.createElement('td');
    tdAssignment.textContent = student.assignmentMarks;
    tr.appendChild(tdAssignment);

    // Study Hours
    const tdStudy = document.createElement('td');
    tdStudy.textContent = student.studyHours;
    tr.appendChild(tdStudy);

    // Action buttons: View, Edit, Delete
    const tdActions = document.createElement('td');
    tdActions.className = 'action-cell';

    // View button
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn btn-sm btn-outline-primary';
    viewBtn.textContent = 'View';
    viewBtn.dataset.action = 'view';
    viewBtn.dataset.id = student.id;

    // Edit link (navigates to add.html?id=ID)
    const editLink = document.createElement('a');
    editLink.href = `add.html?id=${student.id}`;
    editLink.className = 'btn btn-sm btn-ghost';
    editLink.textContent = 'Edit';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = student.id;

    tdActions.appendChild(viewBtn);
    tdActions.appendChild(editLink);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    studentsBody.appendChild(tr);
  });
}

// ─── View Student Detail Dialog ───────────────────────────────────────────────
function showStudentDetail(student) {
  detailContent.textContent = '';

  const fields = [
    { label: 'Student Name',     value: student.name,                    full: true,  warn: false },
    { label: 'Student ID',       value: `#${student.id}`,                full: false, warn: false },
    { label: 'Attendance',       value: `${student.attendance}%`,        full: false, warn: student.attendance < 75 },
    { label: 'Internal Marks',   value: `${student.internalMarks} / 30`, full: false, warn: false },
    { label: 'Assignment Marks', value: `${student.assignmentMarks} / 20`, full: false, warn: false },
    { label: 'Study Hours/week', value: `${student.studyHours} hrs`,     full: false, warn: false },
  ];

  fields.forEach(({ label, value, full, warn }) => {
    const item = document.createElement('div');
    item.className = 'detail-item' + (full ? ' full-width' : '');

    const lbl = document.createElement('span');
    lbl.className = 'detail-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'detail-value' + (full ? ' name-value' : '') + (warn ? ' warn-value' : '');
    val.textContent = value; // Safe user data

    item.appendChild(lbl);
    item.appendChild(val);
    detailContent.appendChild(item);
  });

  if (typeof detailDialog.showModal === 'function') {
    detailDialog.showModal();
  } else {
    show(detailDialog);
  }
}

// ─── Open Delete Dialog ───────────────────────────────────────────────────────
function openDeleteDialog(id) {
  pendingDeleteId = id;
  const student = allStudents.find(s => s.id === id);
  const bodyText = document.getElementById('delete-dialog-body');
  if (student && bodyText) {
    bodyText.textContent = `Are you sure you want to delete "${student.name}" (ID #${student.id})? This action cannot be undone.`;
  }
  if (typeof deleteDialog.showModal === 'function') {
    deleteDialog.showModal();
  } else {
    show(deleteDialog);
  }
}

// ─── Confirm Delete Action ────────────────────────────────────────────────────
async function handleConfirmDelete() {
  if (!pendingDeleteId) return;
  const idToDelete = pendingDeleteId;
  pendingDeleteId = null;

  if (typeof deleteDialog.close === 'function') {
    deleteDialog.close();
  } else {
    hide(deleteDialog);
  }

  try {
    confirmDeleteBtn.disabled = true;
    await deleteStudent(idToDelete);
    showToast('Student deleted successfully', 'success');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
  }
}

// ─── Load Students ────────────────────────────────────────────────────────────
async function loadData() {
  show(loadingState);
  hide(errorState);
  hide(emptyState);
  hide(searchEmptyState);
  hide(tableWrapper);

  try {
    allStudents = await getStudents();
    renderTable();
  } catch (err) {
    showError(err.message);
  } finally {
    hide(loadingState);
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
// Table event delegation for View and Delete buttons
studentsBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);

  if (action === 'view') {
    const student = allStudents.find(s => s.id === id);
    if (student) showStudentDetail(student);
  } else if (action === 'delete') {
    openDeleteDialog(id);
  }
});

// Search input debounced
const onSearchInput = debounce(() => {
  renderTable();
}, 200);

searchInput.addEventListener('input', onSearchInput);
sortSelect.addEventListener('change', renderTable);

// Dialog close handlers
closeDetailBtn.addEventListener('click', () => {
  if (typeof detailDialog.close === 'function') {
    detailDialog.close();
  } else {
    hide(detailDialog);
  }
});

cancelDeleteBtn.addEventListener('click', () => {
  pendingDeleteId = null;
  if (typeof deleteDialog.close === 'function') {
    deleteDialog.close();
  } else {
    hide(deleteDialog);
  }
});

confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

// Close dialogs on clicking outside (backdrop click)
[detailDialog, deleteDialog].forEach(dialog => {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && typeof dialog.close === 'function') {
      dialog.close();
    }
  });
});

// Initial data fetch
loadData();
