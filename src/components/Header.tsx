import { useRef } from 'react';
import type { Theme } from '../lib/theme';
import { AboutDialog } from './AboutDialog';
import { Icon } from './Icon';
import { Logomark } from './Logomark';

export function Header({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  const about = useRef<HTMLDialogElement>(null);
  const dark = theme === 'dark';
  return (
    <header className="header">
      <div className="brand">
        <Logomark size={26} />
        <h1 className="brand-name">Ambit</h1>
      </div>
      <div className="header-actions">
        <button type="button" className="header-btn" onClick={() => about.current?.showModal()}>
          <Icon name="info" size={16} />
          About
        </button>
        <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" className="theme-switch" onClick={() => onTheme(dark ? 'light' : 'dark')}>
          <span className="theme-switch-knob">
            <Icon name={dark ? 'darkMode' : 'lightMode'} size={16} />
          </span>
        </button>
      </div>
      <AboutDialog ref={about} />
    </header>
  );
}
