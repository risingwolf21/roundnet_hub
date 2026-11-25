import { dehydrate, hydrate, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventsUserView } from '@/types/supabaseTypes';

const { repo, toastInfo } = vi.hoisted(() => ({
  repo: { updateAttendance: vi.fn() },
  toastInfo: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/repository/EventRepository', () => ({ EventRepository: repo }));
vi.mock('@/repository/GamesRepository', () => ({ GamesRepository: {} }));
vi.mock('@/features/events/dialogs/TransformEventDialog', () => ({}));
vi.mock('sonner', () => ({ toast: { info: toastInfo, error: vi.fn(), success: vi.fn() } }));

import { attendanceMutationKey, queryClient } from '@/lib/queryClient';
import { eventKeys, useUpdateAttendanceMutation } from '@/tanstack/events';

const user = { id: 'user-1', name: 'Lena', displayName: 'Lena' } as User;
const event = {
  id: 'event-1',
  startingDateTime: '2026-11-26T18:00:00+01:00',
  group: { id: 'group-1', name: 'Basic' },
  user_state: null,
  isCancelled: false,
} as unknown as EventsUserView;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  repo.updateAttendance.mockReset().mockResolvedValue(undefined);
  toastInfo.mockReset();
  queryClient.clear();
  queryClient.setQueryData(eventKeys.event(event.id), event);
});

afterEach(() => onlineManager.setOnline(true));

describe('answering offline', () => {
  it('shows the answer right away, waits without signal and sends it once back online', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useUpdateAttendanceMutation(), { wrapper });

    act(() => result.current.mutate({ user, event, newState: 'Attending' }));

    await waitFor(() => expect(result.current.isPaused).toBe(true));
    expect(queryClient.getQueryData<EventsUserView>(eventKeys.event(event.id))?.user_state).toBe('Attending');
    expect(toastInfo).toHaveBeenCalledWith('Du bist offline. Deine Antwort wird gesendet, sobald du wieder online bist.');
    expect(repo.updateAttendance).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(repo.updateAttendance).toHaveBeenCalledWith('user-1', 'event-1', 'Attending'));
  });

  it('still sends a queued answer after the app was closed and reopened', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useUpdateAttendanceMutation(), { wrapper });
    act(() => result.current.mutate({ user, event, newState: 'Declined' }));
    await waitFor(() => expect(result.current.isPaused).toBe(true));

    // What the persister stores, restored into a fresh client that only has the defaults (no hook mounted).
    const saved = JSON.parse(JSON.stringify(dehydrate(queryClient)));
    expect(saved.mutations).toHaveLength(1);
    const reopened = new QueryClient();
    reopened.setMutationDefaults(attendanceMutationKey, queryClient.getMutationDefaults(attendanceMutationKey));
    hydrate(reopened, saved);

    onlineManager.setOnline(true);
    await reopened.resumePausedMutations();

    expect(repo.updateAttendance).toHaveBeenCalledWith('user-1', 'event-1', 'Declined');
  });
});
