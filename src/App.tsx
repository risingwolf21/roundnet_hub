
import { ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import React from 'react';
import { Provider as SupabaseProvider } from 'react-supabase';
import { supabase } from 'src/lib/supabase';
//@ts-ignore
import { captureException, withScope } from '@sentry/react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@toolpad/core/AppProvider';
import { AuthGate } from './features/auth/AuthGate';
import { munich_roundnet_theme } from './themes/munich_roundnet_theme';
import { roundnet_karlsruhe_theme } from './themes/roundnet_karlsruhe_theme';
import { BRANDING } from './utils';
import { queryClient } from 'src/lib/queryClient';

const themeMap = {
  "munich-roundnet": munich_roundnet_theme,
  "roundnet-karlsruhe": roundnet_karlsruhe_theme
}

const theme = themeMap[process.env.REACT_APP_WEBSITE_PATH as keyof typeof themeMap || 'roundnet-karlsruhe']

export const App = () => {

  return <ThemeProvider theme={theme}>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <QueryClientProvider client={queryClient}>
        <AppProvider branding={BRANDING} theme={theme}>
          <SupabaseProvider value={supabase}>
            <AuthGate />
          </SupabaseProvider>
        </AppProvider>
      </QueryClientProvider>
    </LocalizationProvider>
  </ThemeProvider>
}