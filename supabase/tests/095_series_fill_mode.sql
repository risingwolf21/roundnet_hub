-- 095_series_fill_mode.sql
--
-- apply_series_occurrences(..., 'fill') is the NON-RETROACTIVE mode used by automatic
-- generation (nightly cron + "generate upcoming"). It must ONLY add occurrences for slot
-- dates that do not yet exist — never update, move, cancel or delete an existing occurrence,
-- and never prune a future occurrence that is absent from the slot set. This is what makes
-- turning the feature on / letting the cron run safe for existing (incl. customised) events.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(7);

SELECT (now() AT TIME ZONE 'Europe/Berlin')::date AS d0 \gset
SELECT gen_random_uuid() AS sid \gset

CREATE FUNCTION pg_temp.slot(d date, hh time) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'occurrence_date', d,
    'starting', ((d + hh)                      AT TIME ZONE 'Europe/Berlin'),
    'ending',   ((d + hh + interval '2 hours') AT TIME ZONE 'Europe/Berlin'),
    'deadline', ((d + hh - interval '2 hours') AT TIME ZONE 'Europe/Berlin'),
    'meeting',  null
  );
$$;

INSERT INTO public.event_series(
  id, key, "group", title, timezone, rrule, recurrence, dtstart, duration, answer_offset, created_by
) VALUES (
  :'sid'::uuid, :'sid'::text, '00000000-0000-0000-0000-000000000042',
  'S', 'Europe/Berlin', 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE', 'Weekly',
  ((:'d0'::date + time '19:00') AT TIME ZONE 'Europe/Berlin'), interval '2 hours',
  interval '-2 hours', tests.get_supabase_uid('user_1a')
);

-- Seed two future occurrences (fill) and then customise one of them, as a user would.
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 7,  '19:00'),
  pg_temp.slot(:'d0'::date + 14, '19:00')
), 'fill') AS seed \gset

UPDATE public.events
  SET title = 'CUSTOM',
      "startingDateTime" = (:'d0'::date + 7 + time '20:00') AT TIME ZONE 'Europe/Berlin'
  WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 7;

-- Fill again: d0+7 already exists (must stay as customised), d0+21 is new (insert),
-- d0+14 is deliberately omitted (must NOT be pruned in fill mode).
SELECT public.apply_series_occurrences(:'sid'::uuid, jsonb_build_array(
  pg_temp.slot(:'d0'::date + 7,  '19:00'),
  pg_temp.slot(:'d0'::date + 21, '19:00')
), 'fill') AS r \gset

SELECT is((:'r'::jsonb)->>'inserted',  '1', 'fill inserts only the new date (d0+21)');
SELECT is((:'r'::jsonb)->>'updated',   '0', 'fill never updates an existing occurrence');
SELECT is((:'r'::jsonb)->>'cancelled', '0', 'fill never cancels');
SELECT is((:'r'::jsonb)->>'deleted',   '0', 'fill never deletes');

SELECT is(
  (SELECT title || '|' || ("startingDateTime" AT TIME ZONE 'Europe/Berlin')::time::text
     FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 7),
  'CUSTOM|20:00:00',
  'fill leaves a customised existing occurrence untouched');

SELECT is(
  (SELECT count(*)::int FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 14),
  1, 'fill does not prune a future occurrence missing from the slot set');

SELECT is(
  (SELECT count(*)::int FROM public.events WHERE series_id = :'sid'::uuid AND occurrence_date = :'d0'::date + 21),
  1, 'fill inserted the genuinely new occurrence');

SELECT * FROM finish();
ROLLBACK;
