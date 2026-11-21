import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { testQueryClient, repo, captureException } = vi.hoisted(() => ({
  testQueryClient: { current: null as unknown as QueryClient },
  repo: { addUserToGroup: vi.fn() },
  captureException: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  get queryClient() {
    return testQueryClient.current;
  },
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/repository/GroupsRepository', () => ({ GroupsRepository: repo }));
vi.mock('@sentry/react', () => ({ captureException }));

import { useJoinGroup } from '@/tanstack/groups';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient.current}>{children}</QueryClientProvider>
);

const user = { id: 'user-1' } as User;

describe('useJoinGroup', () => {
  beforeEach(() => {
    testQueryClient.current = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    repo.addUserToGroup.mockReset();
    captureException.mockReset();
  });

  test('treats an existing membership (23505 duplicate key) as success', async () => {
    repo.addUserToGroup.mockRejectedValue({ code: '23505', message: 'duplicate key value violates unique constraint "group_user_mapping_pkey"' });
    const { result } = renderHook(() => useJoinGroup('group-1', user, 'joinRequested'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(captureException).not.toHaveBeenCalled();
  });

  test('still reports other errors', async () => {
    repo.addUserToGroup.mockRejectedValue({ code: '42501', message: 'permission denied' });
    const { result } = renderHook(() => useJoinGroup('group-1', user, 'user'), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toMatchObject({ code: '42501' });
    });

    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
