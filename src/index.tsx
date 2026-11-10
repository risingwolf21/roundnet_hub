import * as Sentry from '@sentry/react';
import { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './apocalypseHandler';
import { App } from './App';
import ErrorScreen from './components/ErrorScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { releaseSplash } from './components/splash';
import { ThemeProvider } from './components/ui/theme-provider';
import { FeatureToggleProvider } from './contexts/FeatureToggleContext';
import './instrument';
import './styles/global.css';
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
  <ErrorScreen error={e.error} eventId={e.eventId || undefined} />
);

// Ends the app start's hold on the splash; outside the error boundary so its fallback is never hidden.
const SplashReady = () => {
  useEffect(releaseSplash, []);
  return null;
};

root.render(
  <>
    <SplashReady />
    <Sentry.ErrorBoundary fallback={Fallback}>
      <div aria-hidden className="top-edge bg-background" />
      <Suspense fallback={<LoadingScreen />}>
        <ThemeProvider>
          <FeatureToggleProvider>
            <App />
          </FeatureToggleProvider>
        </ThemeProvider>
      </Suspense>
    </Sentry.ErrorBoundary>
  </>
);
