set check_function_bodies = off;

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

  return v_id;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_emit(p_recipients uuid[], p_topic text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid, p_urgency text, p_scope_type text, p_scope_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_cnt int := 0;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  if coalesce(array_length(p_recipients, 1), 0) = 0 then
    return 0;
  end if;

  with r as (
    select distinct unnest(p_recipients)::uuid as uid
  ),
  allowed as (
    select r.uid
    from r
    where notifications.is_topic_enabled_for_user(
      r.uid,
      v_tenant,
      p_topic,
      p_scope_type,
      p_scope_id
    )
  ),
  ins as (
    insert into notifications.notifications(
      "user", tenant, topic, title, body, data, source_type, source_id
    )
    select a.uid, v_tenant, p_topic, p_title, p_body, p_data, p_source_type, p_source_id
    from allowed a
    returning id, "user"
  ),
  outbox as (
    insert into notifications.notification_outbox(
      "user", tenant, title, body, data, urgency, notification
    )
    select i."user", v_tenant, p_title, p_body, p_data, p_urgency, i.id
    from ins i
    returning id, "user"
  ),
  targets as (
     insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
  from outbox o
  join notifications.web_push_subscriptions s
    on s."user" = o."user"
   and s.revoked_at is null
   returning outbox_id
  )

  -- Achtung: row_count wäre Targets; wir wollen #Empfänger => outbox count
  select count(*) into v_cnt from outbox;
  return v_cnt;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.set_notification_pref(p_topic text, p_enabled boolean, p_channel text DEFAULT 'webpush'::text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS notifications.user_notification_preferences
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare
  v_row notifications.user_notification_preferences;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  insert into notifications.user_notification_preferences(
    "user", tenant, topic, channel, enabled, scope_type, scope_id
  ) values (
    auth.uid(), v_tenant, p_topic, coalesce(p_channel,'webpush'),
    p_enabled, p_scope_type, p_scope_id
  )
  on conflict ("user", tenant, topic, channel, scope_type_norm, scope_id_norm)
  do update set
    enabled    = excluded.enabled,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;$function$
;


