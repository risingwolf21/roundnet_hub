-- 104_localized_notifications.sql
-- Notifications are stored in the recipient's language (public.user.language). Callers pass a German text and an
-- English variant; recipients who chose English get the variant, everyone else (and anyone when no variant is
-- given) gets the German text. The notification functions stay reserved to the service role.
BEGIN;
SELECT plan(8);

SELECT tests.authenticate_as_service_role();

UPDATE public."user" SET language = 'de' WHERE id = tests.get_supabase_uid('user_1a');
UPDATE public."user" SET language = 'en' WHERE id = tests.get_supabase_uid('user_1b');
-- All assertions below read the only notification a step created, so clear the two users' notifications between steps.
DELETE FROM notifications.notifications
 WHERE "user" IN (tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_1b'));

-- notify_emit: one call, each recipient gets their own language
SELECT notifications.notify_emit(
  ARRAY[tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_1b')],
  'custom', 'Titel', 'Text', NULL, NULL, NULL, 'normal', NULL, NULL, 'Title', 'Text en');

SELECT is(
  (SELECT title || ' / ' || body FROM notifications.notifications WHERE "user" = tests.get_supabase_uid('user_1a')),
  'Titel / Text', 'a German recipient gets the German text');

SELECT is(
  (SELECT title || ' / ' || body FROM notifications.notifications WHERE "user" = tests.get_supabase_uid('user_1b')),
  'Title / Text en', 'an English recipient gets the English variant');
DELETE FROM notifications.notifications WHERE "user" IN (tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_1b'));

-- no English variant (e.g. free text written by an admin): the original text is kept
SELECT notifications.notify_emit(
  ARRAY[tests.get_supabase_uid('user_1b')],
  'custom', 'Nur Deutsch', 'Hallo', NULL, NULL, NULL, 'normal', NULL, NULL);

SELECT is(
  (SELECT title FROM notifications.notifications WHERE "user" = tests.get_supabase_uid('user_1b')),
  'Nur Deutsch', 'without an English variant an English recipient still gets the original text');
DELETE FROM notifications.notifications WHERE "user" IN (tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_1b'));

-- enqueue_notification (single recipient)
SELECT notifications.enqueue_notification(tests.get_supabase_uid('user_1b'), 'Titel', 'Text', NULL, 'normal', NULL,
  '00000000-0000-0000-0000-000000000000', NULL, 'custom', NULL, NULL, 'Title 2', 'Text 2 en');
SELECT notifications.enqueue_notification(tests.get_supabase_uid('user_1a'), 'Titel 2', 'Text 2', NULL, 'normal', NULL,
  '00000000-0000-0000-0000-000000000000', NULL, 'custom', NULL, NULL, 'Title 2', 'Text 2 en');

SELECT is(
  (SELECT title || ' / ' || body FROM notifications.notifications WHERE "user" = tests.get_supabase_uid('user_1b')),
  'Title 2 / Text 2 en', 'enqueue_notification: English recipient');
SELECT is(
  (SELECT title || ' / ' || body FROM notifications.notifications WHERE "user" = tests.get_supabase_uid('user_1a')),
  'Titel 2 / Text 2', 'enqueue_notification: German recipient');

-- a real trigger path: a confirmed payment
INSERT INTO public.payments("user", "amountToPay", "paymentState") VALUES
  (tests.get_supabase_uid('user_1a'), 0, 'Open'), (tests.get_supabase_uid('user_1b'), 0, 'Open');
UPDATE public.payments SET "paymentState" = 'Fulfilled'
 WHERE "user" IN (tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_1b'));

SELECT is(
  (SELECT title FROM notifications.notifications WHERE "user" = tests.get_supabase_uid('user_1a') AND topic = 'drink.payment.fulfilled'),
  'Zahlung eingegangen', 'payment confirmed: German title');
SELECT is(
  (SELECT title FROM notifications.notifications WHERE "user" = tests.get_supabase_uid('user_1b') AND topic = 'drink.payment.fulfilled'),
  'Payment received', 'payment confirmed: English title');

-- The four central functions got new signatures: they must still be service-role only.
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'notifications'
      AND p.proname IN ('notify_emit', 'notify_users', 'enqueue_notification', 'notify_event_updated')
      AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'))),
  0, 'anon and authenticated cannot execute the notification functions');

SELECT * FROM finish();
ROLLBACK;
