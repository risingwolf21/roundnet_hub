// Asks the browser to re-fetch the service worker script from the web host (no Supabase request).
// A changed script starts the update. Called on app start, focus, every navigation and every
// few minutes; the short throttle only stops bursts (e.g. several navigations in a row).
let registration: ServiceWorkerRegistration | undefined;
let lastCheck = 0;

export const setUpdateRegistration = (r: ServiceWorkerRegistration) => {
  registration = r;
};

export const checkForAppUpdate = () => {
  if (!registration || Date.now() - lastCheck < 10_000) return;
  lastCheck = Date.now();
  registration.update().catch(() => { });
};
