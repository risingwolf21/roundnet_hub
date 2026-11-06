import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNativeApp = () => Capacitor.isNativePlatform();

// Wires the web app into the native shell. Does nothing in the browser / PWA.
export const initNative = () => {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('native-app');

  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});

  // Links like https://<tenant>.web.app/events/123 open inside the app.
  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    try {
      const { pathname, search, hash } = new URL(url);
      window.location.assign(`${pathname}${search}${hash}`);
    } catch {
      // Ignore malformed links.
    }
  });

  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else CapacitorApp.exitApp();
  });

  // The splash screen stays until the first frame is painted.
  requestAnimationFrame(() => SplashScreen.hide().catch(() => {}));
};
