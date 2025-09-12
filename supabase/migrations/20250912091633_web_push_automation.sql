drop trigger if exists "challenge_stats_insert_trigger" on "public"."challenge_stats";

drop trigger if exists "on_event_comment_inserted" on "public"."event_comments";

drop function if exists "public"."event_cancelled_notification"();

drop function if exists "public"."event_comment_notification"();

drop function if exists "public"."notify_users_of_challenge_stat"();

create table "public"."notification_topics" (
    "topic" text not null,
    "description" text,
    "scope_type" text not null,
    "default_enabled" boolean not null default true
);


alter table "public"."notification_outbox_targets" add column "leased_at" timestamp with time zone;

alter table "public"."notification_outbox_targets" add column "leased_by" text;

drop index if exists "idx_outbox_status";

CREATE INDEX idx_outbox_status ON public.notification_outbox USING btree (status);

drop index if exists "idx_targets_status";

CREATE INDEX idx_targets_status ON public.notification_outbox_targets USING btree (status);

drop index if exists "notification_topics_pkey";

CREATE UNIQUE INDEX notification_topics_pkey ON public.notification_topics USING btree (topic);

alter table "public"."notification_topics" add constraint "notification_topics_pkey" PRIMARY KEY using index "notification_topics_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._enqueue_notification(p_user text, p_tenant uuid, p_topic text, p_title text, p_data jsonb, p_source_type text, p_source_id uuid, p_urgency text DEFAULT 'normal'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_nid uuid;
  v_outbox_id bigint;
begin
  -- UI-Zeile
  insert into public.notifications("user", tenant, topic, title, data, source_type, source_id)
  values (p_user, p_tenant, p_topic, p_title, p_data, p_source_type, p_source_id)
  returning id into v_nid;

  -- Outbox – lean: nur FK zur Notification (Worker joint Payload bei Bedarf)
  insert into public.notification_outbox("user", tenant, channel, urgency, status, notification)
  values (p_user, p_tenant, 'webpush', coalesce(p_urgency,'normal'), 'pending', v_nid)
  returning id into v_outbox_id;

  -- Targets (alle aktiven Endpunkte des Users)
  insert into public.notification_outbox_targets(outbox_id, subscription_id, status, attempt_count, next_attempt_at)
  select v_outbox_id, s.id, 'pending', 0, now()
    from public.web_push_subscriptions s
   where s."user" = p_user
     and s.revoked_at is null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._match_participants_uids(p_match uuid)
 RETURNS TABLE(uid text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with m as (
    select team_a, team_b
      from games."match"
     where id = p_match
  ),
  team_ids as (
    select unnest(array[team_a, team_b]) as team_id
      from m
  ),
  players as (
    select unnest(array[t.player_1, t.player_2])::text as uid
      from games.teams t
      join team_ids ti on t.id = ti.team_id
  )
  select distinct uid
    from players
   where uid is not null
$function$
;

CREATE OR REPLACE FUNCTION public._notify_challenge_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.added';
  v_url    text := '/challenges/' || new.id::text;
begin
  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = new."group"
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', new.id)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Neue Challenge',
           jsonb_build_object('challenge', new.id, 'url', v_url),
           'challenge', new.id, 'normal'
         )
    from allowed a;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_challenge_entry_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.entry.added';
  v_ch uuid;
  v_grp uuid;
  v_url text;
begin
  select c.id, c."group" into v_ch, v_grp
    from public.challenge c
   where c.id = new."challenge";

  if v_ch is null then
    return new;
  end if;

  v_url := '/challenges/' || v_ch::text;

  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_grp
       and gum."user" <> new."user"
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', v_ch)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Neuer Challenge-Eintrag',
           jsonb_build_object('challenge', v_ch, 'by', new."user", 'stat', new.id, 'url', v_url),
           'challenge', v_ch, 'normal'
         )
    from allowed a;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_drink_payment_fulfilled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'drinks.payment.fulfilled';
  v_url    text := '/';
begin
  if old."paymentState" is distinct from new.status and new."paymentState" = 'Fulfilled' then
    if public.is_topic_enabled_for_user(new."user", v_tenant, v_topic, 'payment', new.id) then
      perform public._enqueue_notification(
        new."user", v_tenant, v_topic,
        'Zahlung bestätigt',
        jsonb_build_object('payment', new.id, 'url', v_url),
        'payment', new.id, 'normal'
      );
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_event_canceled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.canceled';
  v_url    text := '/training/event/' || new.id::text;
begin
  if coalesce(old."isCancelled", false) = false and new."isCancelled" = true then
    with recipients as (
      select distinct eum."user" as uid
        from public.event_attendance_user_mapping eum
       where eum.event = new.id
         and eum.state::text  = 'Attending'
    ), allowed as (
      select r.uid
        from recipients r
       where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', new.id)
    )
    select public._enqueue_notification(
             a.uid, v_tenant, v_topic,
             'Event abgesagt',
             jsonb_build_object('event', new.id, 'url', v_url),
             'event', new.id, 'high'
           )
      from allowed a;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_event_comment_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.comment.created';
  v_url    text := '/training/event/' || new.event::text;
begin
  with recipients as (
    select distinct eum."user" as uid
      from public.event_attendance_user_mapping eum
     where eum.event = new.event
       and eum.state::text  = 'Attending'
       and eum."user" <> coalesce(new."user",'')
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', new.event)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Neuer Kommentar zum Event',
           jsonb_build_object('event', new.event, 'comment', new.id, 'url', v_url),
           'event', new.event, 'normal'
         )
    from allowed a;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_event_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.updated';
  v_url    text := '/training/event/' || new.id::text;
begin
  with recipients as (
    select distinct eum."user" as uid
      from public.event_attendance_user_mapping eum
     where eum.event = new.id
       and eum.state::text  = 'Attending'
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', new.id)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Event aktualisiert',
           jsonb_build_object('event', new.id, 'url', v_url),
           'event', new.id, 'normal'
         )
    from allowed a;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_game_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'game.added';
  v_url    text := '/matches/' || new.id::text;
begin
  with recipients as (
    select distinct uid from public._match_participants_uids(new.id)
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'game', new.id)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Neues Spiel eingetragen',
           jsonb_build_object('match', new.id, 'url', v_url),
           'game', new.id, 'normal'
         )
    from allowed a;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_group_request_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'group.request.confirmed';
  v_url    text := '/';
begin
  if old.role = 'joinRequested' and new.role in ('user','admin') then
    if public.is_topic_enabled_for_user(new."user", v_tenant, v_topic, 'group', new."group") then
      perform public._enqueue_notification(
        new."user", v_tenant, v_topic,
        'Gruppenbeitritt bestätigt',
        jsonb_build_object('group', new."group", 'url', v_url),
        'group', new."group", 'normal'
      );
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._notify_item_handover()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'item.handover';
  v_url    text := '/keys';
begin
  if new.current_holder is distinct from old.current_holder then
    with recipients(uid) as (
      select old.current_holder::text where old.current_holder is not null
      union
      select new.current_holder::text where new.current_holder is not null
    ), allowed as (
      select r.uid from recipients r
       where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'item', new.id)
    )
    select public._enqueue_notification(
             a.uid, v_tenant, v_topic,
             'Item-Übergabe',
             jsonb_build_object('item', new.id, 'from', old.current_holder, 'to', new.current_holder, 'url', v_url),
             'item', new.id, 'normal'
           )
      from allowed a;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_outbox_targets(p_limit integer DEFAULT 100, p_lease_seconds integer DEFAULT 55, p_worker text DEFAULT 'push-worker'::text)
 RETURNS TABLE(target_id bigint, outbox_id bigint, user_id text, endpoint text, p256dh text, auth text, payload jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  with due as (
    select t.id as target_id, t.outbox_id
      from public.notification_outbox_targets t
      join public.notification_outbox o on o.id = t.outbox_id
     where t.status in ('pending','retry')
       and coalesce(t.next_attempt_at, now()) <= now()
       and (t.leased_at is null or t.leased_at < now() - (p_lease_seconds || ' seconds')::interval)
     order by coalesce(t.next_attempt_at, now()), t.id
     limit p_limit
     for update
  ),
  upd as (
    update public.notification_outbox_targets t
       set status = 'sending',
           leased_at = now(),
           leased_by = p_worker
      from due d
     where t.id = d.target_id
     returning t.id as target_id, t.outbox_id
  )
  select
    u.target_id,
    u.outbox_id,
    o."user" as user_id,
    s.endpoint,
    s.p256dh,
    s.auth,
    o.data as payload
  from upd u
  join public.notification_outbox o on o.id = u.outbox_id
  join public.web_push_subscriptions s on s.id = (
    select t.subscription_id
      from public.notification_outbox_targets t
     where t.id = u.target_id
  )
  where s.revoked_at is null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_target_failed(p_target_id bigint, p_status integer, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_outbox bigint;
  v_attempts int;
  v_next timestamptz;
begin
  select outbox_id, coalesce(attempt_count,0)+1 into v_outbox, v_attempts
  from public.notification_outbox_targets where id = p_target_id;

  -- 404/410: Subscription tot -> target 'skipped' + Subscription revoken
  if p_status in (404,410) then
    update public.notification_outbox_targets
       set status='skipped',
           attempt_count = v_attempts,
           last_status = p_status,
           last_error = p_error,
           next_attempt_at = null
     where id = p_target_id;

    update public.web_push_subscriptions s
       set revoked_at = now()
     where s.id = (
       select subscription_id
         from public.notification_outbox_targets
        where id = p_target_id
     );
  else
    -- 403: meist VAPID-Mismatch -> retry mit Backoff, aber limitiert
    if p_status = 403 then
      v_next := now() + (least(v_attempts, 6) * interval '10 seconds'); -- 10s,20s,...60s
    else
      -- generische Fehler: exponentiell mit Cap
      v_next := now() + (power(2, least(v_attempts, 6)) * interval '5 seconds'); -- 5s,10s,...320s
    end if;

    if v_attempts >= 6 then
      update public.notification_outbox_targets
         set status='dead',
             attempt_count = v_attempts,
             last_status = p_status,
             last_error = p_error,
             next_attempt_at = null
       where id = p_target_id;
    else
      update public.notification_outbox_targets
         set status='retry',
             attempt_count = v_attempts,
             last_status = p_status,
             last_error = p_error,
             next_attempt_at = v_next
       where id = p_target_id;
    end if;
  end if;

  -- Outbox auf 'dead' setzen, wenn KEIN target mehr offen und mind. eins 'dead'
  update public.notification_outbox o
     set status = 'dead'
   where o.id = v_outbox
     and not exists (
       select 1 from public.notification_outbox_targets t
        where t.outbox_id = o.id and t.status in ('pending','retry','sending')
     )
     and exists (
       select 1 from public.notification_outbox_targets t
        where t.outbox_id = o.id and t.status = 'dead'
     );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_target_sent(p_target_id bigint)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.notification_outbox_targets
     set status = 'sent',
         attempt_count = coalesce(attempt_count,0) + 1,
         last_status = 201,
         last_error = null,
         next_attempt_at = null
   where outbox_id = p_target_id;

  -- Outbox ggf. auf 'sent' setzen, wenn alle Targets erledigt
  update public.notification_outbox o
     set status = 'sent',
         sent_at = coalesce(sent_at, now())
   where o.id = (
     select outbox_id from public.notification_outbox_targets where outbox_id = p_target_id
   )
     and not exists (
       select 1 from public.notification_outbox_targets t
        where t.outbox_id = o.id and t.status in ('pending','retry','sending')
     );
$function$
;

CREATE OR REPLACE FUNCTION public.set_notification_pref(p_topic text, p_enabled boolean, p_channel text DEFAULT 'webpush'::text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  insert into public.user_notification_preferences(
    "user", tenant, topic, channel, enabled, scope_type, scope_id
  ) values (
    auth.uid()::text,
    '00000000-0000-0000-0000-000000000000',
    p_topic, p_channel, p_enabled, p_scope_type, p_scope_id
  )
  on conflict ("user", tenant, topic, channel, scope_type_norm, scope_id_norm)
  do update set enabled = excluded.enabled, updated_at = now();
$function$
;

grant delete on table "public"."notification_topics" to "anon";

grant insert on table "public"."notification_topics" to "anon";

grant references on table "public"."notification_topics" to "anon";

grant select on table "public"."notification_topics" to "anon";

grant trigger on table "public"."notification_topics" to "anon";

grant truncate on table "public"."notification_topics" to "anon";

grant update on table "public"."notification_topics" to "anon";

grant delete on table "public"."notification_topics" to "authenticated";

grant insert on table "public"."notification_topics" to "authenticated";

grant references on table "public"."notification_topics" to "authenticated";

grant select on table "public"."notification_topics" to "authenticated";

grant trigger on table "public"."notification_topics" to "authenticated";

grant truncate on table "public"."notification_topics" to "authenticated";

grant update on table "public"."notification_topics" to "authenticated";

grant delete on table "public"."notification_topics" to "service_role";

grant insert on table "public"."notification_topics" to "service_role";

grant references on table "public"."notification_topics" to "service_role";

grant select on table "public"."notification_topics" to "service_role";

grant trigger on table "public"."notification_topics" to "service_role";

grant truncate on table "public"."notification_topics" to "service_role";

grant update on table "public"."notification_topics" to "service_role";

CREATE TRIGGER trg_challenge_added_notify AFTER INSERT ON public.challenge FOR EACH ROW EXECUTE FUNCTION _notify_challenge_added();

CREATE TRIGGER trg_challenge_stat_notify AFTER INSERT ON public.challenge_stats FOR EACH ROW EXECUTE FUNCTION _notify_challenge_entry_added();

CREATE TRIGGER trg_event_comment_notify AFTER INSERT ON public.event_comments FOR EACH ROW EXECUTE FUNCTION _notify_event_comment_created();

CREATE TRIGGER trg_event_canceled_notify AFTER UPDATE ON public.events FOR EACH ROW WHEN (((new."isCancelled" IS TRUE) AND (COALESCE(old."isCancelled", false) IS FALSE))) EXECUTE FUNCTION _notify_event_canceled();

CREATE TRIGGER trg_event_updated_notify AFTER UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION _notify_event_updated();

CREATE TRIGGER trg_group_request_confirmed_notify AFTER UPDATE ON public.group_user_mapping FOR EACH ROW WHEN (((old.role = 'joinRequested'::"GroupRole") AND (new.role = ANY (ARRAY['user'::"GroupRole", 'admin'::"GroupRole"])))) EXECUTE FUNCTION _notify_group_request_confirmed();

CREATE TRIGGER trg_item_handover_notify AFTER UPDATE ON public.items FOR EACH ROW WHEN ((old.current_holder IS DISTINCT FROM new.current_holder)) EXECUTE FUNCTION _notify_item_handover();

CREATE TRIGGER trg_payment_fulfilled_notify AFTER UPDATE ON public.payments FOR EACH ROW WHEN (((old."paymentState" IS DISTINCT FROM new."paymentState") AND ((new."paymentState")::text = 'Fulfilled'::text))) EXECUTE FUNCTION _notify_drink_payment_fulfilled();

CREATE TRIGGER trg_game_added_notify AFTER INSERT ON games.match FOR EACH ROW EXECUTE FUNCTION _notify_game_added();

insert into public.notification_topics(topic,description,scope_type,default_enabled) values
  ('event.canceled','Event abgesagt','event', true),
  ('event.comment.created','Neuer Kommentar am Event','event', true),
  ('event.updated','Event aktualisiert','event', true),
  ('challenge.entry.added','Neuer Challenge-Eintrag','challenge', true),
  ('challenge.added','Neue Challenge','challenge', true),
  ('item.handover','Item-Übergabe','item', true),
  ('game.added','Neues Spiel eingetragen','game', true),
  ('drinks.payment.fulfilled','Zahlung bestätigt','payment', true),
  ('group.request.confirmed','Gruppenbeitritt bestätigt','group', true)
on conflict (topic) do update set
  description = excluded.description,
  scope_type = excluded.scope_type,
  default_enabled = excluded.default_enabled;