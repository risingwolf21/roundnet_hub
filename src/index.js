import React from 'react';
import ReactDOM from 'react-dom/client';
import store from "./redux/store";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { Provider } from 'react-redux';
import "./global.css";
import App from './App';
import AuthGate from './AuthGate';
import { ThemeProvider } from '@mui/material';
import { mainTheme } from './themes';
import * as Sentry from "@sentry/react";
import { supabase } from './supabaseClient';
import { Provider as SupabaseProvider } from "react-supabase"

Sentry.init({
  dsn: "https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536",
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ["localhost", /^https:\/\/roundnet-karlsruher\.web.app/],
    }),
    new Sentry.Replay(),
  ],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={mainTheme}>
      <Provider store={store}>
          <SupabaseProvider value={supabase}>
            <AuthGate>
              <App />
            </AuthGate>
          </SupabaseProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
