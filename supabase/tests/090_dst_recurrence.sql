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

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(6);

-- Clean slate for our keys
DELETE FROM public.events WHERE "key" IN ('dst-autumn','dst-spring');

-- Seed the base events as the privileged (superuser) session, exactly like
-- 081_events-create-next-occurences_test.sql — direct-insert RLS is not under test
-- here. AUTUMN base: Wed 2026-10-21 19:00 Europe/Berlin (CEST = 17:00Z).
-- SPRING base: Wed 2026-03-25 19:00 Europe/Berlin (CET = 18:00Z).
INSERT INTO public.events("key","title","description","recurrence",
  "startingDateTime","endDateTime","answerDeadline","group")
VALUES
  ('dst-autumn','Training','Weekly training','Weekly',
   '2026-10-21T17:00:00Z',   -- 19:00 Berlin (CEST)
   '2026-10-21T19:00:00Z',   -- 21:00 Berlin
   '2026-10-21T15:00:00Z',   -- 17:00 Berlin (2h before)
   '00000000-0000-0000-0000-000000000042'),
  ('dst-spring','Training','Weekly training','Weekly',
   '2026-03-25T18:00:00Z',   -- 19:00 Berlin (CET)
   '2026-03-25T20:00:00Z',   -- 21:00 Berlin
   '2026-03-25T16:00:00Z',   -- 17:00 Berlin
   '00000000-0000-0000-0000-000000000042');

-- public.create_next_occurrences only runs for service_role or a caller holding
-- event.create/event.edit. user_1a is admin of group 42 (which grants event.edit),
-- matching how 081 drives the generator.
SELECT tests.authenticate_as('user_1a');

-- ============================================================
-- AUTUMN: generate across the 2026-10-25 switch (Oct 28, Nov 4, Nov 11; all CET)
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM (SELECT public.create_next_occurrences('2026-10-22T00:00:00Z','21 days')) q),
  3,
  'autumn: 3 weekly occurrences generated across the DST switch'
);

-- Every occurrence (base + generated) keeps local 19:00 start / 21:00 end / 17:00 deadline
SELECT ok( NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE "key"='dst-autumn'
    AND ( ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time <> '19:00'
       OR ("endDateTime"      AT TIME ZONE 'Europe/Berlin')::time <> '21:00'
       OR ("answerDeadline"   AT TIME ZONE 'Europe/Berlin')::time <> '17:00' )
), 'autumn: local start/end/deadline time-of-day preserved across DST');

-- The post-switch occurrence lands at the DST-correct instant (18:00Z = 19:00 CET),
-- NOT the buggy 17:00Z (= 18:00 CET).
SELECT is(
  (SELECT count(*)::int FROM public.events
   WHERE "key"='dst-autumn'
     AND "startingDateTime" = '2026-10-28T18:00:00Z'::timestamptz)
  - (SELECT count(*)::int FROM public.events
     WHERE "key"='dst-autumn'
       AND "startingDateTime" = '2026-10-28T17:00:00Z'::timestamptz),
  1,
  'autumn: 2026-10-28 occurrence is 19:00 CET (18:00Z), not the drifted 18:00 CET'
);

-- ============================================================
-- SPRING: generate across the 2026-03-29 switch (Apr 1, 8, 15; all CEST)
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM (SELECT public.create_next_occurrences('2026-03-26T00:00:00Z','21 days')) q),
  3,
  'spring: 3 weekly occurrences generated across the DST switch'
);

SELECT ok( NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE "key"='dst-spring'
    AND ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time <> '19:00'
), 'spring: local start time-of-day preserved across DST');

-- The post-switch occurrence lands at 17:00Z (= 19:00 CEST), NOT the buggy 18:00Z.
SELECT is(
  (SELECT count(*)::int FROM public.events
   WHERE "key"='dst-spring'
     AND "startingDateTime" = '2026-04-01T17:00:00Z'::timestamptz)
  - (SELECT count(*)::int FROM public.events
     WHERE "key"='dst-spring'
       AND "startingDateTime" = '2026-04-01T18:00:00Z'::timestamptz),
  1,
  'spring: 2026-04-01 occurrence is 19:00 CEST (17:00Z), not the drifted 20:00 CEST'
);

SELECT * FROM finish();
ROLLBACK;
