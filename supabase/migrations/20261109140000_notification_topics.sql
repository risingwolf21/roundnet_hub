-- The notification topics the app sends were only data in the old database and were lost with the
-- history import: on a fresh database the profile's notification settings listed just four topics, so
-- members could not switch off e.g. cancelled events. Insert-only: existing rows stay untouched.
INSERT INTO notifications.notification_topics (topic, scope_type, description, default_enabled)
VALUES
  ('event.canceled',          'event',     'Event abgesagt', true),
  ('event.updated',           'event',     'Event geändert', true),
  ('event.group.updated',     'event',     'Neues Event in deiner Gruppe', true),
  ('event.comment.created',   'event',     'Neuer Kommentar', true),
  ('challenge.added',         'challenge', 'Neue Challenge', true),
  ('challenge.entry.added',   'challenge', 'Neuer Challenge-Eintrag', true),
  ('game.added',              'game',      'Neues Spiel mit dir', true),
  ('group.request.received',  'group',     'Neue Beitrittsanfrage', true),
  ('group.request.confirmed', 'group',     'Beitrittsanfrage bestätigt', true),
  ('item.handover',           'item',      'Schlüsselübergabe', true),
  ('drink.payment.fulfilled', 'payment',   'Zahlung bestätigt', true)
ON CONFLICT (topic) DO NOTHING;
