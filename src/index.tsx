import {ThemeProvider} from '@mui/material';
import {LocalizationProvider} from '@mui/x-date-pickers';
import {AdapterDayjs} from '@mui/x-date-pickers/AdapterDayjs';
import * as Sentry from "@sentry/react";
import React from 'react';
import ReactDOM from 'react-dom/client';
import {Provider} from 'react-redux';
import {Provider as SupabaseProvider} from "react-supabase";
import "reflect-metadata";
import App from './App';
import {supabase} from './components/services/supabase/supabaseClient';
import "./global.css";
import store from './redux/store';
import {mainTheme} from './themes/themes';
import "./translation/i18n";
//@ts-ignore
import "src/apocalypseHandler.js";
import {createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType} from "react-router-dom";
import {SupabaseClient} from '@supabase/supabase-js'
import {SupabaseIntegration} from '@supabase/sentry-js-integration'
import {captureConsoleIntegration} from "@sentry/integrations";


export const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

if (process.env.REACT_APP_ENV === "production") {
    Sentry.init({
        dsn: "https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536",
        environment: process.env.REACT_APP_ENV,
        integrations: [
            Sentry.reactRouterV6BrowserTracingIntegration({
                useEffect: React.useEffect,
                useLocation,
                useNavigationType,
                createRoutesFromChildren,
                matchRoutes,
            }),
            new SupabaseIntegration(SupabaseClient, {
                tracing: true,
                breadcrumbs: true,
                errors: true,
            }),
            captureConsoleIntegration()
        ],
        tracesSampleRate: 1.0,
        tracePropagationTargets: [/^https:\/\/roundnet-karlsruhe\.web.app/, /^https:\/\/staging-roundnet-karlsruhe\.web.app/]
    });
}


const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <ThemeProvider theme={mainTheme}>
        <Provider store={store}>
            <SupabaseProvider value={supabase}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <App/>
                </LocalizationProvider>
            </SupabaseProvider>
        </Provider>
    </ThemeProvider>
);