import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { DarkModeProvider } from './context/DarkModeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Prevent input focus from firing default smooth-scroll shifts (mobile
// Desktop Site keyboards). Freeze scroll on focus so the browser shell
// cannot re-render/jump the viewport when the touch keyboard opens.
document.addEventListener(
  'focusin',
  (e) => {
    const t = e.target;
    if (t && typeof t.matches === 'function' && t.matches('input, textarea')) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }
  },
  true,
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <DarkModeProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </DarkModeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
