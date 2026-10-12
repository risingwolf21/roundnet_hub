import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { testQueryClient, repo } = vi.hoisted(() => ({
  testQueryClient: { current: null as unknown as QueryClient },
  repo: {
    grantUserGrants: vi.fn(),
    revokeUserGrants: vi.fn(),
    grantGroupGrants: vi.fn(),
    revokeGroupGrants: vi.fn(),
  },
}));

vi.mock('@/lib/queryClient', () => ({
  get queryClient() {
    return testQueryClient.current;
  },
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/repository/GrantsRepository', () => ({ GrantsRepository: repo }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import {
  grantKeys,
  useGrantGroupPermissions,
  useGrantUserPermissions,
  useRevokeGroupPermissions,
  useRevokeUserPermissions,
} from '@/tanstack/grants';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient.current}>{children}</QueryClientProvider>
);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const previousPerms = ['events.edit', 'drinks.edit'];
const previousFeats = ['feature.games'];

type Case = {
  name: string;
  useHook: () => { mutateAsync: (args: never) => Promise<unknown> };
  repoFn: ReturnType<typeof vi.fn>;
  args: Record<string, unknown>;
  permKey: readonly unknown[];
  featKey: readonly unknown[];
  optimisticPerms: string[];
  optimisticFeats: string[];
};

const cases: Case[] = [
  {
    name: 'useGrantUserPermissions',
    useHook: useGrantUserPermissions as Case['useHook'],
    repoFn: repo.grantUserGrants,
    args: { user: 'user-1', perms: ['groups.manage.admin'], feats: ['feature.drinks'] },
    permKey: grantKeys.userPermissions('user-1'),
    featKey: grantKeys.userFeatures('user-1'),
    optimisticPerms: [...previousPerms, 'groups.manage.admin'],
    optimisticFeats: [...previousFeats, 'feature.drinks'],
  },
  {
    name: 'useRevokeUserPermissions',
    useHook: useRevokeUserPermissions as Case['useHook'],
    repoFn: repo.revokeUserGrants,
    args: { user: 'user-1', perms: ['events.edit'], feats: ['feature.games'] },
    permKey: grantKeys.userPermissions('user-1'),
    featKey: grantKeys.userFeatures('user-1'),
    optimisticPerms: ['drinks.edit'],
    optimisticFeats: [],
  },
  {
    name: 'useGrantGroupPermissions',
    useHook: useGrantGroupPermissions as Case['useHook'],
    repoFn: repo.grantGroupGrants,
    args: { group: 'group-1', perms: ['groups.manage.admin'], feats: ['feature.drinks'] },
    permKey: grantKeys.groupPermissions('group-1'),
    featKey: grantKeys.groupFeatures('group-1'),
    optimisticPerms: [...previousPerms, 'groups.manage.admin'],
    optimisticFeats: [...previousFeats, 'feature.drinks'],
  },
  {
    name: 'useRevokeGroupPermissions',
    useHook: useRevokeGroupPermissions as Case['useHook'],
    repoFn: repo.revokeGroupGrants,
    args: { group: 'group-1', perms: ['events.edit'], feats: ['feature.games'] },
    permKey: grantKeys.groupPermissions('group-1'),
    featKey: grantKeys.groupFeatures('group-1'),
    optimisticPerms: ['drinks.edit'],
    optimisticFeats: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  testQueryClient.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe.each(cases)('$name', (c) => {
  test('applies the optimistic update and restores each cache key to its own previous value on error', async () => {
    const qc = testQueryClient.current;
    qc.setQueryData(c.permKey, previousPerms);
    qc.setQueryData(c.featKey, previousFeats);

    const pending = deferred<unknown>();
    c.repoFn.mockReturnValue(pending.promise);

    const { result } = renderHook(() => c.useHook(), { wrapper });

    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.mutateAsync(c.args as never);
    });

    await vi.waitFor(() => {
      expect(qc.getQueryData(c.permKey)).toEqual(c.optimisticPerms);
      expect(qc.getQueryData(c.featKey)).toEqual(c.optimisticFeats);
    });

    pending.reject(new Error('rpc failed'));
    await act(async () => {
      await expect(mutation).rejects.toThrow('rpc failed');
    });

    expect(qc.getQueryData(c.permKey)).toEqual(previousPerms);
    expect(qc.getQueryData(c.featKey)).toEqual(previousFeats);
  });

  test('restores only the key that was cached before', async () => {
    const qc = testQueryClient.current;
    qc.setQueryData(c.permKey, previousPerms);

    c.repoFn.mockRejectedValue(new Error('rpc failed'));
    const { result } = renderHook(() => c.useHook(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(c.args as never)).rejects.toThrow('rpc failed');
    });

    expect(qc.getQueryData(c.permKey)).toEqual(previousPerms);
    expect(qc.getQueryData(c.featKey)).toBeUndefined();
  });
});
