-- 090_dst_recurrence.sql
--
-- Guards against the daylight-saving drift bug: recurring training occurrences
-- must keep their LOCAL (Europe/Berlin) wall-clock start time when the weekly
-- step crosses a DST boundary — a 19:00 training stays 19:00, not 18:00 (autumn)
-- or 20:00 (spring).
--
-- Germany DST 2026: ends Sun 2026-10-25 (CEST->CET), starts Sun 2026-03-29
-- (CET->CEST). We seed a weekly series just before each switch and generate
-- across it.
--
-- NOTE: public.create_next_occurrences is global (it advances EVERY recurring
-- series in the DB, and seed data adds more), so this test never asserts on the
-- function's return count. It checks our own series by key + exact instant. The
-- spring series is generated and asserted BEFORE the autumn run, because the
-- autumn run (Oct->Nov horizon) would also extend the spring series into November
-- and move its "latest occurrence" template past the spring window.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(6);

DELETE FROM public.events WHERE "key" IN ('dst-autumn','dst-spring');

-- Seed base events as the privileged (superuser) session, like 081.
--   AUTUMN base: Wed 2026-10-21 19:00 Europe/Berlin (CEST = 17:00Z)
--   SPRING base: Wed 2026-03-25 19:00 Europe/Berlin (CET  = 18:00Z)
INSERT INTO public.events("key","title","description","recurrence",
  "startingDateTime","endDateTime","answerDeadline","group")
VALUES
  ('dst-autumn','Training','Weekly training','Weekly',
   '2026-10-21T17:00:00Z','2026-10-21T19:00:00Z','2026-10-21T15:00:00Z',
   '00000000-0000-0000-0000-000000000042'),
  ('dst-spring','Training','Weekly training','Weekly',
   '2026-03-25T18:00:00Z','2026-03-25T20:00:00Z','2026-03-25T16:00:00Z',
   '00000000-0000-0000-0000-000000000042');

-- create_next_occurrences requires service_role OR event.create/event.edit.
-- user_1a is admin of group 42 (which grants event.edit), matching 081.
SELECT tests.authenticate_as('user_1a');

-- ============================================================
-- SPRING first: generate across the 2026-03-29 switch (Apr 1, 8, 15; all CEST)
-- ============================================================
DO $$ BEGIN PERFORM public.create_next_occurrences('2026-03-26T00:00:00Z','21 days'); END $$;

-- The post-switch occurrence lands at 17:00Z (= 19:00 CEST), NOT the buggy 18:00Z.
SELECT is(
  (SELECT count(*)::int FROM public.events
    WHERE "key"='dst-spring' AND "startingDateTime" = '2026-04-01T17:00:00Z'::timestamptz)
  - (SELECT count(*)::int FROM public.events
    WHERE "key"='dst-spring' AND "startingDateTime" = '2026-04-01T18:00:00Z'::timestamptz),
  1,
  'spring: 2026-04-01 occurrence is 19:00 CEST (17:00Z), not the drifted 20:00 CEST'
);

SELECT ok( NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE "key"='dst-spring'
    AND ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time <> '19:00'
), 'spring: every occurrence keeps 19:00 local start across DST');

SELECT is(
  (SELECT count(*)::int FROM public.events
    WHERE "key"='dst-spring' AND "startingDateTime" = '2026-04-08T17:00:00Z'::timestamptz),
  1,
  'spring: 2026-04-08 occurrence present at 19:00 CEST (17:00Z)'
);

-- ============================================================
-- AUTUMN: generate across the 2026-10-25 switch (Oct 28, Nov 4, Nov 11; all CET)
-- ============================================================
DO $$ BEGIN PERFORM public.create_next_occurrences('2026-10-22T00:00:00Z','21 days'); END $$;

-- The post-switch occurrence lands at 18:00Z (= 19:00 CET), NOT the buggy 17:00Z.
SELECT is(
  (SELECT count(*)::int FROM public.events
    WHERE "key"='dst-autumn' AND "startingDateTime" = '2026-10-28T18:00:00Z'::timestamptz)
  - (SELECT count(*)::int FROM public.events
    WHERE "key"='dst-autumn' AND "startingDateTime" = '2026-10-28T17:00:00Z'::timestamptz),
  1,
  'autumn: 2026-10-28 occurrence is 19:00 CET (18:00Z), not the drifted 18:00 CET'
);

SELECT ok( NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE "key"='dst-autumn'
    AND ( ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time <> '19:00'
       OR ("endDateTime"      AT TIME ZONE 'Europe/Berlin')::time <> '21:00'
       OR ("answerDeadline"   AT TIME ZONE 'Europe/Berlin')::time <> '17:00' )
), 'autumn: start/end/deadline local time-of-day preserved across DST');

SELECT is(
  (SELECT count(*)::int FROM public.events
    WHERE "key"='dst-autumn' AND "startingDateTime" = '2026-11-04T18:00:00Z'::timestamptz),
  1,
  'autumn: 2026-11-04 occurrence present at 19:00 CET (18:00Z)'
);

SELECT * FROM finish();
ROLLBACK;
