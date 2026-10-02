import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { EventsUserView } from '@/types/supabaseTypes';

const { testQueryClient, repo } = vi.hoisted(() => ({
  testQueryClient: { current: null as unknown as QueryClient },
  repo: {
    insertEventWithBringItems: vi.fn(),
    updateSingleEvent: vi.fn(),
    syncEventBringItems: vi.fn(),
    updateEventAndAllRecurrences: vi.fn(),
  },
}));

vi.mock('@/lib/queryClient', () => ({
  get queryClient() {
    return testQueryClient.current;
  },
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/repository/EventRepository', () => ({ EventRepository: repo }));
vi.mock('@/repository/GamesRepository', () => ({ GamesRepository: {} }));
vi.mock('@/features/events/dialogs/TransformEventDialog', () => ({}));

import {
  eventKeys,
  useInsertEventMutation,
  useUpdateRecurrenceMutation,
  useUpdateSingleMutation,
} from '@/tanstack/events';

const user = { id: 'user-1', name: 'Test', displayName: 'Test' } as User;

const makeEvent = (overrides: Partial<EventsUserView>): EventsUserView =>
  ({
    id: 'event-1',
    key: 'series-1',
    title: 'Training',
    description: 'desc',
    startingDateTime: '2026-10-05T18:00:00+02:00',
    endDateTime: '2026-10-05T20:00:00+02:00',
    group: { id: 'group-1', name: 'Group' },
    ...overrides,
  }) as EventsUserView;

const upcoming = [
  makeEvent({ id: 'event-1' }),
  makeEvent({ id: 'event-2', startingDateTime: '2026-10-12T18:00:00+02:00' }),
];
const past = [makeEvent({ id: 'event-0', startingDateTime: '2026-09-28T18:00:00+02:00' })];

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

beforeEach(() => {
  vi.clearAllMocks();
  testQueryClient.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  testQueryClient.current.setQueryData(eventKeys.list('upcoming'), upcoming);
  testQueryClient.current.setQueryData(eventKeys.list('past'), past);
  testQueryClient.current.setQueryData(eventKeys.event('event-1'), upcoming[0]);
});

describe('useInsertEventMutation', () => {
  test('does not add a placeholder and invalidates every event list after success', async () => {
    const pending = deferred<unknown>();
    repo.insertEventWithBringItems.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useInsertEventMutation(), { wrapper });

    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.mutateAsync({
        event: { title: 'New training', startingDateTime: '2026-10-20T18:00:00+02:00' },
        items: [],
        currentUser: user,
      });
    });

    expect(testQueryClient.current.getQueryData(eventKeys.list('upcoming'))).toEqual(upcoming);

    pending.resolve([{ event_id: 'event-new', inserted_item_ids: [] }]);
    await act(() => mutation);

    const qc = testQueryClient.current;
    expect(qc.getQueryState(eventKeys.list('upcoming'))?.isInvalidated).toBe(true);
    expect(qc.getQueryState(eventKeys.list('past'))?.isInvalidated).toBe(true);
  });
});

describe('useUpdateSingleMutation', () => {
  test('applies the change optimistically to both caches and rolls back on error', async () => {
    const pending = deferred<unknown>();
    repo.updateSingleEvent.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useUpdateSingleMutation(), { wrapper });

    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.mutateAsync({
        id: 'event-1',
        eventChanges: { title: 'Renamed training', group: 'group-2' },
        currentUser: user,
      });
    });

    await vi.waitFor(() => {
      const list = testQueryClient.current.getQueryData<EventsUserView[]>(eventKeys.list('upcoming'));
      expect(list?.[0].title).toBe('Renamed training');
    });
    const detail = testQueryClient.current.getQueryData<EventsUserView>(eventKeys.event('event-1'));
    expect(detail?.title).toBe('Renamed training');
    // `group` is a joined object in the view and must not be replaced by the raw uuid.
    expect(detail?.group).toEqual({ id: 'group-1', name: 'Group' });

    pending.reject(new Error('Event konnte nicht gespeichert werden'));
    await act(async () => {
      await expect(mutation).rejects.toThrow('Event konnte nicht gespeichert werden');
    });

    expect(testQueryClient.current.getQueryData(eventKeys.list('upcoming'))).toEqual(upcoming);
    expect(testQueryClient.current.getQueryData(eventKeys.event('event-1'))).toEqual(upcoming[0]);
    expect(testQueryClient.current.getQueryState(eventKeys.list('upcoming'))?.isInvalidated).toBe(true);
  });
});

describe('useUpdateRecurrenceMutation', () => {
  test('anchors the series on the original start time and syncs items for every updated event', async () => {
    repo.updateEventAndAllRecurrences.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
    repo.syncEventBringItems.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUpdateRecurrenceMutation(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        key: 'series-1',
        originalStartingDateTime: '2026-10-05T18:00:00+02:00',
        eventChanges: { startingDateTime: '2026-10-05T19:00:00+02:00' },
        currentUser: user,
        items: [{ id: 'item-1', name: 'Ball', required_qty: 1, unit: 'Stk.', notes: null, sort_order: 0 }],
      })
    );

    expect(repo.updateEventAndAllRecurrences).toHaveBeenCalledWith(
      { startingDateTime: '2026-10-05T19:00:00+02:00' },
      'series-1',
      '2026-10-05T18:00:00+02:00'
    );
    expect(repo.syncEventBringItems).toHaveBeenCalledTimes(2);
    expect(repo.syncEventBringItems).toHaveBeenCalledWith('event-2', [
      { name: 'Ball', required_qty: 1, unit: 'Stk.', notes: null, sort_order: 0 },
    ]);
  });
});
