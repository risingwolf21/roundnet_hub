-- 091_repair_recurrence_dst.sql
--
-- Verifies public.repair_recurrence_local_time(): future occurrences of a recurring
-- series are snapped back to the series' established local (Europe/Berlin) start
-- time, while past occurrences and non-recurring events are left untouched.
--
-- Dates are relative to now() so the test stays valid over time. The "drift" is
-- modelled as a future occurrence sitting one hour too early (18:00 instead of the
-- series' 19:00), exactly the DST symptom.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(7);

DELETE FROM public.events WHERE "key" IN ('dst-repair-series','dst-repair-single');

-- Helper expressions:
--   past week  = (Berlin today - 7)   future week = (Berlin today + 7)
-- All built in Europe/Berlin local time, then stored as instants.
INSERT INTO public.events("key","title","description","recurrence",
  "startingDateTime","endDateTime","answerDeadline","group")
VALUES
  -- Anchor: most recent past session at the correct 19:00 local
  ('dst-repair-series','Training','anchor (past, correct)','Weekly',
   (((now() AT TIME ZONE 'Europe/Berlin')::date - 7) + time '19:00') AT TIME ZONE 'Europe/Berlin',
   (((now() AT TIME ZONE 'Europe/Berlin')::date - 7) + time '21:00') AT TIME ZONE 'Europe/Berlin',
   (((now() AT TIME ZONE 'Europe/Berlin')::date - 7) + time '17:00') AT TIME ZONE 'Europe/Berlin',
   '00000000-0000-0000-0000-000000000042'),
  -- Drifted future session: one hour too early (18:00 local)
  ('dst-repair-series','Training','drifted (future, wrong)','Weekly',
   (((now() AT TIME ZONE 'Europe/Berlin')::date + 7) + time '18:00') AT TIME ZONE 'Europe/Berlin',
   (((now() AT TIME ZONE 'Europe/Berlin')::date + 7) + time '20:00') AT TIME ZONE 'Europe/Berlin',
   (((now() AT TIME ZONE 'Europe/Berlin')::date + 7) + time '16:00') AT TIME ZONE 'Europe/Berlin',
   '00000000-0000-0000-0000-000000000042'),
  -- Non-recurring one-off, also at 18:00 local: must NOT be touched
  ('dst-repair-single','Single','one-off, not a series','None',
   (((now() AT TIME ZONE 'Europe/Berlin')::date + 7) + time '18:00') AT TIME ZONE 'Europe/Berlin',
   (((now() AT TIME ZONE 'Europe/Berlin')::date + 7) + time '20:00') AT TIME ZONE 'Europe/Berlin',
   (((now() AT TIME ZONE 'Europe/Berlin')::date + 7) + time '16:00') AT TIME ZONE 'Europe/Berlin',
   '00000000-0000-0000-0000-000000000042');

-- 1) sanity: the future series occurrence starts drifted (18:00 local)
SELECT is(
  (SELECT ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time
     FROM public.events
     WHERE "key"='dst-repair-series' AND "startingDateTime" > now()),
  '18:00'::time,
  'fixture: future series occurrence is drifted to 18:00 local'
);

-- 2) repair reports at least the one drifted occurrence fixed
SELECT cmp_ok(
  public.repair_recurrence_local_time('Europe/Berlin'),
  '>='::text, 1,
  'repair fixes at least one occurrence'
);

-- 3) future series occurrence snapped back to the anchor's 19:00 local
SELECT is(
  (SELECT ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time
     FROM public.events
     WHERE "key"='dst-repair-series' AND "startingDateTime" > now()),
  '19:00'::time,
  'future series occurrence snapped to series local start time (19:00)'
);

-- 4) duration and deadline offset preserved (end 21:00, deadline 17:00 local)
SELECT ok(
  (SELECT ("endDateTime"    AT TIME ZONE 'Europe/Berlin')::time = '21:00'::time
       AND ("answerDeadline" AT TIME ZONE 'Europe/Berlin')::time = '17:00'::time
     FROM public.events
     WHERE "key"='dst-repair-series' AND "startingDateTime" > now()),
  'end/deadline shifted by the same delta (21:00 / 17:00 local)'
);

-- 5) the past anchor occurrence is untouched
SELECT is(
  (SELECT ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time
     FROM public.events
     WHERE "key"='dst-repair-series' AND "startingDateTime" <= now()),
  '19:00'::time,
  'past anchor occurrence left untouched'
);

-- 6) the non-recurring one-off is NOT touched (still 18:00 local)
SELECT is(
  (SELECT ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time
     FROM public.events WHERE "key"='dst-repair-single'),
  '18:00'::time,
  'non-recurring event is not touched by the series repair'
);

-- 7) idempotent: a second run finds nothing left to fix (no other recurring
--    future events exist in the test DB, and ours is already correct)
SELECT is(
  public.repair_recurrence_local_time('Europe/Berlin'),
  0,
  'second run is a no-op (idempotent)'
);

SELECT * FROM finish();
ROLLBACK;
