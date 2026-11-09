-- 109_event_answer_start.sql
--
-- events."answerStart" is the counterpart of "answerDeadline": attendance opens from that instant.
-- A series defaults to opening 5 days before each occurrence and the generated occurrences carry
-- the shifted instant (DST-safe, relative to each occurrence start).

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(4);

SELECT gen_random_uuid() AS sid \gset

SELECT tests.authenticate_as_service_role();
INSERT INTO public.event_series(
  id, key, "group", rrule, recurrence, dtstart, duration
) VALUES (
  :'sid'::uuid, :'sid'::text, '00000000-0000-0000-0000-000000000042',
  'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE', 'Weekly',
  '2026-10-21T17:00:00Z', interval '2 hours'
);

SELECT is(
  (SELECT answer_start_offset FROM public.event_series WHERE id = :'sid'::uuid),
  interval '-5 days',
  'a new series opens attendance 5 days before each occurrence by default');

SELECT public._expand_series_sql(:'sid'::uuid, 60, '2026-10-22T00:00:00Z'::timestamptz) AS r \gset

SELECT cmp_ok(((:'r'::jsonb)->>'inserted')::int, '>='::text, 1,
  'the expander generates occurrences for the series');

-- 2026-10-28 19:00 CET = 18:00Z -> answerStart 5 days earlier, 2026-10-23 18:00Z.
SELECT is(
  (SELECT "answerStart" FROM public.events
    WHERE series_id = :'sid'::uuid AND "startingDateTime" = '2026-10-28T18:00:00Z'::timestamptz),
  '2026-10-23T18:00:00Z'::timestamptz,
  'generated occurrences carry answerStart = start - 5 days');

-- A series without an offset yields events that are always open.
SELECT gen_random_uuid() AS sid2 \gset
INSERT INTO public.event_series(
  id, key, "group", rrule, recurrence, dtstart, duration, answer_start_offset
) VALUES (
  :'sid2'::uuid, :'sid2'::text, '00000000-0000-0000-0000-000000000042',
  'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE', 'Weekly',
  '2026-10-21T17:00:00Z', interval '2 hours', NULL
);
SELECT public._expand_series_sql(:'sid2'::uuid, 60, '2026-10-22T00:00:00Z'::timestamptz) AS r2 \gset
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.events WHERE series_id = :'sid2'::uuid AND "answerStart" IS NOT NULL),
  'a NULL offset leaves answerStart empty (always open)');

SELECT * FROM finish();
ROLLBACK;
