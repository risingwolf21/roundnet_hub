import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope

const SW_VERSION = '2025-09-13T21-55';

self.skipWaiting();
clientsClaim();
self.addEventListener('install', () => self.skipWaiting());

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

const SPA_INDEX = new URL('index.html', self.registration.scope).href;
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');

registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(SPA_INDEX)
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);


self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING')
    self.skipWaiting()
})

self.addEventListener('install', () => self.skipWaiting());

function safeParseJSON(data: PushMessageData | null) {
  try {
    return data ? data.json() : {};
  } catch {
    return {};
  }
}

function extractPayload(raw: any) {
  const p = raw || {};
  // Akzeptiere sowohl top-level (url) als auch data.url
  const title = p.title || 'Benachrichtigung';
  const body = p.body || '';
  const data = p.data || {};
  const url = p.url ?? data.url ?? '/';
  const tag = p.tag;
  const renotify = !!p.renotify;

  return { title, body, url, tag, renotify };
}

self.addEventListener('push', (event) => {
  const raw = safeParseJSON(event.data);
  console.log('[SW] push event raw=', raw);
  const { title, body, url, tag, renotify } = extractPayload(raw);

  const PREFIX = import.meta.env.VITE_ICON_PREFIX || new URL('.', self.registration.scope).pathname;
  const icon = `${PREFIX.replace(/\/$/, '')}/android-chrome-192x192.png`;
  const badge = `${PREFIX.replace(/\/$/, '')}/badge.png`;

  const options = {
    body,
    data: { url },
    icon,
    badge,
    tag,
    renotify,
  };

  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) =>
      clients.forEach((c) => c.postMessage({ type: 'push_received', payload: { title, body, url }, sw: SW_VERSION }))
    )
    .catch(() => { });

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notificationclick', event.notification?.data);
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list: readonly WindowClient[]) => {
      for (const client of list) {
        client.postMessage({ type: 'notification_click', url, sw: SW_VERSION });
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return null;
    })
  );
});

function arrayBufferToBase64(buf: ArrayBuffer | null) {
  if (!buf)
    return null;
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const reg = await self.registration;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });

        const p_p256dh = arrayBufferToBase64(sub.getKey('p256dh'));
        const p_auth = arrayBufferToBase64(sub.getKey('auth'));

        if (!p_auth || !p_p256dh) {
          throw new Error("p_auth or p_p256h was not defined")
        }

        const params = {
          p_endpoint: sub.endpoint,
          p_p256dh: p_p256dh,
          p_auth: p_auth,
        };

        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: 'push_resubscribe_needed', params, sw: SW_VERSION }));
      } catch (e) {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: 'push_resubscribe_failed', error: String(e), sw: SW_VERSION }));
      }
    })()
  );
});
