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
  rg_avatar_url: 'https://example.com/avatar.png',
  rg_index: 1234,
  rg_id: 'TES1',
  gender: 'm',
  hide_rating: false,
  effective_rating_cached: 1000,
} as unknown as Parameters<typeof PlayerzoneTab>[0]['player_data'];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlayerzoneTab', () => {
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'profile.playerzone.saveChanges' }));
  const typeRgId = (value: string) =>
    fireEvent.change(screen.getByLabelText('profile.playerzone.rgIdLabel'), { target: { value } });

  test('only sends rg_id and gender; rg_index / rg_avatar_url are left to the server', () => {
    render(<PlayerzoneTab user={user} player_data={playerData} />);

    typeRgId(' sar221 ');
    save();

    expect(updatePlayer.mutate).toHaveBeenCalledTimes(1);
    const [vars] = updatePlayer.mutate.mock.calls[0];
    expect(vars).toEqual({ updates: { rg_id: 'SAR221', gender: 'm' } });
    expect(vars.updates).not.toHaveProperty('rg_link');
    expect(vars.updates).not.toHaveProperty('rg_avatar_url');
    expect(vars.updates).not.toHaveProperty('rg_index');
  });

  test.each(['221', 'SA221', 'https://playerzone.roundnetgermany.de/players/221-sarah-kiel'])(
    'does not save %s, which is not an RG ID',
    (value) => {
      render(<PlayerzoneTab user={user} player_data={playerData} />);

      typeRgId(value);
      save();

      expect(updatePlayer.mutate).not.toHaveBeenCalled();
    }
  );

  test('an empty field unlinks the playerzone profile', () => {
    render(<PlayerzoneTab user={user} player_data={playerData} />);

    typeRgId('');
    save();

    const [vars] = updatePlayer.mutate.mock.calls[0];
    expect(vars.updates.rg_id).toBeNull();
  });
});
