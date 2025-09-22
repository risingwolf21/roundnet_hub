import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
//@ts-ignore
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@toolpad/core/AppProvider';
import { AuthGate } from './features/auth/AuthGate';
import { customEnLocale } from './lib/date-fns';
import { munich_roundnet_theme } from './themes/munich_roundnet_theme';
import { roundnet_karlsruhe_theme } from './themes/roundnet_karlsruhe_theme';
import { BRANDING } from './utils';

const themeMap = {
  'munich-roundnet': munich_roundnet_theme,
  'roundnet-karlsruhe': roundnet_karlsruhe_theme,
};

const theme = themeMap[(import.meta.env.VITE_WEBSITE_PATH as keyof typeof themeMap) || 'roundnet-karlsruhe'];

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={customEnLocale}>
        <QueryClientProvider client={queryClient}>
          <AppProvider branding={BRANDING} theme={theme}>
            <AuthGate />
          </AppProvider>
        </QueryClientProvider>
      </LocalizationProvider>yarn
    </ThemeProvider>
  );
};
