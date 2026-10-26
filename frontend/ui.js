// ui.js — Shared UI module for PerformIQ AI.
// Demonstrates: ES6 modules (export), DOM manipulation, Event handling, safe textContent.

/**
 * Show or hide an element using the hidden attribute.
 */
export function show(el) {
  if (el) el.hidden = false;
}

export function hide(el) {
  if (el) el.hidden = true;
}

/**
 * Attendance level classifier:
 * >= 75%: ok (Good)
 * 60% - 74%: warn (Warning)
 * < 60%: low (Low)
 */
export function attLevel(pct) {
  if (pct >= 75) return 'ok';
  if (pct >= 60) return 'warn';
  return 'low';
}

export function attLabel(pct) {
  if (pct >= 75) return 'Good';
  if (pct >= 60) return 'Warning';
  return 'Low';
}

/**
 * Create an attendance badge DOM element.
 */
export function createAttBadge(pct) {
  const level = attLevel(pct);
  const badge = document.createElement('span');
  badge.className = `att-badge ${level}`;
  badge.textContent = `${pct}%`;
  return badge;
}

/**
 * Create a visual attendance progress bar with track and fill.
 */
export function createAttBar(pct) {
  const level = attLevel(pct);
  const wrap = document.createElement('div');
  wrap.className = 'att-bar-wrap';

  const track = document.createElement('div');
  track.className = 'att-bar-track';

  const fill = document.createElement('div');
  fill.className = `att-bar-fill ${level}`;
  fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;

  track.appendChild(fill);
  wrap.appendChild(track);
  wrap.appendChild(createAttBadge(pct));
  return wrap;
}

/**
 * Display a toast notification (success or error).
 * Automatically cleans up after 3.5 seconds.
 */
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');

  // Inline SVG icons (checkmark for success, alert for error)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', type === 'success'
    ? 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
    : 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'
  );
  svg.appendChild(path);

  const span = document.createElement('span');
  span.textContent = message; // Safe user text

  toast.appendChild(svg);
  toast.appendChild(span);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3500);
}

/**
 * Render the site navigation inside the header.
 * Highlights the active page and sets aria-current="page".
 * @param {'dashboard'|'students'|'add'} activePage
 */
export function renderHeaderNav(activePage) {
  const navContainer = document.getElementById('site-nav-wrap');
  if (!navContainer) return;

  navContainer.textContent = ''; // clear

  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Main Navigation');

  const links = [
    { id: 'dashboard', href: 'index.html', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { id: 'students',  href: 'students.html', label: 'Students', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
    { id: 'add',       href: 'add.html', label: 'Add Student', icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' },
  ];

  const ul = document.createElement('ul');
  ul.className = 'nav-list';

  links.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.href;
    a.className = 'nav-link' + (item.id === activePage ? ' active' : '');
    if (item.id === activePage) {
      a.setAttribute('aria-current', 'page');
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', item.icon);
    svg.appendChild(path);

    const text = document.createElement('span');
    text.textContent = item.label;

    a.appendChild(svg);
    a.appendChild(text);
    li.appendChild(a);
    ul.appendChild(li);
  });

  nav.appendChild(ul);
  navContainer.appendChild(nav);
}

/**
 * Initialize live clock in header.
 */
export function initClock() {
  const clock = document.getElementById('header-clock');
  if (!clock) return;
  function tick() {
    clock.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 60000);
}
