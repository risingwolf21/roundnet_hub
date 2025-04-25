
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

export const App = () => {
  return <ThemeProvider theme={mainTheme}>
    <AppProvider branding={BRANDING} theme={mainTheme}>
      <DialogsProvider>
        <NotificationsProvider slotProps={{
          snackbar: {
            sx: {
              bottom: "calc(8px + env(safe-area-inset-bottom))"
            }
          }
        }}>
          <Provider store={store}>
            <SupabaseProvider value={supabase}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <AuthGate />
              </LocalizationProvider>
            </SupabaseProvider>
          </Provider>
        </NotificationsProvider>
      </DialogsProvider>
    </AppProvider>
  </ThemeProvider>
}