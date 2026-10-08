import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StyleGuide } from './StyleGuide';
import '../styles.css';
import './styleguide.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleGuide />
  </StrictMode>,
);
