import React, { ReactNode, createContext } from 'react';
import "reflect-metadata";
import ReactDOM from 'react-dom/client';
import "./global.css";
import App from './App';
import { ThemeProvider } from '@mui/material';
import { mainTheme } from './themes/themes';
import * as Sentry from "@sentry/react";
import { supabase } from './components/services/supabase/supabaseClient';
import { Provider as SupabaseProvider } from "react-supabase"
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { Provider, useDispatch } from 'react-redux';
import store from './redux/store';
import "./translation/i18n";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { Container } from 'inversify';
import container from './repository/Container';
import "./firebase";

type Props = {
  children: ReactNode,
  container: Container
}

export const DependencyContext = createContext<{ container: Container | null }>({ container: null });

const DependencyProvider = ({ container, children }: Props) => {
  return <DependencyContext.Provider value={{ container: container }}>
    {children}
  </DependencyContext.Provider>
}



if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536",
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [/^https:\/\/roundnet-karlsruhe\.web.app/, /^https:\/\/staging-roundnet-karlsruhe\.web.app/],
      }),
    ],
    tracesSampleRate: 1.0,
  });
}

export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={mainTheme}>
      <Provider store={store}>
        <SupabaseProvider value={supabase}>
          <DependencyProvider container={container}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <App />
            </LocalizationProvider>
          </DependencyProvider>
        </SupabaseProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);