-- 'drinks.payment.fulfilled' (with an s) was created by the first push migration, but payments are
-- sent on 'drink.payment.fulfilled'. Both showed up as "Zahlung bestätigt" in the profile, and opt-outs
-- saved on the old topic were ignored. Move the saved preferences over and drop the old topic.
UPDATE notifications.user_notification_preferences old
SET topic = 'drink.payment.fulfilled'
WHERE old.topic = 'drinks.payment.fulfilled'
  AND NOT EXISTS (
    SELECT 1 FROM notifications.user_notification_preferences cur
    WHERE cur.topic = 'drink.payment.fulfilled'
      AND cur.tenant = old.tenant AND cur.channel = old.channel AND cur."user" = old."user"
      AND cur.scope_type_norm = old.scope_type_norm AND cur.scope_id_norm = old.scope_id_norm
  );

DELETE FROM notifications.user_notification_preferences WHERE topic = 'drinks.payment.fulfilled';
DELETE FROM notifications.notification_topics WHERE topic = 'drinks.payment.fulfilled';
