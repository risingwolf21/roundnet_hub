import { captureException } from '@sentry/react';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import i18n from '@/translation/i18n';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      retry: 1,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
  mutationCache: new MutationCache({
    onError: (err, variables, context, mutation) => {
      if (!mutation.meta?.suppressErrorToast) {
        toast.error(i18n.t('errors.mutation'));
      }
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
      toast.error(i18n.t('errors.query'));
      captureException(err, (scope) => {
        scope.setContext('query', { queryHash: query.queryHash });
        return scope;
      });
    },
  }),
});

const localStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
});

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient;
  }
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient;
