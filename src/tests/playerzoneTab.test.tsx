import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { updatePlayer } = vi.hoisted(() => ({ updatePlayer: { mutate: vi.fn() } }));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/tanstack/player_data', () => ({
  useEloHistory: () => ({ data: [] }),
  usePlayer: () => ({ data: null }),
  useUpdateIndexHidden: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePlayer: () => updatePlayer,
}));
vi.mock('@/tanstack/user', () => ({
  useUpdateAvatarFromPlayerMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { PlayerzoneTab } from '@/features/profile/tabs/PlayerzoneTab';
import type { UserWithGroups } from '@/types/supabaseTypes';

const user = { id: 'user-1', name: 'Test User', groups: [] } as unknown as UserWithGroups;

const playerData = {
  player: 'user-1',
  rg_link: 'https://playerzone.roundnetgermany.de/players/1',
  rg_avatar_url: 'https://example.com/avatar.png',
  rg_index: 1234,
  rg_id: 'rg-1',
  gender: 'm',
  hide_rating: false,
  effective_rating_cached: 1000,
} as unknown as Parameters<typeof PlayerzoneTab>[0]['player_data'];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlayerzoneTab', () => {
  test('only sends rg_link and gender; rg_index / rg_avatar_url are left to the server', () => {
    render(<PlayerzoneTab user={user} player_data={playerData} />);

    const newLink = 'https://playerzone.roundnetgermany.de/players/2';
    fireEvent.change(screen.getByLabelText('profile.playerzone.urlLabel'), { target: { value: newLink } });
    fireEvent.click(screen.getByRole('button', { name: 'profile.playerzone.saveChanges' }));

    expect(updatePlayer.mutate).toHaveBeenCalledTimes(1);
    const [vars] = updatePlayer.mutate.mock.calls[0];
    expect(vars).toEqual({ updates: { rg_link: newLink, gender: 'm' } });
    expect(vars.updates).not.toHaveProperty('rg_avatar_url');
    expect(vars.updates).not.toHaveProperty('rg_index');
  });

  test('does not save an invalid playerzone url', () => {
    render(<PlayerzoneTab user={user} player_data={playerData} />);

    fireEvent.change(screen.getByLabelText('profile.playerzone.urlLabel'), {
      target: { value: 'https://evil.example.com/players/2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'profile.playerzone.saveChanges' }));

    expect(updatePlayer.mutate).not.toHaveBeenCalled();
  });
});
