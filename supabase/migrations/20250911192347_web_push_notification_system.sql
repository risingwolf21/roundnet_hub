create sequence "public"."notification_outbox_id_seq";

drop policy "Enable read access for all users" on "public"."notification_token";

drop policy "Allow all" on "public"."notifications";

drop policy "Enable all for users based on user_id" on "public"."user_calendar_event_mapping";

drop policy "Enable read access for all users" on "public"."user_calender_settings";

drop policy "Enable all for users based on user_id" on "public"."user_notification_settings";

revoke delete on table "public"."notification_token" from "authenticated";

revoke insert on table "public"."notification_token" from "authenticated";

revoke references on table "public"."notification_token" from "authenticated";

revoke select on table "public"."notification_token" from "authenticated";

revoke trigger on table "public"."notification_token" from "authenticated";

revoke truncate on table "public"."notification_token" from "authenticated";

revoke update on table "public"."notification_token" from "authenticated";

revoke delete on table "public"."notification_token" from "service_role";

revoke insert on table "public"."notification_token" from "service_role";

revoke references on table "public"."notification_token" from "service_role";

revoke select on table "public"."notification_token" from "service_role";

revoke trigger on table "public"."notification_token" from "service_role";

revoke truncate on table "public"."notification_token" from "service_role";

revoke update on table "public"."notification_token" from "service_role";

revoke delete on table "public"."user_calendar_event_mapping" from "authenticated";

revoke insert on table "public"."user_calendar_event_mapping" from "authenticated";

revoke references on table "public"."user_calendar_event_mapping" from "authenticated";

revoke select on table "public"."user_calendar_event_mapping" from "authenticated";

revoke trigger on table "public"."user_calendar_event_mapping" from "authenticated";

revoke truncate on table "public"."user_calendar_event_mapping" from "authenticated";

revoke update on table "public"."user_calendar_event_mapping" from "authenticated";

revoke delete on table "public"."user_calendar_event_mapping" from "service_role";

revoke insert on table "public"."user_calendar_event_mapping" from "service_role";

revoke references on table "public"."user_calendar_event_mapping" from "service_role";

revoke select on table "public"."user_calendar_event_mapping" from "service_role";

revoke trigger on table "public"."user_calendar_event_mapping" from "service_role";

revoke truncate on table "public"."user_calendar_event_mapping" from "service_role";

revoke update on table "public"."user_calendar_event_mapping" from "service_role";

revoke delete on table "public"."user_calender_settings" from "authenticated";

revoke insert on table "public"."user_calender_settings" from "authenticated";

revoke references on table "public"."user_calender_settings" from "authenticated";

revoke select on table "public"."user_calender_settings" from "authenticated";

revoke trigger on table "public"."user_calender_settings" from "authenticated";

revoke truncate on table "public"."user_calender_settings" from "authenticated";

revoke update on table "public"."user_calender_settings" from "authenticated";

revoke delete on table "public"."user_calender_settings" from "service_role";

revoke insert on table "public"."user_calender_settings" from "service_role";

revoke references on table "public"."user_calender_settings" from "service_role";

revoke select on table "public"."user_calender_settings" from "service_role";

revoke trigger on table "public"."user_calender_settings" from "service_role";

revoke truncate on table "public"."user_calender_settings" from "service_role";

revoke update on table "public"."user_calender_settings" from "service_role";

revoke delete on table "public"."user_notification_settings" from "authenticated";

revoke insert on table "public"."user_notification_settings" from "authenticated";

revoke references on table "public"."user_notification_settings" from "authenticated";

revoke select on table "public"."user_notification_settings" from "authenticated";

revoke trigger on table "public"."user_notification_settings" from "authenticated";

revoke truncate on table "public"."user_notification_settings" from "authenticated";

revoke update on table "public"."user_notification_settings" from "authenticated";

revoke delete on table "public"."user_notification_settings" from "service_role";

revoke insert on table "public"."user_notification_settings" from "service_role";

revoke references on table "public"."user_notification_settings" from "service_role";

revoke select on table "public"."user_notification_settings" from "service_role";

revoke trigger on table "public"."user_notification_settings" from "service_role";

revoke truncate on table "public"."user_notification_settings" from "service_role";

revoke update on table "public"."user_notification_settings" from "service_role";

alter table "public"."notification_token" drop constraint "notification_token_user_fkey";

alter table "public"."notifications" drop constraint "public_notifications_user_fkey";

alter table "public"."user_calendar_event_mapping" drop constraint "user_calendar_event_mapping_event_fkey";

alter table "public"."user_calendar_event_mapping" drop constraint "user_calendar_event_mapping_user_fkey";

alter table "public"."user_calender_settings" drop constraint "user_calender_settings_user_fkey";

alter table "public"."user_notification_settings" drop constraint "user_notification_settings_unique_user_tag";

alter table "public"."user_notification_settings" drop constraint "user_notification_settings_user_fkey";

drop view if exists "public"."readable_history";

alter table "public"."notification_token" drop constraint "notification_token_pkey";

alter table "public"."user_calendar_event_mapping" drop constraint "user_calendar_event_mapping_pkey";

alter table "public"."user_calender_settings" drop constraint "user_calender_settings_pkey";

alter table "public"."user_notification_settings" drop constraint "user_notification_settings_pkey";

drop index if exists "public"."notification_token_pkey";

drop index if exists "public"."user_calendar_event_mapping_pkey";

drop index if exists "public"."user_calender_settings_pkey";

drop index if exists "public"."user_notification_settings_pkey";

drop index if exists "public"."user_notification_settings_unique_user_tag";

drop table "public"."notification_token";

drop table "public"."user_calendar_event_mapping";

drop table "public"."user_calender_settings";

drop table "public"."user_notification_settings";

create table "public"."notification_outbox" (
    "id" bigint not null default nextval('notification_outbox_id_seq'::regclass),
    "user" text not null,
    "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "title" text not null,
    "body" text,
    "data" jsonb,
    "urgency" text not null default 'normal'::text,
    "ttl_seconds" integer,
    "dedupe_key" text,
    "status" text not null default 'pending'::text,
    "attempt_count" integer not null default 0,
    "next_attempt_at" timestamp with time zone not null default now(),
    "last_error" text,
    "notification" uuid,
    "created_at" timestamp with time zone not null default now(),
    "sent_at" timestamp with time zone
);


alter table "public"."notification_outbox" enable row level security;

create table "public"."notification_outbox_targets" (
    "outbox_id" bigint not null,
    "subscription_id" uuid not null,
    "status" text not null default 'pending'::text,
    "attempt_count" integer not null default 0,
    "last_status" integer,
    "last_error" text,
    "next_attempt_at" timestamp with time zone not null default now()
);


alter table "public"."notification_outbox_targets" enable row level security;

create table "public"."object_subscriptions" (
    "user" text not null,
    "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "scope_type" text not null,
    "scope_id" uuid not null,
    "topic" text,
    "topic_norm" text not null generated always as (COALESCE(topic, '_'::text)) stored,
    "created_at" timestamp with time zone default now()
);


alter table "public"."object_subscriptions" enable row level security;

create table "public"."user_notification_preferences" (
    "user" text not null,
    "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "topic" text not null,
    "channel" text not null default 'webpush'::text,
    "enabled" boolean not null default true,
    "scope_type" text,
    "scope_id" uuid,
    "scope_type_norm" text not null generated always as (COALESCE(scope_type, '_'::text)) stored,
    "scope_id_norm" uuid not null generated always as (COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."user_notification_preferences" enable row level security;

create table "public"."web_push_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user" text not null,
    "endpoint" text not null,
    "p256dh" text not null,
    "auth" text not null,
    "ua" text,
    "platform" text,
    "expiration_time" timestamp with time zone,
    "last_seen" timestamp with time zone not null default now(),
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."web_push_subscriptions" enable row level security;

create table "public"."notification_retention" (
    "tenant" uuid not null,
    "keep_unread_for" interval not null default '180 days'::interval,
    "keep_read_for" interval not null default '30 days'::interval,
    "keep_sent_outbox_for" interval not null default '7 days'::interval,
    "keep_revoked_sub_for" interval not null default '30 days'::interval
);

alter table "public"."web_push_subscriptions" enable row level security;

alter table "public"."notifications" add column "data" jsonb;

alter table "public"."notifications" add column "dismissed_at" timestamp with time zone;

alter table "public"."notifications" add column "expires_at" timestamp with time zone;

alter table "public"."notifications" add column "read_at" timestamp with time zone;

alter table "public"."notifications" add column "source_id" uuid;

alter table "public"."notifications" add column "source_type" text;

alter table "public"."notifications" add column "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid;

alter table "public"."notifications" add column "topic" text not null;

alter table "public"."notifications" alter column "body" drop default;

alter table "public"."notifications" alter column "body" drop not null;

alter table "public"."notifications" alter column "title" drop default;

alter table "public"."notifications" alter column "user" set not null;

alter table "public"."notifications" disable row level security;

alter sequence "public"."notification_outbox_id_seq" owned by "public"."notification_outbox"."id";

CREATE INDEX idx_notif_user_created ON public.notifications USING btree ("user", created_at DESC);

CREATE INDEX idx_notif_user_unread ON public.notifications USING btree ("user") WHERE (read_at IS NULL);

CREATE INDEX idx_outbox_due ON public.notification_outbox USING btree (status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));

CREATE INDEX idx_targets_due ON public.notification_outbox_targets USING btree (next_attempt_at, status);

CREATE INDEX idx_wps_user_active ON public.web_push_subscriptions USING btree ("user") WHERE (revoked_at IS NULL);

CREATE UNIQUE INDEX notification_outbox_pkey ON public.notification_outbox USING btree (id);

CREATE UNIQUE INDEX notification_outbox_targets_pkey ON public.notification_outbox_targets USING btree (outbox_id, subscription_id);

CREATE UNIQUE INDEX object_subscriptions_pkey ON public.object_subscriptions USING btree ("user", tenant, scope_type, scope_id, topic_norm);

CREATE UNIQUE INDEX user_notification_preferences_pkey ON public.user_notification_preferences USING btree ("user", tenant, topic, channel, scope_type_norm, scope_id_norm);

CREATE UNIQUE INDEX web_push_subscriptions_pkey ON public.web_push_subscriptions USING btree (id);

CREATE UNIQUE INDEX web_push_subscriptions_user_endpoint_key ON public.web_push_subscriptions USING btree ("user", endpoint);

alter table "public"."notification_outbox" add constraint "notification_outbox_pkey" PRIMARY KEY using index "notification_outbox_pkey";

alter table "public"."notification_outbox_targets" add constraint "notification_outbox_targets_pkey" PRIMARY KEY using index "notification_outbox_targets_pkey";

alter table "public"."object_subscriptions" add constraint "object_subscriptions_pkey" PRIMARY KEY using index "object_subscriptions_pkey";

alter table "public"."user_notification_preferences" add constraint "user_notification_preferences_pkey" PRIMARY KEY using index "user_notification_preferences_pkey";

alter table "public"."web_push_subscriptions" add constraint "web_push_subscriptions_pkey" PRIMARY KEY using index "web_push_subscriptions_pkey";

alter table "public"."notification_outbox" add constraint "notification_outbox_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'dead'::text]))) not valid;

alter table "public"."notification_outbox" validate constraint "notification_outbox_status_check";

alter table "public"."notification_outbox" add constraint "notification_outbox_urgency_check" CHECK ((urgency = ANY (ARRAY['very-low'::text, 'low'::text, 'normal'::text, 'high'::text]))) not valid;

alter table "public"."notification_outbox" validate constraint "notification_outbox_urgency_check";

alter table "public"."notification_outbox_targets" add constraint "notification_outbox_targets_outbox_id_fkey" FOREIGN KEY (outbox_id) REFERENCES notification_outbox(id) ON DELETE CASCADE not valid;

alter table "public"."notification_outbox_targets" validate constraint "notification_outbox_targets_outbox_id_fkey";

alter table "public"."notification_outbox_targets" add constraint "notification_outbox_targets_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "public"."notification_outbox_targets" validate constraint "notification_outbox_targets_status_check";

alter table "public"."notification_outbox_targets" add constraint "notification_outbox_targets_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES web_push_subscriptions(id) ON DELETE CASCADE not valid;

alter table "public"."notification_outbox_targets" validate constraint "notification_outbox_targets_subscription_id_fkey";

alter table "public"."user_direct_grants" add constraint "user_direct_grants_user_fkey" FOREIGN KEY ("user") REFERENCES "user"("userId") ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_direct_grants" validate constraint "user_direct_grants_user_fkey";

alter table "public"."web_push_subscriptions" add constraint "web_push_subscriptions_user_endpoint_key" UNIQUE using index "web_push_subscriptions_user_endpoint_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._trg_event_canceled_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.notify_event_canceled(new.id, auth.uid()::text);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_notification(p_user text, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_urgency text DEFAULT 'normal'::text, p_ttl_seconds integer DEFAULT NULL::integer, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_dedupe_key text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id bigint;
  v_nid uuid;
begin
  -- optional: zuerst In-App Notification anlegen
  insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
  values (p_user, p_tenant, coalesce(p_topic,'custom'), p_title, p_body, p_data, p_source_type, p_source_id)
  returning id into v_nid;

  insert into public.notification_outbox("user", title, body, data, urgency, ttl_seconds, tenant, dedupe_key, notification)
  values (p_user, p_title, p_body, p_data, p_urgency, p_ttl_seconds, p_tenant, p_dedupe_key, v_nid)
  returning id into v_id;

  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select v_id, s.id
  from public.web_push_subscriptions s
  where s."user" = p_user and s.revoked_at is null;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.inc_target_attempt(p_outbox_id bigint, p_subscription_id uuid, p_status integer, p_error text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.notification_outbox_targets
     set attempt_count = attempt_count + 1,
         last_status = p_status,
         last_error = p_error
   where outbox_id = p_outbox_id
     and subscription_id = p_subscription_id;
$function$
;

CREATE OR REPLACE FUNCTION public.is_topic_enabled_for_user(p_user text, p_tenant uuid, p_topic text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select coalesce((
    select enabled
    from public.user_notification_preferences p
    where p."user" = p_user
      and p.tenant  = p_tenant
      and p.topic   = p_topic
      and p.channel = 'webpush'
      and (
           (p.scope_type is null and p_scope_type is null) or
           (p.scope_type = p_scope_type and (p.scope_id is null or p.scope_id = p_scope_id))
      )
    order by (p.scope_type is null) asc, (p.scope_id is null) asc
    limit 1
  ), true);
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with upd as (
    update public.notifications n
       set read_at = now()
     where n."user" = auth.uid()::text
       and n.read_at is null
       and (p_topic is null or n.topic = p_topic)
       and (p_source_type is null or n.source_type = p_source_type)
       and (p_source_id is null or n.source_id = p_source_id)
     returning 1
  )
  select count(*)::int from upd;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  update public.notifications
     set read_at = now()
   where id = p_id
     and "user" = auth.uid()::text;
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
  v_body text := 'Das Event wurde abgesagt';
begin
  select e."group", e."title" into v_group, v_title from public.events e where e.id = p_event;
  if v_group is null then raise exception 'event % not found', p_event; end if;

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

CREATE OR REPLACE FUNCTION public.unregister_web_push_subscription(p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.web_push_subscriptions
     set revoked_at = now()
   where endpoint = p_endpoint
     and "user" = auth.uid()::text;
end;
$function$
;

grant delete on table "public"."notification_outbox" to "anon";

grant insert on table "public"."notification_outbox" to "anon";

grant references on table "public"."notification_outbox" to "anon";

grant select on table "public"."notification_outbox" to "anon";

grant trigger on table "public"."notification_outbox" to "anon";

grant truncate on table "public"."notification_outbox" to "anon";

grant update on table "public"."notification_outbox" to "anon";

grant delete on table "public"."notification_outbox" to "service_role";

grant insert on table "public"."notification_outbox" to "service_role";

grant references on table "public"."notification_outbox" to "service_role";

grant select on table "public"."notification_outbox" to "service_role";

grant trigger on table "public"."notification_outbox" to "service_role";

grant truncate on table "public"."notification_outbox" to "service_role";

grant update on table "public"."notification_outbox" to "service_role";

grant delete on table "public"."notification_outbox_targets" to "anon";

grant insert on table "public"."notification_outbox_targets" to "anon";

grant references on table "public"."notification_outbox_targets" to "anon";

grant select on table "public"."notification_outbox_targets" to "anon";

grant trigger on table "public"."notification_outbox_targets" to "anon";

grant truncate on table "public"."notification_outbox_targets" to "anon";

grant update on table "public"."notification_outbox_targets" to "anon";

grant delete on table "public"."notification_outbox_targets" to "service_role";

grant insert on table "public"."notification_outbox_targets" to "service_role";

grant references on table "public"."notification_outbox_targets" to "service_role";

grant select on table "public"."notification_outbox_targets" to "service_role";

grant trigger on table "public"."notification_outbox_targets" to "service_role";

grant truncate on table "public"."notification_outbox_targets" to "service_role";

grant update on table "public"."notification_outbox_targets" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."object_subscriptions" to "anon";

grant insert on table "public"."object_subscriptions" to "anon";

grant references on table "public"."object_subscriptions" to "anon";

grant select on table "public"."object_subscriptions" to "anon";

grant trigger on table "public"."object_subscriptions" to "anon";

grant truncate on table "public"."object_subscriptions" to "anon";

grant update on table "public"."object_subscriptions" to "anon";

grant delete on table "public"."object_subscriptions" to "authenticated";

grant insert on table "public"."object_subscriptions" to "authenticated";

grant references on table "public"."object_subscriptions" to "authenticated";

grant select on table "public"."object_subscriptions" to "authenticated";

grant trigger on table "public"."object_subscriptions" to "authenticated";

grant truncate on table "public"."object_subscriptions" to "authenticated";

grant update on table "public"."object_subscriptions" to "authenticated";

grant delete on table "public"."object_subscriptions" to "service_role";

grant insert on table "public"."object_subscriptions" to "service_role";

grant references on table "public"."object_subscriptions" to "service_role";

grant select on table "public"."object_subscriptions" to "service_role";

grant trigger on table "public"."object_subscriptions" to "service_role";

grant truncate on table "public"."object_subscriptions" to "service_role";

grant update on table "public"."object_subscriptions" to "service_role";

grant delete on table "public"."user_notification_preferences" to "anon";

grant insert on table "public"."user_notification_preferences" to "anon";

grant references on table "public"."user_notification_preferences" to "anon";

grant select on table "public"."user_notification_preferences" to "anon";

grant trigger on table "public"."user_notification_preferences" to "anon";

grant truncate on table "public"."user_notification_preferences" to "anon";

grant update on table "public"."user_notification_preferences" to "anon";

grant delete on table "public"."user_notification_preferences" to "authenticated";

grant insert on table "public"."user_notification_preferences" to "authenticated";

grant references on table "public"."user_notification_preferences" to "authenticated";

grant select on table "public"."user_notification_preferences" to "authenticated";

grant trigger on table "public"."user_notification_preferences" to "authenticated";

grant truncate on table "public"."user_notification_preferences" to "authenticated";

grant update on table "public"."user_notification_preferences" to "authenticated";

grant delete on table "public"."user_notification_preferences" to "service_role";

grant insert on table "public"."user_notification_preferences" to "service_role";

grant references on table "public"."user_notification_preferences" to "service_role";

grant select on table "public"."user_notification_preferences" to "service_role";

grant trigger on table "public"."user_notification_preferences" to "service_role";

grant truncate on table "public"."user_notification_preferences" to "service_role";

grant update on table "public"."user_notification_preferences" to "service_role";

grant delete on table "public"."web_push_subscriptions" to "anon";

grant insert on table "public"."web_push_subscriptions" to "anon";

grant references on table "public"."web_push_subscriptions" to "anon";

grant select on table "public"."web_push_subscriptions" to "anon";

grant trigger on table "public"."web_push_subscriptions" to "anon";

grant truncate on table "public"."web_push_subscriptions" to "anon";

grant update on table "public"."web_push_subscriptions" to "anon";

grant delete on table "public"."web_push_subscriptions" to "authenticated";

grant insert on table "public"."web_push_subscriptions" to "authenticated";

grant references on table "public"."web_push_subscriptions" to "authenticated";

grant select on table "public"."web_push_subscriptions" to "authenticated";

grant trigger on table "public"."web_push_subscriptions" to "authenticated";

grant truncate on table "public"."web_push_subscriptions" to "authenticated";

grant update on table "public"."web_push_subscriptions" to "authenticated";

grant delete on table "public"."web_push_subscriptions" to "service_role";

grant insert on table "public"."web_push_subscriptions" to "service_role";

grant references on table "public"."web_push_subscriptions" to "service_role";

grant select on table "public"."web_push_subscriptions" to "service_role";

grant trigger on table "public"."web_push_subscriptions" to "service_role";

grant truncate on table "public"."web_push_subscriptions" to "service_role";

grant update on table "public"."web_push_subscriptions" to "service_role";

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
drop index if exists "notification_topics_pkey";

CREATE UNIQUE INDEX notification_topics_pkey ON public.notification_topics USING btree (topic);

alter table "public"."notification_topics" add constraint "notification_topics_pkey" PRIMARY KEY using index "notification_topics_pkey";

create policy "os_self"
on "public"."object_subscriptions"
as permissive
for all
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));


create policy "unp_select_self"
on "public"."user_notification_preferences"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));


create policy "unp_update_self"
on "public"."user_notification_preferences"
as permissive
for update
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));


create policy "unp_upsert_self"
on "public"."user_notification_preferences"
as permissive
for insert
to authenticated
with check (("user" = (auth.uid())::text));


create policy "wps_delete_self"
on "public"."web_push_subscriptions"
as permissive
for delete
to authenticated
using (("user" = (auth.uid())::text));


create policy "wps_insert_self"
on "public"."web_push_subscriptions"
as permissive
for insert
to authenticated
with check (("user" = (auth.uid())::text));


create policy "wps_select_self"
on "public"."web_push_subscriptions"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));


create policy "wps_update_self"
on "public"."web_push_subscriptions"
as permissive
for update
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));

revoke delete on table "public"."notification_retention" from "authenticated";

revoke insert on table "public"."notification_retention" from "authenticated";

revoke references on table "public"."notification_retention" from "authenticated";

revoke trigger on table "public"."notification_retention" from "authenticated";

revoke truncate on table "public"."notification_retention" from "authenticated";

revoke update on table "public"."notification_retention" from "authenticated";

revoke delete on table "public"."notification_topics" from "authenticated";

revoke insert on table "public"."notification_topics" from "authenticated";

revoke update on table "public"."notification_topics" from "authenticated";

revoke insert on table "public"."notifications" from "authenticated";


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

alter table "public"."notification_retention" enable row level security;

alter table "public"."notification_topics" enable row level security;

alter table "public"."notifications" enable row level security;

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree ("user", created_at DESC);

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree ("user", read_at);

set check_function_bodies = off;

drop function if exists public.set_notification_pref;

CREATE OR REPLACE FUNCTION public.set_notification_pref(p_topic text, p_enabled boolean, p_channel text DEFAULT 'webpush'::text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS user_notification_preferences
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_row public.user_notification_preferences;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  insert into public.user_notification_preferences(
    "user", tenant, topic, channel, enabled, scope_type, scope_id
  ) values (
    auth.uid()::text, v_tenant, p_topic, coalesce(p_channel,'webpush'),
    p_enabled, p_scope_type, p_scope_id
  )
  on conflict ("user", tenant, topic, channel, scope_type_norm, scope_id_norm)
  do update set
    enabled    = excluded.enabled,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$function$
;

create policy "notification_retention_select_admin"
on "public"."notification_retention"
as permissive
for select
to authenticated
using (authorize('supabase.admin'::text));

create policy "notification_retention_write_admin"
on "public"."notification_retention"
as permissive
for all
to authenticated
using (authorize('supabase.admin'::text))
with check (authorize('supabase.admin'::text));

create policy "notification_topics_select_all"
on "public"."notification_topics"
as permissive
for select
to authenticated
using (true);

create policy "notifications_delete_own"
on "public"."notifications"
as permissive
for delete
to authenticated
using (("user" = (auth.uid())::text));

create policy "notifications_select_own"
on "public"."notifications"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));

create policy "notifications_update_own"
on "public"."notifications"
as permissive
for update
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));

create policy "unp_delete_own"
on "public"."user_notification_preferences"
as permissive
for delete
to authenticated
using (("user" = (auth.uid())::text));

create policy "unp_insert_self"
on "public"."user_notification_preferences"
as permissive
for insert
to authenticated
with check (("user" = (auth.uid())::text));

create policy "unp_select_own"
on "public"."user_notification_preferences"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));

create policy "unp_update_own"
on "public"."user_notification_preferences"
as permissive
for update
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));


INSERT INTO "public"."notification_retention" ("tenant", "keep_unread_for", "keep_read_for", "keep_sent_outbox_for", "keep_revoked_sub_for") VALUES ('00000000-0000-0000-0000-000000000000', '180 days', '30 days', '7 days', '30 days') ON CONFLICT DO NOTHING;

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


CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS id_uuid uuid;

UPDATE public.items
   SET id_uuid = COALESCE(id_uuid, gen_random_uuid());

ALTER TABLE public.items
  ALTER COLUMN id_uuid SET NOT NULL,
  ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS id_uuid uuid;

UPDATE public.payments
   SET id_uuid = COALESCE(id_uuid, gen_random_uuid());

ALTER TABLE public.payments
  ALTER COLUMN id_uuid SET NOT NULL,
  ALTER COLUMN id_uuid SET DEFAULT gen_random_uuid();

-- Optional: Eindeutigkeit absichern
CREATE UNIQUE INDEX IF NOT EXISTS items_id_uuid_key ON public.items(id_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS payments_id_uuid_key ON public.payments(id_uuid);

set check_function_bodies = off;


create or replace function public.notify_event_canceled(p_event uuid, p_actor text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Trigger-Beispiel (wenn du ein 'canceled'-Flag hast)

-- Helper-Trigger Funktion:
create or replace function public._trg_event_canceled_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_event_canceled(new.id, auth.uid()::text);
  return new;
end;
$$;

drop trigger if exists trg_event_canceled_to_notify on public.events;
create trigger trg_event_canceled_to_notify
after update on public.events
for each row
when (new."isCancelled" is true and coalesce(old."isCancelled",false) is false)
execute function public._trg_event_canceled_to_notify();

create or replace function public.notify_event_comment_created(
  p_event uuid,
  p_comment uuid,
  p_text text,
  p_author text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
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
end;
$$;

create or replace function public._trg_event_comment_created_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_event_comment_created(new."event", new.id, new.comment, new."user");
  return new;
end;
$$;

drop trigger if exists trg_event_comment_created_to_notify on public.event_comments;
create trigger trg_event_comment_created_to_notify
after insert on public.event_comments
for each row
execute function public._trg_event_comment_created_to_notify();

create or replace function public.notify_event_updated(
  p_event uuid,
  p_body text,
  p_actor text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.updated';
  v_cnt    int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_text   text := 'Ein Event wurde aktualisiert';
begin

  select e."title" into v_text from public.events as e where e.id = p_event;

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
           v_text,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'event', p_event
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_text,
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
end;
$$;

create or replace function public._trg_event_updated_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
v_body text := '';
begin

  if row(new."startingDateTime", new."endDateTime", new.place)
     is not distinct from
     row(old."startingDateTime", old."endDateTime", old.place) then
    return new;
  end if;

  if row(new."startingDateTime") is distinct from row(old."startingDateTime") then
    v_body := 'Die Startzeit hat sich geändert zu: ' || to_char(new."startingDateTime", 'DD.MM.YYYY HH24:MI:SS');
  end if;

  if row(new."endDateTime") is distinct from row(old."endDateTime") then
    v_body := 'Die Endzeit hat sich geändert zu: ' || to_char(new."endDateTime", 'DD.MM.YYYY HH24:MI:SS');
  end if;

  if row(new."place") is distinct from row(old."place") then
    v_body := 'Der Ort des Events hat sich geändert.';
  end if;
  
  perform public.notify_event_updated(new.id, v_body, auth.uid()::text);

  return new;
end;
$$;

drop trigger if exists trg_event_updated_to_notify on public.events;
create trigger trg_event_updated_to_notify
after update on public.events
for each row
execute function public._trg_event_updated_to_notify();

create or replace function public.notify_challenge_entry_added(
  p_challenge uuid,
  p_actor text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group  uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.entry.added';
  v_cnt    int := 0;
  v_url    text := '/challenges/' || p_challenge::text;
  v_title  text;
  v_body   text := '🔥 Jemand hat einen neuen Punkt eingetragen 🔥';
begin
  select c."group", c."name" into v_group, v_title from public.challenge c where c.id = p_challenge;

  if v_group is null then raise exception 'challenge % not found', p_challenge; end if;

  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_group
       and gum."user" <> coalesce(p_actor, '')
  ),
  allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', p_challenge)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
           'challenge', p_challenge
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
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
end;
$$;

create or replace function public._trg_challenge_entry_added_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_challenge_entry_added(new."challenge", auth.uid()::text);
  return new;
end;
$$;

drop trigger if exists trg_challenge_entry_added_to_notify on public.challenge_stats;
create trigger trg_challenge_entry_added_to_notify
after insert on public.challenge_stats
for each row
execute function public._trg_challenge_entry_added_to_notify();

create or replace function public.notify_challenge_added(
  p_challenge uuid,
  p_actor text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group  uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.added';
  v_cnt    int := 0;
  v_url    text := '/challenges/' || p_challenge::text;
  v_body  text := '💪 Es gibt eine neue Challenge für dich 💪';
  v_title   text;
begin
  select c."group", c."name" into v_group, v_title from public.challenge c where c.id = p_challenge;
  if v_group is null then raise exception 'challenge % not found', p_challenge; end if;

  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_group
       and gum."user" <> coalesce(p_actor, '')
  ),
  allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', p_challenge)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
           'challenge', p_challenge
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
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
end;
$$;

create or replace function public._trg_challenge_added_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_challenge_added(new.id, auth.uid()::text);
  return new;
end;
$$;

drop trigger if exists trg_challenge_added_to_notify on public.challenge;
create trigger trg_challenge_added_to_notify
after insert on public.challenge
for each row
execute function public._trg_challenge_added_to_notify();

create or replace function public.notify_item_handover(
  p_item  uuid,
  p_from  text,
  p_to    text,
  p_actor text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'item.handover';
  v_cnt    int  := 0;
  v_url    text := '/keys';
  v_title text := 'Übergabe';
  v_body text;
  v_item_name text;
begin

  select i."name" into v_item_name from public.items i where id_uuid = p_item;

  v_title := 'Übergabe von ' || p_item_name;

  if p_to = p_actor then
    v_body := 'Du bist jetzt der Besitzer von ' || p_item_name;
  end if;

  if p_from = p_actor then
    v_body := 'Du hast ' || p_item_name || 'abgegeben';
  end if;

  with recipients as (
    select uid from (values (p_from), (p_to)) v(uid)
     where v.uid is not null and v.uid <> coalesce(p_actor, '')
  ),
  allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'item', p_item)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('item', p_item, 'from', p_from, 'to', p_to, 'url', v_url),
           'item', p_item
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('item', p_item, 'from', p_from, 'to', p_to, 'url', v_url),
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join public.web_push_subscriptions s
      on s."user" = o."user"
     and s.revoked_at is null;

  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  return v_cnt;
end;
$$;

create or replace function public.notify_item_handover(
  p_item  bigint,
  p_from  text,
  p_to    text,
  p_actor text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item uuid;
begin
  -- Erwartet, dass public.items.id_uuid existiert (siehe Vorbereitung oben)
  select i.id_uuid into v_item
    from public.items i
   where i.id = p_item;

  if v_item is null then
    raise exception 'notify_item_handover: item % nicht gefunden oder id_uuid fehlt', p_item;
  end if;

  return public.notify_item_handover(v_item, p_from, p_to, p_actor);
end;
$$;

create or replace function public._trg_item_handover_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."current_holder" is distinct from old."current_holder" then
    perform public.notify_item_handover(
      new.id,
      old."current_holder"::text,
      new."current_holder"::text,
      auth.uid()::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_item_handover_to_notify on public.items;
create trigger trg_item_handover_to_notify
after update on public.items
for each row
execute function public._trg_item_handover_to_notify();

create or replace function public.notify_game_added(
  p_match uuid,
  p_actor text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'game.added';
  v_cnt    int := 0;
  v_url    text := '/matches/' || p_match::text;
  v_title text;
  v_body text := '🤾 Es wurde ein neues Spiel mit dir hinzugefügt 🤾';
  v_team_a_name text;
  v_team_b_name text;
begin
  select t."name" into v_team_a_name from games."teams" where id = (select m.team_a
      from games."match" m
     where m.id = p_match );
  select t."name" into v_team_b_name from games."teams" where id = (select m.team_b
      from games."match" m
     where m.id = p_match );

  v_title := v_team_a_name || ' vs. ' || v_team_b_name;

  with mt as (
    select m.team_a, m.team_b
      from games."match" m
     where m.id = p_match
  ),
  rec as (
    select distinct uid from (
      select t1.player_1 as uid from mt join games.teams t1 on t1.id = mt.team_a
      union all
      select t1.player_2       from mt join games.teams t1 on t1.id = mt.team_a
      union all
      select t2.player_1       from mt join games.teams t2 on t2.id = mt.team_b
      union all
      select t2.player_2       from mt join games.teams t2 on t2.id = mt.team_b
    ) u
    where uid is not null and uid <> coalesce(p_actor,'')
  ),
  allowed as (
    select r.uid
      from rec r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'game', p_match)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           'Neues Spiel eingetragen',
           jsonb_build_object('match', p_match, 'url', v_url),
           'game', p_match
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, data, urgency, notification)
    select i."user", v_tenant,
           'Neues Spiel eingetragen',
           jsonb_build_object('match', p_match, 'url', v_url),
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
end;
$$;

create or replace function games._trg_game_added_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_game_added(new.id, auth.uid()::text);
  return new;
end;
$$;

drop trigger if exists trg_game_added_to_notify on games."match";
create trigger trg_game_added_to_notify
after insert on games."match"
for each row
execute function games._trg_game_added_to_notify();

create or replace function public.notify_drink_payment_fulfilled(
  p_payment uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$

declare
  v_user   text;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'drink.payment.fulfilled';
  v_cnt    int := 0;
  v_url    text := '/';
  v_body text := '💸 Deine Zahlung wurde bestätigt 💸';
  v_title text := 'Zahlung eingegangen';
begin
  select p."userId"::text into v_user from public.payments p where p.id_uuid = p_payment;
  if v_user is null then
    raise exception 'payment % not found', p_payment;
  end if;

  with allowed as (
    select v_user::text as uid
     where public.is_topic_enabled_for_user(v_user::text, v_tenant, v_topic, 'payment', p_payment)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('payment', p_payment, 'url', v_url),
           'payment', p_payment
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('payment', p_payment, 'url', v_url),
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
end;
$$;

create or replace function public.notify_drink_payment_fulfilled(
  p_payment  bigint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment uuid;
begin
  -- Erwartet, dass public.items.id_uuid existiert (siehe Vorbereitung oben)
  select i.id_uuid into v_payment
    from public.payments i
   where i.id = p_payment;

  if v_payment is null then
    raise exception 'notify_drink_payment_fulfilled: payment % nicht gefunden oder id_uuid fehlt', p_payment;
  end if;

  return public.notify_drink_payment_fulfilled(v_payment);
end;
$$;

create or replace function public._trg_payment_fulfilled_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old."paymentState" is distinct from new."paymentState")
     and new."paymentState" = 'Fulfilled' then
    perform public.notify_drink_payment_fulfilled(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_fulfilled_to_notify on public.payments;
create trigger trg_payment_fulfilled_to_notify
after update on public.payments
for each row
execute function public._trg_payment_fulfilled_to_notify();

create or replace function public.notify_group_request_confirmed(
  p_group uuid,
  p_user text,
  p_actor text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
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
       and public.is_topic_enabled_for_user(p_user::text, v_tenant, v_topic, 'group', p_group)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('group', p_group, 'url', v_url),
           'group', p_group
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('group', p_group, 'url', v_url),
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
end;
$$;

create or replace function public._trg_group_request_confirmed_to_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old."role" = 'joinRequested' and new."role" in ('user','admin') then
    perform public.notify_group_request_confirmed(new."group", new."user", auth.uid()::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_group_request_confirmed_to_notify on public.group_user_mapping;
create trigger trg_group_request_confirmed_to_notify
after update on public.group_user_mapping
for each row
execute function public._trg_group_request_confirmed_to_notify();

