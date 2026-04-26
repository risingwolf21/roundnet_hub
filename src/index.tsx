import * as Sentry from '@sentry/react';
import { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './apocalypseHandler';
import { App } from './App';
import { LoadingScreen } from './components/LoadingScreen';
import { Button } from './components/ui/button';
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
  <div className='grid min-h-screen grid-cols-1 lg:grid-cols-2'>
    <div className='flex flex-col items-center justify-center px-4 py-8 text-center'>
      <h2 className='mb-6 text-5xl font-semibold'>Whoops!</h2>
      <h3 className='mb-1.5 text-3xl font-semibold'>Something went wrong</h3>
      <p className='text-muted-foreground mb-6 max-w-sm'>
        The page you&apos;re looking for isn&apos;t found, we suggest you back to home.
      </p>
      <Button size='lg' className='rounded-lg text-base'>
        <a href='/'>Back to home page</a>
      </Button>
    </div>

    {/* Right Section: Illustration */}
    <div className='relative max-h-screen w-full p-2 max-lg:hidden'>
      <div className='h-full w-full rounded-2xl bg-black'></div>
      <img
        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/error/image-1.png'
        alt='404 illustration'
        className='absolute top-1/2 left-1/2 h-[clamp(260px,25vw,406px)] -translate-x-1/2 -translate-y-1/2'
      />
    </div>
  </div>
);

root.render(
  <Sentry.ErrorBoundary fallback={Fallback}>
    <Suspense fallback={<LoadingScreen />}>
      <ThemeProvider>
        <FeatureToggleProvider>
          <App />
        </FeatureToggleProvider>
      </ThemeProvider>
    </Suspense>
  </Sentry.ErrorBoundary>
);
