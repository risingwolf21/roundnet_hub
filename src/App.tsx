
import { ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import React from 'react';
import { Provider } from 'react-redux';
import { Provider as SupabaseProvider } from 'react-supabase';
import { supabase } from './components/services/supabase/supabaseClient';
import store from './redux/store';
import { mainTheme } from './themes/themes';
//@ts-ignore
import { AppProvider } from '@toolpad/core/AppProvider';
import { DialogsProvider } from '@toolpad/core/useDialogs';
import { NotificationsProvider } from '@toolpad/core/useNotifications';
import { AuthGate } from './features/auth/AuthGate';
import { BRANDING } from './utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

export const App = () => {

  return <ThemeProvider theme={mainTheme}>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <QueryClientProvider client={queryClient}>
        <AppProvider branding={BRANDING} theme={mainTheme}>
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