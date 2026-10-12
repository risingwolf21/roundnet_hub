import { beforeEach, describe, expect, test, vi } from 'vitest';
import { op, opNames, opsNamed, supabaseMock } from './helpers/supabaseMock';

vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
vi.mock('@/features/admin/dialogs/EditUserDialog', () => ({}));

import { AdminDrinksRepository } from '@/repository/AdminDrinksRepository';
import { AdminUsersRepository } from '@/repository/AdminUsersRepository';
import { DrinkRepository } from '@/repository/DrinkRepository';
import { GamesRepository } from '@/repository/GamesRepository';
import { GrantsRepository } from '@/repository/GrantsRepository';
import { PlayerDataRepository } from '@/repository/PlayerDataRepository';
import type { GamesTable } from '@/types/supabaseTypes';

const dbError = { message: 'boom', code: '42501' };

beforeEach(() => {
  supabaseMock.reset();
});

describe('GamesRepository.upsertSetsToMatch', () => {
  const makeSet = (id: string): GamesTable<'sets'> =>
    ({
      id,
      created_at: '2026-10-01T00:00:00+00:00',
      match: 'match-1',
      set_number: 1,
      team_a_score: 21,
      team_b_score: 15,
      type: 'normal',
      set_awarded: null,
    }) as GamesTable<'sets'>;

  test('empty list: does not upsert and deletes all sets of the match', async () => {
    const result = await GamesRepository.upsertSetsToMatch('match-1', []);

    expect(result).toEqual([]);
    expect(supabaseMock.queries).toHaveLength(1);
    const [del] = supabaseMock.queries;
    expect(del.schema).toBe('games');
    expect(del.table).toBe('sets');
    expect(opNames(del)).toContain('delete');
    expect(opNames(del)).not.toContain('upsert');
    expect(op(del, 'eq')).toEqual(['match', 'match-1']);
    expect(op(del, 'not')).toBeUndefined();
    expect(opNames(del)).toContain('throwOnError');
  });

  test('non-empty list: upserts, then deletes all other sets of the match using the upserted ids', async () => {
    const sets = [makeSet('s1'), makeSet('s2')];
    supabaseMock.respond = (q) =>
      op(q, 'upsert') ? { data: [{ ...sets[0], id: 'db-1' }, { ...sets[1], id: 'db-2' }], error: null } : { data: null, error: null };

    const result = await GamesRepository.upsertSetsToMatch('match-1', sets);

    expect(supabaseMock.queries).toHaveLength(2);
    const [upsert, del] = supabaseMock.queries;
    expect(upsert.schema).toBe('games');
    expect(upsert.table).toBe('sets');
    expect(op(upsert, 'upsert')).toEqual([sets]);
    expect(opNames(upsert)).toEqual(expect.arrayContaining(['select', 'throwOnError']));

    expect(del.table).toBe('sets');
    expect(opNames(del)).toContain('delete');
    expect(op(del, 'eq')).toEqual(['match', 'match-1']);
    expect(op(del, 'not')).toEqual(['id', 'in', '(db-1,db-2)']);
    expect(opNames(del)).toContain('throwOnError');

    expect(result.map((x) => x.id)).toEqual(['db-1', 'db-2']);
  });

  test('propagates upsert errors and does not delete anything', async () => {
    supabaseMock.respond = (q) => (op(q, 'upsert') ? { data: null, error: dbError } : { data: null, error: null });

    await expect(GamesRepository.upsertSetsToMatch('match-1', [makeSet('s1')])).rejects.toEqual(dbError);
    expect(supabaseMock.queries.some((q) => opNames(q).includes('delete'))).toBe(false);
  });

  test('propagates delete errors', async () => {
    supabaseMock.respond = (q) => (op(q, 'delete') ? { data: null, error: dbError } : { data: [], error: null });

    await expect(GamesRepository.upsertSetsToMatch('match-1', [])).rejects.toEqual(dbError);
  });
});

describe('PlayerDataRepository', () => {
  const ownFilter = 'linked_user_id.eq.user-1,and(player.eq.user-1,linked_user_id.is.null)';

  test('updatePlayer matches legacy and linked players via .or and never via .eq("player")', async () => {
    supabaseMock.respond = () => ({ data: [{ player: 'user-1' }], error: null });

    const result = await PlayerDataRepository.updatePlayer('user-1', { rg_link: null });

    const [q] = supabaseMock.queries;
    expect(q.schema).toBe('games');
    expect(q.table).toBe('players');
    expect(op(q, 'update')).toEqual([{ rg_link: null }]);
    expect(op(q, 'or')).toEqual([ownFilter]);
    expect(opsNamed(q, 'eq')).toEqual([]);
    expect(result).toEqual([{ player: 'user-1' }]);
  });

  test('updateIndexHidden matches legacy and linked players via .or', async () => {
    supabaseMock.respond = () => ({ data: [], error: null });

    await PlayerDataRepository.updateIndexHidden('user-1', true);

    const [q] = supabaseMock.queries;
    expect(op(q, 'update')).toEqual([{ hide_rating: true }]);
    expect(op(q, 'or')).toEqual([ownFilter]);
    expect(opsNamed(q, 'eq')).toEqual([]);
  });

  test('updatePlayer rejects on error', async () => {
    supabaseMock.respond = () => ({ data: null, error: dbError });
    await expect(PlayerDataRepository.updatePlayer('user-1', {})).rejects.toEqual(dbError);
  });

  test('fetchEloHistory rejects on error instead of returning an empty list', async () => {
    supabaseMock.respond = () => ({ data: null, error: dbError });
    await expect(PlayerDataRepository.fetchEloHistory('user-1')).rejects.toEqual(dbError);
  });

  test('fetchEloHistory returns the rows', async () => {
    supabaseMock.respond = () => ({ data: [{ delta: 3 }], error: null });
    await expect(PlayerDataRepository.fetchEloHistory('user-1')).resolves.toEqual([{ delta: 3 }]);
    const [q] = supabaseMock.queries;
    expect(q.table).toBe('elo_history');
    expect(op(q, 'eq')).toEqual(['user', 'user-1']);
  });
});

describe('DrinkRepository', () => {
  test('fetchAllDrinks rejects on error instead of returning an empty list', async () => {
    supabaseMock.respond = () => ({ data: null, error: dbError });
    await expect(DrinkRepository.fetchAllDrinks()).rejects.toEqual(dbError);
  });

  test('fetchAllDrinks returns the drinks', async () => {
    supabaseMock.respond = () => ({ data: [{ id: 'd1' }], error: null });
    await expect(DrinkRepository.fetchAllDrinks()).resolves.toEqual([{ id: 'd1' }]);
  });

  test('deleteDrink deletes by uuid string', async () => {
    const id = '2f1d0b8e-6b55-4c8e-9f1f-3c9d6c1c1a11';
    await DrinkRepository.deleteDrink(id);
    const [q] = supabaseMock.queries;
    expect(q.table).toBe('drink');
    expect(opNames(q)).toContain('delete');
    expect(op(q, 'eq')).toEqual(['id', id]);
  });

  test('AdminDrinksRepository.deleteDrink deletes by uuid string and throws on error', async () => {
    const id = '2f1d0b8e-6b55-4c8e-9f1f-3c9d6c1c1a11';
    await AdminDrinksRepository.deleteDrink(id);
    expect(op(supabaseMock.queries[0], 'eq')).toEqual(['id', id]);

    supabaseMock.respond = () => ({ data: null, error: dbError });
    await expect(AdminDrinksRepository.deleteDrink(id)).rejects.toEqual(dbError);
  });
});

describe('GrantsRepository.fetchAdminGroups', () => {
  test('queries admin groups from event_groups_view', async () => {
    supabaseMock.respond = () => ({ data: [{ id: 'g1' }], error: null });

    await expect(GrantsRepository.fetchAdminGroups()).resolves.toEqual([{ id: 'g1' }]);
    const [q] = supabaseMock.queries;
    expect(q.table).toBe('event_groups_view');
    expect(op(q, 'eq')).toEqual(['role', 'admin']);
  });

  test('throws on error instead of returning an empty list', async () => {
    supabaseMock.respond = () => ({ data: null, error: dbError });
    await expect(GrantsRepository.fetchAdminGroups()).rejects.toEqual(dbError);
  });
});

describe('AdminUsersRepository.notifyEmit', () => {
  const args = {
    recipients: ['u1', 'u2'],
    topic: 'admin.message',
    title: 'Hello',
    body: 'World',
    urgency: 'high',
    scopeType: 'group',
    scopeId: 'g1',
    sourceId: 'admin-1',
  };

  test('calls notifications.admin_notify_emit with mapped params and returns the count', async () => {
    supabaseMock.respond = () => ({ data: 2, error: null });

    await expect(AdminUsersRepository.notifyEmit(args)).resolves.toBe(2);

    expect(supabaseMock.queries).toHaveLength(1);
    const [q] = supabaseMock.queries;
    expect(q.schema).toBe('notifications');
    expect(q.rpc).toBe('admin_notify_emit');
    expect(q.args).toEqual({
      p_recipients: ['u1', 'u2'],
      p_topic: 'admin.message',
      p_title: 'Hello',
      p_body: 'World',
      p_data: {},
      p_source_type: 'admin',
      p_source_id: 'admin-1',
      p_urgency: 'high',
      p_scope_type: 'group',
      p_scope_id: 'g1',
    });
  });

  test('returns 0 when no data', async () => {
    await expect(AdminUsersRepository.notifyEmit(args)).resolves.toBe(0);
  });

  test('throws on error', async () => {
    supabaseMock.respond = () => ({ data: null, error: dbError });
    await expect(AdminUsersRepository.notifyEmit(args)).rejects.toEqual(dbError);
  });
});
