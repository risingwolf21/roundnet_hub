import { supabase } from '@/lib/supabase';
import * as Sentry from '@sentry/react';
import { EventHint } from '@sentry/react';
import { supabaseIntegration } from '@supabase/sentry-js-integration';
import React from 'react';
import { createBrowserRouter, createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router';

export const sendMetricsToSentry = (name: string, value: number) => {
  Sentry.metrics.count(name, value);
};

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.us.sentry.io/4505379651649536',
  sendDefaultPii: true,
  enabled: import.meta.env.VITE_ENV !== 'development',
  environment: import.meta.env.VITE_WEBSITE_NAME + '-' + import.meta.env.VITE_ENV,
  release: import.meta.env.VITE_APP_VERSION,
  enableLogs: true,
  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    supabaseIntegration(supabase, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'error', 'warn'] }),
    Sentry.eventFiltersIntegration({
      ignoreErrors: [
        /Load failed/,
        /Failed to fetch/,
        /Script .*service-worker\.js load failed/,
        /Invalid login credentials/],
    }),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: [
    'https://roundnet-karlsruhe.web.app',
    'https://staging-roundnet-karlsruhe.web.app',
    'https://munich-roundnet.web.app',
  ],
  beforeSend: (event: Sentry.ErrorEvent, hint: EventHint) => {
    // check if the originalException is your object and add the data as extras to the Sentry Event
    if (typeof hint.originalException === 'object' && hint.originalException != null && 'key' in hint.originalException) {
      event.extra = {
        ...event.extra,
        ...hint.originalException,
      }
    }
    return event;
  },
});

export const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV7(
  createBrowserRouter,
);
