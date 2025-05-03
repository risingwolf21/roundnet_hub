import * as Sentry from "@sentry/react";
import { supabaseIntegration } from '@supabase/sentry-js-integration';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router';
import { useEffect } from 'react';
import { supabase } from './components/services/supabase/supabaseClient';


Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.us.sentry.io/4505379651649536',
  sendDefaultPii: true,
  environment: process.env.REACT_APP_ENV,
  release: process.env.REACT_APP_VERSION,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    supabaseIntegration(supabase, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true
    }),
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["https://roundnet-karlsruhe.web.app"],
});