import { captureException } from '@sentry/react';
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
    onError: (err, variables, context, mutation) => {
      captureException(err, (scope) => {
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
        scope.setExtra('variables', variables);
        scope.setExtra('context', context);
        return scope;
      });
    },
  }),
  queryCache: new QueryCache({
    onError: (err, query) => {
      captureException(err, (scope) => {
        scope.setContext('query', { queryHash: query.queryHash });
        return scope;
      });
    },
  }),
});

// This code is only for TypeScript
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient;
  }
}

// This code is for all users
window.__TANSTACK_QUERY_CLIENT__ = queryClient;
