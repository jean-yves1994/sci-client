'use client';

import * as React from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sci-theme';

interface ThemeContextValue {
  /** What the user chose, including 'system'. */
  theme: ThemeChoice;
  /** What is actually rendered right now. */
  resolved: ResolvedTheme;
  setTheme: (theme: ThemeChoice) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/**
 * Script injected before first paint.
 *
 * Reading the stored preference in a useEffect would render light first and
 * then repaint dark — a white flash on every load for dark-mode users. This
 * runs synchronously in <head>, so the correct class is on <html> before the
 * browser paints anything.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;

  // The transition class is added only for the duration of the swap, so colours
  // animate when the user toggles but not on initial load or navigation.
  root.classList.add('theme-transition');
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;

  window.setTimeout(() => root.classList.remove('theme-transition'), 220);
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice !== 'system') return choice;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeChoice>('system');
  const [resolved, setResolved] = React.useState<ResolvedTheme>('light');

  // Reads what the init script already applied, so state agrees with the DOM.
  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? 'system';
    setThemeState(stored);
    setResolved(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  // While the choice is 'system', follow the OS if the user changes it mid-session.
  React.useEffect(() => {
    if (theme !== 'system') return;

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = query.matches ? 'dark' : 'light';
      setResolved(next);
      applyTheme(next);
    };

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = React.useCallback((next: ThemeChoice) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);

    const nextResolved = resolve(next);
    setResolved(nextResolved);
    applyTheme(nextResolved);
  }, []);

  // Toggle moves between explicit light and dark; 'system' stays available in
  // the menu but is not part of a two-way switch.
  const toggle = React.useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  const value = React.useMemo(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
