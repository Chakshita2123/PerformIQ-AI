import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'performiq_theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Default to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (err) {
    // Fallback if localStorage or matchMedia is restricted
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {}
  }, [theme]);

  // Listen for external system preference changes if user hasn't explicitly set a preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to provide Recharts-compatible dynamic colors responding to light/dark mode.
 */
export function useChartTheme() {
  const { isDark } = useTheme();
  return {
    grid: isDark ? '#263952' : '#D8E0EB',
    text: isDark ? '#9BB0C7' : '#536479',
    tooltipBg: isDark ? '#172437' : '#FFFFFF',
    tooltipBorder: isDark ? '#263952' : '#D8E0EB',
    tooltipText: isDark ? '#F4F6F9' : '#0F1C2E',
    coral: '#E05C4B',
    amber: '#D4891A',
    mint: '#2EAB72',
    unassessed: isDark ? '#64748B' : '#94A3B8',
    teal: '#2AB4A0',
  };
}
