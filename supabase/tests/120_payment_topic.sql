-- 120_payment_topic.sql
-- Only one payment topic is left, so the profile shows a single "Zahlung bestätigt" switch.
BEGIN;
SELECT plan(2);

SELECT is((SELECT count(*)::int FROM notifications.notification_topics WHERE topic = 'drinks.payment.fulfilled'), 0,
  'the unused drinks.payment.fulfilled topic is gone');
SELECT is((SELECT count(*)::int FROM notifications.notification_topics WHERE topic = 'drink.payment.fulfilled'), 1,
  'the drink.payment.fulfilled topic that payments are sent on stays');

SELECT * FROM finish();
ROLLBACK;
