import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: { feats: ['events'] as string[], rgId: null as string | null, pushActive: true },
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));
vi.mock('@/components/ui/appbar', () => ({ AppBar: ({ title }: { title?: string }) => <header>{title}</header> }));
vi.mock('@/features/auth/GrantsContext', () => ({
  useGrants: () => ({
    user: { id: 'u1', displayName: 'Kojote', name: 'Erika Musterfrau', groups: [] },
    signOut: vi.fn(),
    hasFeat: (f: string) => state.feats.includes(f),
  }),
}));
vi.mock('@/tanstack/player_data', () => ({ usePlayer: () => ({ data: state.rgId ? { rg_id: state.rgId } : null }) }));
vi.mock('@/tanstack/events', () => ({ useUserAttendanceInMonth: () => ({ data: [] }) }));
vi.mock('@/features/profile/tabs/NotificationsTab', () => ({
  NotificationsTab: () => <div>notifications section</div>,
  isPushActiveOnThisDevice: () => Promise.resolve(state.pushActive),
}));
vi.mock('@/features/profile/tabs/AccountTab', () => ({ AccountTab: () => <div>account section</div> }));
vi.mock('@/features/profile/tabs/CalendarTab', () => ({ CalendarTab: () => <div>calendar section</div> }));
vi.mock('@/features/profile/tabs/ChangePasswordTab', () => ({ ChangePasswordTab: () => <div>password section</div> }));
vi.mock('@/features/profile/tabs/PlayerzoneTab', () => ({ PlayerzoneTab: () => <div>playerzone section</div> }));
vi.mock('@/features/profile/tabs/TestLabTab', () => ({ TestLabTab: () => <div>testlab section</div> }));

import User from '@/features/profile/User';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/user" element={<User />} />
        <Route path="/user/:section" element={<User />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  state.feats = ['events'];
  state.rgId = null;
  state.pushActive = true;
});

describe('Profile overview', () => {
  test('lists every section as a link to its own page, with its state', async () => {
    state.rgId = 'KAR123';
    renderAt('/user');

    expect(screen.getByRole('link', { name: /navigation.notifications/ })).toHaveAttribute('href', '/user/notifications');
    expect(screen.getByRole('link', { name: /profile.calendar.title/ })).toHaveAttribute('href', '/user/calendar');
    expect(screen.getByRole('link', { name: /profile.tabs.account/ })).toHaveAttribute('href', '/user/account');
    expect(screen.getByRole('link', { name: /profile.password.title/ })).toHaveAttribute('href', '/user/password');
    expect(screen.getByText('profile.sections.rgId {"rgId":"KAR123"}')).toBeInTheDocument();
    expect(await screen.findByText('profile.sections.pushOn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'profile.account.logout' })).toBeInTheDocument();
  });

  test('without the events feature there is no calendar row, and its link goes back to the overview', () => {
    state.feats = [];
    renderAt('/user');
    expect(screen.queryByRole('link', { name: /profile.calendar.title/ })).toBeNull();

    renderAt('/user/calendar');
    expect(screen.queryByText('calendar section')).toBeNull();
  });

  test('a section link opens only that section, titled in the app bar', () => {
    renderAt('/user/notifications');
    expect(screen.getByText('notifications section')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('navigation.notifications');
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('an unknown section shows the overview', () => {
    renderAt('/user/nope');
    expect(screen.getByRole('link', { name: /profile.tabs.account/ })).toBeInTheDocument();
  });
});
