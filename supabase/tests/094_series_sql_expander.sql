-- 094_series_sql_expander.sql
--
-- The pg_cron path (_expand_series_sql) must generate occurrences in SQL with the same DST-safe
-- local-time behaviour as the browser expander: a 19:00 weekly training stays 19:00 across the
-- autumn switch (26-10-25), not 18:00.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(3);

SELECT gen_random_uuid() AS sid \gset

-- Weekly series anchored Wed 2026-10-21 19:00 Europe/Berlin (CEST = 17:00Z), 2h, deadline -2h.
SELECT tests.authenticate_as_service_role();
INSERT INTO public.event_series(
  id, key, "group", rrule, recurrence, dtstart, duration, answer_offset
) VALUES (
  :'sid'::uuid, :'sid'::text, '00000000-0000-0000-0000-000000000042',
  'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE', 'Weekly',
  '2026-10-21T17:00:00Z', interval '2 hours', interval '-2 hours'
);

-- Run the cron expander with a fixed window that straddles the 2026-10-25 switch
-- (deterministic regardless of when CI runs).
SELECT public._expand_series_sql(:'sid'::uuid, 60, '2026-10-22T00:00:00Z'::timestamptz) AS r \gset
SELECT cmp_ok(((:'r'::jsonb)->>'inserted')::int, '>='::text, 1,
  'SQL expander inserts future occurrences');

-- The post-switch occurrence lands at the DST-correct instant (19:00 CET = 18:00Z), not 17:00Z.
SELECT is(
  (SELECT count(*)::int FROM public.events
     WHERE series_id = :'sid'::uuid AND "startingDateTime" = '2026-10-28T18:00:00Z'::timestamptz)
  - (SELECT count(*)::int FROM public.events
     WHERE series_id = :'sid'::uuid AND "startingDateTime" = '2026-10-28T17:00:00Z'::timestamptz),
  1,
  'SQL expander: 2026-10-28 occurrence is 19:00 CET (18:00Z), not the drifted 18:00 CET');

-- Every generated occurrence keeps 19:00 local start.
SELECT ok( NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE series_id = :'sid'::uuid
    AND ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time <> '19:00'
), 'SQL expander: all occurrences keep 19:00 local start across DST');

SELECT * FROM finish();
ROLLBACK;
