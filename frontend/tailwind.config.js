/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        // Core Palette
        navy: '#0F1C2E',
        surface: '#F4F6F9',
        teal: '#2AB4A0',
        coral: '#E05C4B',
        amber: '#D4891A',
        mint: '#2EAB72',

        // Dynamic Semantic Tokens
        page: 'var(--bg-page)',
        panel: 'var(--bg-panel)',
        subtle: 'var(--bg-subtle)',
        active: 'var(--bg-active)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',

        // Text
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',

        // Accent
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          text: 'var(--accent-text)',
          bg: 'var(--accent-bg)',
        },

        // Risk Tokens
        risk: {
          high: {
            fill: 'var(--risk-high-fill)',
            text: 'var(--risk-high-text)',
            bg: 'var(--risk-high-bg)',
            border: 'var(--risk-high-border)',
          },
          med: {
            fill: 'var(--risk-med-fill)',
            text: 'var(--risk-med-text)',
            bg: 'var(--risk-med-bg)',
            border: 'var(--risk-med-border)',
          },
          low: {
            fill: 'var(--risk-low-fill)',
            text: 'var(--risk-low-text)',
            bg: 'var(--risk-low-bg)',
            border: 'var(--risk-low-border)',
          },
          unassessed: {
            fill: 'var(--risk-unassessed-fill)',
            text: 'var(--risk-unassessed-text)',
            bg: 'var(--risk-unassessed-bg)',
            border: 'var(--risk-unassessed-border)',
          },
        },
      },
    },
  },
  plugins: [],
}
