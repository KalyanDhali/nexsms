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

// Desktop Mode keyboard pops: in mobile browsers' "Desktop site" mode the
// layout viewport is >=980px and opening the touch keyboard resizes the
// visual viewport. Re-pin scroll position to keep the layout frozen (the
// .app-shell CSS lock at min-width:980px covers the layout side).
const inDesktopMode = () =>
  window.matchMedia('(min-width: 980px)').matches ||
  (typeof window.visualViewport !== 'undefined' && window.visualViewport.width >= 980);

if (typeof window.visualViewport !== 'undefined') {
  const pinScroll = () => {
    if (!inDesktopMode()) return;
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  };
  window.visualViewport.addEventListener('resize', pinScroll);
  window.visualViewport.addEventListener('scroll', pinScroll);
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
