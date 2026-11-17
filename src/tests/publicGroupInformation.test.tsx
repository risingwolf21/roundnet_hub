import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { members, myRole } = vi.hoisted(() => ({ members: { current: [] as unknown[] }, myRole: { current: 'user' } }));

vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
vi.mock('@/features/groups/query/addUsersMutation', () => ({ useAddUsersMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('@/features/groups/query/removeUsersMutation', () => ({ useRemoveUsersMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('@/features/groups/query/declineRequestMutation', () => ({ useDeclineRequestMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/DialogsProvider', () => ({ useDialogs: () => ({ open: vi.fn(), confirm: vi.fn() }) }));
vi.mock('@/features/groups/dialogs/CreateOrUpdateGroupDialog', () => ({ CreateOrUpdateGroupDialog: () => null }));
vi.mock('@/features/trials/GuestInvitesCard', () => ({ GuestInvitesCard: () => null }));
vi.mock('@/features/trials/TrialMemberParts', () => ({ TrialLimitDialog: () => null, TrialMemberBadges: () => null }));
vi.mock('@/hooks/useGrants', () => ({ Has: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/features/auth/GrantsContext', () => ({
  useGrants: () => ({ user: { id: 'me', name: 'Ich' }, hasPerm: () => false, refetchUserGrants: vi.fn() }),
}));
vi.mock('@/components/ui/appbar', () => ({ AppBar: ({ title }: { title?: string }) => <header>{title}</header> }));
vi.mock('@/components/PullToRefresh', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/tanstack/groups', () => ({
  useGroup: () => ({
    data: { id: 'g1', name: 'Montagstraining', color: '#d9480f', user_group_role: myRole.current, visible: true, is_public: true },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGroupAllUsers: () => ({ data: members.current, isLoading: false, error: null, refetch: vi.fn() }),
  useGroups: () => ({ data: [] }),
  useJoinGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useLeaveGroupMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeUserRoleMutation: () => ({ mutate: vi.fn() }),
}));

import PublicGroupInformation from '@/features/groups/PublicGroupInformation';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Same two routes as in AppRoutes.
const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      { path: '/groups/:groupId', element: <PublicGroupInformation /> },
      { path: '/groups/:groupId/members', element: <PublicGroupInformation key="members" screen="members" /> },
    ],
    { initialEntries: [path] }
  );
  render(<RouterProvider router={router} />);
  return router;
};

const setMembers = (count: number) => {
  members.current = Array.from({ length: count }, (_, i) => ({
    role: i === 0 ? 'admin' : 'user',
    user: { id: i === 1 ? 'me' : `u${i}`, name: `Person ${String(i).padStart(2, '0')}`, email: '' },
  }));
};

const memberRows = () => screen.queryAllByText(/^Person \d+$/);

beforeEach(() => {
  myRole.current = 'user';
});

describe('PublicGroupInformation overview', () => {
  test('a large group shows a preview, a link to all members and the danger zone', async () => {
    setMembers(20);
    const router = renderAt('/groups/g1');

    expect(memberRows()).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Gruppe verlassen' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Alle 20 Mitglieder anzeigen/ }));
    expect(router.state.location.pathname).toBe('/groups/g1/members');
    expect(memberRows()).toHaveLength(20);
  });

  test('a small group shows every member and no link for normal members', () => {
    setMembers(4);
    renderAt('/groups/g1');

    expect(memberRows()).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Mitglieder (anzeigen|verwalten)/ })).toBeNull();
  });
});

describe('PublicGroupInformation members screen', () => {
  test('lists every member and leaves out the danger zone', () => {
    setMembers(20);
    renderAt('/groups/g1/members');

    expect(memberRows()).toHaveLength(20);
    expect(screen.getByText('Mitglieder · Montagstraining')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gruppe verlassen' })).toBeNull();
  });

  test('"Prüfen" on the overview opens the members screen on the join requests', async () => {
    myRole.current = 'admin';
    setMembers(3);
    members.current.push({ role: 'joinRequested', user: { id: 'asker', name: 'Anfragende Person', email: '' } });
    renderAt('/groups/g1');

    await userEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByText('Anfragende Person')).toBeInTheDocument();
    expect(memberRows()).toHaveLength(0);
  });
});
