import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@toolpad/core/AppProvider';
import { PropsWithChildren, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';
import { customEnLocale } from './lib/date-fns';
import { munich_roundnet_theme } from './theme/munich_roundnet_theme';
import { roundnet_karlsruhe_theme } from './theme/roundnet_karlsruhe_theme';
import { BRANDING } from './utils';

const themeMap = {
  'munich-roundnet': munich_roundnet_theme,
  'roundnet-karlsruhe': roundnet_karlsruhe_theme,
};

const theme = themeMap[(import.meta.env.VITE_WEBSITE_PATH as keyof typeof themeMap) || 'roundnet-karlsruhe'];

const ServiceWorkerGate = ({ children }: PropsWithChildren) => {
  useRegisterSW({
    immediate: true,
    onRegistered: (registration) => {
      if (!registration) return;

      const updateSW = async () => {
        try {
          await registration.update();
        } catch (error) {
          console.debug('ServiceWorker update check failed:', error);
        }
      };

      setInterval(updateSW, 60_000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          updateSW();
        }
      });

      document.addEventListener('focus', updateSW);
    },
  });

  useEffect(() => {
    const handleControllerChange = () => {

      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return children;
};

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={customEnLocale}>
        <ServiceWorkerGate>
          <QueryClientProvider client={queryClient}>
            <AppProvider branding={BRANDING} theme={theme}>
              <AuthGate />
            </AppProvider>
          </QueryClientProvider>
        </ServiceWorkerGate>
      </LocalizationProvider>
    </ThemeProvider>
  );
};
