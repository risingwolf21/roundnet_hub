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

registerSW({
  immediate: true,
  onRegisterError: (error) => {
    Sentry.logger.info("Service Worker installation failed", {
      type: 'service_worker',
      message: 'instalation_failed',
      error: JSON.stringify(error)
    })
  },
  onRegisteredSW: (_, registration) => {
    Sentry.logger.info("Service Worker installed succesfully", {
      type: 'service_worker',
      message: 'instalation_successful'
    })
    setInterval(() => {
      if (registration)
        registration.update();
    }, 5000)
  }
});

let reloading = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!reloading) {
    reloading = true;
    window.location.reload();
  }
});

root.render(
  <Sentry.ErrorBoundary fallback={<div>Etwas ist schiefgelaufen. Bitte neu laden.</div>}>
    <Suspense fallback={<div style={{ padding: 16 }}>Lade…</div>}>
      <App />
    </Suspense>
  </Sentry.ErrorBoundary>
);