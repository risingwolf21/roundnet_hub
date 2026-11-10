import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventsUserView } from '@/types/supabaseTypes';

const { testQueryClient, repo } = vi.hoisted(() => ({
  testQueryClient: { current: null as unknown as QueryClient },
  repo: { updateAttendance: vi.fn() },
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

import { trialUsageDelta } from '@/features/trials/trialUsage';
import { useUpdateAttendanceMutation } from '@/tanstack/events';
import { trialKeys } from '@/tanstack/trialKeys';

const user = { id: 'guest-1', name: 'Lena', displayName: 'Lena' } as User;
const trialEvent = (overrides: Partial<EventsUserView> = {}) =>
  ({
    id: 'event-1',
    startingDateTime: '2026-11-12T18:00:00+01:00',
    endDateTime: '2026-11-12T20:00:00+01:00',
    group: { id: 'group-1', name: 'Basic' },
    user_group_role: 'trial',
    user_state: null,
    isCancelled: false,
    ...overrides,
  }) as EventsUserView;

const status = { event_limit: 3, events_used: 1, is_guest: true, trial_started_at: null };
const used = () => testQueryClient.current.getQueryData<typeof status>(trialKeys.status('group-1'))?.events_used;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient.current}>{children}</QueryClientProvider>
);

beforeEach(() => {
  testQueryClient.current = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  testQueryClient.current.setQueryData(trialKeys.status('group-1'), status);
  repo.updateAttendance.mockReset();
});

describe('trialUsageDelta', () => {
  it('counts a new sign-up, gives a training back on leaving and ignores moves and members', () => {
    expect(trialUsageDelta(trialEvent(), 'Attending')).toBe(1);
    expect(trialUsageDelta(trialEvent(), 'Waiting')).toBe(1);
    expect(trialUsageDelta(trialEvent({ user_state: 'AttendingAsTrial' }), 'Declined')).toBe(-1);
    expect(trialUsageDelta(trialEvent({ user_state: 'WaitingAsTrial' }), 'Attending')).toBe(0);
    expect(trialUsageDelta(trialEvent({ user_state: 'Declined' }), 'Declined')).toBe(0);
    expect(trialUsageDelta(trialEvent({ isCancelled: true }), 'Attending')).toBe(0);
    expect(trialUsageDelta(trialEvent({ user_group_role: 'user' }), 'Attending')).toBe(0);
  });
});

describe('attending as a trial member', () => {
  it('updates "Noch x von y" immediately, before the server answers', async () => {
    let resolve!: () => void;
    repo.updateAttendance.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { result } = renderHook(() => useUpdateAttendanceMutation(), { wrapper });

    act(() => result.current.mutate({ user, event: trialEvent(), newState: 'Attending' }));

    await waitFor(() => expect(used()).toBe(2));
    await act(async () => resolve());
  });

  it('gives the training back when the sign-up is refused', async () => {
    repo.updateAttendance.mockRejectedValue({ hint: 'trial_event_limit_reached' });
    const { result } = renderHook(() => useUpdateAttendanceMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ user, event: trialEvent(), newState: 'Attending' }).catch(() => {});
    });

    expect(used()).toBe(1);
  });
});
