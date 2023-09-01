import React from 'react';
import ReactDOM from 'react-dom/client';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import "./global.css";
import App from './App';
import AuthGate from './AuthGate';
import { ThemeProvider } from '@mui/material';
import { mainTheme } from './themes';
import * as Sentry from "@sentry/react";
import { supabase } from './supabaseClient';
import { Provider as SupabaseProvider } from "react-supabase"
import SubscriptionHandler from './components/SubscriptionHandler';
import { Provider } from 'react-redux';
import store from './redux/store';
import OneSignal from "react-onesignal";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536",
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [/^https:\/\/roundnet-karlsruhe\.web.app/, /^https:\/\/staging-roundnet-karlsruhe\.web.app/],
      }),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 0.2,
  });
}

OneSignal.init(
  {
    appId: "a66ef7ea-b977-4fc4-9678-cb2bbf4fdba9",
    safari_web_id: "web.onesignal.auto.1b5e3a9a-fd8d-4cbc-b150-cc0a98b0f0fe",
    notifyButton: {
      enable: true,
    },
    allowLocalhostAsSecureOrigin: true,
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={mainTheme}>
      <Provider store={store}>
        <SupabaseProvider value={supabase}>
          <AuthGate>
            <SubscriptionHandler>
              <App />
            </SubscriptionHandler>
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
