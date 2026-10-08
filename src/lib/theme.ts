import { useEffect, useState } from 'react';
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

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme === theme) return;
    // Swap every color at once: hover fades would otherwise lag a frame behind the page.
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove('theme-switching');
    };
  }, [theme]);
  // Only an explicit choice is saved, so a system setting change still applies otherwise.
  const choose = (next: Theme) => {
    setTheme(next);
    savePref('theme', next);
  };
  return [theme, choose];
}
