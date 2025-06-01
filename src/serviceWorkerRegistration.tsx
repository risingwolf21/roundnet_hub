// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.

// To learn more about the benefits of this model and instructions on how to
// opt-in, read https://cra.link/PWA

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  // [::1] is the IPv6 localhost address.
  window.location.hostname === '[::1]' ||
  // 127.0.0.0/8 are considered localhost for IPv4.
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register() {
  if ('serviceWorker' in navigator && process.env.PUBLIC_URL) {

    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      if (isLocalhost) {
        checkValidServiceWorker(swUrl);

        navigator.serviceWorker.ready.then(() => {
          console.log(
            'App is served by a service worker (localhost, cache-first).'
          );
        });
      } else {
        registerValidSW(swUrl);
      }
    });

    // 🟡 Optional: zusätzlicher Firebase-Messaging SW, wenn nötig
    const firebaseSwUrl = `${process.env.PUBLIC_URL}/firebase-messaging-sw.js`;
    navigator.serviceWorker
      .register(firebaseSwUrl)
      .then((reg) =>
        console.log(
          'Firebase Service Worker registered with scope:',
          reg.scope
        )
      )
      .catch((err) =>
        console.warn('Firebase Service Worker registration failed:', err)
      );
  }
}

function registerValidSW(swUrl: string) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {

      setInterval(() => {
        registration.update();
      }, 1 * 60 * 1000);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller) {
            console.log('New content is available, activating immediately...');
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        };
      };

      if (registration.waiting) {
        console.log('Activating waiting service worker immediately...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log('Service worker controller changed. Reloading...');
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

function checkValidServiceWorker(swUrl: string) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (response.status === 404 || (contentType != null && contentType.indexOf('javascript') === -1)) {
        console.log('No service worker found. Probably a different app. Reload the page.');
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}