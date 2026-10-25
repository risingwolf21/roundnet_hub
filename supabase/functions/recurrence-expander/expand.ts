// Pure RRULE → occurrence-slots expansion. No DB, no Deno APIs — unit-testable in isolation
// (CI runs pgTAP for the DB merge, not Deno; run these with `deno test` / `yarn test:functions`).
//
// DST-correct recipe: RRULE is expanded in a FLOATING (naive local) space, then each naive
// wall-clock occurrence is converted to a real instant in the series timezone with TZDate, so
// a 19:00 training stays 19:00 across the spring/autumn switch. UNTIL is applied as an instant
// filter here (not inside the rule string) to avoid rrule.js' floating-vs-Zulu DTSTART mismatch.

import { rrulestr } from 'rrule';
import { TZDate } from '@date-fns/tz';

export interface SeriesInput {
  rrule: string;          // e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=WE" (UNTIL, if any, is ignored here)
  dtstart: string;        // ISO instant of the first occurrence
  timezone: string;       // IANA tz, e.g. "Europe/Berlin"
  until?: string | null;  // ISO instant; inclusive upper bound on occurrence start
  durationMs: number;
  meetingOffsetMs?: number | null;  // meetingDateTime = start + offset
  answerOffsetMs?: number | null;   // answerDeadline = start + offset
}

export interface Slot {
  occurrence_date: string; // local YYYY-MM-DD
  starting: string;        // ISO instant
  ending: string;          // ISO instant
  meeting: string | null;
  deadline: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Instant → a Date whose UTC fields equal the wall-clock fields in `tz` (floating representation).
function instantToFloating(d: Date, tz: string): Date {
  const z = new TZDate(d, tz);
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), z.getHours(), z.getMinutes(), z.getSeconds()));
}

// Floating naive datetime (UTC fields = wall-clock fields) → the real instant in `tz`.
function floatingToInstant(n: Date, tz: string): Date {
  return new Date(
    new TZDate(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), n.getUTCHours(), n.getUTCMinutes(), n.getUTCSeconds(), tz).getTime(),
  );
}

function floatingDtstartString(n: Date): string {
  return `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}`;
}

// Strip any UNTIL=/COUNT-adjacent artifacts we handle ourselves; keep the rest of the rule.
function stripUntil(rrule: string): string {
  return rrule
    .split(';')
    .filter((p) => !/^UNTIL=/i.test(p.trim()))
    .join(';');
}

/**
 * Expand a series into slots whose start instant lies in [rangeStart, rangeEnd] and, if `until`
 * is set, at or before it. Wall-clock time (and thus local date) is preserved across DST.
 */
export function expandSeries(input: SeriesInput, rangeStart: Date, rangeEnd: Date): Slot[] {
  const tz = input.timezone;
  const dtstartInstant = new Date(input.dtstart);
  const floatingDtstart = instantToFloating(dtstartInstant, tz);

  const rule = rrulestr(`DTSTART:${floatingDtstartString(floatingDtstart)}\nRRULE:${stripUntil(input.rrule)}`);

  // Expand across the range in floating space, padded by a day each side so a DST shift near the
  // boundary can't drop a legitimate occurrence; we re-filter by the real instant below.
  const fromFloating = instantToFloating(new Date(rangeStart.getTime() - 86_400_000), tz);
  const toFloating = instantToFloating(new Date(rangeEnd.getTime() + 86_400_000), tz);

  const untilMs = input.until ? new Date(input.until).getTime() : null;
  const startMsBound = rangeStart.getTime();
  const endMsBound = rangeEnd.getTime();

  const slots: Slot[] = [];
  for (const naive of rule.between(fromFloating, toFloating, true)) {
    const start = floatingToInstant(naive, tz);
    const startMs = start.getTime();
    if (startMs < startMsBound || startMs > endMsBound) continue;
    if (untilMs !== null && startMs > untilMs) continue;

    slots.push({
      occurrence_date: `${naive.getUTCFullYear()}-${pad(naive.getUTCMonth() + 1)}-${pad(naive.getUTCDate())}`,
      starting: start.toISOString(),
      ending: new Date(startMs + input.durationMs).toISOString(),
      meeting: input.meetingOffsetMs != null ? new Date(startMs + input.meetingOffsetMs).toISOString() : null,
      deadline: input.answerOffsetMs != null ? new Date(startMs + input.answerOffsetMs).toISOString() : null,
    });
  }
  return slots;
}
