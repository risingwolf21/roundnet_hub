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
begin
  select e."group" into v_group from public.event e where e.id = p_event;
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
    insert into public.notifications("user", tenant, topic, title, data, source_type, source_id)
    select a.uid, v_tenant, v_topic, 'Event abgesagt', jsonb_build_object('event', p_event), 'event', p_event
      from allowed a
    returning id, "user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, data, urgency, notification)
    select i."user", v_tenant, 'Event abgesagt', jsonb_build_object('event', p_event), 'high', i.id
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



