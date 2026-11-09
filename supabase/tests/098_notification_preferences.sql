-- Tests for notification topic preferences:
--   notifications.set_notification_pref  (user mutes/unmutes a topic, globally or per-scope)
--   notifications.is_topic_enabled_for_user  (the resolver: default-on, specific scope wins)
--   notifications.notify_emit  (must honour a mute: a muted recipient gets nothing)
--
-- A user silencing a topic that is then ignored is both a correctness and a privacy bug, so
-- lock the behaviour down.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(7);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user('np_user', 'np_user@notif-test.local');

\set tenant '00000000-0000-0000-0000-000000000000'
\set scope  '00000000-0000-0000-0000-0000000000aa'

-- Default (no stored preference) => enabled.
SELECT is(
  notifications.is_topic_enabled_for_user(tests.get_supabase_uid('np_user'), :'tenant'::uuid, 'np.topic'),
  true, 'a topic with no stored preference is enabled by default');

-- set_notification_pref needs an authenticated caller.
SELECT throws_ok(
  $$ SELECT notifications.set_notification_pref('np.x', true) $$,
  '28P01', NULL, 'set_notification_pref rejects an unauthenticated caller');

-- Store preferences as the user.
SELECT tests.authenticate_as('np_user');
SELECT notifications.set_notification_pref('np.topic', false);                                   -- mute globally
SELECT notifications.set_notification_pref('np.scoped', false);                                  -- scoped topic: global off
SELECT notifications.set_notification_pref('np.scoped', true, 'webpush', 'group', :'scope'::uuid); -- but on for this scope
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

-- Mute is honoured.
SELECT is(
  notifications.is_topic_enabled_for_user(tests.get_supabase_uid('np_user'), :'tenant'::uuid, 'np.topic'),
  false, 'a globally muted topic resolves to disabled');

-- The more specific (scoped) preference wins over the global one.
SELECT is(
  notifications.is_topic_enabled_for_user(tests.get_supabase_uid('np_user'), :'tenant'::uuid, 'np.scoped', 'group', :'scope'::uuid),
  true, 'a scope-specific preference overrides the global one (enabled for this scope)');
SELECT is(
  notifications.is_topic_enabled_for_user(tests.get_supabase_uid('np_user'), :'tenant'::uuid, 'np.scoped'),
  false, 'the same topic stays disabled where no scope-specific preference applies');

-- End-to-end: notify_emit creates nothing for a muted recipient, and one row otherwise.
SELECT is(
  notifications.notify_emit(ARRAY[tests.get_supabase_uid('np_user')], 'np.topic', 't', 'b',
                            '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL),
  0, 'notify_emit delivers nothing to a recipient who muted the topic');
SELECT is(
  notifications.notify_emit(ARRAY[tests.get_supabase_uid('np_user')], 'np.unmuted', 't', 'b',
                            '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL),
  1, 'notify_emit delivers to a recipient with the topic (default) enabled');

SELECT * FROM finish();
ROLLBACK;
