// Minimal iCal-RRULE helpers for the frontend. The app only needs to *build* a rule string
// from the recurrence options the UI already offers (weekly / fortnightly / monthly) plus the
// event's start day; the heavy expansion lives in the recurrence-expander edge function
// (rrule.js). Kept dependency-free on purpose so it adds nothing to the bundle/lockfile.

export type EventRecurrence = 'None' | 'Weekly' | 'Fortnightly' | 'Monthly';

const RRULE_WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/**
 * Build the RRULE string for a recurrence enum anchored at `start` (local time).
 * Returns null for non-recurring events. UNTIL is handled separately (stored on the series),
 * so it is deliberately not encoded here.
 */
export function buildRRule(recurrence: EventRecurrence, start: Date): string | null {
  const weekday = RRULE_WEEKDAYS[start.getDay()];
  const monthday = start.getDate();
  switch (recurrence) {
    case 'Weekly':
      return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${weekday}`;
    case 'Fortnightly':
      return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${weekday}`;
    case 'Monthly':
      return `FREQ=MONTHLY;BYMONTHDAY=${monthday}`;
    case 'None':
    default:
      return null;
  }
}

/** Seconds between two ISO timestamps, as a Postgres interval literal (e.g. "7200 seconds"). */
export function intervalSecondsLiteral(fromIso: string, toIso: string): string {
  const seconds = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000);
  return `${seconds} seconds`;
}
