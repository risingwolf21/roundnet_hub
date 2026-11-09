import { addWeeks, startOfISOWeek } from 'date-fns';

/** Weeks shown in the recurring-events overview: this week and the next seven. */
export const GRID_WEEKS = 8;

export type SeriesCell = 'on' | 'off' | 'cancelled' | 'moved';

type Occurrence = { startingDateTime: string; isCancelled: boolean; detached: boolean };

/** Mondays of the shown weeks. */
export const gridWeeks = (now: Date): Date[] =>
  Array.from({ length: GRID_WEEKS }, (_, i) => addWeeks(startOfISOWeek(now), i));

/**
 * One cell per week: an occurrence (`on`), one edited on its own (`moved`), only cancelled
 * occurrences (`cancelled`), or none (`off`).
 */
export const weekCells = (occurrences: Occurrence[], weeks: Date[]): SeriesCell[] =>
  weeks.map((weekStart) => {
    const weekEnd = addWeeks(weekStart, 1);
    const inWeek = occurrences.filter((o) => {
      const start = new Date(o.startingDateTime);
      return start >= weekStart && start < weekEnd;
    });
    if (inWeek.length === 0) return 'off';
    if (inWeek.every((o) => o.isCancelled)) return 'cancelled';
    return inWeek.some((o) => o.detached && !o.isCancelled) ? 'moved' : 'on';
  });

export type Rhythm =
  | { key: 'weekly' }
  | { key: 'everyNWeeks'; count: number }
  | { key: 'monthly'; day?: number }
  | { key: 'everyNMonths'; count: number }
  | { key: 'other' };

/** The rhythm of a series, read from its RRULE (e.g. "FREQ=WEEKLY;INTERVAL=3;BYDAY=SA"). */
export const rhythmOf = (rrule: string): Rhythm => {
  const parts = Object.fromEntries(
    rrule.replace(/^RRULE:/, '').split(';').map((part) => part.split('=') as [string, string])
  );
  const interval = Number(parts.INTERVAL ?? 1);
  if (parts.FREQ === 'WEEKLY') return interval === 1 ? { key: 'weekly' } : { key: 'everyNWeeks', count: interval };
  if (parts.FREQ === 'MONTHLY') {
    if (interval !== 1) return { key: 'everyNMonths', count: interval };
    return parts.BYMONTHDAY ? { key: 'monthly', day: Number(parts.BYMONTHDAY) } : { key: 'monthly' };
  }
  return { key: 'other' };
};
