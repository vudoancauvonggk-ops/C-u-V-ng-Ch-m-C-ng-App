/// <reference types="vite-plugin-pwa/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
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

// Force clear service workers and caches to ensure everyone gets the latest version
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}

// Optionally, we can still use registerSW but let's disable it temporarily or let it re-register
// after clearing. Actually, since they are stuck, let's just clear it and not register immediately
// so it forces network fetch next time. We can uncomment registerSW if needed later.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
