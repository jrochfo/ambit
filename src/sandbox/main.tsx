import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Sandbox } from './Sandbox';
import '../styles.css';
import './sandbox.css';
import { applyTypePreview } from '../lib/typePreview';

// Fonts picked in the type lab (another tab) apply here live.
applyTypePreview();
window.addEventListener('storage', (e) => {
  if (e.key === 'ambit.typePreview') applyTypePreview();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sandbox />
  </StrictMode>,
);
