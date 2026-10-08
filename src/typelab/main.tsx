import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TypeLab } from './TypeLab';
import '../styles.css';
import './typelab.css';
import { DISPLAY_FONTS, SANS_FONTS, loadFonts } from '../lib/typePreview';

// Before rendering, so the font faces exist when the cards measure them.
loadFonts([...DISPLAY_FONTS, ...SANS_FONTS].map((f) => f.query), 'type-lab-fonts');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TypeLab />
  </StrictMode>,
);
