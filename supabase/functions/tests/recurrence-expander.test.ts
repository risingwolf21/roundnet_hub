// Unit tests for the pure RRULE expander (no DB / stack needed):
//   deno test --config supabase/functions/tests/deno.json supabase/functions/tests/recurrence-expander.test.ts
// NOTE: the CI `supabase test db` job runs pgTAP, not Deno — run these locally.
import { assert, assertEquals } from '@std/assert';
import { expandSeries } from '../recurrence-expander/expand.ts';

const TZ = 'Europe/Berlin';
const TWO_H = 2 * 60 * 60 * 1000;

// Every occurrence's local wall time in Europe/Berlin, as "HH:MM".
function localHHMM(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === 'hour')!.value;
  const m = parts.find((p) => p.type === 'minute')!.value;
  return `${h}:${m}`;
}

Deno.test('weekly series stays 19:00 local across the autumn DST switch (CEST→CET)', () => {
  const slots = expandSeries(
    {
      rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE',
      dtstart: '2026-10-21T17:00:00Z', // Wed 19:00 CEST
      timezone: TZ,
      durationMs: TWO_H,
    },
    new Date('2026-10-22T00:00:00Z'),
    new Date('2026-11-15T00:00:00Z'),
  );
  // Oct 28 / Nov 4 / Nov 11 are all after the Oct 25 switch (CET)
  const oct28 = slots.find((s) => s.occurrence_date === '2026-10-28');
  assert(oct28, 'expected a 2026-10-28 occurrence');
  assertEquals(oct28!.starting, '2026-10-28T18:00:00.000Z', '19:00 CET = 18:00Z, not the drifted 17:00Z');
  for (const s of slots) {
    assertEquals(localHHMM(s.starting), '19:00', `start stays 19:00 local (${s.occurrence_date})`);
    assertEquals(localHHMM(s.ending), '21:00', `end stays 21:00 local (${s.occurrence_date})`);
  }
});

Deno.test('weekly series stays 19:00 local across the spring DST switch (CET→CEST)', () => {
  const slots = expandSeries(
    {
      rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE',
      dtstart: '2026-03-25T18:00:00Z', // Wed 19:00 CET
      timezone: TZ,
      durationMs: TWO_H,
    },
    new Date('2026-03-26T00:00:00Z'),
    new Date('2026-04-20T00:00:00Z'),
  );
  const apr1 = slots.find((s) => s.occurrence_date === '2026-04-01');
  assert(apr1, 'expected a 2026-04-01 occurrence');
  assertEquals(apr1!.starting, '2026-04-01T17:00:00.000Z', '19:00 CEST = 17:00Z, not the drifted 18:00Z');
  for (const s of slots) assertEquals(localHHMM(s.starting), '19:00');
});

Deno.test('UNTIL is an inclusive instant bound', () => {
  const slots = expandSeries(
    {
      rrule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE',
      dtstart: '2026-10-21T17:00:00Z',
      timezone: TZ,
      until: '2026-11-04T18:00:00Z', // through Nov 4 only
      durationMs: TWO_H,
    },
    new Date('2026-10-22T00:00:00Z'),
    new Date('2026-12-31T00:00:00Z'),
  );
  const dates = slots.map((s) => s.occurrence_date);
  assert(dates.includes('2026-11-04'), 'Nov 4 included (== until)');
  assert(!dates.includes('2026-11-11'), 'Nov 11 excluded (after until)');
});

Deno.test('fortnightly interval', () => {
  const slots = expandSeries(
    {
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=WE',
      dtstart: '2026-10-21T17:00:00Z',
      timezone: TZ,
      durationMs: TWO_H,
    },
    new Date('2026-10-22T00:00:00Z'),
    new Date('2026-12-01T00:00:00Z'),
  );
  assertEquals(slots.map((s) => s.occurrence_date), ['2026-11-04', '2026-11-18'], 'every 2nd Wednesday');
});

Deno.test('monthly by month-day generates (the case the old SQL generator dropped)', () => {
  const slots = expandSeries(
    {
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=21',
      dtstart: '2026-10-21T17:00:00Z',
      timezone: TZ,
      durationMs: TWO_H,
    },
    new Date('2026-10-22T00:00:00Z'),
    new Date('2027-01-31T00:00:00Z'),
  );
  assertEquals(slots.map((s) => s.occurrence_date), ['2026-11-21', '2026-12-21', '2027-01-21']);
  for (const s of slots) assertEquals(localHHMM(s.starting), '19:00');
});

Deno.test('meeting/answer offsets ride with the start', () => {
  const [slot] = expandSeries(
    {
      rrule: 'FREQ=WEEKLY;BYDAY=WE',
      dtstart: '2026-10-21T17:00:00Z',
      timezone: TZ,
      durationMs: TWO_H,
      meetingOffsetMs: -30 * 60 * 1000, // 30 min before
      answerOffsetMs: -2 * 60 * 60 * 1000, // 2h before
    },
    new Date('2026-10-22T00:00:00Z'),
    new Date('2026-11-01T00:00:00Z'),
  );
  assertEquals(localHHMM(slot.meeting!), '18:30');
  assertEquals(localHHMM(slot.deadline!), '17:00');
});
