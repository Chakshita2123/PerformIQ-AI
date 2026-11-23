/**
 * format.js
 * Central formatting utilities for PerformIQ AI.
 * Ensures consistent date, score, and currency representations across the entire UI.
 */

/**
 * Format a date string or timestamp into uniform "23 Oct 2026" format.
 * @param {string|Date|number} dateVal
 * @returns {string} e.g. "23 Oct 2026" or "—"
 */
export function formatDate(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a score into "XX.XX / 100" format with 2 fixed decimals.
 * @param {number|null|undefined} score
 * @returns {string} e.g. "21.93 / 100" or "N/A"
 */
export function formatScore(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'N/A';
  return `${score.toFixed(2)} / 100`;
}
