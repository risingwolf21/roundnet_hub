import { ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import * as Sentry from "@sentry/react";
import { Container } from 'inversify';
import React, { ReactNode, createContext } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Provider as SupabaseProvider } from "react-supabase";
import "reflect-metadata";
import App from './App';
import { supabase } from './components/services/supabase/supabaseClient';
import "./global.css";
import store from './redux/store';
import container from './repository/Container';
import { mainTheme } from './themes/themes';
import "./translation/i18n";
//@ts-ignore
import "src/apocalypseHandler.js";

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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
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
);