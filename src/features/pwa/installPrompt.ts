import { useSyncExternalStore } from 'react';

// Chrome/Android fires this once, early on start-up, so the listener is registered when this module loads
// (imported by App.tsx) and keeps the event until the install card uses it.
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void> };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const setPrompt = (prompt: BeforeInstallPromptEvent | null) => {
  deferredPrompt = prompt;
  listeners.forEach((listener) => listener());
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  setPrompt(event as BeforeInstallPromptEvent);
});
window.addEventListener('appinstalled', () => setPrompt(null));

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** True while the browser offers to install the app (Chrome on Android and desktop). */
export const useCanInstall = () => useSyncExternalStore(subscribe, () => deferredPrompt !== null);

/** Shows the browser's install dialog. The event can be used only once. */
export const promptInstall = () => {
  const prompt = deferredPrompt;
  setPrompt(null);
  return prompt?.prompt();
};

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
