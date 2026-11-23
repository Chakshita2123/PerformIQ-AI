/**
 * verify-contrast.js
 * WCAG AA Contrast Ratio Validator for PerformIQ AI design tokens.
 * Computes exact relative luminance according to WCAG 2.1 specifications:
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * Contrast = (L1 + 0.05) / (L2 + 0.05)
 *
 * Validates all text / background token combinations in both Light and Dark themes.
 * Exits with code 0 if all pairs pass WCAG AA (>= 4.5:1 for normal text, >= 3.0:1 for large text / UI elements),
 * or code 1 with detailed failure reports.
 */

function sRGBtoLinear(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((ch) => ch + ch).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * sRGBtoLinear(r) +
    0.7152 * sRGBtoLinear(g) +
    0.0722 * sRGBtoLinear(b)
  );
}

function getContrast(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

// ── Define Design System Token Combinations to Test ─────────────────────────

const LIGHT_PAIRS = [
  // Primary & Muted Text on Surface Backgrounds
  { name: 'text-primary on bg-panel', text: '#0F1C2E', bg: '#FFFFFF' },
  { name: 'text-primary on bg-page', text: '#0F1C2E', bg: '#F4F6F9' },
  { name: 'text-primary on bg-subtle', text: '#0F1C2E', bg: '#EEF1F6' },
  { name: 'text-muted on bg-panel', text: '#536479', bg: '#FFFFFF' },
  { name: 'text-muted on bg-page', text: '#536479', bg: '#F4F6F9' },
  { name: 'text-muted on bg-subtle', text: '#536479', bg: '#EEF1F6' },
  { name: 'text-subtle on bg-panel', text: '#596E87', bg: '#FFFFFF' },
  { name: 'text-subtle on bg-page', text: '#596E87', bg: '#F4F6F9' },
  { name: 'text-subtle on bg-subtle', text: '#596E87', bg: '#EEF1F6' },

  // Buttons & Badges: Navy Text on Teal Fill (WCAG AA requirement)
  { name: 'navy text on teal button fill', text: '#0F1C2E', bg: '#2AB4A0' },
  { name: 'accent-text on bg-panel', text: '#0F766E', bg: '#FFFFFF' },
  { name: 'accent-text on accent-bg', text: '#0F766E', bg: '#F0FDFA' },

  // Risk Badges (Text on Tinted Badge Background)
  { name: 'risk-high-text on risk-high-bg', text: '#B91C1C', bg: '#FEF2F2' },
  { name: 'risk-high-text on bg-panel', text: '#B91C1C', bg: '#FFFFFF' },
  { name: 'risk-med-text on risk-med-bg', text: '#8D5B00', bg: '#FFFBEB' },
  { name: 'risk-med-text on bg-panel', text: '#8D5B00', bg: '#FFFFFF' },
  { name: 'risk-low-text on risk-low-bg', text: '#0D7A46', bg: '#ECFDF5' },
  { name: 'risk-low-text on bg-panel', text: '#0D7A46', bg: '#FFFFFF' },
  { name: 'risk-unassessed-text on bg-panel', text: '#475569', bg: '#FFFFFF' },
];

const DARK_PAIRS = [
  // Primary & Muted Text on Dark Surfaces
  { name: 'text-primary on bg-panel', text: '#F4F6F9', bg: '#172437' },
  { name: 'text-primary on bg-page', text: '#F4F6F9', bg: '#0F1C2E' },
  { name: 'text-primary on bg-subtle', text: '#F4F6F9', bg: '#1F3046' },
  { name: 'text-muted on bg-panel', text: '#9BB0C7', bg: '#172437' },
  { name: 'text-muted on bg-page', text: '#9BB0C7', bg: '#0F1C2E' },
  { name: 'text-muted on bg-subtle', text: '#9BB0C7', bg: '#1F3046' },
  { name: 'text-subtle on bg-panel', text: '#9CB1C9', bg: '#172437' },
  { name: 'text-subtle on bg-page', text: '#9CB1C9', bg: '#0F1C2E' },
  { name: 'text-subtle on bg-subtle', text: '#9CB1C9', bg: '#1F3046' },

  // Buttons & Badges: Navy Text on Teal Fill
  { name: 'navy text on teal button fill', text: '#0F1C2E', bg: '#2AB4A0' },
  { name: 'accent-text on bg-panel', text: '#5EEAD4', bg: '#172437' },

  // Dark Risk Badges
  { name: 'risk-high-text on bg-panel', text: '#FFA299', bg: '#172437' },
  { name: 'risk-med-text on bg-panel', text: '#FCD34D', bg: '#172437' },
  { name: 'risk-low-text on bg-panel', text: '#6EE7B7', bg: '#172437' },
  { name: 'risk-unassessed-text on bg-panel', text: '#94A3B8', bg: '#172437' },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PerformIQ AI — WCAG AA Contrast Verification Report');
console.log('  Target threshold: >= 4.5:1 for body/small text (>= 3.0:1 large)');
console.log('═══════════════════════════════════════════════════════════════\n');

let failedCount = 0;

function evaluateTheme(themeName, pairs) {
  console.log(`[Theme: ${themeName}]`);
  console.log('─'.repeat(63));
  pairs.forEach((p) => {
    const ratio = getContrast(p.text, p.bg);
    const passed = ratio >= 4.5;
    const formattedRatio = `${ratio.toFixed(2)}:1`;

    if (!passed) {
      failedCount++;
      console.log(`  ❌ FAIL: ${p.name.padEnd(36)} -> ${formattedRatio.padEnd(8)} (Text: ${p.text}, BG: ${p.bg})`);
    } else {
      console.log(`  ✅ PASS: ${p.name.padEnd(36)} -> ${formattedRatio.padEnd(8)} (Text: ${p.text}, BG: ${p.bg})`);
    }
  });
  console.log('');
}

evaluateTheme('Light Mode', LIGHT_PAIRS);
evaluateTheme('Dark Mode', DARK_PAIRS);

console.log('═'.repeat(63));
if (failedCount === 0) {
  console.log('  ALL TESTED TOKEN PAIRS MEET OR EXCEED WCAG AA (>= 4.5:1)');
  console.log('═'.repeat(63));
  process.exit(0);
} else {
  console.error(`  FAILURES DETECTED: ${failedCount} token pairs failed WCAG AA (< 4.5:1)`);
  console.log('═'.repeat(63));
  process.exit(1);
}
