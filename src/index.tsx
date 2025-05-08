import "./instrument";
import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'reflect-metadata';
import './global.css';
import './translation/i18n';
//@ts-ignore
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import { App } from "./App";


const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});

dayjs.extend(updateLocale)
dayjs.updateLocale('en', {
  weekStart: 1,
})

root.render(
  <App />
);
