import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';
import { supabase } from './lib/supabase';
import { toast } from 'sonner';

const ServiceWorkerGate = ({ children }: PropsWithChildren) => {
  useRegisterSW({
    immediate: true,
    onRegistered: (registration) => {
      if (!registration) return;

      // Cheap SW update check: browser byte-compares the SW script, no DB needed.
      // With self.skipWaiting() in the SW, a new SW activates immediately after
      // installing, firing controllerchange → index.tsx reloads the page.
      const triggerSwUpdate = () => registration.update().catch(() => {});

      // Full check: confirm a new deployment exists before triggering an update.
      const checkDeploymentHash = async () => {
        try {
          const { data } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', 'latest_deployment_hash')
            .single();

          if (data?.value && data.value !== import.meta.env.VITE_GIT_COMMIT) {
            triggerSwUpdate();
          }
        } catch {
          // Offline or DB unavailable — ignore
        }
      };

      // Alert the user before the imminent reload caused by SW activation.
      registration.addEventListener('updatefound', () => {
        toast.info('Neue Version verfügbar', {
          description: 'Die App wird jetzt auf die neueste Version aktualisiert.',
          duration: 3000,
        });
      });

      // Fast path: SW byte-check on every tab focus (no DB round-trip).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') triggerSwUpdate();
      });
      window.addEventListener('focus', triggerSwUpdate);

      // Slow path: confirm deployment via DB hash every 60s.
      setInterval(checkDeploymentHash, 60_000);
      checkDeploymentHash();
    },
  });

  // controllerchange → window.location.reload() is handled in index.tsx.
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
