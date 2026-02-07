set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.compute_effective_player_from_values(ka numeric, rg numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'games'
AS $function$
declare
  v_rg_offset numeric;
  v_rg_scale  numeric;
  v_result    numeric;
begin
  if ka is null then
    raise exception 'Internal index was not defined ka: %, rg: %', ka, rg
      using errcode = '22004';
  end if;

  select rg_offset, rg_scale
    into strict v_rg_offset, v_rg_scale
  from games.elo_config
  where id = 1;

  -- Wenn rg fehlt: einfach KA zurückgeben
  if rg is null then
    return ka;
  end if;

  v_result := (ka + (v_rg_scale * (rg - v_rg_offset))) / 2.0;
  return v_result;

exception
  when no_data_found then
    raise exception 'elo_config(id=1) not found';
end
$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_group_updated_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if (old."group" is distinct from new."group") then
    perform notifications.notify_event_group_updated(new.id, old."group", auth.uid()::text);
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_group_updated(p_event uuid, p_old_group uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.group.updated';
  v_cnt    int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title text := '';
  v_body   text := '🆕 Es ist ein neues Event verfügbar';
  v_start text;
  v_event_group uuid;
begin

  select e."title", e."startingDateTime", e."group" into v_title, v_start, v_event_group from public.events as e where e.id = p_event;

  if v_event_group is null then raise exception 'event % not found', p_event; end if;

  v_title := v_title || ' - 🗓️ ' || to_char(DATE(v_start), 'DD.MM.YYYY');

  with g_new as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_event_group
  ),
  recipients as (
    select n.uid
      from g_new n
     where p_actor <> n.uid
       and not exists (
             select 1
               from public.group_user_mapping og
              where og."group" = p_old_group
                and og."user"  = n.uid
           )
  ),
  allowed as (
    select r.uid
      from recipients r
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'event', p_event
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
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


