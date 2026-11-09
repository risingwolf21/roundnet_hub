import { gridWeeks, rhythmOf, weekCells } from '@/features/events/seriesGrid';
import { describe, expect, it } from 'vitest';

describe('rhythmOf', () => {
  it('reads weekly, every n weeks and monthly rules', () => {
    expect(rhythmOf('FREQ=WEEKLY;INTERVAL=1;BYDAY=TU')).toEqual({ key: 'weekly' });
    expect(rhythmOf('FREQ=WEEKLY;INTERVAL=2;BYDAY=TH')).toEqual({ key: 'everyNWeeks', count: 2 });
    expect(rhythmOf('RRULE:FREQ=WEEKLY;INTERVAL=3;BYDAY=SA')).toEqual({ key: 'everyNWeeks', count: 3 });
    expect(rhythmOf('FREQ=MONTHLY;BYMONTHDAY=4')).toEqual({ key: 'monthly', day: 4 });
    expect(rhythmOf('FREQ=MONTHLY;INTERVAL=2')).toEqual({ key: 'everyNMonths', count: 2 });
    expect(rhythmOf('FREQ=YEARLY')).toEqual({ key: 'other' });
  });
});

describe('weekCells', () => {
  // Wednesday, 11 November 2026 → the grid starts on Monday, 9 November.
  const weeks = gridWeeks(new Date(2026, 10, 11, 12));
  const at = (day: number, h = 18) => new Date(2026, 10, day, h).toISOString();
  const occ = (day: number, extra: Partial<{ isCancelled: boolean; detached: boolean }> = {}) => ({
    startingDateTime: at(day),
    isCancelled: false,
    detached: false,
    ...extra,
  });

  it('starts on this week’s Monday and covers eight weeks', () => {
    expect(weeks).toHaveLength(8);
    expect(weeks[0]).toEqual(new Date(2026, 10, 9));
  });

  it('shows an every-3-weeks series in every third column', () => {
    expect(weekCells([occ(14), occ(14 + 21), occ(14 + 42)], weeks)).toEqual(['on', 'off', 'off', 'on', 'off', 'off', 'on', 'off']);
  });

  it('marks cancelled and separately edited occurrences', () => {
    const cells = weekCells([occ(10, { isCancelled: true }), occ(17, { detached: true })], weeks);
    expect(cells.slice(0, 3)).toEqual(['cancelled', 'moved', 'off']);
  });
});
