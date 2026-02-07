alter table "util"."background_errors" alter column "ref_id" set data type text using "ref_id"::text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION notifications.notify_emit(p_recipients uuid[], p_topic text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid, p_urgency text, p_scope_type text, p_scope_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cnt int := 0;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
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
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_challenge_added(p_challenge uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_group  uuid;
  v_topic  text := 'challenge.added';
  v_url    text := '/challenges/' || p_challenge::text;
  v_body   text := 'Es gibt eine neue Challenge für dich 💪';
  v_title  text;
  v_recipients uuid[];
begin
  select c."group", c."name"
    into v_group, v_title
    from public.challenge c
   where c.id = p_challenge;

  if v_group is null then
    raise exception 'challenge % not found', p_challenge;
  end if;

  v_recipients := array(
    select distinct gum."user"
      from public.group_user_mapping gum
     where gum."group" = v_group
       and gum.role in ('admin','user','trial')
       and (p_actor is null or gum."user" <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('challenge', p_challenge, 'url', v_url),
    'challenge',
    p_challenge,
    'normal',
    'challenge',
    p_challenge
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_challenge_entry_added(p_challenge uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_group  uuid;
  v_topic  text := 'challenge.entry.added';
  v_url    text := '/challenges/' || p_challenge::text;
  v_title  text;
  v_body   text := ' hat einen neuen Punkt eingetragen 🔥';
  v_user_display text;
  v_recipients uuid[];
begin
  select c."group", c."name"
    into v_group, v_title
    from public.challenge c
   where c.id = p_challenge;

  select coalesce(u."displayName", u."name")
    into v_user_display
    from public."user" u
   where u."id" = p_actor;

  v_body := coalesce(v_user_display, '') || v_body;

  if v_group is null then
    raise exception 'challenge % not found', p_challenge;
  end if;

  v_recipients := array(
    select distinct gum."user"
      from public.group_user_mapping gum
     where gum."group" = v_group
       and gum.role in ('admin','user','trial')
       and (p_actor is null or gum."user" <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('challenge', p_challenge, 'url', v_url),
    'challenge',
    p_challenge,
    'normal',
    'challenge',
    p_challenge
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_drink_payment_fulfilled(p_payment bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid;
  v_topic text := 'drink.payment.fulfilled';
  v_title text := 'Zahlung eingegangen';
  v_body  text := '💸 Deine Zahlung wurde bestätigt 💸';
begin
  -- (wie im Dump üblich: bigint-id in public.payments.id)
  select p."user"
    into v_user
    from public.payments p
   where p.id = p_payment;

  if v_user is null then
    raise exception 'payment % not found', p_payment;
  end if;

  return notifications.notify_emit(
    array[v_user],
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('payment', p_payment, 'url', '/'),
    'payment',
    null,              -- source_id (kein uuid bei bigint payment)
    'normal',
    'payment',
    null
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_drink_payment_fulfilled(p_payment uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid;
  v_topic text := 'drink.payment.fulfilled';
  v_title text := 'Zahlung eingegangen';
  v_body  text := '💸 Deine Zahlung wurde bestätigt 💸';
begin
  -- (wie im Dump: uuid in public.payments.id_uuid)
  select p."user"
    into v_user
    from public.payments p
   where p.id_uuid = p_payment;

  if v_user is null then
    raise exception 'payment % not found', p_payment;
  end if;

  return notifications.notify_emit(
    array[v_user],
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('payment', p_payment, 'url', '/'),
    'payment',
    p_payment,
    'normal',
    'payment',
    p_payment
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_canceled(p_event uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_group uuid;
  v_topic text := 'event.canceled';
  v_url   text := '/training/event/' || p_event::text;
  v_title text := '';
  v_body  text := '🚫 Das Event wurde abgesagt 🚫';
  v_start text;
  v_recipients uuid[];
begin
  select e."group", e."title", e."startingDateTime"
    into v_group, v_title, v_start
    from public.events e
   where e.id = p_event;

  if v_group is null then
    raise exception 'event % not found', p_event;
  end if;

  v_title := v_title || ' - 🗓️ ' || to_char(date(v_start), 'DD.MM.YYYY');

  v_recipients := array(
    select distinct gum."user"
      from public.group_user_mapping gum
     where gum."group" = v_group
       and gum.role in ('admin','user','trial')
       and (p_actor is null or gum."user" <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('event', p_event, 'url', v_url),
    'event',
    p_event,
    'high',
    'event',
    p_event
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_comment_created(p_event uuid, p_comment uuid, p_text text, p_author uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic text := 'event.comment.created';
  v_url   text := '/training/event/' || p_event::text;
  v_title text := 'Neuer Kommentar';
  v_body  text;
  v_displayName text;
  v_name text;
  v_start text;
  v_recipients uuid[];
begin
  select e."title", e."startingDateTime"
    into v_title, v_start
    from public.events e
   where e.id = p_event;

  v_title := v_title || ' - 🗓️ ' || to_char(date(v_start), 'DD.MM.YYYY');

  select u."displayName", u."name"
    into v_displayName, v_name
    from public."user" u
   where u."id" = p_author;

  v_body := coalesce(v_displayName, v_name, p_author::text) || ': ' || coalesce(p_text, '');

  v_recipients := array(
    select distinct eum."user"
      from public.event_attendance_user_mapping eum
     where eum.event = p_event
       and eum.state = 'Attending'
       and eum."user" <> p_author
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object(
      'event', p_event,
      'comment', p_comment,
      'author', p_author,
      'text', p_text,
      'url', v_url
    ),
    'event',
    p_event,
    'normal',
    'event',
    p_event
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_group_updated(p_event uuid, p_old_group uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic  text := 'event.group.updated';
  v_url    text := '/training/event/' || p_event::text;
  v_title  text := '';
  v_body   text := '🆕 Es ist ein neues Event verfügbar';
  v_start  text;
  v_event_group uuid;
  v_recipients uuid[];
begin
  select e."title", e."startingDateTime", e."group"
    into v_title, v_start, v_event_group
    from public.events e
   where e.id = p_event;

  if v_event_group is null then
    raise exception 'event % not found', p_event;
  end if;

  v_title := v_title || ' - 🗓️ ' || to_char(date(v_start), 'DD.MM.YYYY');

  v_recipients := array(
    with g_new as (
      select distinct gum."user" as uid
        from public.group_user_mapping gum
       where gum."group" = v_event_group
         and gum.role in ('admin','user','trial')
    )
    select n.uid
      from g_new n
     where (p_actor is null or n.uid <> p_actor)
       and not exists (
         select 1
           from public.group_user_mapping og
          where og."group" = p_old_group
            and og.role in ('admin','user','trial')
            and og."user" = n.uid
       )
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('event', p_event, 'url', v_url),
    'event',
    p_event,
    'normal',
    'event',
    p_event
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_updated(p_event uuid, p_body text, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic text := 'event.updated';
  v_url   text := '/training/event/' || p_event::text;
  v_title text := 'Ein Event wurde aktualisiert';
  v_start text;
  v_recipients uuid[];
begin
  select e."title", e."startingDateTime"
    into v_title, v_start
    from public.events e
   where e.id = p_event;

  v_title := v_title || ' - 🗓️ ' || to_char(date(v_start), 'DD.MM.YYYY');

  v_recipients := array(
    select distinct eum."user"
      from public.event_attendance_user_mapping eum
     where eum.event = p_event
       and eum.state = 'Attending'
       and (p_actor is null or eum."user" <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    p_body,
    jsonb_build_object('event', p_event, 'url', v_url),
    'event',
    p_event,
    'normal',
    'event',
    p_event
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_game_added(p_match uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic  text := 'game.added';
  v_url    text := '/matches/' || p_match::text;
  v_title  text := '';
  v_body   text := '🤾 Es wurde ein neues Spiel mit dir hinzugefügt 🤾';
  v_team_a_name text;
  v_team_b_name text;
  v_recipients uuid[];
begin
  select t."name"
    into v_team_a_name
    from games."teams" t
   where t.id = (select m.team_a from games."match" m where m.id = p_match);

  select t."name"
    into v_team_b_name
    from games."teams" t
   where t.id = (select m.team_b from games."match" m where m.id = p_match);

  v_title := v_team_a_name || ' vs. ' || v_team_b_name;

  v_recipients := array(
    with mt as (
      select m.team_a, m.team_b
        from games."match" m
       where m.id = p_match
    )
    select distinct uid
      from (
        select t1.player_1 as uid from mt join games."teams" t1 on t1.id = mt.team_a
        union all
        select t1.player_2       from mt join games."teams" t1 on t1.id = mt.team_a
        union all
        select t2.player_1       from mt join games."teams" t2 on t2.id = mt.team_b
        union all
        select t2.player_2       from mt join games."teams" t2 on t2.id = mt.team_b
      ) u
     where uid is not null
       and (p_actor is null or uid <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('match', p_match, 'url', v_url),
    'game',
    p_match,
    'normal',
    'game',
    p_match
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_group_join_requested(p_group uuid, p_user uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic  text := 'group.request.received';
  v_url    text := '/groups/' || p_group::text;
  v_title  text := 'Neue Beitrittsanfrage';
  v_body   text;
  v_group_name text;
  v_user_display text;
  v_recipients uuid[];
begin
  select g.name
    into v_group_name
    from public.event_group g
   where g.id = p_group;

  select coalesce(u."displayName", u."name", p_user::text)
    into v_user_display
    from public."user" u
   where u."id" = p_user;

  v_body := coalesce(v_user_display, p_user::text)
         || ' möchte der Gruppe "' || coalesce(v_group_name, '') || '" beitreten.';

  v_recipients := array(
    select distinct gum."user"
      from public.group_user_mapping gum
     where gum."group" = p_group
       and gum.role = 'admin'
       and gum.role in ('admin','user','trial') -- explizit, wie gewünscht
       and (p_actor is null or gum."user" <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('group', p_group, 'requester', p_user, 'url', v_url),
    'group',
    p_group,
    'normal',
    'group',
    p_group
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_group_request_confirmed(p_group uuid, p_user uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic  text := 'group.request.confirmed';
  v_title  text := 'Gruppenanfrage bestätigt';
  v_body   text;
  v_group_name text;
begin
  select g."name"
    into v_group_name
    from public.event_group g
   where g.id = p_group;

  v_body := '✅ Du bist jetzt Teil der Gruppe ' || coalesce(v_group_name, '') || ' ✅';

  if p_actor is not null and p_user = p_actor then
    return 0;
  end if;

  return notifications.notify_emit(
    array[p_user],
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('group', p_group, 'url', '/'),
    'group',
    p_group,
    'normal',
    'group',
    p_group
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_item_handover(p_item bigint, p_from uuid, p_to uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic text := 'item.handover';
  v_title text := 'Übergabe';
  v_body  text := '';
  v_item_name text;
  v_recipients uuid[];
begin
  select i."name"
    into v_item_name
    from public.items i
   where i.id = p_item;

  v_title := 'Übergabe von ' || coalesce(v_item_name, '');

  if p_to is not null and (p_actor is null or p_to <> p_actor) then
    v_body := 'Du bist jetzt der Besitzer von ' || coalesce(v_item_name, '');
  end if;

  if p_from is not null and (p_actor is null or p_from <> p_actor) then
    v_body := 'Du hast ' || coalesce(v_item_name, '') || ' abgegeben';
  end if;

  v_recipients := array(
    select uid
      from (values (p_from), (p_to)) v(uid)
     where v.uid is not null
       and (p_actor is null or v.uid <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('item', p_item, 'from', p_from, 'to', p_to, 'url', '/keys'),
    'item',
    null,          -- source_id nicht uuid bei bigint
    'normal',
    'item',
    null
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_item_handover(p_item uuid, p_from uuid, p_to uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic text := 'item.handover';
  v_title text := 'Übergabe';
  v_body  text := '';
  v_item_name text;
  v_recipients uuid[];
begin
  select i."name"
    into v_item_name
    from public.items i
   where i.id_uuid = p_item;

  v_title := 'Übergabe von ' || coalesce(v_item_name, '');

  if p_to is not null and (p_actor is null or p_to <> p_actor) then
    v_body := 'Du bist jetzt der Besitzer von ' || coalesce(v_item_name, '');
  end if;

  if p_from is not null and (p_actor is null or p_from <> p_actor) then
    v_body := 'Du hast ' || coalesce(v_item_name, '') || ' abgegeben';
  end if;

  v_recipients := array(
    select uid
      from (values (p_from), (p_to)) v(uid)
     where v.uid is not null
       and (p_actor is null or v.uid <> p_actor)
  );

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('item', p_item, 'from', p_from, 'to', p_to, 'url', '/keys'),
    'item',
    p_item,
    'normal',
    'item',
    p_item
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_users(p_users uuid[], p_topic text, p_scope text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return notifications.notify_emit(
    p_users,
    p_topic,
    p_title,
    p_body,
    p_data,
    p_source_type,
    p_source_id,
    'normal',
    p_scope,
    null
  );
end;
$function$
;


