/// <reference types="vite-plugin-pwa/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './App.tsx';
import './index.css';

// Intercept fetch to add Firebase Auth token to /api requests
const originalFetch = window.fetch;
Object.defineProperty(window, 'fetch', {
  configurable: true,
  writable: true,
  value: async (...args: any[]) => {
    let [resource, config] = args;
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      try {
        const { auth } = await import('./lib/firebase');
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          config = config || {};
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
          };
        }
      } catch (e) {
        console.warn('Failed to attach Firebase token', e);
      }
    }
    return originalFetch(resource, config);
  }
});

// Register Service Worker for Web Push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch((err) => {
      console.warn('ServiceWorker registration failed: ', err);
    });
  });
}

// Optionally, we can still use registerSW but let's disable it temporarily or let it re-register
// after clearing. Actually, since they are stuck, let's just clear it and not register immediately
// so it forces network fetch next time. We can uncomment registerSW if needed later.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
