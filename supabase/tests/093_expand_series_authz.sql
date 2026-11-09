-- 093_expand_series_authz.sql
--
-- public.expand_series is the authenticated entry point the frontend calls to apply
-- browser-expanded slots. It must enforce the same authorization as editing the series
-- (event.edit + full member of the series' group) before delegating to the merge.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(2);

SELECT gen_random_uuid() AS sid \gset

-- Series in group 42 (user_1a is admin + has event.edit there; user_1c is not a member).
SELECT tests.authenticate_as_service_role();
INSERT INTO public.event_series(id, key, "group", rrule, recurrence, dtstart, duration)
VALUES (
  :'sid'::uuid, :'sid'::text, '00000000-0000-0000-0000-000000000042',
  'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE', 'Weekly',
  (now() + interval '1 day'), interval '2 hours'
);

-- A non-member cannot expand the series.
SELECT tests.authenticate_as('user_1c');
SELECT throws_ok(
  format('SELECT public.expand_series(%L::uuid, %L::jsonb)', :'sid', '[]'),
  '42501', NULL,
  'expand_series is forbidden for a non-member'
);

-- An editor of the series' group can (empty slots is a valid no-op).
SELECT tests.authenticate_as('user_1a');
SELECT lives_ok(
  format('SELECT public.expand_series(%L::uuid, %L::jsonb)', :'sid', '[]'),
  'expand_series allowed for an event.edit member of the group'
);

SELECT * FROM finish();
ROLLBACK;
