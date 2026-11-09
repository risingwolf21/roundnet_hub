drop table "public"."notification_outbox";

drop table "public"."notification_outbox_targets";

drop table "public"."notification_retention";

drop table "public"."notification_topics";

drop table "public"."notifications";

drop table "public"."object_subscriptions";

drop table "public"."user_notification_preferences";

drop table "public"."web_push_subscriptions";

drop sequence if exists "public"."notification_outbox_id_seq";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION notifications.notify_group_request_confirmed(p_group uuid, p_user text, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'group.request.confirmed';
  v_cnt    int := 0;
  v_url    text := '/';
  v_title text := 'Gruppenanfrage bestätigt';
  v_body text;
  v_group_name text;
begin
  select g."name" into v_group_name from public.event_group g where id = p_group;
  v_body := '✅ ' || 'Du bist jetzt Teil der Gruppe ' || v_group_name || ' ✅';
  -- Nur Ziel-User benachrichtigen (wenn Sub aktiv)
  with allowed as (
    select p_user::text as uid
     where p_user <> coalesce(p_actor,'')
       and notifications.is_topic_enabled_for_user(p_user::text, v_tenant, v_topic, 'group', p_group)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('group', p_group, 'url', v_url),
           'group', p_group
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('group', p_group, 'url', v_url),
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join notifications.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;

CREATE OR REPLACE FUNCTION public.run_push_worker_if_needed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_has_work boolean;
begin
  select exists (
    select 1
      from public.notification_outbox_targets t
      join public.notification_outbox o on o.id = t.outbox_id
     where (t.last_status is null or t.last_status >= 400)           -- nie versucht oder fehlgeschlagen
       and (t.next_attempt_at is null or t.next_attempt_at <= now()) -- fällig
       and o.status = 'pending'
  )
  into v_has_work;

  if v_has_work then
    return public.invoke_edge_function('push-worker');
  else
    return jsonb_build_object('processed', 0, 'skipped', true);
  end if;
end;$function$
;


