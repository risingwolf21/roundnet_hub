import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { testQueryClient, repo } = vi.hoisted(() => ({
  testQueryClient: { current: null as unknown as QueryClient },
  repo: { markAllNotificationsRead: vi.fn() },
}));

vi.mock('@/lib/queryClient', () => ({
  get queryClient() {
    return testQueryClient.current;
  },
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/repository/NotificationsRepository', () => ({ NotificationsRepository: repo }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { notificationKeys, useMarkAllNotificationsRead } from '@/tanstack/notifications';
import { Notification } from 'types/supabase';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient.current}>{children}</QueryClientProvider>
);

const user = { id: 'anna', name: 'Anna' } as User;
const notification = (id: string, dismissed_at: string | null) => ({ id, title: id, dismissed_at }) as unknown as Notification;

describe('useMarkAllNotificationsRead', () => {
  beforeEach(() => {
    testQueryClient.current = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    repo.markAllNotificationsRead.mockReset();
  });

  test('marks every unread notification as read at once and keeps them in the list', async () => {
    let finish!: () => void;
    repo.markAllNotificationsRead.mockReturnValue(new Promise<null>((resolve) => (finish = () => resolve(null))));
    testQueryClient.current.setQueryData(notificationKeys.all, [
      notification('a', null),
      notification('b', '2026-11-01T10:00:00Z'),
      notification('c', null),
    ]);

    const { result } = renderHook(() => useMarkAllNotificationsRead(user), { wrapper });
    act(() => result.current.mutate());

    await vi.waitFor(() => expect(repo.markAllNotificationsRead).toHaveBeenCalledWith('anna'));
    const list = testQueryClient.current.getQueryData<Notification[]>(notificationKeys.all)!;
    expect(list).toHaveLength(3);
    expect(list.every((x) => x.dismissed_at)).toBe(true);
    expect(list[1].dismissed_at).toBe('2026-11-01T10:00:00Z');

    await act(async () => finish());
  });
});
