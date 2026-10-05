import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource/hanken-grotesk/latin-400';
import '@fontsource/hanken-grotesk/latin-600';
import '@fontsource/ibm-plex-mono/latin-500';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
