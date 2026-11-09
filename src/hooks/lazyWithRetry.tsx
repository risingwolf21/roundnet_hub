import * as React from 'react';

function isChunkError(err: unknown) {
  const msg = (err as any)?.message ?? '';
  // Safari iOS reports lazy-load failures as "Importing a module script failed." instead of
  // the Chromium-style "Failed to fetch dynamically imported module" — include both variants.
  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed|Importing .*chunk.*failed/i.test(
    msg
  );
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  opts: { retries?: number; delayMs?: number; onFinalFail?: (err: any) => void } = {}
) {
  const { retries = 2, delayMs = 400, onFinalFail } = opts;

  return React.lazy(
    () =>
      new Promise<{ default: T }>((resolve, reject) => {
        const attempt = async (n: number) => {
          loader()
            .then(resolve)
            .catch(async (err) => {
              if (isChunkError(err) && n > 0) {
                setTimeout(() => attempt(n - 1), delayMs);
              } else if (isChunkError(err)) {
                // All retries exhausted and it's a chunk error
                // Clear caches and reload the page to get fresh modules
                try {
                  const keys = await caches?.keys?.();
                  await Promise.all((keys || []).map((k) => caches.delete(k)));
                } catch (cacheErr) {
                  // Silently handle cache API errors (especially on iOS Safari)
                  // but still proceed with page reload
                  console.warn('Failed to clear caches:', cacheErr);
                }
                // Reload the page to get fresh modules after cache clearing
                window.location.reload();
              } else {
                onFinalFail?.(err);
                reject(err);
              }
            });
        };
        attempt(retries);
      })
  );
}
