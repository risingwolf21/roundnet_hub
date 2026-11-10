-- 20261110140000_cleanup_guests: guests that are no longer in a trial and were not seen for
-- 7 days are deleted nightly; running trials, recent guests and real accounts stay.
BEGIN;
SELECT plan(8);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@cleanup-guests.test')
FROM unnest(ARRAY['cg_ended','cg_trial','cg_recent','cg_member']) n;
UPDATE auth.users SET is_anonymous = true, email = NULL
WHERE id IN (tests.get_supabase_uid('cg_ended'), tests.get_supabase_uid('cg_trial'), tests.get_supabase_uid('cg_recent'));
-- Everyone signed up long ago except the recent guest.
UPDATE auth.users SET created_at = now() - interval '30 days', last_sign_in_at = NULL
WHERE id IN (tests.get_supabase_uid('cg_ended'), tests.get_supabase_uid('cg_trial'), tests.get_supabase_uid('cg_member'));
UPDATE public."user" SET last_seen_at = NULL
WHERE id IN (tests.get_supabase_uid('cg_ended'), tests.get_supabase_uid('cg_trial'), tests.get_supabase_uid('cg_member'));

\set grp '00000000-0000-0000-0000-0000000011e1'
INSERT INTO public.event_group(id, name, visible, is_public) VALUES (:'grp', 'CleanupGrp', true, true);
INSERT INTO public.group_user_mapping("user","group",role) VALUES
  (tests.get_supabase_uid('cg_ended'), :'grp', 'joinRequested'),
  (tests.get_supabase_uid('cg_trial'), :'grp', 'trial'),
  (tests.get_supabase_uid('cg_member'), :'grp', 'user');

-- The ended guest attended a training: the row must not block the delete.
INSERT INTO public.events(id, "key", "title","description","startingDateTime","endDateTime","group", trials_open)
VALUES ('00000000-0000-0000-0000-0000000011e2', 'cg-ev', 'Alt', '—', now() - interval '20 days', now() - interval '20 days' + interval '2 hours', :'grp', true);
INSERT INTO public.event_attendance_user_mapping(event, "user", state)
VALUES ('00000000-0000-0000-0000-0000000011e2', tests.get_supabase_uid('cg_ended'), 'AttendingAsTrial');

SELECT tests.get_supabase_uid('cg_ended') AS ended \gset
SELECT ok(public.delete_abandoned_guests() >= 1, 'abandoned guests are deleted');

SELECT is((SELECT count(*)::int FROM auth.users WHERE id = :'ended'::uuid), 0, 'the auth user is gone');
SELECT is((SELECT count(*)::int FROM public."user" WHERE id = :'ended'::uuid), 0, 'the profile is gone');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE "user" = :'ended'::uuid), 0, 'their attendance is gone');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = tests.get_supabase_uid('cg_trial')), 1, 'a guest in a running trial stays');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = tests.get_supabase_uid('cg_recent')), 1, 'a guest seen recently stays');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = tests.get_supabase_uid('cg_member')), 1, 'a real account stays');

SELECT is((SELECT count(*)::int FROM cron.job WHERE jobname = 'delete_abandoned_guests' AND command LIKE '%public.delete_abandoned_guests()%'), 1,
          'abandoned guests are deleted nightly');

SELECT * FROM finish();
ROLLBACK;
