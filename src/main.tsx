import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyDesignTokens } from './styles/applyTokens';
import './styles/tokens.css';
import './styles/global.css';

applyDesignTokens();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('#root が見つかりません');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
