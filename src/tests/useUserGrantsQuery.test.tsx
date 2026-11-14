import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MockResponse, supabaseMock } from './helpers/supabaseMock';

const { testQueryClient } = vi.hoisted(() => ({
  testQueryClient: { current: null as unknown as QueryClient },
}));

vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
vi.mock('@/lib/queryClient', () => ({
  get queryClient() {
    return testQueryClient.current;
  },
}));
vi.mock('@sentry/react', () => ({ captureException: vi.fn(), setUser: vi.fn() }));

import { useUserGrantsQuery } from '@/features/auth/tanstack/useUserGrantsQuery';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient.current}>{children}</QueryClientProvider>
);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

beforeEach(() => {
  supabaseMock.reset();
  testQueryClient.current = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
});

describe('useUserGrantsQuery', () => {
  test('loading is only true for the initial load, not during background refetches', async () => {
    supabaseMock.authUserId = 'user-1';
    let pending = deferred<MockResponse>();
    supabaseMock.respond = () => pending.promise;

    const { result } = renderHook(() => useUserGrantsQuery('user-1'), { wrapper });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      pending.resolve({
        data: [
          { kind: 'perm', key: 'drinks.edit' },
          { kind: 'feat', key: 'feature.games' },
        ],
        error: null,
      });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.grants).toEqual({ perm: ['drinks.edit'], feat: ['feature.games'] });
    expect(result.current.hasPerm('drinks.edit' as never)).toBe(true);

    pending = deferred<MockResponse>();
    let refetch!: Promise<unknown>;
    act(() => {
      refetch = result.current.refetchUserGrants();
    });

    await waitFor(() =>
      expect(testQueryClient.current.isFetching({ queryKey: ['auth', 'current-user', 'user-1', 'grants'] })).toBe(1)
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.grants.perm).toEqual(['drinks.edit']);

    await act(async () => {
      pending.resolve({ data: [{ kind: 'perm', key: 'events.edit' }], error: null });
      await refetch;
    });

    await waitFor(() => expect(result.current.grants.perm).toEqual(['events.edit']));
    expect(result.current.loading).toBe(false);
    expect(supabaseMock.queries.filter((q) => q.table === 'user_grants_view')).toHaveLength(2);
  });

  test('is not loading when there is no user', () => {
    const { result } = renderHook(() => useUserGrantsQuery(null), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(result.current.grants).toEqual({ perm: [], feat: [] });
  });

  test('does not query grants without a session for that user (e.g. right after sign-out)', async () => {
    supabaseMock.respond = () => ({ data: [{ kind: 'perm', key: 'drinks.edit' }], error: null });

    const { result } = renderHook(() => useUserGrantsQuery('user-1'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.grants).toEqual({ perm: [], feat: [] });
    expect(supabaseMock.queries.filter((q) => q.table === 'user_grants_view')).toHaveLength(0);
  });

  test('subscribes to realtime grant changes and removes the channels on unmount', async () => {
    supabaseMock.authUserId = 'user-1';
    supabaseMock.respond = () => ({ data: [], error: null });

    const { unmount } = renderHook(() => useUserGrantsQuery('user-1'), { wrapper });

    await waitFor(() => expect(supabaseMock.channels).toHaveLength(4));
    expect(supabaseMock.channels.every((c) => c.subscribed)).toBe(true);

    unmount();
    expect(supabaseMock.removedChannels).toHaveLength(4);
  });
});
