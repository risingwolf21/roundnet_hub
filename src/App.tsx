
import { ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import React from 'react';
import { Provider } from 'react-redux';
import { Provider as SupabaseProvider } from 'react-supabase';
import { supabase } from './components/services/supabase/supabaseClient';
import store from './redux/store';
//@ts-ignore
import { captureException, withScope } from '@sentry/react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@toolpad/core/AppProvider';
import { AuthGate } from './features/auth/AuthGate';
import { BRANDING } from './utils';
import { roundnet_karlsruhe_theme } from './themes/roundnet_karlsruhe_theme';
import { munich_roundnet_theme } from './themes/munich_roundnet_theme';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
  mutationCache: new MutationCache({
    onError: (err, _variables, _context, mutation) => {
      withScope((scope) => {
        scope.setContext("mutation", {
          mutationId: mutation.mutationId,
          variables: mutation.state.variables,
        });
        if (mutation.options.mutationKey) {
          scope.setFingerprint(
            // Duplicate to prevent modification
            Array.from(mutation.options.mutationKey) as string[],
          );
        }
        captureException(err);
      });
    },
  }),
  queryCache: new QueryCache({
    onError: (err, query) => {
      withScope((scope) => {
        scope.setContext("query", { queryHash: query.queryHash });
        captureException(err);
      })
    }
  })
});

export const App = () => {

  const theme = window.location.hostname === "roundnet-karlsruhe.web.app"
    ? roundnet_karlsruhe_theme
    : munich_roundnet_theme;

  return <ThemeProvider theme={theme}>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <QueryClientProvider client={queryClient}>
        <AppProvider branding={BRANDING} theme={theme}>
          <Provider store={store}>
            <SupabaseProvider value={supabase}>
              <AuthGate />
            </SupabaseProvider>
          </Provider>
        </AppProvider>
      </QueryClientProvider>
    </LocalizationProvider>
  </ThemeProvider>
}