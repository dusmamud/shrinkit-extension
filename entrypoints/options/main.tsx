import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Options from './Options';
import '../../src/styles/global.css';
import './style.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Options />
    </StrictMode>,
  );
}
