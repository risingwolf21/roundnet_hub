import "./instrument";
import * as Sentry from '@sentry/react';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import 'reflect-metadata';
import './global.css';
import './translation/i18n';
//@ts-ignore
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import { App } from "./App";
import "src/apocalypseHandler.js";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

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

dayjs.extend(updateLocale)
dayjs.updateLocale('en', { weekStart: 1 })

root.render(
  <Sentry.ErrorBoundary fallback={<div>Etwas ist schiefgelaufen. Bitte neu laden.</div>}>
    <Suspense fallback={<div style={{ padding: 16 }}>Lade…</div>}>
      <App />
    </Suspense>
  </Sentry.ErrorBoundary>
);

serviceWorkerRegistration.register();