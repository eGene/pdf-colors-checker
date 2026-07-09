import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { AnalysisSessionProvider } from '@/features/session/AnalysisSessionProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AnalysisSessionProvider>
      <App />
    </AnalysisSessionProvider>
  </React.StrictMode>,
);
