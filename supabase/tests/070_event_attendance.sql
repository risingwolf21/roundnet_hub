BEGIN;
\i 000_setup_tests_users.inc
SET LOCAL TIME ZONE 'UTC';
SELECT plan(10);

-- ------------------------------------------------------------------
-- Test-Setup
-- ------------------------------------------------------------------
-- saubere Basis
DELETE FROM public.events WHERE "key" IN ('t-rsvp-future','t-rsvp-past','t-rsvp-cancel');
DELETE FROM public.event_attendance_user_mapping
WHERE event IN (SELECT id FROM public.events WHERE "key" IN ('t-rsvp-future','t-rsvp-past','t-rsvp-cancel'));

-- nötige Permission (falls noch nicht da)
INSERT INTO public.permissions(name) VALUES ('event.attendance.manage') ON CONFLICT DO NOTHING;

-- Gruppe: aus 00_test_helpers.sql: 00000000-0000-0000-0000-000000000042
-- Mitgliedschaften sind dort auch angelegt (a1=admin, b2=user).

-- Events anlegen
INSERT INTO public.events(
  "key","title","description","recurrence",
  "startingDateTime","endDateTime","group","isCancelled"
) VALUES
  -- zukünftiges Event (morgen)
  ('t-rsvp-future','RSVP Future','...', 'None',
   now() + interval '1 day', now() + interval '1 day' + interval '2 hours',
   '00000000-0000-0000-0000-000000000042', false),
  -- vergangenes Event (gestern)
  ('t-rsvp-past','RSVP Past','...', 'None',
   now() - interval '1 day', now() - interval '1 day' + interval '2 hours',
   '00000000-0000-0000-0000-000000000042', false),
  -- abgesagtes zukünftiges Event
  ('t-rsvp-cancel','RSVP Cancelled','...', 'None',
   now() + interval '1 day', now() + interval '1 day' + interval '2 hours',
   '00000000-0000-0000-0000-000000000042', true);

-- Helfer: Event-IDs per Key auflösen
WITH e AS (
  SELECT "key", id FROM public.events WHERE "key" IN ('t-rsvp-future','t-rsvp-past','t-rsvp-cancel')
)
SELECT ok( (SELECT count(*) FROM e) = 3, '3 Test-Events vorbereitet');

-- ------------------------------------------------------------------
-- 1) Self-RSVP auf zukünftiges Event (erwartet: OK)
-- ------------------------------------------------------------------
SELECT tests.authenticate_as('user_1a'); -- a1

SELECT lives_ok(
  $$
  SELECT public.update_attendance(
    (SELECT id FROM public.events WHERE "key"='t-rsvp-future'),
    tests.get_supabase_uid('user_1a')::text,
    'Attending'::public."EventAttendance"
  )
  $$,
  'Self-RSVP (Attending) auf zukünftiges Event klappt'
);

SELECT is(
  (
    SELECT state::text
    FROM public.event_attendance_user_mapping
    WHERE event=(SELECT id FROM public.events WHERE "key"='t-rsvp-future')
      AND "user"=tests.get_supabase_uid('user_1a')::text
  ),
  'Attending',
  'Status wurde als Attending gespeichert'
);


-- a1 versucht b2 -> Attending (ohne Permission)
SELECT tests.authenticate_as('user_1a');

SELECT throws_like(
  $$
  SELECT public.update_attendance(
    (SELECT id FROM public.events WHERE "key"='t-rsvp-future'),
    tests.get_supabase_uid('user_2b')::text,
    'Attending'::public."EventAttendance"
  )
  $$,
  '%forbidden%',
  'Ohne event.attendance.manage kann ich b2 nicht promoten'
);

-- ------------------------------------------------------------------
-- 2) Kein RSVP für andere Person ohne Manage-Permission (erwartet: Fehler)
-- ------------------------------------------------------------------
-- sicherstellen, dass die Gruppe aktuell KEINE manage-Permission hat
-- Grants/Features sauber als Service-Role setzen
SELECT tests.authenticate_as_service_role();
INSERT INTO public.group_permissions("group","permission")VALUES('00000000-0000-0000-0000-000000000042','event.attendance.manage')
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1c'); -- a1


SELECT throws_like(
  $$
  SELECT public.update_attendance(
    (SELECT id FROM public.events WHERE "key"='t-rsvp-future'),
    tests.get_supabase_uid('user_2b')::text,           -- anderer User
    'Attending'::public."EventAttendance"
  )
  $$,
  '%forbidden%',
  'Ohne Permission darf ich nicht für andere zu-/absagen'
);

-- ------------------------------------------------------------------
-- 3) Kein RSVP auf vergangenes Event (erwartet: Fehler)
-- ------------------------------------------------------------------
SELECT tests.authenticate_as('user_1a');
SELECT throws_like(
  $$
  SELECT public.update_attendance(
    (SELECT id FROM public.events WHERE "key"='t-rsvp-past'),
    tests.get_supabase_uid('user_1a')::text,
    'Attending'::public."EventAttendance"
  )
  $$,
  '%event closed%',
  'Vergangenes Event: keine Zu-/Absage erlaubt'
);

-- ------------------------------------------------------------------
-- 4) Kein RSVP auf abgesagtes Event (erwartet: Fehler)
-- ------------------------------------------------------------------
SELECT throws_like(
  $$
  SELECT public.update_attendance(
    (SELECT id FROM public.events WHERE "key"='t-rsvp-cancel'),
    tests.get_supabase_uid('user_1a')::text,
    'Attending'::public."EventAttendance"
  )
  $$,
  '%event closed%',
  'Abgesagtes Event: keine Zu-/Absage erlaubt'
);

-- ------------------------------------------------------------------
-- 5) Anfrage bestätigen: ohne Permission FAIL, mit Permission OK
-- ------------------------------------------------------------------
-- erst: b2 loggt sich ein und erstellt eigene Anfrage (Waiting)
SELECT tests.authenticate_as('user_2a');

SELECT lives_ok(
  $$
  SELECT public.update_attendance(
    (SELECT id FROM public.events WHERE "key"='t-rsvp-future'),
    tests.get_supabase_uid('user_2a')::text,
    'Waiting'::public."EventAttendance"
  )
  $$,
  '2a setzt eigenen Status auf Waiting'
);

-- Permission vergeben und erneut versuchen
SELECT tests.authenticate_as_service_role();
INSERT INTO public.group_permissions("group","permission")VALUES('00000000-0000-0000-0000-000000000042','event.attendance.manage')
ON CONFLICT DO NOTHING;
SELECT tests.authenticate_as('user_1a');

SELECT lives_ok(
  $$
  SELECT public.update_attendance(
    (SELECT id FROM public.events WHERE "key"='t-rsvp-future'),
    tests.get_supabase_uid('user_2b')::text,
    'Attending'::public."EventAttendance"
  )
  $$,
  'Mit event.attendance.manage darf ich b2 promoten'
);

SELECT is(
  (
    SELECT state::text
    FROM public.event_attendance_user_mapping
    WHERE event=(SELECT id FROM public.events WHERE "key"='t-rsvp-future')
      AND "user"=tests.get_supabase_uid('user_2b')::text
  ),
  'Attending',
  'b2 wurde erfolgreich auf Attending gesetzt'
);

SELECT * FROM finish();
ROLLBACK;
