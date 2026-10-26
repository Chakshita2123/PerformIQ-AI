// dashboard.js — Controller for Dashboard page.
// Demonstrates: ES6 modules, Fetch API, Array methods (reduce, filter, sort, slice), DOM manipulation.

import { getStudents } from './api.js';
import { renderHeaderNav, initClock, show, hide, showToast } from './ui.js';

// ─── DOM References ───────────────────────────────────────────────────────────
const loadingState     = document.getElementById('loading-state');
const errorState       = document.getElementById('error-state');
const emptyState       = document.getElementById('empty-state');
const dashboardContent = document.getElementById('dashboard-content');

// Stat values
const statTotalVal      = document.getElementById('stat-total-val');
const statAttendanceVal = document.getElementById('stat-attendance-val');
const statLowVal        = document.getElementById('stat-low-val');
const statInternalVal   = document.getElementById('stat-internal-val');
const statAssignmentVal = document.getElementById('stat-assignment-val');

// Distribution elements
const distTotalBadge = document.getElementById('dist-total-badge');
const distSegLow     = document.getElementById('dist-seg-low');
const distSegMid     = document.getElementById('dist-seg-mid');
const distSegHigh    = document.getElementById('dist-seg-high');
const distCountLow   = document.getElementById('dist-count-low');
const distCountMid   = document.getElementById('dist-count-mid');
const distCountHigh  = document.getElementById('dist-count-high');
const distPctLow     = document.getElementById('dist-pct-low');
const distPctMid     = document.getElementById('dist-pct-mid');
const distPctHigh    = document.getElementById('dist-pct-high');

// Lists
const attentionList  = document.getElementById('attention-list');
const attentionBadge = document.getElementById('attention-badge');
const attentionEmpty = document.getElementById('attention-empty');
const recentList     = document.getElementById('recent-list');
const recentEmpty    = document.getElementById('recent-empty');

// ─── Initialize Header & Navigation ───────────────────────────────────────────
renderHeaderNav('dashboard');
initClock();

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
  strong.textContent = 'Could not load analytics data';

  const p = document.createElement('p');
  p.textContent = message;

  box.appendChild(svg);
  box.appendChild(strong);
  box.appendChild(p);
  errorState.appendChild(box);

  show(errorState);
  hide(dashboardContent);
  hide(emptyState);
}

// ─── Calculate and Render Dashboard ───────────────────────────────────────────
function renderDashboard(students) {
  const n = students.length;

  if (n === 0) {
    hide(dashboardContent);
    show(emptyState);
    return;
  }

  hide(emptyState);
  show(dashboardContent);

  // 1. Calculate Summary Statistics
  // Total
  statTotalVal.textContent = n;

  // Average Attendance
  const avgAtt = (students.reduce((acc, s) => acc + s.attendance, 0) / n).toFixed(1);
  statAttendanceVal.textContent = `${avgAtt}%`;

  // Below 75% Attendance count
  const lowCount = students.filter(s => s.attendance < 75).length;
  statLowVal.textContent = lowCount;

  // Average Internal Marks (/30)
  const avgInternal = (students.reduce((acc, s) => acc + s.internalMarks, 0) / n).toFixed(1);
  statInternalVal.textContent = avgInternal;

  // Average Assignment Marks (/20)
  const avgAssignment = (students.reduce((acc, s) => acc + s.assignmentMarks, 0) / n).toFixed(1);
  statAssignmentVal.textContent = avgAssignment;

  // 2. Attendance Distribution (Plain CSS Bars)
  // Categories: below 75%, 75-89%, 90% and above
  const countLow = lowCount;
  const countMid = students.filter(s => s.attendance >= 75 && s.attendance < 90).length;
  const countHigh = students.filter(s => s.attendance >= 90).length;

  const pctLow = ((countLow / n) * 100).toFixed(1);
  const pctMid = ((countMid / n) * 100).toFixed(1);
  const pctHigh = ((countHigh / n) * 100).toFixed(1);

  // Set widths
  distSegLow.style.width = `${pctLow}%`;
  distSegMid.style.width = `${pctMid}%`;
  distSegHigh.style.width = `${pctHigh}%`;

  // Display text in segments if width is wide enough
  distSegLow.textContent = parseFloat(pctLow) >= 12 ? `${pctLow}%` : '';
  distSegMid.textContent = parseFloat(pctMid) >= 12 ? `${pctMid}%` : '';
  distSegHigh.textContent = parseFloat(pctHigh) >= 12 ? `${pctHigh}%` : '';

  // Update distribution counts & percentages in legend
  distTotalBadge.textContent = `${n} student${n !== 1 ? 's' : ''}`;
  distCountLow.textContent = countLow;
  distPctLow.textContent = `${pctLow}%`;
  distCountMid.textContent = countMid;
  distPctMid.textContent = `${pctMid}%`;
  distCountHigh.textContent = countHigh;
  distPctHigh.textContent = `${pctHigh}%`;

  // 3. Needs Attention List: below 75% attendance, lowest first, max 5
  attentionList.textContent = '';
  const lowAttStudents = students
    .filter(s => s.attendance < 75)
    .sort((a, b) => a.attendance - b.attendance)
    .slice(0, 5);

  attentionBadge.textContent = `${lowCount} student${lowCount !== 1 ? 's' : ''}`;

  if (lowAttStudents.length === 0) {
    show(attentionEmpty);
    hide(attentionList);
  } else {
    hide(attentionEmpty);
    show(attentionList);

    lowAttStudents.forEach(st => {
      const li = document.createElement('li');
      li.className = 'dashboard-list-item';

      const meta = document.createElement('div');
      meta.className = 'dashboard-list-meta';

      const title = document.createElement('div');
      title.className = 'dashboard-list-title';
      title.textContent = st.name; // safe user data

      const sub = document.createElement('div');
      sub.className = 'dashboard-list-sub';
      sub.textContent = `ID #${st.id} • Internal: ${st.internalMarks}/30 • Assign: ${st.assignmentMarks}/20`;

      meta.appendChild(title);
      meta.appendChild(sub);

      const actions = document.createElement('div');
      actions.className = 'dashboard-list-actions';

      const badge = document.createElement('span');
      badge.className = 'att-badge low';
      badge.textContent = `${st.attendance}%`;

      const editLink = document.createElement('a');
      editLink.href = `add.html?id=${st.id}`;
      editLink.className = 'btn btn-sm btn-ghost';
      editLink.textContent = 'Edit';

      actions.appendChild(badge);
      actions.appendChild(editLink);

      li.appendChild(meta);
      li.appendChild(actions);
      attentionList.appendChild(li);
    });
  }

  // 4. Recently Added List: last 3 students by ID
  recentList.textContent = '';
  const recentStudents = [...students]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);

  if (recentStudents.length === 0) {
    show(recentEmpty);
    hide(recentList);
  } else {
    hide(recentEmpty);
    show(recentList);

    recentStudents.forEach(st => {
      const li = document.createElement('li');
      li.className = 'dashboard-list-item';

      const meta = document.createElement('div');
      meta.className = 'dashboard-list-meta';

      const title = document.createElement('div');
      title.className = 'dashboard-list-title';
      title.textContent = st.name;

      const sub = document.createElement('div');
      sub.className = 'dashboard-list-sub';
      sub.textContent = `ID #${st.id} • Study: ${st.studyHours}h/w • Internals: ${st.internalMarks}/30`;

      meta.appendChild(title);
      meta.appendChild(sub);

      const actions = document.createElement('div');
      actions.className = 'dashboard-list-actions';

      const level = st.attendance >= 75 ? 'ok' : st.attendance >= 60 ? 'warn' : 'low';
      const badge = document.createElement('span');
      badge.className = `att-badge ${level}`;
      badge.textContent = `${st.attendance}%`;

      const editLink = document.createElement('a');
      editLink.href = `add.html?id=${st.id}`;
      editLink.className = 'btn btn-sm btn-ghost';
      editLink.textContent = 'Edit';

      actions.appendChild(badge);
      actions.appendChild(editLink);

      li.appendChild(meta);
      li.appendChild(actions);
      recentList.appendChild(li);
    });
  }
}

// ─── Fetch Students ───────────────────────────────────────────────────────────
async function loadDashboard() {
  show(loadingState);
  hide(errorState);
  hide(emptyState);
  hide(dashboardContent);

  try {
    const students = await getStudents();
    renderDashboard(students);
  } catch (err) {
    showError(err.message);
  } finally {
    hide(loadingState);
  }
}

// Run dashboard load
loadDashboard();
