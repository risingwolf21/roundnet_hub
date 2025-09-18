import * as React from 'react';

function isChunkError(err: unknown) {
  const msg = (err as any)?.message ?? '';
  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|imported module/i.test(
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
                try {
                  const keys = await caches?.keys?.();
                  await Promise.all((keys || []).map((k) => caches.delete(k)));
                } catch {}
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
