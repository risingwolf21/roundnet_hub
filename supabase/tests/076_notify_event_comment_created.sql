-- file: tests/notify_event_comment_created.sql
BEGIN;
\i 000_setup_tests_users.inc
SET LOCAL TIME ZONE 'UTC';

-- pgTAP
SELECT plan(5);

-- Setup: Testdaten
-- Event + Gruppe
WITH e AS (
  INSERT INTO public.events ("title","startingDateTime","endDateTime","group")
  VALUES ('Test Event', now() + interval '1 day', now() + interval '1 day' + interval '2 hour', '00000000-0000-0000-0000-000000000042')
  RETURNING id, "group"
),
attend AS (
  -- u1 und u2 sind Attending, u3 nicht
  INSERT INTO public.event_attendance_user_mapping ("user","state","event")
  SELECT tests.get_supabase_uid('user_1a')::text, 'Attending'::public."EventAttendance", e.id FROM e
  UNION ALL
  SELECT tests.get_supabase_uid('user_2a')::text, 'Attending'::public."EventAttendance", e.id FROM e
  UNION ALL
  SELECT tests.get_supabase_uid('user_1b')::text, 'Unanswered'::public."EventAttendance", e.id FROM e
  UNION ALL
  SELECT tests.get_supabase_uid('user_2b')::text, 'Declined'::public."EventAttendance", e.id FROM e
  RETURNING event
),
prefs AS (
  INSERT INTO notifications.user_notification_preferences("user","tenant","topic","channel","enabled","scope_type") VALUES 
  (tests.get_supabase_uid('user_1a')::text, '00000000-0000-0000-0000-000000000000', 'event.comment.created', 'webpush', true, 'event')
  ,(tests.get_supabase_uid('user_2a')::text, '00000000-0000-0000-0000-000000000000', 'event.comment.created', 'webpush', false, 'event')
  ,(tests.get_supabase_uid('user_2b')::text, '00000000-0000-0000-0000-000000000000', 'event.comment.created', 'webpush', true, 'event')
  RETURNING "user"
),
comment as (
  INSERT INTO public.event_comments("user", "comment", "displayName", "event")
  VALUES(tests.get_supabase_uid('user_1b')::text, 'Das ist ein Test', 'Test', (SELECT id from e))
)
SELECT 1;

-- Assert: u1 bekommt 1 Notification
SELECT is(
  (SELECT count(*)::int FROM public.notifications n
   WHERE n.topic = 'event.comment.created'
     AND n."user" = tests.get_supabase_uid('user_1a')::text),
  1,
  'u1 receives event.comment.created'
);

-- Assert: u2 ist Attending aber hat Preference disabled -> 0
SELECT is(
  (SELECT count(*)::int FROM public.notifications n
   WHERE n.topic = 'event.comment.created'
     AND n."user" = tests.get_supabase_uid('user_2a')::text),
  0,
  'u2 has disabled pref -> no notification'
);

-- Assert: u3 ist nicht Attending -> 0
SELECT is(
  (SELECT count(*)::int FROM public.notifications n
   WHERE n.topic = 'event.comment.created'
     AND n."user" = tests.get_supabase_uid('user_1b')::text),
  0,
  'u3 not attending -> no notification'
);

SELECT is(
  (SELECT count(*)::int FROM public.notifications n
   WHERE n.topic = 'event.comment.created'
     AND n."user" = tests.get_supabase_uid('user_2b')::text),
  0,
  'user 2b not attending -> with pref on -> no notification'
);

-- Assert: Outbox nur für u1 erzeugt
SELECT is(
  (SELECT count(*)::int FROM public.notification_outbox o
   WHERE o.notification IN (
     SELECT id FROM public.notifications WHERE topic='event.comment.created'
   )),
  1,
  'exactly one outbox row created (for u1)'
);

SELECT * FROM finish();
ROLLBACK;
