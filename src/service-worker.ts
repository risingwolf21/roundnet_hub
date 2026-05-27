import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, PrecacheController, PrecacheRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();

// On activation, claim all clients then force-reload every open window so that
// pages stuck with a white screen (stale SW served broken chunk hashes, JS
// never ran) are recovered automatically — no page-side JS required.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients
        .matchAll({ type: 'window' })
        .then((windowClients) =>
          Promise.all(
            (windowClients as WindowClient[]).map((c) => c.navigate(c.url).catch(() => null))
          )
        )
    )
  );
});

// Precaching — resilient: SW still activates even if the network fails during
// cache population (e.g. slow/spotty mobile connection on first open after deploy).
const precacheController = new PrecacheController();
precacheController.addToCacheList(self.__WB_MANIFEST);
registerRoute(new PrecacheRoute(precacheController));

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheController.install({ event }).catch((err) =>
      console.warn('[SW] Precache install failed, activating without full cache:', err)
    )
  );
});

cleanupOutdatedCaches();

// SPA navigation: NetworkFirst so the app loads even when the precache is
// incomplete (e.g. after a resilient-install that skipped some files).
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');

registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  new NetworkFirst({
    cacheName: 'navigations',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 5 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20 }),
    ],
  })
);

registerRoute(
  ({ url, request }) =>
    url.origin.includes('supabase.co') &&
    url.pathname.startsWith('/rest/v1/') &&
    request.method === 'GET',
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  ({ url, request }) =>
    url.origin.includes('supabase.co') &&
    url.pathname.startsWith('/storage/v1/object/public/') &&
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) => request.destination === 'image' && !url.origin.includes('supabase.co'),
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function safeParseJSON(data: PushMessageData | null) {
  try {
    return data ? data.json() : {};
  } catch {
    return {};
  }
}

function extractPayload(raw: any) {
  const p = raw || {};
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

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notificationclick', event.notification?.data);
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list: readonly WindowClient[]) => {
      for (const client of list) {
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
