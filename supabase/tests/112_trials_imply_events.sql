-- 20261110120000_trials_imply_events: a group open for trials (events.trials) gives its trial
-- members events and event.signup, even when the group itself has neither (members get events
-- through another group or a direct grant, as in a club's main group).
BEGIN;
SELECT plan(5);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@trials-imply.test')
FROM unnest(ARRAY['ti_trial', 'ti_guest', 'ti_other', 'ti_manager']) n;
UPDATE auth.users SET is_anonymous = true WHERE id = tests.get_supabase_uid('ti_guest');

\set open   '00000000-0000-0000-0000-0000000011c1'
\set closed '00000000-0000-0000-0000-0000000011c2'

INSERT INTO public.event_group(id, name, visible, is_public) VALUES
  (:'open', 'Main Group', true, true),
  (:'closed', 'Ohne Probetraining', true, true);
-- Features the test needs, whatever the seed contains.
INSERT INTO public.features(name) VALUES ('events'), ('events.trials'), ('events.trials.guests'), ('items') ON CONFLICT DO NOTHING;
-- Like the reported setup: trials on, but no `events` feature on the group itself.
INSERT INTO public.group_features("group", feature) VALUES
  (:'open', 'events.trials'), (:'open', 'events.trials.guests'),
  (:'closed', 'items');
INSERT INTO public.group_user_mapping("user", "group", role) VALUES
  (tests.get_supabase_uid('ti_trial'), :'open', 'trial'),
  (tests.get_supabase_uid('ti_guest'), :'open', 'trial'),
  (tests.get_supabase_uid('ti_other'), :'closed', 'trial');
INSERT INTO public.user_direct_grants("user", kind, key)
VALUES (tests.get_supabase_uid('ti_manager'), 'perm', 'grants.manage');

SELECT tests.authenticate_as('ti_trial');
SELECT is((SELECT array_agg(kind || ':' || key ORDER BY kind || ':' || key) FROM public.user_grants_view),
          ARRAY['feat:events', 'feat:events.trials', 'perm:event.signup']::text[],
          'a trial member of a group with events.trials can use events and sign up');

SELECT tests.authenticate_as('ti_guest');
SELECT set_config('request.jwt.claims', (current_setting('request.jwt.claims')::jsonb || '{"is_anonymous": true}')::text, true);
SELECT ok(EXISTS (SELECT 1 FROM public.user_grants_view WHERE kind = 'feat' AND key = 'events'),
          'so does a guest (anonymous trial member)');
SELECT ok(EXISTS (SELECT 1 FROM public.user_grants_view WHERE kind = 'perm' AND key = 'event.signup'),
          'and the guest may sign up');

SELECT tests.authenticate_as('ti_other');
SELECT is((SELECT count(*)::int FROM public.user_grants_view), 0,
          'a trial member of a group without events.trials gets nothing implied');

SELECT tests.authenticate_as('ti_manager');
SELECT is((SELECT array_agg(key ORDER BY key) FROM public.admin_user_effective_grants(tests.get_supabase_uid('ti_trial'))),
          ARRAY['event.signup', 'events', 'events.trials'],
          'grant managers see the implied grants once each');

SELECT * FROM finish();
ROLLBACK;
