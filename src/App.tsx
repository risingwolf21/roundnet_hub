import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';
import { supabase } from './lib/supabase';

const ServiceWorkerGate = ({ children }: PropsWithChildren) => {
  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegistered: (registration) => {
      if (!registration) return;

      const updateSW = async () => {
        try {

          const { data } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', 'latest_deployment_hash')
            .single();

          const currentLocalHash = import.meta.env.VITE_GIT_COMMIT;

          if (data && data.value !== currentLocalHash) {
            console.log('Neuer Hash erkannt, starte SW Update...');
            await registration.update();

            if (registration.waiting) {
              updateServiceWorker(true);
            }
          }
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

      updateSW();
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
