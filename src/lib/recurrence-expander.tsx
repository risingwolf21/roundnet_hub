import { TZDate } from '@date-fns/tz';
import { rrulestr } from 'rrule';

export interface RecurrenceSeriesInput {
  /** RRULE body, e.g. `FREQ=WEEKLY;INTERVAL=1;BYDAY=WE`. */
  rrule: string;
  /** ISO instant for the first occurrence. */
  dtstart: string;
  /** IANA timezone, e.g. `Europe/Berlin`. */
  timezone: string;
  /** Optional inclusive upper bound on occurrence start, as an ISO instant. */
  until?: string | null;
  durationMs: number;
  /** Offset from occurrence start to meeting time. */
  meetingOffsetMs?: number | null;
  /** Offset from occurrence start to answer deadline. */
  answerOffsetMs?: number | null;
}

export interface RecurrenceSlot {
  /** Local date in the series timezone, formatted YYYY-MM-DD. */
  occurrence_date: string;
  /** Occurrence start as an ISO instant. */
  starting: string;
  /** Occurrence end as an ISO instant. */
  ending: string;
  meeting: string | null;
  deadline: string | null;
}

const DAY_MS = 86_400_000;
const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Expands an RRULE into occurrence slots. RRULE expansion happens in floating local-time space,
 * then each occurrence is converted back to an instant in the series timezone. This preserves
 * wall-clock time across daylight-saving transitions.
 *
 * `rangeStart` and `rangeEnd` are inclusive. `until`, when supplied, is also an inclusive instant
 * bound. Database access and runtime-specific APIs are intentionally not used, so this utility
 * can run in the frontend and be unit-tested with Vitest.
 */
export class RecurrenceExpander {
  static expand(
    input: RecurrenceSeriesInput,
    rangeStart: Date,
    rangeEnd: Date,
  ): RecurrenceSlot[] {
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      throw new TypeError('rangeStart and rangeEnd must be valid dates');
    }
    if (rangeStart.getTime() > rangeEnd.getTime()) {
      throw new RangeError('rangeStart must be less than or equal to rangeEnd');
    }

    const timezone = input.timezone;
    const dtstartInstant = new Date(input.dtstart);
    if (Number.isNaN(dtstartInstant.getTime())) {
      throw new TypeError('dtstart must be a valid ISO date string');
    }

    const floatingDtstart = this.instantToFloating(dtstartInstant, timezone);
    const rule = rrulestr(
      `DTSTART:${this.floatingDtstartString(floatingDtstart)}\nRRULE:${this.stripUntil(input.rrule)}`,
    );

    // Pad by one day in floating space, then filter using actual instants below.
    const fromFloating = this.instantToFloating(
      new Date(rangeStart.getTime() - DAY_MS),
      timezone,
    );
    const toFloating = this.instantToFloating(
      new Date(rangeEnd.getTime() + DAY_MS),
      timezone,
    );

    const untilMs = input.until ? new Date(input.until).getTime() : null;
    const rangeStartMs = rangeStart.getTime();
    const rangeEndMs = rangeEnd.getTime();
    const slots: RecurrenceSlot[] = [];

    for (const naive of rule.between(fromFloating, toFloating, true)) {
      const start = this.floatingToInstant(naive, timezone);
      const startMs = start.getTime();
      if (startMs < rangeStartMs || startMs > rangeEndMs) continue;
      if (untilMs !== null && startMs > untilMs) continue;

      slots.push({
        occurrence_date: `${naive.getUTCFullYear()}-${pad(naive.getUTCMonth() + 1)}-${pad(naive.getUTCDate())}`,
        starting: start.toISOString(),
        ending: new Date(startMs + input.durationMs).toISOString(),
        meeting:
          input.meetingOffsetMs != null
            ? new Date(startMs + input.meetingOffsetMs).toISOString()
            : null,
        deadline:
          input.answerOffsetMs != null
            ? new Date(startMs + input.answerOffsetMs).toISOString()
            : null,
      });
    }

    return slots;
  }

  private static instantToFloating(date: Date, timezone: string): Date {
    const zonedDate = new TZDate(date, timezone);
    return new Date(
      Date.UTC(
        zonedDate.getFullYear(),
        zonedDate.getMonth(),
        zonedDate.getDate(),
        zonedDate.getHours(),
        zonedDate.getMinutes(),
        zonedDate.getSeconds(),
      ),
    );
  }

  private static floatingToInstant(date: Date, timezone: string): Date {
    return new Date(
      new TZDate(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        timezone,
      ).getTime(),
    );
  }

  private static floatingDtstartString(date: Date): string {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  }

  private static stripUntil(rrule: string): string {
    return rrule
      .split(';')
      .filter((part) => !/^UNTIL=/i.test(part.trim()))
      .join(';');
  }
}
