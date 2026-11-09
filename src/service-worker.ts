import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { addPlugins, cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// No skipWaiting() here: a new SW waits until the user taps "refresh" on the update page,
// which posts SKIP_WAITING (see the message handler below).

// On activation, claim all clients then force-reload every open window so that
// pages stuck with a white screen (stale SW served broken chunk hashes, JS
// never ran) are recovered automatically — no page-side JS required.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Supabase REST responses are no longer cached by the SW (TanStack Query owns API caching);
    // drop the legacy cache so stale or other users' responses can't be served anymore.
    caches
      .delete('supabase-api-cache')
      .catch(() => false)
      .then(() => self.clients.claim())
      .then(() =>
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

cleanupOutdatedCaches();

const manifest = self.__WB_MANIFEST;

// Tell the open pages how far the download of a new version is, so they can show a progress bar.
// Only files that are not cached yet are downloaded (unchanged ones keep their content hash).
let toDownload = 0;
let downloaded = 0;
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all(manifest.map((entry) => matchPrecache(typeof entry === 'string' ? entry : entry.url))).then(
      (cached) => {
        toDownload = cached.filter((response) => !response).length;
      }
    )
  );
});
addPlugins([
  {
    cacheDidUpdate: async () => {
      downloaded++;
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windowClients.forEach((c) =>
        c.postMessage({ type: 'PRECACHE_PROGRESS', done: Math.min(downloaded, toDownload), total: toDownload })
      );
    },
  },
]);

precacheAndRoute(manifest);

// SPA navigation: NetworkFirst so the app loads even when the precache is
// incomplete (falls back to the cached response when offline).
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
  // shortcut: the service worker cannot read the app's language, so this rarely used fallback (the push
  // payload normally carries a title) follows the browser language; upgrade by keeping the language in IndexedDB.
  const title = p.title || (self.navigator.language.startsWith('de') ? 'Benachrichtigung' : 'Notification');
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
