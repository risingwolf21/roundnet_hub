import UpdateAvailable from '@/images/update_available2.png';
import { queryClient } from '@/lib/queryClient';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@toolpad/core/AppProvider';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import AuthLayout from './components/layout/AuthLayout';
import { DialogsProvider } from './contexts/DialogsProvider';
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
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      setNeedRefresh(true);
    },
    onRegistered: (registration) => {
      if (registration) {
        let isUpdating = false;
        setInterval(async () => {
          // Prevent concurrent update attempts
          if (isUpdating) {
            return;
          }

          try {
            isUpdating = true;
            await registration.update();
          } catch (error) {
            // Silently handle update errors to prevent unhandled promise rejections
            console.debug('ServiceWorker update check failed:', error);
          } finally {
            isUpdating = false;
          }
        }, 60_000);
      }
    },
  });
  const { t } = useTranslation();

  if (needRefresh) {
    return (
      <AuthLayout>
        <Stack direction={'column'} sx={{ p: 6 }}>
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img src={UpdateAvailable} width={'100%'} height={'225px'} style={{ objectFit: 'contain' }} />
          </Box>
          <Typography sx={{ fontSize: 26, fontWeight: 'bold', mt: 3, textAlign: 'center' }}>
            {t('updateAvailableTitle')}
          </Typography>
          <Typography sx={{ fontSize: 20, mt: 3, textAlign: 'center' }}>{t('updateAvailableMessage')}</Typography>

          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button fullWidth={false} variant="contained" onClick={() => updateServiceWorker(true)}>
              {t('browse.appRefresh')}
            </Button>
          </Box>
        </Stack>
      </AuthLayout>
    );
  }

  return children;
};

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={customEnLocale}>
        <ServiceWorkerGate>
          <QueryClientProvider client={queryClient}>
            <DialogsProvider>
              <AppProvider branding={BRANDING} theme={theme}>
                <AuthGate />
              </AppProvider>
            </DialogsProvider>
          </QueryClientProvider>
        </ServiceWorkerGate>
      </LocalizationProvider>
    </ThemeProvider>
  );
};
