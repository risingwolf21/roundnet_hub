import * as Sentry from '@sentry/react';
import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './apocalypseHandler';
import { App } from './App';
import './global.css';
import './instrument';
import './translation/i18n';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Caught error', error, errorInfo.componentStack);
  }),
  onRecoverableError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Recoverable error', error, errorInfo.componentStack);
  }),
});

const updateSW = registerSW({
  immediate: true, // direkt registrieren
  onNeedRefresh() {
    // Statt Prompt: sofort updaten -> sendet 'SKIP_WAITING' an waiting SW
    updateSW(true);
  },
  onOfflineReady() {
    // optional: Toast "App ist offlinefähig"
  },
});

root.render(
  <Sentry.ErrorBoundary fallback={<div>Etwas ist schiefgelaufen. Bitte neu laden.</div>}>
    <Suspense fallback={<div style={{ padding: 16 }}>Lade…</div>}>
      <App />
    </Suspense>
  </Sentry.ErrorBoundary>
);

let refreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!refreshing) {
    refreshing = true;
    window.location.reload();
  }
});
