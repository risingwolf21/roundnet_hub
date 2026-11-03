-- Notifications in the language of the recipient (public.user.language, see 20261103100000_user_language.sql).
--
-- Callers keep building the German text as before and now also pass an English variant. The central functions
-- (notify_emit / enqueue_notification / notify_users / notify_event_updated) store, per recipient, the English text when
-- the recipient chose English and an English variant was supplied; otherwise the German text.
--
-- Adding parameters needs new function signatures. New functions would get the default EXECUTE grants for anon and
-- authenticated in these schemas, but the originals are executable by postgres and service_role only. The grants are
-- therefore reset explicitly below.

DROP FUNCTION IF EXISTS notifications.notify_users(uuid[], text, text, text, text, jsonb, text, uuid);
DROP FUNCTION IF EXISTS notifications.notify_emit(uuid[], text, text, text, jsonb, text, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS notifications.enqueue_notification(uuid, text, text, jsonb, text, integer, uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS notifications.notify_event_updated(uuid, text, uuid);

CREATE OR REPLACE FUNCTION notifications.notify_emit(p_recipients uuid[], p_topic text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid, p_urgency text, p_scope_type text, p_scope_id uuid, p_title_en text DEFAULT NULL::text, p_body_en text DEFAULT NULL::text)
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
    select r.uid, coalesce(u.language, 'de') = 'en' as en
    from r
    left join public."user" u on u.id = r.uid
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
    select a.uid, v_tenant, p_topic,
           case when a.en then coalesce(p_title_en, p_title) else p_title end,
           case when a.en then coalesce(p_body_en, p_body) else p_body end,
           p_data, p_source_type, p_source_id
    from allowed a
    returning id, "user", title, body
  ),
  outbox as (
    insert into notifications.notification_outbox(
      "user", tenant, title, body, data, urgency, notification
    )
    select i."user", v_tenant, i.title, i.body, p_data, p_urgency, i.id
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
end;$function$;

CREATE OR REPLACE FUNCTION notifications.notify_users(p_users uuid[], p_topic text, p_scope text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid, p_title_en text DEFAULT NULL::text, p_body_en text DEFAULT NULL::text)
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
    null,
    p_title_en,
    p_body_en
  );
end;
$function$;

CREATE OR REPLACE FUNCTION notifications.enqueue_notification(p_user uuid, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_urgency text DEFAULT 'normal'::text, p_ttl_seconds integer DEFAULT NULL::integer, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_dedupe_key text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid, p_title_en text DEFAULT NULL::text, p_body_en text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_id bigint;
  v_nid uuid;
  v_title text := p_title;
  v_body text := p_body;
begin
  if exists (select 1 from public."user" u where u.id = p_user and u.language = 'en') then
    v_title := coalesce(p_title_en, p_title);
    v_body := coalesce(p_body_en, p_body);
  end if;

  insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
  values (p_user, p_tenant, coalesce(p_topic,'custom'), v_title, v_body, p_data, p_source_type, p_source_id)
  returning id into v_nid;

  insert into notifications.notification_outbox("user", title, body, data, urgency, ttl_seconds, tenant, dedupe_key, notification)
  values (p_user, v_title, v_body, p_data, p_urgency, p_ttl_seconds, p_tenant, p_dedupe_key, v_nid)
  returning id into v_id;

  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select v_id, s.id
  from notifications.web_push_subscriptions s
  where s."user" = p_user and s.revoked_at is null;

  IF NOT FOUND THEN
    UPDATE notifications.notification_outbox
    SET status = 'no_subscriptions', sent_at = now()
    WHERE id = v_id;
  END IF;

  return v_id;
end;$function$;

CREATE OR REPLACE FUNCTION notifications.notify_event_updated(p_event uuid, p_body text, p_actor uuid DEFAULT NULL::uuid, p_body_en text DEFAULT NULL::text)
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
    p_event,
    null,
    p_body_en
  );
end;
$function$;

REVOKE ALL ON FUNCTION notifications.notify_emit(uuid[], text, text, text, jsonb, text, uuid, text, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION notifications.notify_emit(uuid[], text, text, text, jsonb, text, uuid, text, text, uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION notifications.notify_users(uuid[], text, text, text, text, jsonb, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION notifications.notify_users(uuid[], text, text, text, text, jsonb, text, uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION notifications.enqueue_notification(uuid, text, text, jsonb, text, integer, uuid, text, text, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION notifications.enqueue_notification(uuid, text, text, jsonb, text, integer, uuid, text, text, text, uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION notifications.notify_event_updated(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION notifications.notify_event_updated(uuid, text, uuid, text) TO service_role;

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
  v_body_en text := 'There is a new challenge for you 💪';
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
    p_challenge,
    null,
    v_body_en
  );
end;
$function$;

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
  v_body_en text := ' added a new point 🔥';
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
  v_body_en := coalesce(v_user_display, '') || v_body_en;

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
    p_challenge,
    null,
    v_body_en
  );
end;
$function$;

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
  v_title_en text := 'Payment received';
  v_body_en text := '💸 Your payment has been confirmed 💸';
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
    null,
    v_title_en,
    v_body_en
  );
end;
$function$;

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
  v_title_en text := 'Payment received';
  v_body_en text := '💸 Your payment has been confirmed 💸';
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
    p_payment,
    v_title_en,
    v_body_en
  );
end;
$function$;

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
  v_body_en text := '🚫 The event has been cancelled 🚫';
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
    p_event,
    null,
    v_body_en
  );
end;
$function$;

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
  v_body_en text := '🆕 A new event is available';
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
    p_event,
    null,
    v_body_en
  );
end;
$function$;

CREATE OR REPLACE FUNCTION notifications.notify_game_added(p_match uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_topic  text := 'game.added';
  v_url    text := '/matches/' || p_match::text;
  v_body   text := '🤾 Es wurde ein neues Spiel mit dir hinzugefügt 🤾';
  v_body_en text := '🤾 A new match with you has been added 🤾';
  v_title  text;
  v_team_a_name text;
  v_team_b_name text;
  v_recipients uuid[];
begin

  select "team_a_name", "team_b_name" into v_team_a_name, v_team_b_name from "games"."match" where id = p_match;

  v_title := v_team_a_name || ' vs. ' || v_team_b_name;

  v_recipients := array(
    with match_players as (
      select unnest(array[a_player_1, a_player_2, b_player_1, b_player_2]) as uid
      from games."match" where id = p_match
    ),
    rec as (
      select distinct uid from match_players
      where uid is not null and uid::text <> coalesce(p_actor::text,'')
    )
    -- Recipients are users: the player's linked account (player ids no longer equal user ids).
    select distinct p.linked_user_id
      from rec ap
      join games.players p on p.player = ap.uid
      where p.linked_user_id IS NOT NULL
        AND (p_actor is null or p.linked_user_id <> p_actor)
  );

  IF array_length(v_recipients, 1) IS NULL THEN
    RETURN NULL;
  END IF;

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
    p_match,
    null,
    v_body_en
  );
end;$function$;

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
  v_title_en text := 'New join request';
  v_body_en text;
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
  v_body_en := coalesce(v_user_display, p_user::text)
         || ' would like to join the group "' || coalesce(v_group_name, '') || '".';

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
    p_group,
    v_title_en,
    v_body_en
  );
end;
$function$;

CREATE OR REPLACE FUNCTION notifications.notify_group_request_confirmed(p_group uuid, p_user uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic  text := 'group.request.confirmed';
  v_title  text := 'Gruppenanfrage bestätigt';
  v_title_en text := 'Group request confirmed';
  v_body_en text;
  v_body   text;
  v_group_name text;
begin
  select g."name"
    into v_group_name
    from public.event_group g
   where g.id = p_group;

  v_body := '✅ Du bist jetzt Teil der Gruppe ' || coalesce(v_group_name, '') || ' ✅';
  v_body_en := '✅ You are now part of the group ' || coalesce(v_group_name, '') || ' ✅';

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
    p_group,
    v_title_en,
    v_body_en
  );
end;
$function$;

CREATE OR REPLACE FUNCTION notifications.notify_item_handover(p_item bigint, p_from uuid, p_to uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic text := 'item.handover';
  v_title text := 'Übergabe';
  v_title_en text := 'Handover';
  v_body_en text := '';
  v_body  text := '';
  v_item_name text;
  v_recipients uuid[];
begin
  select i."name"
    into v_item_name
    from public.items i
   where i.id = p_item;

  v_title := 'Übergabe von ' || coalesce(v_item_name, '');
  v_title_en := 'Handover of ' || coalesce(v_item_name, '');

  if p_to is not null and (p_actor is null or p_to <> p_actor) then
    v_body := 'Du bist jetzt der Besitzer von ' || coalesce(v_item_name, '');
    v_body_en := 'You are now the owner of ' || coalesce(v_item_name, '');
  end if;

  if p_from is not null and (p_actor is null or p_from <> p_actor) then
    v_body := 'Du hast ' || coalesce(v_item_name, '') || ' abgegeben';
    v_body_en := 'You handed over ' || coalesce(v_item_name, '');
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
    null,
    v_title_en,
    v_body_en
  );
end;
$function$;

CREATE OR REPLACE FUNCTION notifications.notify_item_handover(p_item uuid, p_from uuid, p_to uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_topic text := 'item.handover';
  v_title text := 'Übergabe';
  v_title_en text := 'Handover';
  v_body_en text := '';
  v_body  text := '';
  v_item_name text;
  v_recipients uuid[];
begin
  select i."name"
    into v_item_name
    from public.items i
   where i.id_uuid = p_item;

  v_title := 'Übergabe von ' || coalesce(v_item_name, '');
  v_title_en := 'Handover of ' || coalesce(v_item_name, '');

  if p_to is not null and (p_actor is null or p_to <> p_actor) then
    v_body := 'Du bist jetzt der Besitzer von ' || coalesce(v_item_name, '');
    v_body_en := 'You are now the owner of ' || coalesce(v_item_name, '');
  end if;

  if p_from is not null and (p_actor is null or p_from <> p_actor) then
    v_body := 'Du hast ' || coalesce(v_item_name, '') || ' abgegeben';
    v_body_en := 'You handed over ' || coalesce(v_item_name, '');
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
    p_item,
    v_title_en,
    v_body_en
  );
end;
$function$;

CREATE OR REPLACE FUNCTION notifications._trg_event_updated_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare 
  v_state   text;
  v_msg     text;
  v_detail  text;
  v_hint    text;
  v_context text;
  v_body text := '';
  v_body_en text := '';
begin
  begin
      if row(new."startingDateTime", new."endDateTime", new.place)
     is not distinct from
     row(old."startingDateTime", old."endDateTime", old.place) then
    return new;
  end if;

  if row(new."startingDateTime") is distinct from row(old."startingDateTime") then
    v_body := 'Die Startzeit hat sich geändert zu: ' || to_char(new."startingDateTime", 'DD.MM.YYYY HH24:MI:SS');
    v_body_en := 'The start time has changed to: ' || to_char(new."startingDateTime", 'DD.MM.YYYY HH24:MI:SS');
  end if;

  if row(new."endDateTime") is distinct from row(old."endDateTime") then
    v_body := 'Die Endzeit hat sich geändert zu: ' || to_char(new."endDateTime", 'DD.MM.YYYY HH24:MI:SS');
    v_body_en := 'The end time has changed to: ' || to_char(new."endDateTime", 'DD.MM.YYYY HH24:MI:SS');
  end if;

  if row(new."place") is distinct from row(old."place") then
    v_body := 'Der Ort des Events hat sich geändert.';
    v_body_en := 'The location of the event has changed.';
  end if;
  
  perform notifications.notify_event_updated(new.id, v_body, auth.uid(), v_body_en);
    exception when others then
      get stacked diagnostics
        v_state   = returned_sqlstate,
        v_msg     = message_text,
        v_detail  = pg_exception_detail,
        v_hint    = pg_exception_hint,
        v_context = pg_exception_context;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_event_comment_created', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'sqlstate', v_state,
        'sqlstate_label', util.sqlstate_label(v_state),
        'detail', v_detail,
        'hint',   v_hint,
        'context', v_context
      ));
  end;
  return new;
end;$function$;

CREATE OR REPLACE FUNCTION public.auto_promote_from_waitinglist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_cap         numeric;
  v_count       integer;
  v_waiting_state text;
  v_attending_state text;
  v_next_user   uuid;
BEGIN
  -- Only when someone who occupied a seat drops out.
  IF NEW.state <> 'Declined' THEN
    RETURN NEW;
  END IF;

  IF OLD.state = 'Attending' THEN
    v_waiting_state := 'Waiting';
    v_attending_state := 'Attending';
    SELECT "maxAttendees" INTO v_cap FROM public.events WHERE id = NEW.event;
  ELSIF OLD.state = 'AttendingAsTrial' THEN
    v_waiting_state := 'WaitingAsTrial';
    v_attending_state := 'AttendingAsTrial';
    SELECT max_trial_attendees INTO v_cap FROM public.events WHERE id = NEW.event;
  ELSE
    RETURN NEW;  -- was not occupying a seat
  END IF;

  -- No cap on this pool => there is no waitlist for it.
  IF v_cap IS NULL THEN
    RETURN NEW;
  END IF;

  -- Seat still full for this pool? nothing to do.
  SELECT COUNT(*) INTO v_count
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event AND state = v_attending_state::public."EventAttendance";

  IF v_count >= v_cap THEN
    RETURN NEW;
  END IF;

  -- Oldest waiter in the SAME pool.
  SELECT "user" INTO v_next_user
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event AND state = v_waiting_state::public."EventAttendance"
  ORDER BY "lastUpdate" ASC
  LIMIT 1;

  IF v_next_user IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.event_attendance_user_mapping
  SET state = v_attending_state::public."EventAttendance",
      "lastUpdate" = now()
  WHERE event = NEW.event AND "user" = v_next_user;

  PERFORM notifications.enqueue_notification(
    p_user    := v_next_user,
    p_title   := 'Du bist aufgerückt!',
    p_body    := 'Ein Platz wurde frei. Du bist von der Warteliste auf die Teilnehmerliste gerutscht.',
    p_title_en := 'You moved up!',
    p_body_en := 'A spot has opened up. You moved from the waiting list to the attendee list.',
    p_topic   := 'event.waitinglist.promoted',
    p_source_type := 'event',
    p_source_id   := NEW.event   -- uuid param; passing ::text would fail type match
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_answer_deadline_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'notifications'
AS $function$
DECLARE
  v_event   record;
  v_user_id uuid;
  v_count   integer := 0;
BEGIN
  FOR v_event IN
    SELECT e.id, e.title, e."group"
    FROM public.events e
    WHERE e."answerDeadline" IS NOT NULL
      AND e.reminder_before IS NOT NULL
      AND e.reminder_sent_at IS NULL
      AND e."isCancelled" = false
      AND e."answerDeadline" > now()
      AND e."answerDeadline" <= now() + e.reminder_before::interval
  LOOP
    FOR v_user_id IN
      SELECT gum."user"::uuid
      FROM public.group_user_mapping gum
      WHERE gum."group" = v_event."group"
        AND gum.role IN ('user', 'admin', 'trial')
        AND NOT EXISTS (
          SELECT 1 FROM public.event_attendance_user_mapping eaum
          WHERE eaum.event = v_event.id
            AND eaum."user" = gum."user"
            AND eaum.state NOT IN ('Unanswered', 'Waiting', 'WaitingAsTrial')
        )
    LOOP
      PERFORM notifications.enqueue_notification(
        p_user        := v_user_id,
        p_title       := 'Anmeldeschluss naht',
        p_body        := 'Bitte melde dich jetzt für "' || v_event.title || '" an!',
        p_title_en    := 'Registration deadline approaching',
        p_body_en     := 'Please sign up now for "' || v_event.title || '"!',
        p_topic       := 'event.answer_deadline.reminder',
        p_source_type := 'event',
        p_source_id   := v_event.id
      );
      v_count := v_count + 1;
    END LOOP;

    UPDATE public.events SET reminder_sent_at = now() WHERE id = v_event.id;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_trial_memberships()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_days       int := coalesce((select value::int from public.app_config where key = 'trial_duration_days'), 28);
  v_count      int := 0;
  r            record;
  v_group_name text;
  v_admins     uuid[];
begin
  for r in
    select gum."user" as user_id, gum."group" as group_id
    from public.group_user_mapping gum
    where gum.role = 'trial'::public."GroupRole"
      and gum.trial_started_at is not null
      and gum.trial_started_at < now() - make_interval(days => v_days)
  loop
    begin
      update public.group_user_mapping
        set role = 'joinRequested'::public."GroupRole"
        where "user" = r.user_id
          and "group" = r.group_id
          and role = 'trial'::public."GroupRole";

      delete from public.event_attendance_user_mapping eaum
      using public.events e
      where eaum.event = e.id
        and e."group" = r.group_id
        and eaum."user" = r.user_id
        and eaum.state in ('AttendingAsTrial'::public."EventAttendance",
                           'WaitingAsTrial'::public."EventAttendance")
        and e."startingDateTime" > now();

      select g."name" into v_group_name
      from public.event_group g
      where g.id = r.group_id;

      perform notifications.notify_emit(
        array[r.user_id],
        'group.trial.expired',
        'Probezeit beendet',
        'Deine Probezeit bei ' || coalesce(v_group_name, 'der Gruppe') || ' ist abgelaufen.',
        jsonb_build_object('group', r.group_id, 'url', '/'),
        'group',
        r.group_id,
        'normal',
        'group',
        r.group_id,
        'Trial period ended',
        'Your trial period at ' || coalesce(v_group_name, 'the group') || ' has ended.'
      );

      select array_agg(gum2."user")
        into v_admins
      from public.group_user_mapping gum2
      where gum2."group" = r.group_id
        and gum2.role = 'admin'::public."GroupRole";

      if v_admins is not null then
        perform notifications.notify_emit(
          v_admins,
          'group.trial.expired.admin',
          'Probezeit beendet',
          'Die Probezeit eines Nutzers bei ' || coalesce(v_group_name, 'der Gruppe') || ' ist abgelaufen.',
          jsonb_build_object('group', r.group_id, 'url', '/'),
          'group',
          r.group_id,
          'normal',
          'group',
          r.group_id,
          'Trial period ended',
          'A user''s trial period at ' || coalesce(v_group_name, 'the group') || ' has ended.'
        );
      end if;

      v_count := v_count + 1;
    exception when others then
      insert into util.background_errors(source, op, ref_id, message, details)
      values ('public.group_user_mapping', 'expire_trial_memberships', r.group_id, sqlerrm,
              jsonb_build_object('user', r.user_id, 'group', r.group_id));
    end;
  end loop;

  return v_count;
end;
$function$;
