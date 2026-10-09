import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { applyColorPreview } from './lib/palette';

// Dev only: a palette picked in the sandbox or color lab also previews here, on the real map.
if (import.meta.env.DEV) {
  applyColorPreview();
  window.addEventListener('storage', (e) => {
    if (e.key === 'ambit.colorPreview') applyColorPreview();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
