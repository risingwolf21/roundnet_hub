import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthGate } from './features/auth/AuthGate';
import { UpdatePage, UpdateSuccess } from './features/pwa/AppUpdate';
import { checkForAppUpdate, setUpdateRegistration } from './features/pwa/checkForUpdate';
import { UpdateDownload, UpdateDownloadContext } from './features/pwa/updateDownload';
import './features/pwa/installPrompt';

export const ServiceWorkerGate = ({ children }: PropsWithChildren) => {
  // Shown in the sidebar while it runs; the app stays usable until the new version is installed.
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownload>(undefined);
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

  // The one page-side reload: once a new version controls this page (in every open tab, not only the one that
  // activated it). The SW's activate handler also navigates open windows, for pages whose JS never ran.
  useEffect(() => {
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange, { once: true });
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
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

  // Sends SKIP_WAITING to the waiting SW; the controllerchange listener above reloads the page.
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

  // The button: SKIP_WAITING only reaches a waiting SW. When none is waiting anymore (the new
  // version is already active, but the page was not reloaded), the tap would do nothing, so reload.
  const updateNow = useCallback(async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.waiting) activate();
    else window.location.reload();
  }, [activate]);

  // Block the whole app once the new version is installed and activates.
  if (needRefresh) return <UpdatePage progress={1} onUpdate={updateNow} />;

  return (
    <UpdateDownloadContext value={downloadProgress}>
      {children}
      <UpdateSuccess />
    </UpdateDownloadContext>
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