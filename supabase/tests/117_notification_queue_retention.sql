-- Tests for 20261124090000_notification_queue_retention: old push queue rows and revoked devices are deleted.
BEGIN;
SELECT plan(4);

SELECT is(
  (SELECT count(*)::int FROM cron.job WHERE jobname = 'notification_retention' AND schedule = '0 4 * * *'),
  1, 'the retention job is scheduled nightly');

INSERT INTO notifications.web_push_subscriptions (id, "user", endpoint, p256dh, auth, revoked_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', tests.get_supabase_uid('user_1a'), 'https://push.test/old-revoked', 'k', 'a', now() - interval '31 days'),
  ('00000000-0000-0000-0000-0000000000a2', tests.get_supabase_uid('user_1a'), 'https://push.test/new-revoked', 'k', 'a', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000a3', tests.get_supabase_uid('user_1a'), 'https://push.test/active', 'k', 'a', null);

INSERT INTO notifications.notification_outbox ("user", title, body, status, created_at, sent_at) VALUES
  (tests.get_supabase_uid('user_1a'), 'sent-old', '', 'sent', now() - interval '8 days', now() - interval '8 days'),
  (tests.get_supabase_uid('user_1a'), 'sent-new', '', 'sent', now() - interval '1 day', now() - interval '1 day'),
  (tests.get_supabase_uid('user_1a'), 'dead-old', '', 'dead', now() - interval '31 days', null),
  (tests.get_supabase_uid('user_1a'), 'dead-new', '', 'dead', now() - interval '8 days', null),
  (tests.get_supabase_uid('user_1a'), 'pending-old', '', 'pending', now() - interval '60 days', null);

INSERT INTO notifications.notification_outbox_targets (outbox_id, subscription_id)
SELECT id, '00000000-0000-0000-0000-0000000000a3' FROM notifications.notification_outbox WHERE title = 'sent-old';

SELECT notifications.run_retention();

SELECT is(
  (SELECT array_agg(title ORDER BY title) FROM notifications.notification_outbox
    WHERE title IN ('sent-old', 'sent-new', 'dead-old', 'dead-new', 'pending-old')),
  ARRAY['dead-new', 'pending-old', 'sent-new'],
  'sent jobs older than 7 days and dead jobs older than 30 days are deleted; pending jobs are kept');

SELECT is(
  (SELECT count(*)::int FROM notifications.notification_outbox_targets
    WHERE subscription_id = '00000000-0000-0000-0000-0000000000a3'),
  0, 'targets of deleted jobs go with them');

SELECT is(
  (SELECT array_agg(endpoint ORDER BY endpoint) FROM notifications.web_push_subscriptions
    WHERE endpoint LIKE 'https://push.test/%'),
  ARRAY['https://push.test/active', 'https://push.test/new-revoked'],
  'devices revoked more than 30 days ago are deleted');

SELECT * FROM finish();
ROLLBACK;
