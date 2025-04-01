import { ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import * as Sentry from '@sentry/react';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Provider as SupabaseProvider } from 'react-supabase';
import 'reflect-metadata';
import { supabase } from './components/services/supabase/supabaseClient';
import './global.css';
import store from './redux/store';
import { mainTheme } from './themes/themes';
import './translation/i18n';
//@ts-ignore
import { captureConsoleIntegration } from '@sentry/integrations';
import { supabaseIntegration } from '@supabase/sentry-js-integration';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DialogsProvider } from '@toolpad/core/useDialogs';
import { NotificationsProvider } from '@toolpad/core/useNotifications';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router';
import 'src/apocalypseHandler.js';
import { BRANDING } from './utils';
import { AuthGate } from './features/auth/AuthGate';
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  environment: process.env.REACT_APP_ENV,
  enabled: process.env.REACT_APP_ENV === "production",
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration(),
    supabaseIntegration(supabase, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
    captureConsoleIntegration(),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/roundnet-karlsruhe\.web.app/, /^https:\/\/staging-roundnet-karlsruhe\.web.app/],
});

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
  <ThemeProvider theme={mainTheme}>
    <AppProvider branding={BRANDING} theme={mainTheme}>
      <DialogsProvider>
        <NotificationsProvider>
          <Provider store={store}>
            <SupabaseProvider value={supabase}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <AuthGate />
              </LocalizationProvider>
            </SupabaseProvider>
          </Provider>
        </NotificationsProvider>
      </DialogsProvider>
    </AppProvider>
  </ThemeProvider>
);
