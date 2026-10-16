import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import '../../src/styles/global.css';
import './style.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
  );
}
