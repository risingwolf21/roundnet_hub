import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';
import { UpdateDownloading, UpdateReadyPage, UpdateSuccess } from './features/pwa/AppUpdate';
import { supabase } from './lib/supabase';

const ServiceWorkerGate = ({ children }: PropsWithChildren) => {
  // undefined = no download running, null = running but progress not known yet, else 0..1
  const [downloadProgress, setDownloadProgress] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Not on the very first install (no controller yet): there is no "new version" then.
      if (event.data?.type !== 'PRECACHE_PROGRESS' || !event.data.total || !navigator.serviceWorker.controller) return;
      setDownloadProgress(event.data.done / event.data.total);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegistered: (registration) => {
      if (!registration) return;

      // A new version starts downloading. Not on the very first install (no controller yet).
      registration.addEventListener('updatefound', () => {
        if (navigator.serviceWorker.controller) setDownloadProgress(null);
      });
      // Cheap SW update check: browser byte-compares the SW script, no DB needed.
      // A new SW installs and then waits (no skipWaiting): needRefresh turns true and the
      // update page is shown until the user taps "refresh".
      const triggerSwUpdate = () => registration.update().catch(() => { });

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

      // Fast path: SW byte-check on every tab focus (no DB round-trip).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') triggerSwUpdate();
      });
      window.addEventListener('focus', triggerSwUpdate);

      // Slow path: confirm deployment via DB hash every 20s (a new version is found sooner).
      setInterval(checkDeploymentHash, 20_000);
      checkDeploymentHash();
    },
  });

  // After the user taps "refresh", the SW activates and the page reloads (see index.tsx).
  return (
    <>
      {children}
      {needRefresh ? (
        <UpdateReadyPage onRefresh={() => updateServiceWorker(true)} />
      ) : (
        downloadProgress !== undefined && <UpdateDownloading progress={downloadProgress} />
      )}
      <UpdateSuccess />
    </>
  );
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
