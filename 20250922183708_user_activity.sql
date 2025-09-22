create extension if not exists "basejump-supabase_test_helpers" with schema "public" version '0.0.6';

drop policy "wps_delete_self" on "public"."web_push_subscriptions";

drop policy "wps_insert_self" on "public"."web_push_subscriptions";

drop policy "wps_select_self" on "public"."web_push_subscriptions";

drop policy "wps_update_self" on "public"."web_push_subscriptions";

drop function if exists "public"."webpush_compact_duplicates"();

drop function if exists "public"."webpush_mark_hard_bounces"(p_lookback_days integer);

drop function if exists "public"."webpush_prune_subscriptions"(p_revoked_ttl_days integer, p_stale_days integer);

drop function if exists "public"."webpush_sweep"();

create table "public"."user_activity" (
    "user" text not null,
    "last_activity" timestamp with time zone not null default now(),
    "commit_version" text not null,
    "app_version" text not null
);


CREATE UNIQUE INDEX payments_id_uuid_key ON public.payments USING btree (id_uuid);

CREATE UNIQUE INDEX user_activity_pkey ON public.user_activity USING btree ("user");

CREATE UNIQUE INDEX webpush_one_active_per_device ON public.web_push_subscriptions USING btree ("user", COALESCE(device_id, ''::text)) WHERE (revoked_at IS NULL);

alter table "public"."user_activity" add constraint "user_activity_pkey" PRIMARY KEY using index "user_activity_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.register_web_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text DEFAULT NULL::text, p_platform text DEFAULT NULL::text, p_expiration timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_uid text := auth.uid()::text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28P01'; end if;

  insert into public.web_push_subscriptions("user", endpoint, p256dh, auth, ua, platform, expiration_time, last_seen, revoked_at)
  values (v_uid, p_endpoint, p_p256dh, p_auth, p_ua, p_platform, p_expiration, now(), null)
  on conflict ("user", endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        ua = excluded.ua,
        platform = excluded.platform,
        expiration_time = excluded.expiration_time,
        last_seen = now(),
        revoked_at = null
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_webpush_subscription(p_endpoint text, p_p256dh text, p_auth text, p_device_id text, p_user_agent text)
 RETURNS web_push_subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user text := auth.uid()::text;
  v_row  public.web_push_subscriptions;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28P01';
  END IF;

  -- 1) Upsert per endpoint (global eindeutig)
  INSERT INTO public.web_push_subscriptions("user", endpoint, p256dh, auth, device_id, user_agent, revoked_at, last_seen)
  VALUES (v_user, p_endpoint, p_p256dh, p_auth, p_device_id, p_user_agent, NULL, now())
  ON CONFLICT (endpoint) DO UPDATE
     SET "user"      = EXCLUDED."user",
         p256dh      = EXCLUDED.p256dh,
         auth        = EXCLUDED.auth,
         device_id   = EXCLUDED.device_id,
         user_agent  = EXCLUDED.user_agent,
         revoked_at  = NULL,
         last_seen   = now()
  RETURNING * INTO v_row;

  -- 2) Sicherstellen: nur 1 aktiver Eintrag pro (user, device_id)
  DELETE FROM public.web_push_subscriptions s
   WHERE s."user" = v_user
     AND COALESCE(s.device_id, '') = COALESCE(p_device_id, '')
     AND s.revoked_at IS NULL
     AND s.id <> v_row.id;

  -- Aktuelle Zeile zurück
  RETURN v_row;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_event_canceled(p_event uuid, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_group uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic text := 'event.canceled';
  v_cnt int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title text := '';
  v_body text := '🚫 Das Event wurde abgesagt 🚫';
  v_start timestamptz;
begin
  select e."group", e."title", e."startingDateTime" into v_group, v_title, v_start from public.events e where e.id = p_event;
  if v_group is null then raise exception 'event % not found', p_event; end if;

  v_title := v_title || ' - 🗓️ ' || to_char(v_start, 'DD.MM.YYYY');

  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_group and gum."user" <> coalesce(p_actor,'')
  ),
  allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic, v_title, v_body, jsonb_build_object('event', p_event, 'url', v_url), 'event', p_event
      from allowed a
    returning id, "user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant, v_title, v_body, jsonb_build_object('event', p_event, 'url', v_url), 'high', i.id
      from ins i
    returning id, "user"
  )
  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join public.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_event_comment_created(p_event uuid, p_comment uuid, p_text text, p_author text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.comment.created';
  v_cnt    int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title  text := 'Neuer Kommentar';
  v_body   text;
  v_displayName text;
  v_name text;
  v_start timestamptz;
begin

  select e."title", e."startingDateTime" into v_title, v_start from public.events e where e.id = p_event;

  v_title := v_title || ' - 🗓️ ' || to_char(v_start, 'DD.MM.YYYY');

  select u."displayName", u."name"
    into v_displayName, v_name
    from public.user u
    where u."userId" = p_author;

  if v_displayName is null and v_name is null then
    raise exception 'event_comment author % not found', p_author;
  end if;

  v_body := coalesce(v_displayName, v_name) || ': ' || coalesce(p_text, '');

  with recipients as (
    -- alle Attending-User dieses Events, außer ggf. dem Actor
    select distinct eum."user" as uid
      from public.event_attendance_user_mapping eum
     where eum.event = p_event
       and eum.state = 'Attending'
       and eum."user" <> coalesce(p_author, '')
  ),
  allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object(
             'event', p_event,
             'comment', p_comment,
             'author', p_author,
             'text', p_text,
             'url', v_url
           ),
           'event', p_event
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object(
             'event', p_event,
             'comment', p_comment,
             'author', p_author,
             'text', p_text,
             'url', v_url
           ),
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join public.web_push_subscriptions s
      on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;

CREATE OR REPLACE FUNCTION public.notify_event_updated(p_event uuid, p_body text, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.updated';
  v_cnt    int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title   text := 'Ein Event wurde aktualisiert';
  v_start timestamptz;
begin

  select e."title", e."startingDateTime" into v_title, v_start from public.events as e where e.id = p_event;

  v_title := v_title || ' - 🗓️ ' || to_char(DATE(v_start), 'DD.MM.YYYY');

  with recipients as (
    select distinct eum."user" as uid
      from public.event_attendance_user_mapping eum
     where eum.event = p_event
       and eum.state = 'Attending'
       and eum."user" <> coalesce(p_actor, '')
  ),
  allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'event', p_event
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join public.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;

grant delete on table "public"."user_activity" to "anon";

grant insert on table "public"."user_activity" to "anon";

grant references on table "public"."user_activity" to "anon";

grant select on table "public"."user_activity" to "anon";

grant trigger on table "public"."user_activity" to "anon";

grant truncate on table "public"."user_activity" to "anon";

grant update on table "public"."user_activity" to "anon";

grant delete on table "public"."user_activity" to "authenticated";

grant insert on table "public"."user_activity" to "authenticated";

grant references on table "public"."user_activity" to "authenticated";

grant select on table "public"."user_activity" to "authenticated";

grant trigger on table "public"."user_activity" to "authenticated";

grant truncate on table "public"."user_activity" to "authenticated";

grant update on table "public"."user_activity" to "authenticated";

grant delete on table "public"."user_activity" to "service_role";

grant insert on table "public"."user_activity" to "service_role";

grant references on table "public"."user_activity" to "service_role";

grant select on table "public"."user_activity" to "service_role";

grant trigger on table "public"."user_activity" to "service_role";

grant truncate on table "public"."user_activity" to "service_role";

grant update on table "public"."user_activity" to "service_role";

create policy "webpush_insert_supabase_admin"
on "public"."web_push_subscriptions"
as permissive
for select
to public
using (( SELECT authorize('supabase.admin'::text) AS authorize));



