import { beforeEach, describe, expect, test, vi } from 'vitest';

process.env.TZ = 'Europe/Berlin';

type RecordedQuery = { table: string; ops: Array<[string, unknown[]]> };

const { state } = vi.hoisted(() => ({
  state: {
    queries: [] as RecordedQuery[],
    respond: (() => ({ data: null, error: null })) as (query: RecordedQuery) => { data: unknown; error: unknown },
  },
}));

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    const query: RecordedQuery = { table, ops: [] };
    state.queries.push(query);
    const builder: unknown = new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
              const response = state.respond(query);
              const throws = query.ops.some(([op]) => op === 'throwOnError') && response.error;
              return (throws ? Promise.reject(response.error) : Promise.resolve(response)).then(resolve, reject);
            };
          }
          return (...args: unknown[]) => {
            query.ops.push([prop, args]);
            return builder;
          };
        },
      }
    );
    return builder;
  };
  return { supabase: { from, schema: () => ({ from }) } };
});

import { EventRepository } from '@/repository/EventRepository';

const op = (query: RecordedQuery, name: string) => query.ops.find(([o]) => o === name)?.[1];

beforeEach(() => {
  state.queries = [];
});

describe('EventRepository.updateSingleEvent', () => {
  test('throws when no row was updated (e.g. filtered by RLS)', async () => {
    state.respond = () => ({ data: [], error: null });
    await expect(EventRepository.updateSingleEvent('event-1', { title: 'New title' })).rejects.toThrow(
      'Event konnte nicht gespeichert werden'
    );
  });

  test('returns the updated rows', async () => {
    state.respond = () => ({ data: [{ id: 'event-1' }], error: null });
    await expect(EventRepository.updateSingleEvent('event-1', { title: 'New title' })).resolves.toEqual([
      { id: 'event-1' },
    ]);
  });
});

describe('EventRepository.updateEventAndAllRecurrences', () => {
  const series = [
    { id: 'a', key: 's', recurrence: 'Weekly', startingDateTime: '2026-10-19T16:00:00+00:00', endDateTime: '2026-10-19T18:00:00+00:00' },
    { id: 'b', key: 's', recurrence: 'Weekly', startingDateTime: '2026-10-26T17:00:00+00:00', endDateTime: '2026-10-26T19:00:00+00:00' },
    { id: 'c', key: 's', recurrence: 'Weekly', startingDateTime: '2026-11-02T17:00:00+00:00', endDateTime: '2026-11-02T19:00:00+00:00' },
  ];

  const respondWithSeries = (query: RecordedQuery) => {
    if (op(query, 'update')) return { data: { id: op(query, 'eq')?.[1] }, error: null };
    return { data: series, error: null };
  };

  test('moves every occurrence to the new wall-clock time (DST safe), latest first', async () => {
    state.respond = respondWithSeries;

    await EventRepository.updateEventAndAllRecurrences(
      { startingDateTime: '2026-10-19T19:00:00.000+02:00', endDateTime: '2026-10-19T21:00:00.000+02:00' },
      's',
      '2026-10-19T16:00:00+00:00'
    );

    const [select, ...updates] = state.queries;
    expect(op(select, 'gte')).toEqual(['startingDateTime', '2026-10-19T16:00:00+00:00']);
    expect(op(select, 'order')).toEqual(['startingDateTime', { ascending: true }]);

    expect(updates.map((u) => op(u, 'eq')?.[1])).toEqual(['c', 'b', 'a']);
    expect(updates.map((u) => op(u, 'update')?.[0])).toEqual([
      { startingDateTime: '2026-11-02T19:00:00.000+01:00', endDateTime: '2026-11-02T21:00:00.000+01:00' },
      { startingDateTime: '2026-10-26T19:00:00.000+01:00', endDateTime: '2026-10-26T21:00:00.000+01:00' },
      { startingDateTime: '2026-10-19T19:00:00.000+02:00', endDateTime: '2026-10-19T21:00:00.000+02:00' },
    ]);
  });

  test('does not touch dates when only other fields change', async () => {
    state.respond = respondWithSeries;

    await EventRepository.updateEventAndAllRecurrences({ title: 'Renamed' }, 's', '2026-10-19T16:00:00+00:00');

    const updates = state.queries.slice(1);
    expect(updates).toHaveLength(3);
    updates.forEach((u) => expect(op(u, 'update')?.[0]).toEqual({ title: 'Renamed' }));
  });

  test('throws when the series is not visible', async () => {
    state.respond = () => ({ data: [], error: null });
    await expect(
      EventRepository.updateEventAndAllRecurrences({ title: 'Renamed' }, 's', '2026-10-19T16:00:00+00:00')
    ).rejects.toThrow();
  });
});
