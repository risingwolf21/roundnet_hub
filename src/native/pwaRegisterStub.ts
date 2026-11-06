// Replaces `virtual:pwa-register/react` in the native build, where the app files ship inside the store app and there is no service worker.
export const useRegisterSW = (_options?: {
  immediate?: boolean;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
}) => ({
  needRefresh: [false, () => {}] as const,
  offlineReady: [false, () => {}] as const,
  updateServiceWorker: async () => {},
});
