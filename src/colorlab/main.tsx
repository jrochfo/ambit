import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ColorLab } from './ColorLab';
import '../styles.css';
import './colorlab.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorLab />
  </StrictMode>,
);
