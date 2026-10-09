import { useState } from 'react';
import { loadPref, savePref } from './storage';

export type Theme = 'light' | 'dark';
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

/** The chosen theme, else the system setting. index.html applies it before first paint too. */
function initialTheme(): Theme {
  const stored = loadPref<Theme | null>('theme', null, (v): v is Theme | null => v === null || isTheme(v));
  if (stored) return stored;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Puts a theme on the page. Called before React re-renders for the new theme, so anything that
 * reads the theme's colors while rendering (the map rings, which need literal colors) sees the
 * new ones, not the old.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  // Swap every color at once: hover fades would otherwise lag a frame behind the page.
  root.classList.add('theme-switching');
  root.dataset.theme = theme;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = initialTheme();
    applyTheme(t);
    return t;
  });
  // Only an explicit choice is saved, so a system setting change still applies otherwise.
  const choose = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
    savePref('theme', next);
  };
  return [theme, choose];
}
