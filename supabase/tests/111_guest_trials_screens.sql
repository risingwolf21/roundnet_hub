-- Guest trials, part 2 (20261110100000_guest_trials_screens): invite info for the invite page,
-- trial_status.is_guest, insert_event_with_bring_items storing the trial fields, e-mail sync.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(11);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@guest-screens.test')
FROM unnest(ARRAY['gs_guest','gs_admin']) n;
UPDATE auth.users SET is_anonymous = true, email = NULL WHERE id = tests.get_supabase_uid('gs_guest');

\set grp  '00000000-0000-0000-0000-0000000011b1'
\set grp2 '00000000-0000-0000-0000-0000000011b2'

INSERT INTO public.event_group(id, name, visible, is_public) VALUES
  (:'grp', 'Basic Training', true, true),
  (:'grp2', 'Ohne Gäste', true, true);
-- Features the test needs, whatever the seed contains.
INSERT INTO public.features(name) VALUES ('events'), ('events.trials'), ('events.trials.guests') ON CONFLICT DO NOTHING;
INSERT INTO public.group_features("group", feature) VALUES
  (:'grp', 'events'), (:'grp', 'events.trials'), (:'grp', 'events.trials.guests'),
  (:'grp2', 'events'), (:'grp2', 'events.trials');
INSERT INTO public.group_user_mapping("user","group",role) VALUES
  (tests.get_supabase_uid('gs_admin'), :'grp', 'admin');

INSERT INTO public.trial_invites("group", token, event_limit) VALUES (:'grp', 'gs-ok', 3);
INSERT INTO public.trial_invites("group", token, active) VALUES (:'grp', 'gs-off', false);
INSERT INTO public.trial_invites("group", token) VALUES (:'grp2', 'gs-nofeature');

-- ============================================================================
-- 0) A guest can sign up at all (anonymous auth user, no e-mail)
-- ============================================================================
INSERT INTO auth.users(id, aud, role, is_anonymous, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-0000000011bf', 'authenticated', 'authenticated', true, '{"name": "Gast", "displayName": "Gast"}');
SELECT is((SELECT email FROM public."user" WHERE id = '00000000-0000-0000-0000-0000000011bf'), '',
          'an anonymous sign-up creates the profile with an empty e-mail');
SELECT is((SELECT email FROM public."user" WHERE id = tests.get_supabase_uid('gs_guest')), '',
          'removing the e-mail of an auth user leaves an empty e-mail, not NULL');

-- ============================================================================
-- A) The invite page, before anyone signs in
-- ============================================================================
SET LOCAL ROLE anon;
SELECT results_eq($$ SELECT group_name, event_limit, valid FROM public.trial_invite_info('gs-ok') $$,
                  $$ VALUES ('Basic Training'::text, 3, true) $$,
                  'anon reads group name and limit of a valid link');
SELECT is((SELECT valid FROM public.trial_invite_info('gs-off')), false, 'a deactivated link is not valid');
SELECT is((SELECT valid FROM public.trial_invite_info('gs-nofeature')), false, 'a link of a group without the feature is not valid');
SELECT is((SELECT count(*)::int FROM public.trial_invite_info('nope')), 0, 'an unknown token returns nothing');
RESET ROLE;

-- ============================================================================
-- B) trial_status says whether the trial member is a guest
-- ============================================================================
SELECT tests.authenticate_as('gs_guest');
SELECT set_config('request.jwt.claims', (current_setting('request.jwt.claims')::jsonb || '{"is_anonymous": true}')::text, true);
SELECT public.redeem_trial_invite('gs-ok', 'Lena');

SELECT tests.authenticate_as('gs_admin');
SELECT results_eq(format($$ SELECT event_limit, events_used, is_guest FROM public.trial_status(%L, %L) $$, :'grp', tests.get_supabase_uid('gs_guest')),
                  $$ VALUES (3, 0, true) $$,
                  'a group admin sees the guest''s limit, usage and that they are a guest');

-- ============================================================================
-- C) insert_event_with_bring_items keeps the trial fields
-- ============================================================================
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT event_id AS ev FROM public.insert_event_with_bring_items(
  jsonb_build_object('title', 'Probe', 'description', 'Probetraining', 'startingDateTime', now() + interval '1 day', 'endDateTime', now() + interval '1 day 2 hours',
                     'group', :'grp', 'trials_open', true, 'max_trial_attendees', 4),
  '[]'::jsonb) \gset
SELECT is((SELECT trials_open FROM public.events WHERE id = :'ev'::uuid), true, 'trials_open is stored');
SELECT is((SELECT max_trial_attendees FROM public.events WHERE id = :'ev'::uuid), 4::numeric, 'max_trial_attendees is stored');

SELECT event_id AS ev2 FROM public.insert_event_with_bring_items(
  jsonb_build_object('title', 'Ohne', 'description', 'Ohne Probe', 'startingDateTime', now() + interval '1 day', 'endDateTime', now() + interval '1 day 2 hours', 'group', :'grp'),
  '[]'::jsonb) \gset
SELECT is((SELECT trials_open FROM public.events WHERE id = :'ev2'::uuid), false, 'events are closed for trials unless opened');

-- ============================================================================
-- D) Converting a guest: the linked e-mail reaches public.user
-- ============================================================================
UPDATE auth.users SET email = 'lena@guest-screens.test' WHERE id = tests.get_supabase_uid('gs_guest');
SELECT is((SELECT email FROM public."user" WHERE id = tests.get_supabase_uid('gs_guest')), 'lena@guest-screens.test',
          'the e-mail a guest links is copied to public.user');

SELECT * FROM finish();
ROLLBACK;
