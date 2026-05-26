-- Fix 1: Add 'no_subscriptions' as a valid status for notification_outbox
-- The constraint currently allows: pending, processing, sent, dead
alter table "notifications"."notification_outbox"
  drop constraint if exists "notification_outbox_status_check";

alter table "notifications"."notification_outbox"
  add constraint "notification_outbox_status_check"
  CHECK ((status = ANY (ARRAY[
    'pending'::text,
    'processing'::text,
    'sent'::text,
    'dead'::text,
    'no_subscriptions'::text
  ])));

-- Fix 2: Replace enqueue_notification to mark outbox entries as 'no_subscriptions'
-- when the user has no active push subscriptions, preventing silent drops.
CREATE OR REPLACE FUNCTION notifications.enqueue_notification(p_user uuid, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_urgency text DEFAULT 'normal'::text, p_ttl_seconds integer DEFAULT NULL::integer, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_dedupe_key text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_id bigint;
  v_nid uuid;
begin
  -- optional: zuerst In-App Notification anlegen
  insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
  values (p_user, p_tenant, coalesce(p_topic,'custom'), p_title, p_body, p_data, p_source_type, p_source_id)
  returning id into v_nid;

  insert into notifications.notification_outbox("user", title, body, data, urgency, ttl_seconds, tenant, dedupe_key, notification)
  values (p_user, p_title, p_body, p_data, p_urgency, p_ttl_seconds, p_tenant, p_dedupe_key, v_nid)
  returning id into v_id;

  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select v_id, s.id
  from notifications.web_push_subscriptions s
  where s."user" = p_user and s.revoked_at is null;

  IF NOT FOUND THEN
    -- User has no active subscriptions; mark outbox entry as undeliverable immediately
    UPDATE notifications.notification_outbox
    SET status = 'no_subscriptions', sent_at = now()
    WHERE id = v_id;
  END IF;

  return v_id;
end;$function$
;
