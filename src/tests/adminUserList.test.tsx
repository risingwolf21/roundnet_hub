import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { pushDevices } = vi.hoisted(() => ({ pushDevices: { current: undefined as unknown } }));

vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/DialogsProvider', () => ({ useDialogs: () => ({ open: vi.fn() }) }));
vi.mock('@/features/auth/GrantsContext', () => ({ useGrants: () => ({ user: null }) }));
vi.mock('@/components/ui/appbar', () => ({ AppBar: () => <header /> }));
vi.mock('@/components/PullToRefresh', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/tanstack/admin', () => ({
  useAllUsersAsAdmin: () => ({
    data: [
      { id: 'u1', name: 'Anna', email: 'anna@x', groups: [{ id: 'g1', name: 'Training' }] },
      { id: 'u2', name: 'Ben', email: 'ben@x', groups: [] },
    ],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAdminPushDevices: () => ({ data: pushDevices.current, refetch: vi.fn() }),
  useUpdateUserMutation: () => ({ mutate: vi.fn() }),
}));

import AdminUserList from '@/features/admin/AdminUserList';

const row = (name: string) => screen.getByText(name).closest('[data-slot="item"]') as HTMLElement;

beforeEach(() => {
  pushDevices.current = [
    { user: 'u1', platform: 'ios', last_seen: '2026-11-25T10:00:00Z' },
    { user: 'u1', platform: 'desktop', last_seen: '2026-11-20T10:00:00Z' },
  ];
});

describe('AdminUserList', () => {
  test('shows push status and missing groups on each row', () => {
    render(<AdminUserList />);
    expect(within(row('Anna')).getByText('Push · 2 Geräte')).toBeInTheDocument();
    expect(within(row('Ben')).getByText('Kein Push')).toBeInTheDocument();
    expect(within(row('Ben')).getByText('Keine Gruppe')).toBeInTheDocument();
    expect(within(row('Anna')).queryByText('Keine Gruppe')).toBeNull();
  });

  test('filters users without a group and without push', () => {
    render(<AdminUserList />);
    fireEvent.click(screen.getByRole('radio', { name: /Ohne Gruppe/ }));
    expect(screen.queryByText('Anna')).toBeNull();
    expect(screen.getByText('Ben')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Ohne Push/ }));
    expect(screen.queryByText('Anna')).toBeNull();
    expect(screen.getByText('Ben')).toBeInTheDocument();
  });

  test('hides push status while push data is unavailable', () => {
    pushDevices.current = undefined;
    render(<AdminUserList />);
    expect(screen.queryByText('Kein Push')).toBeNull();
    expect(screen.queryByRole('radio', { name: /Ohne Push/ })).toBeNull();
  });
});
