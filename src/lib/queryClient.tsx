import { captureException } from '@sentry/react';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { EventRepository } from '@/repository/EventRepository';
import { EventsUserView } from '@/types/supabaseTypes';
import { t } from 'i18next';
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
      // Writes must never be silently paused or blindly replayed: a paused mutation is lost on reload
      // and retrying non-idempotent inserts can create duplicates. Fail fast and surface the error.
      retry: 0,
      networkMode: 'always',
    },
  },
  mutationCache: new MutationCache({
    onError: (err, variables, context, mutation) => {
      if (!mutation.meta?.suppressErrorToast) {
        toast.error(t('errors.mutation'));
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
      toast.error(t('errors.query'));
      captureException(err, (scope) => {
        scope.setContext('query', { queryHash: query.queryHash });
        return scope;
      });
    },
  }),
});

export const attendanceMutationKey = ['events', 'attendance', 'update'];
export type AttendanceVariables = { user: User; event: EventsUserView; newState: EventAttendance };

// An answer queued offline and restored after a reload has no hook anymore; these defaults send it.
queryClient.setMutationDefaults(attendanceMutationKey, {
  mutationFn: ({ event, newState, user }: AttendanceVariables) =>
    EventRepository.updateAttendance(user.id, event.id!, newState),
  // Only used by an answer restored after a reload; the hook brings its own onSettled.
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
});

const localStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
});

const [, restorePromise] = persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
  // Kept across deployments so the app still shows data offline right after an update. Bump this when the shape of a
  // persisted query changes in a way the screens can't render.
  buster: '1',
  dehydrateOptions: {
    // Only persist confirmed server data, never pending/optimistic state.
    shouldDehydrateQuery: (query) => query.state.status === 'success' && !query.state.isInvalidated,
    // Answers queued offline (the only mutations that can pause) survive a reload and are sent once back online.
    shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
  },
});

// Restored data is only a placeholder for a fast first paint; always revalidate it against the server.
restorePromise
  .then(() => queryClient.resumePausedMutations())
  .then(() => queryClient.invalidateQueries())
  .catch((error) => captureException(error));

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient;
  }
}

window.__TANSTACK_QUERY_CLIENT__ = queryClient;
