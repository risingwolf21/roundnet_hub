import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';
import { UpdatePage, UpdateSuccess } from './features/pwa/AppUpdate';
import { supabase } from './lib/supabase';

const ServiceWorkerGate = ({ children }: PropsWithChildren) => {
  // undefined = no download running, null = running but progress not known yet, else 0..1
  const [downloadProgress, setDownloadProgress] = useState<number | null | undefined>(undefined);
  const activationStarted = useRef(false);

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
        const installing = registration.installing;
        if (!navigator.serviceWorker.controller || !installing) return;
        setDownloadProgress(null);
        // Install failed (e.g. a precache request failed): unblock the app instead of hanging forever.
        installing.addEventListener('statechange', () => {
          if (installing.state === 'redundant') setDownloadProgress(undefined);
        });
      });
      // Cheap SW update check: browser byte-compares the SW script, no DB needed.
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

  // Sends SKIP_WAITING to the waiting SW. The plugin reloads the page once the new SW controls it.
  const activate = useCallback(() => {
    try {
      sessionStorage.setItem('pwa-update-applied', '1');
    } catch {
      // Storage may be unavailable.
    }
    updateServiceWorker().catch((error) => {
      console.error('Failed to activate service worker:', error);
      try {
        sessionStorage.removeItem('pwa-update-applied');
      } catch {
        // Ignore storage errors.
      }
    });
  }, [updateServiceWorker]);

  // Activate automatically as soon as the new version is installed.
  useEffect(() => {
    if (!needRefresh || activationStarted.current) return;
    activationStarted.current = true;
    activate();
  }, [needRefresh, activate]);

  // Block the whole app while a new version downloads or activates.
  if (needRefresh || downloadProgress !== undefined) {
    return (
      <UpdatePage
        progress={needRefresh ? 1 : (downloadProgress ?? null)}
        onUpdate={needRefresh ? activate : undefined}
      />
    );
  }

  return (
    <>
      {children}
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