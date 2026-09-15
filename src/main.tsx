import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installErrorReporting } from './utils/errorReporting.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

installErrorReporting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
