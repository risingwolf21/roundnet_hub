-- 121_calendar_feed_events.sql
-- public.calendar_feed_events(token, all): the two calendar feed options.
-- Attending feed: only events the user attends. All feed: every event in the user's groups,
-- past and future, that they haven't declined. Cancelled events and other groups' events never show.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(8);

SELECT tests.authenticate_as_service_role();

-- user_2a is a plain member of group 42 and not in group 43.
INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","group","isCancelled") VALUES
  ('cf-attending', 'CF Attending',  '', 'None', now() + interval '1 day',  now() + interval '1 day 2 hours',  '00000000-0000-0000-0000-000000000042', false),
  ('cf-trainer',   'CF Trainer',    '', 'None', now() + interval '2 days', now() + interval '2 days 2 hours', '00000000-0000-0000-0000-000000000042', false),
  ('cf-open',      'CF Unanswered', '', 'None', now() + interval '3 days', now() + interval '3 days 2 hours', '00000000-0000-0000-0000-000000000042', false),
  ('cf-past',      'CF Past',       '', 'None', now() - interval '3 days', now() - interval '3 days' + interval '2 hours', '00000000-0000-0000-0000-000000000042', false),
  ('cf-waiting',   'CF Waiting',    '', 'None', now() + interval '4 days', now() + interval '4 days 2 hours', '00000000-0000-0000-0000-000000000042', false),
  ('cf-declined',  'CF Declined',   '', 'None', now() + interval '5 days', now() + interval '5 days 2 hours', '00000000-0000-0000-0000-000000000042', false),
  ('cf-cancelled', 'CF Cancelled',  '', 'None', now() + interval '6 days', now() + interval '6 days 2 hours', '00000000-0000-0000-0000-000000000042', true),
  ('cf-foreign',   'CF Foreign',    '', 'None', now() + interval '7 days', now() + interval '7 days 2 hours', '00000000-0000-0000-0000-000000000043', false);

DELETE FROM public.event_attendance_user_mapping
WHERE "user" = tests.get_supabase_uid('user_2a') AND event IN (SELECT id FROM public.events WHERE "key" LIKE 'cf-%');

INSERT INTO public.event_attendance_user_mapping("user", event, state)
SELECT tests.get_supabase_uid('user_2a'), e.id, s.state::public."EventAttendance"
FROM (VALUES ('cf-attending','Attending'), ('cf-trainer','AttendingAsTrainer'), ('cf-waiting','Waiting'),
             ('cf-declined','Declined'), ('cf-cancelled','Attending')) AS s("key", state)
JOIN public.events e ON e."key" = s."key";

INSERT INTO public.calendar_feed_tokens("user", token)
VALUES (tests.get_supabase_uid('user_2a'), '00000000-0000-0000-0000-0000000cf001')
ON CONFLICT ("user") DO UPDATE SET token = excluded.token;

SELECT results_eq(
  $$ SELECT title FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf001') WHERE title LIKE 'CF %' ORDER BY title $$,
  $$ VALUES ('CF Attending'), ('CF Trainer') $$,
  'attending feed: only attended events, also as trainer');

SELECT results_eq(
  $$ SELECT title FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf001', true) WHERE title LIKE 'CF %' ORDER BY title $$,
  $$ VALUES ('CF Attending'), ('CF Past'), ('CF Trainer'), ('CF Unanswered'), ('CF Waiting') $$,
  'all feed: every event of the group, past and future, except declined ones');

SELECT ok(NOT EXISTS (SELECT 1 FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf001', true) WHERE title = 'CF Cancelled'),
  'cancelled events are left out, even when attending');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf001', true) WHERE title = 'CF Foreign'),
  'events of groups the user is not in are left out');
SELECT is_empty($$ SELECT * FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf999', true) $$,
  'an unknown token returns nothing');

-- Trial members only see events open for trials.
UPDATE public.group_user_mapping SET role = 'trial'
WHERE "user" = tests.get_supabase_uid('user_2a') AND "group" = '00000000-0000-0000-0000-000000000042';
UPDATE public.events SET trials_open = ("key" = 'cf-open') WHERE "key" IN ('cf-open', 'cf-past');
SELECT ok(EXISTS (SELECT 1 FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf001', true) WHERE title = 'CF Unanswered'),
  'a trial member sees events open for trials');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf001', true) WHERE title = 'CF Past'),
  'but not events closed for trials');

SELECT tests.authenticate_as('user_2a');
SELECT throws_ok($$ SELECT * FROM public.calendar_feed_events('00000000-0000-0000-0000-0000000cf001', true) $$,
  '42501', NULL, 'signed-in users cannot call it, only the feed function');

SELECT * FROM finish();
ROLLBACK;
