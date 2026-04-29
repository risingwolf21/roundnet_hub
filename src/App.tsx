import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';

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
    <ServiceWorkerGate>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
      </QueryClientProvider>
    </ServiceWorkerGate>
  );
};
