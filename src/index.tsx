import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import * as Sentry from '@sentry/react';
import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './apocalypseHandler';
import { App } from './App';
import AuthLayout from './components/layout/AuthLayout';
import { LoadingScreen } from './components/LoadingScreen';
import './global.css';
import './instrument';
import './translation/i18n';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement, {
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Uncaught error', error, errorInfo.componentStack);
  }),
  onCaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Caught error', error, errorInfo.componentStack);
  }),
  onRecoverableError: Sentry.reactErrorHandler((error, errorInfo) => {
    console.warn('Recoverable error', error, errorInfo.componentStack);
  }),
});

let reloading = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (!reloading) {
    reloading = true;
    window.location.reload();
  }
});

const Fallback = (e: { error: unknown; componentStack: string; eventId: string; resetError(): void }) => (
  <AuthLayout>
    <Stack direction={'column'} sx={{ m: 6 }}>
      <Typography sx={{ fontSize: 26, fontWeight: 'bold', mt: 3, textAlign: 'center' }}>
        Es ist ein Fehler aufgetreten!
      </Typography>
      <Typography sx={{ fontSize: 20, mt: 3, textAlign: 'center' }}>Bitte lade die Seite neu.</Typography>
      <Typography variant="overline" sx={{ fontSize: 20, mt: 3, textAlign: 'center' }}>
        {JSON.stringify(e.error, null, 2)}
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          e.resetError();
          window.location.reload();
        }}
        sx={{ mt: 3, alignSelf: 'center' }}
      >
        Neu laden
      </Button>
    </Stack>
  </AuthLayout>
);

root.render(
  <Sentry.ErrorBoundary fallback={Fallback}>
    <Suspense fallback={<LoadingScreen />}>
      <App />
    </Suspense>
  </Sentry.ErrorBoundary>
);
