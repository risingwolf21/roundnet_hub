-- Guest trials (20261109150000_guest_trials): invite links, the event limit of trial members,
-- the end of a trial, the feature switch and what guests (anonymous users) may touch.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(39);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@guest-trial.test')
FROM unnest(ARRAY['gt_guest','gt_admin','gt_trial','gt_trial2','gt_other']) n;

-- gt_guest signs in anonymously.
UPDATE auth.users SET is_anonymous = true WHERE id = tests.get_supabase_uid('gt_guest');

\set grp   '00000000-0000-0000-0000-0000000011a1'
\set grp2  '00000000-0000-0000-0000-0000000011a2'
\set open  '00000000-0000-0000-0000-0000000011a3'

INSERT INTO public.event_group(id, name, visible, is_public) VALUES
  (:'grp',  'GuestGrp',  true, true),
  (:'grp2', 'NoGuests',  true, true),
  (:'open', 'OpenGrp',   true, true);

INSERT INTO public.group_features("group", feature) VALUES
  (:'grp',  'events'), (:'grp',  'events.trials'), (:'grp', 'events.trials.guests'),
  (:'grp2', 'events'), (:'grp2', 'events.trials');

INSERT INTO public.group_user_mapping("user","group",role) VALUES
  (tests.get_supabase_uid('gt_admin'),  :'grp',  'admin'),
  (tests.get_supabase_uid('gt_trial'),  :'grp',  'trial'),
  (tests.get_supabase_uid('gt_trial2'), :'grp',  'trial'),
  (tests.get_supabase_uid('gt_other'),  :'open', 'user');

INSERT INTO public.trial_invites("group", token, event_limit) VALUES (:'grp', 'tok-ok', 2);
INSERT INTO public.trial_invites("group", token, event_limit) VALUES (:'grp2', 'tok-nofeature', 2);
INSERT INTO public.trial_invites("group", token, expires_at) VALUES (:'grp', 'tok-expired', now() - interval '1 day');
INSERT INTO public.trial_invites("group", token, max_uses, uses) VALUES (:'grp', 'tok-full', 1, 1);

INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","max_trial_attendees","trials_open")
VALUES ('gt-1','E1','—', now()+interval '1 day', now()+interval '1 day 2 hours', :'grp', 5, true) RETURNING id AS e1 \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","max_trial_attendees","trials_open")
VALUES ('gt-2','E2','—', now()+interval '2 days', now()+interval '2 days 2 hours', :'grp', 5, true) RETURNING id AS e2 \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","max_trial_attendees","trials_open")
VALUES ('gt-3','E3','—', now()+interval '3 days', now()+interval '3 days 2 hours', :'grp', 5, true) RETURNING id AS e3 \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","max_trial_attendees","trials_open")
VALUES ('gt-past','EP','—', now()-interval '2 days', now()-interval '2 days'+interval '2 hours', :'grp', 5, true) RETURNING id AS ep \gset

-- An event not opened for trials (the default) and a series opened for trials.
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES ('gt-closed','Closed','—', now()+interval '4 days', now()+interval '4 days 2 hours', :'grp') RETURNING id AS ec \gset
INSERT INTO public.event_series("group", title, rrule, dtstart, duration, trials_open)
VALUES (:'grp', 'Offen', 'FREQ=WEEKLY;INTERVAL=1;BYDAY=TU', now(), interval '2 hours', true) RETURNING id AS so \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","series_id")
VALUES ('gt-series','Series','—', now()+interval '5 days', now()+interval '5 days 2 hours', :'grp', :'so') RETURNING id AS es \gset

-- A blocked table guests could otherwise read as group members.
INSERT INTO public.event_series("group", title, rrule, dtstart, duration)
VALUES (:'grp', 'Serie', 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO', now(), interval '2 hours');

SELECT ok(EXISTS (SELECT 1 FROM public.features WHERE name = 'events.trials.guests'), 'the feature events.trials.guests is registered');

-- ============================================================================
-- A) Invite links
-- ============================================================================
SELECT tests.authenticate_as('gt_trial');
SELECT throws_ok($$ INSERT INTO public.trial_invites("group") VALUES ('00000000-0000-0000-0000-0000000011a1') $$,
  '42501', NULL, 'a member who is not a group admin cannot create a link');

SELECT tests.authenticate_as('gt_admin');
SELECT lives_ok($$ INSERT INTO public.trial_invites("group", token) VALUES ('00000000-0000-0000-0000-0000000011a1', 'tok-admin') $$,
  'a group admin creates a link');
SELECT throws_ok($$ INSERT INTO public.trial_invites("group") VALUES ('00000000-0000-0000-0000-0000000011a2') $$,
  '42501', NULL, 'no link for a group without events.trials.guests');
SELECT throws_ok($$ UPDATE public.trial_invites SET uses = 5 WHERE token = 'tok-admin' $$,
  '42501', NULL, 'the use counter cannot be changed directly');

SELECT tests.authenticate_as('gt_guest');
SELECT set_config('request.jwt.claims', (current_setting('request.jwt.claims')::jsonb || '{"is_anonymous": true}')::text, true);

SELECT throws_ok($$ SELECT public.redeem_trial_invite('tok-expired') $$, '22023', NULL, 'an expired link is refused');
SELECT throws_ok($$ SELECT public.redeem_trial_invite('tok-full') $$, '22023', NULL, 'a used-up link is refused');
SELECT throws_ok($$ SELECT public.redeem_trial_invite('tok-nofeature') $$, '22023', NULL, 'a link of a group without the feature is refused');
SELECT throws_ok($$ SELECT public.redeem_trial_invite('nope') $$, '22023', NULL, 'an unknown token is refused');
SELECT is(public.redeem_trial_invite('tok-ok', '  Lena  '), :'grp'::uuid, 'a valid link makes the guest a trial member');

SELECT tests.authenticate_as_service_role();
SELECT is((SELECT role::text || '/' || trial_event_limit FROM public.group_user_mapping
            WHERE "user" = tests.get_supabase_uid('gt_guest') AND "group" = :'grp'),
          'trial/2', 'the guest is trial with the limit of the link');
SELECT is((SELECT uses FROM public.trial_invites WHERE token = 'tok-ok'), 1, 'the link counts one use');
SELECT is((SELECT "displayName" FROM public."user" WHERE id = tests.get_supabase_uid('gt_guest')), 'Lena', 'the guest''s name is saved');

-- ============================================================================
-- B) The event limit
-- ============================================================================
SELECT tests.authenticate_as('gt_guest');
SELECT set_config('request.jwt.claims', (current_setting('request.jwt.claims')::jsonb || '{"is_anonymous": true}')::text, true);

INSERT INTO public.event_attendance_user_mapping("user","event","state") VALUES
  (tests.get_supabase_uid('gt_guest'), :'e1'::uuid, 'Attending'),
  (tests.get_supabase_uid('gt_guest'), :'e2'::uuid, 'Attending');

SELECT throws_ok(format($$ INSERT INTO public.event_attendance_user_mapping("user","event","state") VALUES (%L, %L, 'Attending') $$,
                        tests.get_supabase_uid('gt_guest'), :'e3'),
  'P0001', NULL, 'a third sign-up is refused with a limit of 2');

UPDATE public.event_attendance_user_mapping SET state = 'Declined'
  WHERE "user" = tests.get_supabase_uid('gt_guest') AND event = :'e1'::uuid;
SELECT lives_ok(format($$ INSERT INTO public.event_attendance_user_mapping("user","event","state") VALUES (%L, %L, 'Attending') $$,
                       tests.get_supabase_uid('gt_guest'), :'e3'),
  'declining gives the training back');

SELECT results_eq($$ SELECT event_limit, events_used FROM public.trial_status('00000000-0000-0000-0000-0000000011a1') $$,
                  $$ VALUES (2, 2) $$, 'trial_status shows 2 of 2 used');

SELECT tests.authenticate_as_service_role();
UPDATE public.events SET "isCancelled" = true WHERE id = :'e2'::uuid;

SELECT tests.authenticate_as('gt_guest');
SELECT set_config('request.jwt.claims', (current_setting('request.jwt.claims')::jsonb || '{"is_anonymous": true}')::text, true);
SELECT lives_ok(format($$ UPDATE public.event_attendance_user_mapping SET state = 'Attending' WHERE "user" = %L AND event = %L $$,
                       tests.get_supabase_uid('gt_guest'), :'e1'),
  'a cancelled event gives the training back');
SELECT is((SELECT state::text FROM public.event_attendance_user_mapping
            WHERE "user" = tests.get_supabase_uid('gt_guest') AND event = :'e1'::uuid),
          'AttendingAsTrial', 'the guest attends on a trial slot');

-- ============================================================================
-- C) What guests may touch
-- ============================================================================
SELECT is((SELECT count(*)::int FROM public.event_series WHERE "group" = :'grp'), 0, 'guests cannot read blocked tables (event_series)');
SELECT is((SELECT count(*)::int FROM public.trial_invites), 0, 'guests cannot read invite links');
SELECT throws_ok(format($$ INSERT INTO public.group_user_mapping("user","group",role) VALUES (%L, %L, 'user') $$,
                        tests.get_supabase_uid('gt_guest'), :'open'),
  '42501', NULL, 'guests cannot join an open group by themselves');
SELECT is((SELECT count(*)::int FROM public."user" WHERE id = tests.get_supabase_uid('gt_guest')), 1, 'a guest sees their own user row');
SELECT is((SELECT count(*)::int FROM public."user" WHERE id = tests.get_supabase_uid('gt_admin')), 1, 'a guest sees people of their group');
SELECT is((SELECT count(*)::int FROM public."user" WHERE id = tests.get_supabase_uid('gt_other')), 0, 'a guest does not see people outside their groups');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = :'e3'::uuid), 1, 'a guest sees the events of their group');

-- ============================================================================
-- D) The end of a trial
-- ============================================================================
SELECT tests.authenticate_as_service_role();
-- gt_trial: limit 1, used on a past training -> ends. The guest still has future trainings -> stays.
UPDATE public.group_user_mapping SET trial_event_limit = 1
  WHERE "user" = tests.get_supabase_uid('gt_trial') AND "group" = :'grp';
INSERT INTO public.event_attendance_user_mapping("user","event","state")
VALUES (tests.get_supabase_uid('gt_trial'), :'ep'::uuid, 'AttendingAsTrial');

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT public.expire_trial_memberships();

SELECT is((SELECT role::text FROM public.group_user_mapping WHERE "user" = tests.get_supabase_uid('gt_trial') AND "group" = :'grp'),
          'joinRequested', 'a used-up limit whose last training is over ends the trial');
SELECT is((SELECT role::text FROM public.group_user_mapping WHERE "user" = tests.get_supabase_uid('gt_guest') AND "group" = :'grp'),
          'trial', 'a used-up limit with trainings still ahead keeps the trial');

-- ============================================================================
-- E) Switching the feature off ends guest trials only
-- ============================================================================
DELETE FROM public.group_features WHERE "group" = :'grp' AND feature = 'events.trials.guests';

SELECT is((SELECT role::text FROM public.group_user_mapping WHERE "user" = tests.get_supabase_uid('gt_guest') AND "group" = :'grp'),
          'joinRequested', 'switching the feature off ends the guest trial');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping a JOIN public.events e ON e.id = a.event
            WHERE a."user" = tests.get_supabase_uid('gt_guest') AND e."startingDateTime" > now()),
          0, 'and removes the guest''s future sign-ups');
SELECT is((SELECT role::text FROM public.group_user_mapping WHERE "user" = tests.get_supabase_uid('gt_trial2') AND "group" = :'grp'),
          'trial', 'a trial member with an account keeps the trial');
SELECT is((SELECT count(*)::int FROM public.trial_invites WHERE "group" = :'grp' AND active), 0, 'the group''s links stop working');

-- ============================================================================
-- F) Every table with RLS is either blocked for guests or deliberately open
-- ============================================================================
SELECT is(
  (SELECT array_agg(n.nspname || '.' || c.relname ORDER BY 1)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relkind IN ('r','p') AND c.relrowsecurity AND n.nspname IN ('public','games')
     AND NOT EXISTS (SELECT 1 FROM pg_policies p
                     WHERE p.schemaname = n.nspname AND p.tablename = c.relname
                       AND p.policyname IN ('guests_blocked','guests_read_only_insert','guests_user_scope'))
     AND NOT (n.nspname = 'public' AND c.relname = ANY (ARRAY[
       'event_attendance_user_mapping','event_bring_pledges','event_comments','notifications','notification_token',
       'user_notification_preferences','user_notification_settings','web_push_subscriptions','object_subscriptions',
       'user_activity','user_calender_settings','user_calendar_event_mapping']))),
  NULL,
  'no table with RLS is open to guests by accident (add new tables to the guest block)');

-- ============================================================================
-- G) Events open for trials
-- ============================================================================
SELECT is((SELECT trials_open FROM public.events WHERE id = :'es'::uuid), true, 'a new occurrence takes the trial setting of its series');
UPDATE public.event_series SET trials_open = false WHERE id = :'so'::uuid;
SELECT is((SELECT trials_open FROM public.events WHERE id = :'es'::uuid), false, 'closing the series closes its coming occurrences');

SELECT tests.authenticate_as('gt_trial2');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = :'ec'::uuid), 0, 'trial members do not see an event closed for trials');
SELECT is((SELECT count(*)::int FROM public.events_user_view WHERE id = :'ec'::uuid), 0, 'nor in events_user_view');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = :'e3'::uuid), 1, 'trial members see an event open for trials');
SELECT throws_ok(format($$ INSERT INTO public.event_attendance_user_mapping("user","event","state") VALUES (%L, %L, 'Attending') $$,
                        tests.get_supabase_uid('gt_trial2'), :'ec'),
  'P0001', NULL, 'trial members cannot sign up for an event closed for trials');

SELECT tests.authenticate_as('gt_admin');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = :'ec'::uuid), 1, 'members still see an event closed for trials');

SELECT * FROM finish();
ROLLBACK;
