-- Tests for public.expire_trial_memberships() (20260602130000_fix_trial_functions).
--
-- The nightly job demotes every group_user_mapping whose role is 'trial' and whose
-- trial_started_at is older than trial_duration_days (default 28) back to 'joinRequested',
-- and removes that user's *future* trial attendance in the group, leaving past attendance
-- and non-expired trials alone. It walks all trials globally, so we assert on our own rows
-- (deterministic) and only that the return count is at least the trials we expired.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(7);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@trial-test.local')
FROM unnest(ARRAY['tx_old','tx_new','tx_null','tx_adm']) n;

\set grp '00000000-0000-0000-0000-0000000000e1'

INSERT INTO public.event_group(id, name, visible, is_public) VALUES (:'grp','ExpireGrp', true, true);

-- Pin the trial window so the test doesn't depend on the environment's configured value.
DELETE FROM public.app_config WHERE key = 'trial_duration_days';
INSERT INTO public.app_config(key, value) VALUES ('trial_duration_days', '28');

-- Three trials plus an admin (recipient of the admin notification).
INSERT INTO public.group_user_mapping("user","group",role) VALUES
  (tests.get_supabase_uid('tx_old'),  :'grp', 'trial'),
  (tests.get_supabase_uid('tx_new'),  :'grp', 'trial'),
  (tests.get_supabase_uid('tx_null'), :'grp', 'trial'),
  (tests.get_supabase_uid('tx_adm'),  :'grp', 'admin');

-- set_trial_started_at() stamps now() only when a row BECOMES trial; a later UPDATE that
-- keeps role = trial preserves whatever we set (that's the back-dating path), so set the ages
-- through an UPDATE rather than the INSERT (which the trigger would overwrite with now()).
UPDATE public.group_user_mapping SET trial_started_at = now() - interval '40 days'
  WHERE "user" = tests.get_supabase_uid('tx_old')  AND "group" = :'grp';   -- expired
UPDATE public.group_user_mapping SET trial_started_at = now() - interval '5 days'
  WHERE "user" = tests.get_supabase_uid('tx_new')  AND "group" = :'grp';   -- still within trial
UPDATE public.group_user_mapping SET trial_started_at = NULL
  WHERE "user" = tests.get_supabase_uid('tx_null') AND "group" = :'grp';   -- never started

-- Future + past events in the group; expired user holds a trial seat on each.
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES ('exp-fut','Fut','—', now()+interval '2 days', now()+interval '2 days 2 hours', :'grp')
RETURNING id AS ev_fut \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES ('exp-past','Past','—', now()-interval '2 days', now()-interval '2 days'+interval '2 hours', :'grp')
RETURNING id AS ev_past \gset

INSERT INTO public.event_attendance_user_mapping("user","event","state") VALUES
  (tests.get_supabase_uid('tx_old'), :'ev_fut'::uuid,  'AttendingAsTrial'),
  (tests.get_supabase_uid('tx_old'), :'ev_past'::uuid, 'AttendingAsTrial');

-- Run the expiry job.
SELECT public.expire_trial_memberships() AS expired \gset

SELECT cmp_ok(:'expired'::int, '>=', 1, 'returns at least the one trial we aged out');

SELECT is((SELECT role::text FROM public.group_user_mapping
            WHERE "user" = tests.get_supabase_uid('tx_old') AND "group" = :'grp'),
          'joinRequested', 'expired trial is demoted to joinRequested');

SELECT is((SELECT role::text FROM public.group_user_mapping
            WHERE "user" = tests.get_supabase_uid('tx_new') AND "group" = :'grp'),
          'trial', 'a trial still inside the window is left untouched');

SELECT is((SELECT role::text FROM public.group_user_mapping
            WHERE "user" = tests.get_supabase_uid('tx_null') AND "group" = :'grp'),
          'trial', 'a trial with no trial_started_at never expires');

SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping
            WHERE "user" = tests.get_supabase_uid('tx_old') AND event = :'ev_fut'::uuid),
          0, 'expired user is removed from the FUTURE event');

SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping
            WHERE "user" = tests.get_supabase_uid('tx_old') AND event = :'ev_past'::uuid),
          1, 'past attendance of the expired user is kept');

-- Idempotency: a second run does not touch the now-joinRequested user again.
SELECT public.expire_trial_memberships();
SELECT is((SELECT role::text FROM public.group_user_mapping
            WHERE "user" = tests.get_supabase_uid('tx_old') AND "group" = :'grp'),
          'joinRequested', 'second run leaves the demoted user as joinRequested (idempotent)');

SELECT * FROM finish();
ROLLBACK;
