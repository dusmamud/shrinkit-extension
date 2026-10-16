import React from 'react';
import { createRoot } from 'react-dom/client';
import Editor from './Editor';
import '../../src/styles/global.css';
import './style.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Editor />
    </React.StrictMode>,
  );
}
