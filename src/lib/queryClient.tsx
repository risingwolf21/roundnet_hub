import { captureException, withScope } from '@sentry/react';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';


export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min für „upcoming“
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: { retry: 1 },
  },
  mutationCache: new MutationCache({
    onError: (err, _variables, _context, mutation) => {
      withScope((scope) => {
        scope.setContext('mutation', {
          mutationId: mutation.mutationId,
          variables: mutation.state.variables,
        });
        if (mutation.options.mutationKey) {
          scope.setFingerprint(
            // Duplicate to prevent modification
            Array.from(mutation.options.mutationKey) as string[]
          );
        }
        captureException(err);
      });
    },
  }),
  queryCache: new QueryCache({
    onError: (err, query) => {
      withScope((scope) => {
        scope.setContext('query', { queryHash: query.queryHash });
        captureException(err);
      });
    },
  }),
});

// This code is only for TypeScript
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__:
    import("@tanstack/query-core").QueryClient;
  }
}

// This code is for all users
window.__TANSTACK_QUERY_CLIENT__ = queryClient;