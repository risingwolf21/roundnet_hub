import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { navigate, members } = vi.hoisted(() => ({ navigate: vi.fn(), members: { current: [] as unknown[] } }));

vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
vi.mock('@/features/groups/query/addUsersMutation', () => ({ useAddUsersMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('@/features/groups/query/removeUsersMutation', () => ({ useRemoveUsersMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('@/features/groups/query/declineRequestMutation', () => ({ useDeclineRequestMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('react-router', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ groupId: 'g1' }),
  useSearchParams: () => [new URLSearchParams()],
}));
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
    data: { id: 'g1', name: 'Montagstraining', color: '#d9480f', user_group_role: 'user', visible: true, is_public: true },
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

const setMembers = (count: number) => {
  members.current = Array.from({ length: count }, (_, i) => ({
    role: i === 0 ? 'admin' : 'user',
    user: { id: i === 1 ? 'me' : `u${i}`, name: `Person ${String(i).padStart(2, '0')}`, email: '' },
  }));
};

const memberRows = () => screen.queryAllByText(/^Person \d+$/);

beforeEach(() => navigate.mockReset());

describe('PublicGroupInformation overview', () => {
  test('a large group shows a preview, a link to all members and the danger zone', async () => {
    setMembers(20);
    render(<PublicGroupInformation />);

    expect(memberRows()).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Gruppe verlassen' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Alle 20 Mitglieder anzeigen/ }));
    expect(navigate).toHaveBeenCalledWith('/groups/g1/members');
  });

  test('a small group shows every member and no link for normal members', () => {
    setMembers(4);
    render(<PublicGroupInformation />);

    expect(memberRows()).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Mitglieder (anzeigen|verwalten)/ })).toBeNull();
  });
});

describe('PublicGroupInformation members screen', () => {
  test('lists every member and leaves out the danger zone', () => {
    setMembers(20);
    render(<PublicGroupInformation screen="members" />);

    expect(memberRows()).toHaveLength(20);
    expect(screen.getByText('Mitglieder · Montagstraining')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gruppe verlassen' })).toBeNull();
  });
});
