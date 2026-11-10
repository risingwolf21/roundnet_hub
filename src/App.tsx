import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';
import { UpdatePage, UpdateSuccess } from './features/pwa/AppUpdate';
import { checkForAppUpdate, setUpdateRegistration } from './features/pwa/checkForUpdate';

export const ServiceWorkerGate = ({ children }: PropsWithChildren) => {
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
      setUpdateRegistration(registration);
      checkForAppUpdate(); // app start

      // Returning to the app (tab focus, app back in the foreground).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForAppUpdate();
      });
      window.addEventListener('focus', checkForAppUpdate);

      // For an app left open on screen. Navigations check too (AppRoutes).
      setInterval(() => {
        if (document.visibilityState === 'visible') checkForAppUpdate();
      }, 5 * 60_000);
    },
  });

  // Sends SKIP_WAITING to the waiting SW and reloads once the new SW controls the page. The plugin
  // reloads too, but only when the page was controlled at load (an uncontrolled page stays stuck here).
  const activate = useCallback(() => {
    try {
      sessionStorage.setItem('pwa-update-applied', '1');
    } catch {
      // Storage may be unavailable.
    }
    navigator.serviceWorker?.addEventListener('controllerchange', () => window.location.reload(), { once: true });
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

  // The button: SKIP_WAITING only reaches a waiting SW. When none is waiting anymore (the new
  // version is already active, but the page was not reloaded), the tap would do nothing, so reload.
  const updateNow = useCallback(async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.waiting) activate();
    else window.location.reload();
  }, [activate]);

  // Block the whole app while a new version downloads or activates.
  if (needRefresh || downloadProgress !== undefined) {
    return (
      <UpdatePage
        progress={needRefresh ? 1 : (downloadProgress ?? null)}
        onUpdate={needRefresh ? updateNow : undefined}
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