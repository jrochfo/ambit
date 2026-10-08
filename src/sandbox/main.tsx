import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Sandbox } from './Sandbox';
import '../styles.css';
import './sandbox.css';
import { applyTypePreview } from '../lib/typePreview';
import { applyColorPreview } from '../lib/palette';
import { applyTexturePreview } from '../lib/texturePreview';

// Fonts and palettes picked in the type and color labs (other tabs) apply here live.
applyTypePreview();
applyColorPreview();
applyTexturePreview();
window.addEventListener('storage', (e) => {
  if (e.key === 'ambit.texturePreview') applyTexturePreview();
  if (e.key === 'ambit.typePreview') applyTypePreview();
  if (e.key === 'ambit.colorPreview') applyColorPreview();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sandbox />
  </StrictMode>,
);
