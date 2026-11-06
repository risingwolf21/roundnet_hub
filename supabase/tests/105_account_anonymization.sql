-- Regression tests for 20261106080000_account_anonymization.sql
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(15);

SELECT tests.authenticate_as_service_role();

INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","group")
VALUES ('anon-future','Future','D','None', now() + interval '2 days', now() + interval '2 days 3 hours',
        '00000000-0000-0000-0000-000000000042'),
       ('anon-past','Past','D','None', now() - interval '3 days', now() - interval '3 days' + interval '3 hours',
        '00000000-0000-0000-0000-000000000042');

INSERT INTO public.event_attendance_user_mapping("user", event, state)
SELECT tests.get_supabase_uid('user_1b'), id, 'Attending' FROM public.events WHERE "key" IN ('anon-future', 'anon-past');

INSERT INTO public.event_comments("user", event, comment, "displayName")
SELECT tests.get_supabase_uid('user_1b'), id, 'See you there', 'Secret Name' FROM public.events WHERE "key" = 'anon-past';

INSERT INTO public.group_user_mapping("user","group","role")
VALUES (tests.get_supabase_uid('user_1b'), '00000000-0000-0000-0000-000000000042', 'user')
ON CONFLICT DO NOTHING;

INSERT INTO notifications.web_push_subscriptions("user", endpoint, p256dh, auth)
VALUES (tests.get_supabase_uid('user_1b'), 'https://push.example/abc', 'k', 'a');

UPDATE public."user"
SET name = 'Secret Name', "displayName" = 'Secret', "avatarUrl" = 'https://x/y.jpg'
WHERE id = tests.get_supabase_uid('user_1b');

UPDATE games.players
SET display_name = 'Secret', rg_link = 'https://rg.example/secret-1', rg_avatar_url = 'https://rg.example/a.jpg', rg_id = '1'
WHERE linked_user_id = tests.get_supabase_uid('user_1b');

SELECT public.anonymize_user(tests.get_supabase_uid('user_1b'));

SELECT is((SELECT name FROM public."user" WHERE id = tests.get_supabase_uid('user_1b')),
  'Gelöschter Nutzer', 'name is replaced');
SELECT is((SELECT "displayName" FROM public."user" WHERE id = tests.get_supabase_uid('user_1b')),
  'Gelöschter Nutzer', 'display name is replaced');
SELECT is((SELECT email FROM public."user" WHERE id = tests.get_supabase_uid('user_1b')),
  'deleted-' || tests.get_supabase_uid('user_1b') || '@deleted.invalid', 'email is replaced by a placeholder');
SELECT ok((SELECT "avatarUrl" IS NULL AND disabled FROM public."user" WHERE id = tests.get_supabase_uid('user_1b')),
  'avatar removed and account disabled');

SELECT ok((SELECT display_name = 'Gelöschter Nutzer' AND rg_link IS NULL AND rg_avatar_url IS NULL AND rg_id IS NULL
             FROM games.players WHERE linked_user_id = tests.get_supabase_uid('user_1b')),
  'player profile is scrubbed but the row stays');

SELECT is((SELECT count(*)::int FROM public.group_user_mapping WHERE "user" = tests.get_supabase_uid('user_1b')),
  0, 'group memberships are removed');
SELECT is((SELECT count(*)::int FROM notifications.web_push_subscriptions WHERE "user" = tests.get_supabase_uid('user_1b')),
  0, 'push subscriptions are removed');

SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping a JOIN public.events e ON e.id = a.event
            WHERE a."user" = tests.get_supabase_uid('user_1b') AND e."key" = 'anon-future'),
  0, 'attendance of upcoming events is removed');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping a JOIN public.events e ON e.id = a.event
            WHERE a."user" = tests.get_supabase_uid('user_1b') AND e."key" = 'anon-past'),
  1, 'attendance of past events is kept');

SELECT is((SELECT "displayName" FROM public.event_comments WHERE "user" = tests.get_supabase_uid('user_1b')),
  'Gelöschter Nutzer', 'name copy on comments is replaced');
SELECT is((SELECT comment FROM public.event_comments WHERE "user" = tests.get_supabase_uid('user_1b')),
  'See you there', 'comment text is kept');

RESET ROLE;
SELECT is((SELECT count(*)::int FROM audit.log
            WHERE schema_name = 'public' AND table_name = 'user' AND row_pk ->> 'id' = tests.get_supabase_uid('user_1b')::text),
  0, 'audit copies of the old profile are removed');

-- idempotent
SELECT tests.authenticate_as_service_role();
SELECT lives_ok($$ SELECT public.anonymize_user(tests.get_supabase_uid('user_1b')) $$, 'can run twice');
SELECT throws_ok($$ SELECT public.anonymize_user('00000000-0000-0000-0000-00000000dead') $$, 'P0002', NULL,
  'unknown user raises');

-- only the service role may call it
SELECT tests.authenticate_as('user_1a');
SELECT throws_ok(
  format($$ SELECT public.anonymize_user(%L) $$, tests.get_supabase_uid('user_2a')),
  '42501', NULL, 'regular users cannot anonymize accounts');

SELECT * FROM finish();
ROLLBACK;
