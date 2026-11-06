import { RecurrenceExpander, type RecurrenceSeriesInput } from '@/lib/recurrence-expander';
import { describe, expect, it } from 'vitest';

const baseInput: RecurrenceSeriesInput = {
  rrule: 'FREQ=WEEKLY;BYDAY=WE',
  // 19:00 in Berlin while standard time is active (UTC+1).
  dtstart: '2026-03-18T18:00:00.000Z',
  timezone: 'Europe/Berlin',
  durationMs: 90 * 60 * 1000,
};

describe('RecurrenceExpander', () => {
  it('expands weekly occurrences into slots with end times', () => {
    const slots = RecurrenceExpander.expand(
      baseInput,
      new Date('2026-03-18T00:00:00.000Z'),
      new Date('2026-04-02T23:59:59.999Z'),
    );

    expect(slots.map(({ occurrence_date }) => occurrence_date)).toEqual([
      '2026-03-18',
      '2026-03-25',
      '2026-04-01',
    ]);
    expect(slots[0]).toEqual({
      occurrence_date: '2026-03-18',
      starting: '2026-03-18T18:00:00.000Z',
      ending: '2026-03-18T19:30:00.000Z',
      meeting: null,
      deadline: null,
      answer_start: null,
    });
  });

  it('preserves the local wall-clock time across the spring DST transition', () => {
    const slots = RecurrenceExpander.expand(
      baseInput,
      new Date('2026-03-18T00:00:00.000Z'),
      new Date('2026-04-02T23:59:59.999Z'),
    );

    // Berlin moves from UTC+1 to UTC+2 on 29 March 2026. The event remains at 19:00 local.
    expect(slots.map(({ starting }) => starting)).toEqual([
      '2026-03-18T18:00:00.000Z',
      '2026-03-25T18:00:00.000Z',
      '2026-04-01T17:00:00.000Z',
    ]);
  });

  it('applies the inclusive range bounds', () => {
    const slots = RecurrenceExpander.expand(
      baseInput,
      new Date('2026-03-25T18:00:00.000Z'),
      new Date('2026-04-01T17:00:00.000Z'),
    );

    expect(slots.map(({ starting }) => starting)).toEqual([
      '2026-03-25T18:00:00.000Z',
      '2026-04-01T17:00:00.000Z',
    ]);
  });

  it('applies an inclusive until instant', () => {
    const slots = RecurrenceExpander.expand(
      { ...baseInput, until: '2026-03-25T18:00:00.000Z' },
      new Date('2026-03-18T00:00:00.000Z'),
      new Date('2026-04-02T23:59:59.999Z'),
    );

    expect(slots.map(({ occurrence_date }) => occurrence_date)).toEqual([
      '2026-03-18',
      '2026-03-25',
    ]);
  });

  it('calculates meeting, answer start and deadline from each occurrence start', () => {
    const slots = RecurrenceExpander.expand(
      {
        ...baseInput,
        meetingOffsetMs: -24 * 60 * 60 * 1000,
        answerOffsetMs: -60 * 60 * 1000,
        answerStartOffsetMs: -5 * 24 * 60 * 60 * 1000,
      },
      new Date('2026-03-18T18:00:00.000Z'),
      new Date('2026-03-18T18:00:00.000Z'),
    );

    expect(slots).toHaveLength(1);
    expect(slots[0].meeting).toBe('2026-03-17T18:00:00.000Z');
    expect(slots[0].deadline).toBe('2026-03-18T17:00:00.000Z');
    expect(slots[0].answer_start).toBe('2026-03-13T18:00:00.000Z');
  });

  it('returns no slots when the range contains no matching occurrence', () => {
    const slots = RecurrenceExpander.expand(
      baseInput,
      new Date('2026-03-19T00:00:00.000Z'),
      new Date('2026-03-24T23:59:59.999Z'),
    );

    expect(slots).toEqual([]);
  });

  it('supports interval and count RRULE parts', () => {
    const slots = RecurrenceExpander.expand(
      { ...baseInput, rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=WE;COUNT=3' },
      new Date('2026-03-18T00:00:00.000Z'),
      new Date('2026-05-01T23:59:59.999Z'),
    );

    expect(slots.map(({ occurrence_date }) => occurrence_date)).toEqual([
      '2026-03-18',
      '2026-04-01',
      '2026-04-15',
    ]);
  });

  it('rejects an invalid date range', () => {
    expect(() =>
      RecurrenceExpander.expand(
        baseInput,
        new Date('2026-04-01T00:00:00.000Z'),
        new Date('2026-03-01T00:00:00.000Z'),
      ),
    ).toThrow('rangeStart must be less than or equal to rangeEnd');
  });
});
