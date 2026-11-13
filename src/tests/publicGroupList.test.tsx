import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { supabaseMock } from './helpers/supabaseMock';

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
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/DialogsProvider', () => ({ useDialogs: () => ({ open: vi.fn() }) }));
vi.mock('@/features/groups/dialogs/CreateOrUpdateGroupDialog', () => ({ CreateOrUpdateGroupDialog: () => null }));
vi.mock('@/components/ui/appbar', () => ({
  AppBar: ({ title, actions }: { title?: string; actions?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      <div data-testid='appbar-actions'>{actions}</div>
    </header>
  ),
}));
vi.mock('@/components/PullToRefresh', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/tanstack/groups', () => ({
  useGroups: () => ({ data: [], error: null, isLoading: false, refetch: vi.fn() }),
  useJoinGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useRequestedUsersPerGroup: () => ({ data: [], refetch: vi.fn() }),
}));
vi.mock('@/tanstack/notifications', () => ({ useAllNotifications: () => ({ data: [] }) }));

import { GrantsProvider } from '@/features/auth/GrantsContext';
import PublicGroupList from '@/features/groups/PublicGroupList';
import type { UserWithGroups } from '@/types/supabaseTypes';

const user = { id: 'user-1', name: 'Test User', groups: [] } as unknown as UserWithGroups;

const renderWithPerms = async (perms: string[]) => {
  supabaseMock.authUserId = user.id;
  supabaseMock.respond = (q) =>
    q.table === 'user_grants_view'
      ? { data: perms.map((key) => ({ kind: 'perm', key })), error: null }
      : { data: [], error: null };

  render(
    <QueryClientProvider client={testQueryClient.current}>
      <GrantsProvider user={user}>
        <PublicGroupList />
      </GrantsProvider>
    </QueryClientProvider>
  );

  await screen.findByRole('heading', { name: 'Gruppen' });
};

const createButton = () => screen.getByTestId('appbar-actions').querySelector('button');

beforeEach(() => {
  supabaseMock.reset();
  testQueryClient.current = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
});

describe('PublicGroupList create-group button', () => {
  test('is hidden for users without group-admin permissions', async () => {
    await renderWithPerms([]);
    expect(createButton()).toBeNull();
  });

  test('is hidden for users with unrelated permissions only', async () => {
    await renderWithPerms(['drinks.edit', 'events.edit']);
    expect(createButton()).toBeNull();
  });

  test.each(['supabase.admin', 'groups.manage.admin'])('is shown for users with %s', async (perm) => {
    await renderWithPerms([perm]);
    expect(createButton()).toBeInTheDocument();
  });
});
