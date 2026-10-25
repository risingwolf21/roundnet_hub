-- 092_series_apply.sql
--
-- Exercises public.apply_series_occurrences: the SQL merge that materializes RRULE slots
-- into occurrences. Covers insert + item materialization, idempotent re-apply,
-- update-future-in-place (id + attendance preserved), prune (cancel when attended /
-- delete when not), detached-skip and past-skip.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(14);

-- local "today" in the series timezone; all slots are built relative to it
SELECT (now() AT TIME ZONE 'Europe/Berlin')::date AS d0 \gset
SELECT gen_random_uuid() AS sid \gset

-- one slot {occurrence_date, starting, ending (+2h), deadline (-2h), meeting:null}
CREATE FUNCTION pg_temp.slot(d date, hh time) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'occurrence_date', d,
    'starting', ((d + hh)                      AT TIME ZONE 'Europe/Berlin'),
    'ending',   ((d + hh + interval '2 hours') AT TIME ZONE 'Europe/Berlin'),
    'deadline', ((d + hh - interval '2 hours') AT TIME ZONE 'Europe/Berlin'),
    'meeting',  null
  );
$$;

-- Series template (weekly, 19:00, 2h, deadline -2h, one bring-item)
INSERT INTO public.event_series(
  id, key, "group", title, timezone, rrule, recurrence, dtstart, duration,
  answer_offset, items_enabled, items_template, created_by
) VALUES (
  :'sid'::uuid, :'sid'::text, '00000000-0000-0000-0000-000000000042',
  'S', 'Europe/Berlin', 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE', 'Weekly',
  ((:'d0'::date + time '19:00') AT TIME ZONE 'Europe/Berlin'), interval '2 hours',
  interval '-2 hours', true,
  '[{"name":"Bälle","unit":"Stk","required_qty":5,"sort_order":1}]'::jsonb,
  tests.get_supabase_uid('user_1a')
);

-- ---- apply #1: one past (d0-7) + three future (d0+7/14/21) -----------
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date - 7,  '19:00'),
  pg_temp.slot(:'d0'::date + 7,  '19:00'),
  pg_temp.slot(:'d0'::date + 14, '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00')
)) AS r1 \gset
SELECT is((:'r1'::jsonb)->>'inserted', '4', 'apply #1 inserts 4 new occurrences');
SELECT is((SELECT count(*)::int FROM public.events WHERE series_id = :'sid'::uuid), 4,
  'all 4 occurrences linked to the series');
SELECT is(
  (SELECT count(*)::int FROM public.event_bring_items bi
     JOIN public.events e ON e.id = bi.event WHERE e.series_id = :'sid'::uuid),
  4, 'items template materialized (one per new occurrence)');

-- ---- apply #2: same slots → idempotent (past skipped, futures updated no-op) --
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date - 7,  '19:00'),
  pg_temp.slot(:'d0'::date + 7,  '19:00'),
  pg_temp.slot(:'d0'::date + 14, '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00')
)) AS r2 \gset
SELECT is((:'r2'::jsonb)->>'inserted', '0', 'apply #2 inserts nothing (idempotent)');
SELECT is((:'r2'::jsonb)->>'updated',  '3', 'apply #2 updates the 3 future occurrences (past skipped)');

-- ---- update-in-place preserves id + attendance ----------------------
SELECT id AS aid FROM public.events
  WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 7 \gset
INSERT INTO public.event_attendance_user_mapping("user","event","state")
  VALUES (tests.get_supabase_uid('user_1a'), :'aid'::uuid, 'Attending');
UPDATE public.event_series SET title = 'S2' WHERE id = :'sid'::uuid;

-- move occurrence A to 20:00 (same occurrence_date), keep B/C
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 7,  '20:00'),
  pg_temp.slot(:'d0'::date + 14, '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00')
)) AS r3 \gset
SELECT is(
  (SELECT id FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 7),
  :'aid'::uuid, 'future occurrence updated in place (id preserved)');
SELECT is(
  (SELECT ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time::text || '|' || title
     FROM public.events WHERE id = :'aid'::uuid),
  '20:00:00|S2', 'occurrence moved to 20:00 local and took the new title');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = :'aid'::uuid),
  1, 'attendance survived the series edit');

-- ---- prune: attended future occurrence is cancelled, not deleted ----
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 14, '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00')
)) AS r4 \gset
SELECT is((SELECT "isCancelled" FROM public.events WHERE id = :'aid'::uuid), true,
  'pruned occurrence WITH attendance is cancelled, not deleted');

-- ---- prune: unattended future occurrence is deleted -----------------
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 14, '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00'),
  pg_temp.slot(:'d0'::date + 28, '19:00')
)) AS r5 \gset
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 14, '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00')
)) AS r6 \gset
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 28),
  0, 'pruned occurrence WITHOUT attendance is deleted');

-- ---- detached occurrence is left alone; non-detached follows edits ---
UPDATE public.events SET detached = true
  WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 14;
UPDATE public.event_series SET title = 'S3' WHERE id = :'sid'::uuid;
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 14, '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00')
)) AS r7 \gset
SELECT is((SELECT title FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 14),
  'S2', 'detached occurrence is not rewritten by a series edit');
SELECT is((SELECT title FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 21),
  'S3', 'non-detached future occurrence follows the series edit');

-- ---- past occurrence is never rewritten -----------------------------
SELECT is((SELECT title FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date - 7),
  'S', 'past occurrence is never rewritten by series edits');

-- ---- key-rewrite (event_transformations style) is treated as detached ----
-- Rewrite occurrence C's key (what apply_transformation_to_event does to decouple it),
-- then push a series edit: the expander must leave the key-mismatched occurrence alone.
UPDATE public.events SET "key" = gen_random_uuid()::text
  WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 21;
UPDATE public.event_series SET title = 'S4' WHERE id = :'sid'::uuid;
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 21, '19:00')
)) AS r8 \gset
SELECT is((SELECT title FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 21),
  'S3', 'key-rewritten (transformed) occurrence is not touched by a series edit');

SELECT * FROM finish();
ROLLBACK;
