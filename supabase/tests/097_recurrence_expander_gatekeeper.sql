-- Tests for the pg_cron recurrence gatekeeper
-- (public.run_recurrence_expander_if_needed / expand_all_due_series, 20261025160000).
--
-- The nightly 02:00 job only does work when some ACTIVE series is within ~55 days of running
-- dry; when it does, expand_all_due_series fills every active series' upcoming occurrences via
-- the idempotent 'fill' path (_expand_series_sql is covered for DST in 094). Here we verify the
-- gatekeeper's decision + that inactive series are never expanded.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(4);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

\set grp '00000000-0000-0000-0000-000000000042'

SELECT gen_random_uuid() AS sid_due \gset
SELECT gen_random_uuid() AS sid_off \gset

-- Active weekly series, anchored two weeks ago, with NO occurrences yet -> it is "running dry",
-- so the gatekeeper must decide work is needed.
INSERT INTO public.event_series(id, key, "group", title, rrule, recurrence, dtstart, duration, active, created_by)
VALUES (:'sid_due'::uuid, :'sid_due'::text, :'grp', 'Due',
        'FREQ=WEEKLY;INTERVAL=1', 'Weekly',
        ((now() - interval '14 days')), interval '2 hours', true, tests.get_supabase_uid('user_1a'));

-- Inactive series: must never be expanded, regardless of the gatekeeper firing.
INSERT INTO public.event_series(id, key, "group", title, rrule, recurrence, dtstart, duration, active, created_by)
VALUES (:'sid_off'::uuid, :'sid_off'::text, :'grp', 'Off',
        'FREQ=WEEKLY;INTERVAL=1', 'Weekly',
        ((now() - interval '14 days')), interval '2 hours', false, tests.get_supabase_uid('user_1a'));

-- Fire the gatekeeper.
SELECT public.run_recurrence_expander_if_needed() AS r \gset

SELECT ok((:'r'::jsonb) ? 'processed',
          'gatekeeper invokes the expander when an active series is running dry');

SELECT cmp_ok(
  (SELECT count(*)::int FROM public.events WHERE series_id = :'sid_due'::uuid AND "startingDateTime" > now()),
  '>=', 1, 'the due series gets upcoming occupancy generated');

SELECT is(
  (SELECT count(*)::int FROM public.events WHERE series_id = :'sid_off'::uuid),
  0, 'an inactive series is never expanded');

-- Re-running is a no-op for already-filled occurrences (fill mode never rewrites): the future
-- occurrence count does not shrink or duplicate on a second pass.
SELECT (SELECT count(*)::int FROM public.events WHERE series_id = :'sid_due'::uuid) AS n1 \gset
SELECT public.run_recurrence_expander_if_needed();
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE series_id = :'sid_due'::uuid),
  :'n1'::int, 'a second gatekeeper run neither duplicates nor drops occurrences (idempotent fill)');

SELECT * FROM finish();
ROLLBACK;
