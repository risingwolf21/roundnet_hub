import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { op, supabaseMock } from './helpers/supabaseMock';

vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/repository/GamesRepository', () => ({ GamesRepository: { reportScores: vi.fn() } }));
vi.mock('@/contexts/DialogsProvider', () => ({ useDialogs: () => ({ selectMultipleUser: vi.fn() }) }));

import {
  ConstellationCreationDialog,
  playersOfUsersFilter,
  userIdOfPlayer,
} from '@/features/events/dialogs/ConstellationsCreationDialog';
import type { EventsUserView, GamesTable } from '@/types/supabaseTypes';

const makePlayer = (overrides: Partial<GamesTable<'players'>>): GamesTable<'players'> =>
  ({
    player: 'player-id',
    linked_user_id: null,
    gender: 'm',
    ka_index: 0,
    rg_index: 100,
    pro_status: false,
    created_at: '',
    rg_avatar_url: null,
    rg_id: null,
    rg_link: null,
    effective_rating_cached: 1000,
    hide_rating: false,
    display_name: null,
    matches_played: 0,
    ...overrides,
  }) as GamesTable<'players'>;

beforeEach(() => {
  supabaseMock.reset();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('userIdOfPlayer', () => {
  test('returns linked_user_id for new-style players', () => {
    expect(userIdOfPlayer(makePlayer({ player: 'p-2', linked_user_id: 'u-2' }))).toBe('u-2');
  });

  test('falls back to player for legacy players (player = user id)', () => {
    expect(userIdOfPlayer(makePlayer({ player: 'u-1', linked_user_id: null }))).toBe('u-1');
  });
});

describe('playersOfUsersFilter', () => {
  test('matches players by linked_user_id or (legacy) player id', () => {
    expect(playersOfUsersFilter(['a', 'b'])).toBe('linked_user_id.in.(a,b),player.in.(a,b)');
  });

  test('works for a single user', () => {
    expect(playersOfUsersFilter(['a'])).toBe('linked_user_id.in.(a),player.in.(a)');
  });
});

describe('ConstellationCreationDialog', () => {
  test('loads players of legacy and linked users via .or and maps their names', async () => {
    supabaseMock.respond = (q) =>
      q.table === 'players'
        ? {
            data: [
              makePlayer({ player: 'u-1', linked_user_id: null, rg_index: 111 }),
              makePlayer({ player: 'p-2', linked_user_id: 'u-2', rg_index: 222 }),
            ],
            error: null,
          }
        : { data: [], error: null };

    const payload = {
      users: [
        { id: 'u-1', name: 'Alice Legacy' },
        { id: 'u-2', name: 'Bob Linked' },
      ],
      event: { id: 'event-1' } as EventsUserView,
    };

    render(<ConstellationCreationDialog payload={payload} open onClose={vi.fn()} />);

    const trigger = await screen.findByRole('button', { name: /Spieler bearbeiten - 2/ });

    const [query] = supabaseMock.queries;
    expect(query.schema).toBe('games');
    expect(query.table).toBe('players');
    expect(op(query, 'or')).toEqual(['linked_user_id.in.(u-1,u-2),player.in.(u-1,u-2)']);
    expect(op(query, 'in')).toBeUndefined();

    fireEvent.click(trigger);

    const section = trigger.closest('[data-slot="card"]') as HTMLElement | null;
    const scope = section ? within(section) : screen;
    await waitFor(() => {
      expect(scope.getByText('Alice Legacy')).toBeInTheDocument();
      expect(scope.getByText('Bob Linked')).toBeInTheDocument();
    });
    expect(scope.getByText('Index: 111')).toBeInTheDocument();
    expect(scope.getByText('Index: 222')).toBeInTheDocument();
  });
});
