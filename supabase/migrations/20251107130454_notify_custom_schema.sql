create schema if not exists "notifications";

create sequence "notifications"."notification_outbox_id_seq";

drop trigger if exists "trg_audit_user_notification_preferences" on "public"."user_notification_preferences";

drop trigger if exists "trg_game_added_to_notify" on "games"."match";

drop trigger if exists "fetch_player_info_after_rglink_change" on "games"."players";

drop trigger if exists "set_normalized_players" on "games"."teams";

drop trigger if exists "trg_challenge_added_to_notify" on "public"."challenge";

drop trigger if exists "trg_challenge_entry_added_to_notify" on "public"."challenge_stats";

drop trigger if exists "WaitingListAttendanceTrigger" on "public"."event_attendance_user_mapping";

drop trigger if exists "trg_event_comment_created_to_notify" on "public"."event_comments";

drop trigger if exists "trg_update_event_comment" on "public"."event_comments";

drop trigger if exists "maxattendees_change_trigger" on "public"."events";

drop trigger if exists "trg_event_canceled_to_notify" on "public"."events";

drop trigger if exists "trg_event_updated_to_notify" on "public"."events";

drop trigger if exists "trg_events_max_trial_attendees_change" on "public"."events";

drop trigger if exists "delete_user_from_subgroups" on "public"."group_user_mapping";

drop trigger if exists "trg_group_join_requested_to_notify" on "public"."group_user_mapping";

drop trigger if exists "trg_group_request_confirmed_to_notify" on "public"."group_user_mapping";

drop trigger if exists "item_history_trigger" on "public"."items";

drop trigger if exists "trg_item_handover_to_notify" on "public"."items";

drop trigger if exists "trg_payment_fulfilled_to_notify" on "public"."payments";

drop trigger if exists "on_auth_user_created" on "auth"."users";

drop policy "notification_retention_select_admin" on "public"."notification_retention";

drop policy "notification_retention_write_admin" on "public"."notification_retention";

drop policy "notification_topics_select_all" on "public"."notification_topics";

drop policy "allow_all_admin_notifiy_users" on "public"."notifications";

drop policy "notifications_delete_own" on "public"."notifications";

drop policy "notifications_select_own" on "public"."notifications";

drop policy "notifications_update_own" on "public"."notifications";

drop policy "os_self" on "public"."object_subscriptions";

drop policy "unp_delete_own" on "public"."user_notification_preferences";

drop policy "unp_insert_self" on "public"."user_notification_preferences";

drop policy "unp_select_own" on "public"."user_notification_preferences";

drop policy "unp_select_self" on "public"."user_notification_preferences";

drop policy "unp_update_own" on "public"."user_notification_preferences";

drop policy "unp_update_self" on "public"."user_notification_preferences";

drop policy "unp_upsert_self" on "public"."user_notification_preferences";

drop policy "webpush_insert_self" on "public"."web_push_subscriptions";

drop policy "webpush_insert_supabase_admin" on "public"."web_push_subscriptions";

drop policy "webpush_select_self" on "public"."web_push_subscriptions";

drop policy "webpush_update_self" on "public"."web_push_subscriptions";

revoke delete on table "public"."notification_outbox" from "anon";

revoke insert on table "public"."notification_outbox" from "anon";

revoke references on table "public"."notification_outbox" from "anon";

revoke select on table "public"."notification_outbox" from "anon";

revoke trigger on table "public"."notification_outbox" from "anon";

revoke truncate on table "public"."notification_outbox" from "anon";

revoke update on table "public"."notification_outbox" from "anon";

revoke delete on table "public"."notification_outbox" from "authenticated";

revoke insert on table "public"."notification_outbox" from "authenticated";

revoke references on table "public"."notification_outbox" from "authenticated";

revoke select on table "public"."notification_outbox" from "authenticated";

revoke trigger on table "public"."notification_outbox" from "authenticated";

revoke truncate on table "public"."notification_outbox" from "authenticated";

revoke update on table "public"."notification_outbox" from "authenticated";

revoke delete on table "public"."notification_outbox" from "service_role";

revoke insert on table "public"."notification_outbox" from "service_role";

revoke references on table "public"."notification_outbox" from "service_role";

revoke select on table "public"."notification_outbox" from "service_role";

revoke trigger on table "public"."notification_outbox" from "service_role";

revoke truncate on table "public"."notification_outbox" from "service_role";

revoke update on table "public"."notification_outbox" from "service_role";

revoke delete on table "public"."notification_outbox_targets" from "anon";

revoke insert on table "public"."notification_outbox_targets" from "anon";

revoke references on table "public"."notification_outbox_targets" from "anon";

revoke select on table "public"."notification_outbox_targets" from "anon";

revoke trigger on table "public"."notification_outbox_targets" from "anon";

revoke truncate on table "public"."notification_outbox_targets" from "anon";

revoke update on table "public"."notification_outbox_targets" from "anon";

revoke delete on table "public"."notification_outbox_targets" from "authenticated";

revoke insert on table "public"."notification_outbox_targets" from "authenticated";

revoke references on table "public"."notification_outbox_targets" from "authenticated";

revoke select on table "public"."notification_outbox_targets" from "authenticated";

revoke trigger on table "public"."notification_outbox_targets" from "authenticated";

revoke truncate on table "public"."notification_outbox_targets" from "authenticated";

revoke update on table "public"."notification_outbox_targets" from "authenticated";

revoke delete on table "public"."notification_outbox_targets" from "service_role";

revoke insert on table "public"."notification_outbox_targets" from "service_role";

revoke references on table "public"."notification_outbox_targets" from "service_role";

revoke select on table "public"."notification_outbox_targets" from "service_role";

revoke trigger on table "public"."notification_outbox_targets" from "service_role";

revoke truncate on table "public"."notification_outbox_targets" from "service_role";

revoke update on table "public"."notification_outbox_targets" from "service_role";

revoke delete on table "public"."notification_retention" from "anon";

revoke insert on table "public"."notification_retention" from "anon";

revoke references on table "public"."notification_retention" from "anon";

revoke select on table "public"."notification_retention" from "anon";

revoke trigger on table "public"."notification_retention" from "anon";

revoke truncate on table "public"."notification_retention" from "anon";

revoke update on table "public"."notification_retention" from "anon";

revoke select on table "public"."notification_retention" from "authenticated";

revoke delete on table "public"."notification_retention" from "service_role";

revoke insert on table "public"."notification_retention" from "service_role";

revoke references on table "public"."notification_retention" from "service_role";

revoke select on table "public"."notification_retention" from "service_role";

revoke trigger on table "public"."notification_retention" from "service_role";

revoke truncate on table "public"."notification_retention" from "service_role";

revoke update on table "public"."notification_retention" from "service_role";

revoke delete on table "public"."notification_topics" from "anon";

revoke insert on table "public"."notification_topics" from "anon";

revoke references on table "public"."notification_topics" from "anon";

revoke select on table "public"."notification_topics" from "anon";

revoke trigger on table "public"."notification_topics" from "anon";

revoke truncate on table "public"."notification_topics" from "anon";

revoke update on table "public"."notification_topics" from "anon";

revoke delete on table "public"."notification_topics" from "authenticated";

revoke insert on table "public"."notification_topics" from "authenticated";

revoke references on table "public"."notification_topics" from "authenticated";

revoke select on table "public"."notification_topics" from "authenticated";

revoke trigger on table "public"."notification_topics" from "authenticated";

revoke truncate on table "public"."notification_topics" from "authenticated";

revoke update on table "public"."notification_topics" from "authenticated";

revoke delete on table "public"."notification_topics" from "service_role";

revoke insert on table "public"."notification_topics" from "service_role";

revoke references on table "public"."notification_topics" from "service_role";

revoke select on table "public"."notification_topics" from "service_role";

revoke trigger on table "public"."notification_topics" from "service_role";

revoke truncate on table "public"."notification_topics" from "service_role";

revoke update on table "public"."notification_topics" from "service_role";

revoke delete on table "public"."notifications" from "anon";

revoke insert on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke select on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."notifications" from "authenticated";

revoke references on table "public"."notifications" from "authenticated";

revoke select on table "public"."notifications" from "authenticated";

revoke trigger on table "public"."notifications" from "authenticated";

revoke truncate on table "public"."notifications" from "authenticated";

revoke update on table "public"."notifications" from "authenticated";

revoke delete on table "public"."notifications" from "service_role";

revoke insert on table "public"."notifications" from "service_role";

revoke references on table "public"."notifications" from "service_role";

revoke select on table "public"."notifications" from "service_role";

revoke trigger on table "public"."notifications" from "service_role";

revoke truncate on table "public"."notifications" from "service_role";

revoke update on table "public"."notifications" from "service_role";

revoke delete on table "public"."object_subscriptions" from "anon";

revoke insert on table "public"."object_subscriptions" from "anon";

revoke references on table "public"."object_subscriptions" from "anon";

revoke select on table "public"."object_subscriptions" from "anon";

revoke trigger on table "public"."object_subscriptions" from "anon";

revoke truncate on table "public"."object_subscriptions" from "anon";

revoke update on table "public"."object_subscriptions" from "anon";

revoke delete on table "public"."object_subscriptions" from "authenticated";

revoke insert on table "public"."object_subscriptions" from "authenticated";

revoke references on table "public"."object_subscriptions" from "authenticated";

revoke select on table "public"."object_subscriptions" from "authenticated";

revoke trigger on table "public"."object_subscriptions" from "authenticated";

revoke truncate on table "public"."object_subscriptions" from "authenticated";

revoke update on table "public"."object_subscriptions" from "authenticated";

revoke delete on table "public"."object_subscriptions" from "service_role";

revoke insert on table "public"."object_subscriptions" from "service_role";

revoke references on table "public"."object_subscriptions" from "service_role";

revoke select on table "public"."object_subscriptions" from "service_role";

revoke trigger on table "public"."object_subscriptions" from "service_role";

revoke truncate on table "public"."object_subscriptions" from "service_role";

revoke update on table "public"."object_subscriptions" from "service_role";

revoke delete on table "public"."user_notification_preferences" from "anon";

revoke insert on table "public"."user_notification_preferences" from "anon";

revoke references on table "public"."user_notification_preferences" from "anon";

revoke select on table "public"."user_notification_preferences" from "anon";

revoke trigger on table "public"."user_notification_preferences" from "anon";

revoke truncate on table "public"."user_notification_preferences" from "anon";

revoke update on table "public"."user_notification_preferences" from "anon";

revoke delete on table "public"."user_notification_preferences" from "authenticated";

revoke insert on table "public"."user_notification_preferences" from "authenticated";

revoke references on table "public"."user_notification_preferences" from "authenticated";

revoke select on table "public"."user_notification_preferences" from "authenticated";

revoke trigger on table "public"."user_notification_preferences" from "authenticated";

revoke truncate on table "public"."user_notification_preferences" from "authenticated";

revoke update on table "public"."user_notification_preferences" from "authenticated";

revoke delete on table "public"."user_notification_preferences" from "service_role";

revoke insert on table "public"."user_notification_preferences" from "service_role";

revoke references on table "public"."user_notification_preferences" from "service_role";

revoke select on table "public"."user_notification_preferences" from "service_role";

revoke trigger on table "public"."user_notification_preferences" from "service_role";

revoke truncate on table "public"."user_notification_preferences" from "service_role";

revoke update on table "public"."user_notification_preferences" from "service_role";

revoke delete on table "public"."web_push_subscriptions" from "anon";

revoke insert on table "public"."web_push_subscriptions" from "anon";

revoke references on table "public"."web_push_subscriptions" from "anon";

revoke select on table "public"."web_push_subscriptions" from "anon";

revoke trigger on table "public"."web_push_subscriptions" from "anon";

revoke truncate on table "public"."web_push_subscriptions" from "anon";

revoke update on table "public"."web_push_subscriptions" from "anon";

revoke delete on table "public"."web_push_subscriptions" from "authenticated";

revoke insert on table "public"."web_push_subscriptions" from "authenticated";

revoke references on table "public"."web_push_subscriptions" from "authenticated";

revoke select on table "public"."web_push_subscriptions" from "authenticated";

revoke trigger on table "public"."web_push_subscriptions" from "authenticated";

revoke truncate on table "public"."web_push_subscriptions" from "authenticated";

revoke update on table "public"."web_push_subscriptions" from "authenticated";

revoke delete on table "public"."web_push_subscriptions" from "service_role";

revoke insert on table "public"."web_push_subscriptions" from "service_role";

revoke references on table "public"."web_push_subscriptions" from "service_role";

revoke select on table "public"."web_push_subscriptions" from "service_role";

revoke trigger on table "public"."web_push_subscriptions" from "service_role";

revoke truncate on table "public"."web_push_subscriptions" from "service_role";

revoke update on table "public"."web_push_subscriptions" from "service_role";

alter table "public"."notification_outbox" drop constraint "notification_outbox_status_check";

alter table "public"."notification_outbox" drop constraint "notification_outbox_urgency_check";

alter table "public"."notification_outbox_targets" drop constraint "notification_outbox_targets_outbox_id_fkey";

alter table "public"."notification_outbox_targets" drop constraint "notification_outbox_targets_status_check";

alter table "public"."notification_outbox_targets" drop constraint "notification_outbox_targets_subscription_id_fkey";

alter table "public"."web_push_subscriptions" drop constraint "web_push_subscriptions_user_endpoint_key";

drop function if exists "games"."_trg_game_added_to_notify"();

drop function if exists "games"."fetch_player_info_on_change"();

drop function if exists "public"."_trg_challenge_added_to_notify"();

drop function if exists "public"."_trg_challenge_entry_added_to_notify"();

drop function if exists "public"."_trg_event_canceled_to_notify"();

drop function if exists "public"."_trg_event_comment_created_to_notify"();

drop function if exists "public"."_trg_event_updated_to_notify"();

drop function if exists "public"."_trg_group_join_requested_to_notify"();

drop function if exists "public"."_trg_group_request_confirmed_to_notify"();

drop function if exists "public"."_trg_item_handover_to_notify"();

drop function if exists "public"."_trg_payment_fulfilled_to_notify"();

drop function if exists "public"."_trg_refresh_from_udg"();

drop function if exists "public"."_trg_refresh_from_udg_stmt"();

drop function if exists "public"."add_item_history_entry"();

drop function if exists "public"."add_user_to_public"();

drop function if exists "public"."authorize"(requested_permission text, p_tenant uuid);

drop function if exists "public"."delete_user_from_subgroups"();

drop function if exists "public"."enqueue_notification"(p_user text, p_title text, p_body text, p_data jsonb, p_urgency text, p_ttl_seconds integer, p_tenant uuid, p_dedupe_key text, p_topic text, p_source_type text, p_source_id uuid);

drop function if exists "public"."get_column_info"(schema_name text, selected_table text);

drop function if exists "public"."get_enum_types"();

drop function if exists "public"."get_public_table_names"();

drop function if exists "public"."handle_new_auth_user"();

drop function if exists "public"."is_topic_enabled_for_user"(p_user text, p_tenant uuid, p_topic text, p_scope_type text, p_scope_id uuid);

drop function if exists "public"."mark_all_notifications_read"(p_topic text, p_source_type text, p_source_id uuid);

drop function if exists "public"."mark_notification_read"(p_id uuid);

drop function if exists "public"."notify_challenge_added"(p_challenge uuid, p_actor text);

drop function if exists "public"."notify_challenge_entry_added"(p_challenge uuid, p_actor text);

drop function if exists "public"."notify_drink_payment_fulfilled"(p_payment bigint);

drop function if exists "public"."notify_drink_payment_fulfilled"(p_payment uuid);

drop function if exists "public"."notify_event_canceled"(p_event uuid, p_actor text);

drop function if exists "public"."notify_event_comment_created"(p_event uuid, p_comment uuid, p_text text, p_author text);

drop function if exists "public"."notify_event_updated"(p_event uuid, p_body text, p_actor text);

drop function if exists "public"."notify_game_added"(p_match uuid, p_actor text);

drop function if exists "public"."notify_group_join_requested"(p_group uuid, p_user text, p_actor text);

drop function if exists "public"."notify_group_request_confirmed"(p_group uuid, p_user text, p_actor text);

drop function if exists "public"."notify_item_handover"(p_item bigint, p_from text, p_to text, p_actor text);

drop function if exists "public"."notify_item_handover"(p_item uuid, p_from text, p_to text, p_actor text);

drop function if exists "public"."notify_users"(p_users text[], p_topic text, p_scope text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid);

drop function if exists "public"."set_notification_pref"(p_topic text, p_enabled boolean, p_channel text, p_scope_type text, p_scope_id uuid);

drop function if exists "public"."unregister_web_push_subscription"(p_endpoint text);

drop function if exists "public"."update_attendance_on_max_trial_attendees_change"();

drop function if exists "public"."update_attendance_on_maxattendees_change"();

drop function if exists "public"."update_event_comment"();

drop function if exists "public"."update_normalized_players"();

drop function if exists "public"."updatewaitinglistattendance"();

drop function if exists "public"."upsert_webpush_subscription"(p_endpoint text, p_p256dh text, p_auth text, p_device_id text, p_user_agent text, p_platform text);

drop function if exists "public"."util_get_primary_keys"(schema_name text, table_name text);

drop function if exists "public"."webpush_prune_subscriptions"(p_inactive_days integer, p_revoked_days integer, p_failures integer);

alter table "public"."notification_outbox" drop constraint "notification_outbox_pkey";

alter table "public"."notification_outbox_targets" drop constraint "notification_outbox_targets_pkey";

alter table "public"."notification_topics" drop constraint "notification_topics_pkey";

alter table "public"."notifications" drop constraint "notifications_pkey";

alter table "public"."object_subscriptions" drop constraint "object_subscriptions_pkey";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_pkey";

alter table "public"."web_push_subscriptions" drop constraint "web_push_subscriptions_pkey";

drop index if exists "public"."idx_notif_user_created";

drop index if exists "public"."idx_notif_user_unread";

drop index if exists "public"."idx_notifications_user_created";

drop index if exists "public"."idx_notifications_user_read";

drop index if exists "public"."idx_outbox_due";

drop index if exists "public"."idx_targets_due";

drop index if exists "public"."idx_wps_user_active";

drop index if exists "public"."notification_outbox_pkey";

drop index if exists "public"."notification_outbox_targets_pkey";

drop index if exists "public"."notification_topics_pkey";

drop index if exists "public"."notifications_pkey";

drop index if exists "public"."object_subscriptions_pkey";

drop index if exists "public"."user_notification_preferences_pkey";

drop index if exists "public"."web_push_subscriptions_pkey";

drop index if exists "public"."web_push_subscriptions_user_endpoint_key";

drop index if exists "public"."webpush_one_active_per_device";

drop index if exists "public"."webpush_unique_endpoint";

drop index if exists "public"."webpush_uq_endpoint";

drop index if exists "public"."webpush_uq_user_device_active";

drop table "public"."notification_outbox";

drop table "public"."notification_outbox_targets";

drop table "public"."notification_retention";

drop table "public"."notification_topics";

drop table "public"."notifications";

drop table "public"."object_subscriptions";

drop table "public"."user_notification_preferences";

drop table "public"."web_push_subscriptions";


  create table "notifications"."notification_outbox" (
    "id" bigint not null default nextval('notifications.notification_outbox_id_seq'::regclass),
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


alter table "notifications"."notification_outbox" enable row level security;


  create table "notifications"."notification_outbox_targets" (
    "outbox_id" bigint not null,
    "subscription_id" uuid not null,
    "status" text not null default 'pending'::text,
    "attempt_count" integer not null default 0,
    "last_status" integer,
    "last_error" text,
    "next_attempt_at" timestamp with time zone not null default now()
      );


alter table "notifications"."notification_outbox_targets" enable row level security;


  create table "notifications"."notification_retention" (
    "tenant" uuid not null,
    "keep_unread_for" interval not null default '180 days'::interval,
    "keep_read_for" interval not null default '30 days'::interval,
    "keep_sent_outbox_for" interval not null default '7 days'::interval,
    "keep_revoked_sub_for" interval not null default '30 days'::interval
      );


alter table "notifications"."notification_retention" enable row level security;


  create table "notifications"."notification_topics" (
    "topic" text not null,
    "description" text,
    "scope_type" text not null,
    "default_enabled" boolean not null default true
      );


alter table "notifications"."notification_topics" enable row level security;


  create table "notifications"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "body" text,
    "title" text not null,
    "user" text not null,
    "data" jsonb,
    "dismissed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "source_id" uuid,
    "source_type" text,
    "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "topic" text not null
      );


alter table "notifications"."notifications" enable row level security;


  create table "notifications"."object_subscriptions" (
    "user" text not null,
    "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "scope_type" text not null,
    "scope_id" uuid not null,
    "topic" text,
    "topic_norm" text not null generated always as (COALESCE(topic, '_'::text)) stored,
    "created_at" timestamp with time zone default now()
      );


alter table "notifications"."object_subscriptions" enable row level security;


  create table "notifications"."user_notification_preferences" (
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


alter table "notifications"."user_notification_preferences" enable row level security;


  create table "notifications"."web_push_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user" text not null,
    "endpoint" text not null,
    "p256dh" text not null,
    "auth" text not null,
    "platform" text,
    "expiration_time" timestamp with time zone,
    "last_seen" timestamp with time zone not null default now(),
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "device_id" text,
    "user_agent" text,
    "failure_count" integer default 0,
    "last_status" integer,
    "last_error" text
      );


alter table "notifications"."web_push_subscriptions" enable row level security;

alter sequence "notifications"."notification_outbox_id_seq" owned by "notifications"."notification_outbox"."id";

drop sequence if exists "public"."notification_outbox_id_seq";

CREATE INDEX idx_notif_user_created ON notifications.notifications USING btree ("user", created_at DESC);

CREATE INDEX idx_notif_user_unread ON notifications.notifications USING btree ("user") WHERE (read_at IS NULL);

CREATE INDEX idx_notifications_user_created ON notifications.notifications USING btree ("user", created_at DESC);

CREATE INDEX idx_notifications_user_read ON notifications.notifications USING btree ("user", read_at);

CREATE INDEX idx_outbox_due ON notifications.notification_outbox USING btree (status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));

CREATE INDEX idx_targets_due ON notifications.notification_outbox_targets USING btree (next_attempt_at, status);

CREATE INDEX idx_wps_user_active ON notifications.web_push_subscriptions USING btree ("user") WHERE (revoked_at IS NULL);

CREATE UNIQUE INDEX notification_outbox_pkey ON notifications.notification_outbox USING btree (id);

CREATE UNIQUE INDEX notification_outbox_targets_pkey ON notifications.notification_outbox_targets USING btree (outbox_id, subscription_id);

CREATE UNIQUE INDEX notification_topics_pkey ON notifications.notification_topics USING btree (topic);

CREATE UNIQUE INDEX notifications_pkey ON notifications.notifications USING btree (id);

CREATE UNIQUE INDEX object_subscriptions_pkey ON notifications.object_subscriptions USING btree ("user", tenant, scope_type, scope_id, topic_norm);

CREATE UNIQUE INDEX user_notification_preferences_pkey ON notifications.user_notification_preferences USING btree ("user", tenant, topic, channel, scope_type_norm, scope_id_norm);

CREATE UNIQUE INDEX web_push_subscriptions_pkey ON notifications.web_push_subscriptions USING btree (id);

CREATE UNIQUE INDEX web_push_subscriptions_user_endpoint_key ON notifications.web_push_subscriptions USING btree ("user", endpoint);

CREATE UNIQUE INDEX webpush_one_active_per_device ON notifications.web_push_subscriptions USING btree ("user", COALESCE(device_id, ''::text)) WHERE (revoked_at IS NULL);

CREATE UNIQUE INDEX webpush_unique_endpoint ON notifications.web_push_subscriptions USING btree (endpoint);

CREATE UNIQUE INDEX webpush_uq_endpoint ON notifications.web_push_subscriptions USING btree (endpoint);

CREATE UNIQUE INDEX webpush_uq_user_device_active ON notifications.web_push_subscriptions USING btree ("user", device_id) WHERE ((revoked_at IS NULL) AND (device_id IS NOT NULL));

alter table "notifications"."notification_outbox" add constraint "notification_outbox_pkey" PRIMARY KEY using index "notification_outbox_pkey";

alter table "notifications"."notification_outbox_targets" add constraint "notification_outbox_targets_pkey" PRIMARY KEY using index "notification_outbox_targets_pkey";

alter table "notifications"."notification_topics" add constraint "notification_topics_pkey" PRIMARY KEY using index "notification_topics_pkey";

alter table "notifications"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "notifications"."object_subscriptions" add constraint "object_subscriptions_pkey" PRIMARY KEY using index "object_subscriptions_pkey";

alter table "notifications"."user_notification_preferences" add constraint "user_notification_preferences_pkey" PRIMARY KEY using index "user_notification_preferences_pkey";

alter table "notifications"."web_push_subscriptions" add constraint "web_push_subscriptions_pkey" PRIMARY KEY using index "web_push_subscriptions_pkey";

alter table "notifications"."notification_outbox" add constraint "notification_outbox_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'dead'::text]))) not valid;

alter table "notifications"."notification_outbox" validate constraint "notification_outbox_status_check";

alter table "notifications"."notification_outbox" add constraint "notification_outbox_urgency_check" CHECK ((urgency = ANY (ARRAY['very-low'::text, 'low'::text, 'normal'::text, 'high'::text]))) not valid;

alter table "notifications"."notification_outbox" validate constraint "notification_outbox_urgency_check";

alter table "notifications"."notification_outbox_targets" add constraint "notification_outbox_targets_outbox_id_fkey" FOREIGN KEY (outbox_id) REFERENCES notifications.notification_outbox(id) ON DELETE CASCADE not valid;

alter table "notifications"."notification_outbox_targets" validate constraint "notification_outbox_targets_outbox_id_fkey";

alter table "notifications"."notification_outbox_targets" add constraint "notification_outbox_targets_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text]))) not valid;

alter table "notifications"."notification_outbox_targets" validate constraint "notification_outbox_targets_status_check";

alter table "notifications"."notification_outbox_targets" add constraint "notification_outbox_targets_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES notifications.web_push_subscriptions(id) ON DELETE CASCADE not valid;

alter table "notifications"."notification_outbox_targets" validate constraint "notification_outbox_targets_subscription_id_fkey";

alter table "notifications"."web_push_subscriptions" add constraint "web_push_subscriptions_user_endpoint_key" UNIQUE using index "web_push_subscriptions_user_endpoint_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.trg_fetch_player_info_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
perform public.invoke_edge_function(
    'fetch-player-info',
    jsonb_build_object(
      'rg_link', new.rg_link,
      'player',  new.player
    ),
    5000
  );
        RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION games.trg_game_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_game_added(new.id, auth.uid()::text);
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_challenge_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_challenge_added(new.id, auth.uid()::text);
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_challenge_entry_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_challenge_entry_added(new."challenge", auth.uid()::text);
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_canceled_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_event_canceled(new.id, auth.uid()::text);
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_comment_created_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_event_comment_created(new."event", new.id, new.comment, new."user");
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_updated_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
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
  
  perform notifications.notify_event_updated(new.id, v_body, auth.uid()::text);

  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_group_join_requested_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  -- Only act for joinRequested rows; ignore other roles
  if (tg_op = 'INSERT' and new.role = 'joinRequested') then
    perform notifications.notify_group_join_requested(new."group", new."user", auth.uid()::text);
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_group_request_confirmed_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if old."role" = 'joinRequested' and new."role" in ('user','admin') then
    perform notifications.notify_group_request_confirmed(new."group", new."user", auth.uid()::text);
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_item_handover_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if new."current_holder" is distinct from old."current_holder" then
    perform notifications.notify_item_handover(
      new.id,
      old."current_holder"::text,
      new."current_holder"::text,
      auth.uid()::text
    );
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_payment_fulfilled_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if (old."paymentState" is distinct from new."paymentState")
     and new."paymentState" = 'Fulfilled' then
    perform notifications.notify_drink_payment_fulfilled(new.id);
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.enqueue_notification(p_user text, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_urgency text DEFAULT 'normal'::text, p_ttl_seconds integer DEFAULT NULL::integer, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_dedupe_key text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
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
  from public.web_push_subscriptions s
  where s."user" = p_user and s.revoked_at is null;

  return v_id;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.is_topic_enabled_for_user(p_user text, p_tenant uuid, p_topic text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$select coalesce((
    select enabled
    from notifications.user_notification_preferences p
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
  ), true);$function$
;

CREATE OR REPLACE FUNCTION notifications.mark_all_notifications_read(p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$with upd as (
    update notifications.notifications n
       set read_at = now()
     where n."user" = auth.uid()::text
       and n.read_at is null
       and (p_topic is null or n.topic = p_topic)
       and (p_source_type is null or n.source_type = p_source_type)
       and (p_source_id is null or n.source_id = p_source_id)
     returning 1
  )
  select count(*)::int from upd;$function$
;

CREATE OR REPLACE FUNCTION notifications.mark_notification_read(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$update notifications.notifications
     set read_at = now()
   where id = p_id
     and "user" = auth.uid()::text;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_challenge_added(p_challenge uuid, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_group  uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.added';
  v_cnt    int := 0;
  v_url    text := '/challenges/' || p_challenge::text;
  v_body  text := 'Es gibt eine neue Challenge für dich 💪';
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
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', p_challenge)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
           'challenge', p_challenge
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
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

CREATE OR REPLACE FUNCTION notifications.notify_challenge_entry_added(p_challenge uuid, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_group  uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.entry.added';
  v_cnt    int := 0;
  v_url    text := '/challenges/' || p_challenge::text;
  v_title  text;
  v_body   text := 'Jemand hat einen neuen Punkt eingetragen 🔥';
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
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', p_challenge)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
           'challenge', p_challenge
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
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

CREATE OR REPLACE FUNCTION notifications.notify_drink_payment_fulfilled(p_payment bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_payment uuid;
begin
  -- Erwartet, dass public.items.id_uuid existiert (siehe Vorbereitung oben)
  select i.id_uuid into v_payment
    from public.payments i
   where i.id = p_payment;

  if v_payment is null then
    raise exception 'notify_drink_payment_fulfilled: payment % nicht gefunden oder id_uuid fehlt', p_payment;
  end if;

  return notifications.notify_drink_payment_fulfilled(v_payment);
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_drink_payment_fulfilled(p_payment uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
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
     where notifications.is_topic_enabled_for_user(v_user::text, v_tenant, v_topic, 'payment', p_payment)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('payment', p_payment, 'url', v_url),
           'payment', p_payment
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('payment', p_payment, 'url', v_url),
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

CREATE OR REPLACE FUNCTION notifications.notify_event_canceled(p_event uuid, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_group uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic text := 'event.canceled';
  v_cnt int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title text := '';
  v_body text := '🚫 Das Event wurde abgesagt 🚫';
  v_start text;
begin
  select e."group", e."title", e."startingDateTime" into v_group, v_title, v_start from public.events e where e.id = p_event;
  if v_group is null then raise exception 'event % not found', p_event; end if;

  v_title := v_title || ' - 🗓️ ' || to_char(DATE(v_start), 'DD.MM.YYYY');

  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_group and gum."user" <> coalesce(p_actor,'')
  ),
  allowed as (
    select r.uid
      from recipients r
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic, v_title, v_body, jsonb_build_object('event', p_event, 'url', v_url), 'event', p_event
      from allowed a
    returning id, "user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant, v_title, v_body, jsonb_build_object('event', p_event, 'url', v_url), 'high', i.id
      from ins i
    returning id, "user"
  )
  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join notifications.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_comment_created(p_event uuid, p_comment uuid, p_text text, p_author text)
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
  v_start text;
begin

  select e."title", e."startingDateTime" into v_title, v_start from public.events e where e.id = p_event;

  v_title := v_title || ' - 🗓️ ' || to_char(DATE(v_start), 'DD.MM.YYYY');

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
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
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
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
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
  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join notifications.web_push_subscriptions s
      on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_updated(p_event uuid, p_body text, p_actor text DEFAULT NULL::text)
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
  v_start text;
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

CREATE OR REPLACE FUNCTION notifications.notify_game_added(p_match uuid, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'game.added';
  v_cnt    int := 0;
  v_url    text := '/matches/' || p_match::text;
  v_title text;
  v_body text := '🤾 Es wurde ein neues Spiel mit dir hinzugefügt 🤾';
  v_team_a_name text;
  v_team_b_name text;
begin
  select t."name" into v_team_a_name from games."teams" t where id = (select m.team_a
      from games."match" m
     where m.id = p_match );
  select t."name" into v_team_b_name from games."teams" t where id = (select m.team_b
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
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'game', p_match)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           'Neues Spiel eingetragen',
           jsonb_build_object('match', p_match, 'url', v_url),
           'game', p_match
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, data, urgency, notification)
    select i."user", v_tenant,
           'Neues Spiel eingetragen',
           jsonb_build_object('match', p_match, 'url', v_url),
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

CREATE OR REPLACE FUNCTION notifications.notify_group_join_requested(p_group uuid, p_user text, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'group.request.received';
  v_cnt    int  := 0;
  v_url    text := '/groups/' || p_group::text;
  v_title  text := 'Neue Beitrittsanfrage';
  v_body   text;
  v_group_name text;
  v_user_display text;
begin
  -- group name
  select g.name into v_group_name
  from public.event_group g
  where g.id = p_group;

  -- requester display (best-effort)
  select coalesce(u."displayName", u."name", p_user::text)
    into v_user_display
    from public."user" u
   where u."userId" = p_user;

  v_body := coalesce(v_user_display, p_user::text) || ' möchte der Gruppe "' || coalesce(v_group_name, '') || '" beitreten.';

  with recipients as (
      -- only admins of this group, exclude actor if present
      select distinct gum."user" as uid
        from public.group_user_mapping gum
       where gum."group" = p_group
         and gum.role = 'admin'
         and gum."user" <> coalesce(p_actor, '')
  ),
  allowed as (
      select r.uid
        from recipients r
       where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'group', p_group)
  ),
  ins as (
      insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
      select a.uid, v_tenant, v_topic,
             v_title,
             v_body,
             jsonb_build_object('group', p_group, 'requester', p_user, 'url', v_url),
             'group', p_group
        from allowed a
      returning id,"user"
  ),
  outbox as (
      insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
      select i."user", v_tenant,
             v_title,
             v_body,
             jsonb_build_object('group', p_group, 'requester', p_user, 'url', v_url),
             'normal',
             i.id
        from ins i
      returning id,"user"
  )
  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join notifications.web_push_subscriptions s
      on s."user" = o."user"
     and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;

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
       and public.is_topic_enabled_for_user(p_user::text, v_tenant, v_topic, 'group', p_group)
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

CREATE OR REPLACE FUNCTION notifications.notify_item_handover(p_item bigint, p_from text, p_to text, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_item uuid;
begin
  -- Erwartet, dass public.items.id_uuid existiert (siehe Vorbereitung oben)
  select i.id_uuid into v_item
    from public.items i
   where i.id = p_item;

  if v_item is null then
    raise exception 'notify_item_handover: item % nicht gefunden oder id_uuid fehlt', p_item;
  end if;

  return notifications.notify_item_handover(v_item, p_from, p_to, p_actor);
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_item_handover(p_item uuid, p_from text, p_to text, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'item.handover';
  v_cnt    int  := 0;
  v_url    text := '/keys';
  v_title text := 'Übergabe';
  v_body text;
  v_item_name text;
begin

  select i."name" into v_item_name from public.items i where id_uuid = p_item;

  v_title := 'Übergabe von ' || v_item_name;

  if p_to = p_actor then
    v_body := 'Du bist jetzt der Besitzer von ' || v_item_name;
  end if;

  if p_from = p_actor then
    v_body := 'Du hast ' || v_item_name || 'abgegeben';
  end if;

  with recipients as (
    select uid from (values (p_from), (p_to)) v(uid)
     where v.uid is not null and v.uid <> coalesce(p_actor, '')
  ),
  allowed as (
    select r.uid
      from recipients r
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'item', p_item)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('item', p_item, 'from', p_from, 'to', p_to, 'url', v_url),
           'item', p_item
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('item', p_item, 'from', p_from, 'to', p_to, 'url', v_url),
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join notifications.web_push_subscriptions s
      on s."user" = o."user"
     and s.revoked_at is null;

  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  return v_cnt;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_users(p_users text[], p_topic text, p_scope text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare
v_cnt    int  := 0;
v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin

  with allowed as (
    select distinct "userId" as uid from public.user where "userId" = any (p_users)
    and public.is_topic_enabled_for_user("userId", v_tenant, p_topic, p_scope, null)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, p_topic,
           p_title,
           p_body,
           p_data,
           p_source_type,
           p_source_id
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           p_title,
           p_body,
           p_data,
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join public.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  return v_cnt;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.set_notification_pref(p_topic text, p_enabled boolean, p_channel text DEFAULT 'webpush'::text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS notifications.user_notification_preferences
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare
  v_row notifications.user_notification_preferences;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  insert into notifications.user_notification_preferences(
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
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.unregister_web_push_subscription(p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$begin
  update notifications.web_push_subscriptions
     set revoked_at = now()
   where endpoint = p_endpoint
     and "user" = auth.uid()::text;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.upsert_webpush_subscription(p_endpoint text, p_p256dh text, p_auth text, p_device_id text, p_user_agent text, p_platform text)
 RETURNS notifications.web_push_subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_user text := auth.uid()::text;
  v_row  notifications.web_push_subscriptions%rowtype;
  v_ep   notifications.web_push_subscriptions%rowtype;
  v_dev  notifications.web_push_subscriptions%rowtype;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if coalesce(p_endpoint,'') = '' then
    raise exception 'endpoint required';
  end if;

  -- 0) Rennen vermeiden: pro (user|device) sperren
  perform pg_advisory_xact_lock(
    hashtextextended(coalesce(v_user,'?') || '|' || coalesce(p_device_id,'?'), 0)
  );

  -- 1) Falls endpoint bereits existiert: diese Zeile übernehmen/aktualisieren
  select * into v_ep
    from notifications.web_push_subscriptions
   where endpoint = p_endpoint
   limit 1;

  if found then
    update notifications.web_push_subscriptions
       set "user"     = v_user,
           p256dh     = p_p256dh,
           auth       = p_auth,
           platform   = p_platform,
           device_id  = p_device_id,
           user_agent = p_user_agent,
           revoked_at = null,
           last_seen  = now()
     where id = v_ep.id
     returning * into v_row;

    -- Alle anderen aktiven Zeilen für dasselbe (user, device_id) deaktivieren
    update notifications.web_push_subscriptions
       set revoked_at = now()
     where "user" = v_user
       and coalesce(device_id,'') = coalesce(p_device_id,'')
       and revoked_at is null
       and id <> v_row.id;

    return v_row;
  end if;

  -- 2) Sonst: gibt es bereits eine aktive Zeile für (user, device_id)?
  if p_device_id is not null then
    select * into v_dev
      from notifications.web_push_subscriptions
     where "user" = v_user
       and device_id = p_device_id
       and revoked_at is null
     limit 1;

    if found then
      -- Update IN PLACE (kein Insert, daher kein Unique-Konflikt)
      update notifications.web_push_subscriptions
         set endpoint   = p_endpoint,
             p256dh     = p_p256dh,
             auth       = p_auth,
             platform   = p_platform,
             user_agent = p_user_agent,
             last_seen  = now()
       where id = v_dev.id
       returning * into v_row;

      return v_row;
    end if;
  end if;

  -- 3) Weder endpoint noch device aktiv vorhanden -> Insert / Claim via endpoint
  insert into notifications.web_push_subscriptions
      ("user", endpoint, p256dh, auth, platform, device_id, user_agent, revoked_at, last_seen)
  values (v_user, p_endpoint, p_p256dh, p_auth, p_platform, p_device_id, p_user_agent, null, now())
  on conflict (endpoint) do update
     set "user"     = excluded."user",
         p256dh     = excluded.p256dh,
         auth       = excluded.auth,
         platform   = excluded.platform,
         device_id  = excluded.device_id,
         user_agent = excluded.user_agent,
         revoked_at = null,
         last_seen  = now()
  returning * into v_row;

  -- 4) Sicherheitshalber: andere aktive Zeilen für (user, device_id) deaktivieren
  if p_device_id is not null then
    update notifications.web_push_subscriptions
       set revoked_at = now()
     where "user" = v_user
       and device_id = p_device_id
       and revoked_at is null
       and id <> v_row.id;
  end if;

  return v_row;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.webpush_prune_subscriptions(p_inactive_days integer DEFAULT 30, p_revoked_days integer DEFAULT 10, p_failures integer DEFAULT 10)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
  v_cnt int := 0;
  v_cnt2 int := 0;
BEGIN
  -- 1) alte, widerrufene Zeilen weg
  DELETE FROM notifications.web_push_subscriptions
   WHERE revoked_at IS NOT NULL
     AND revoked_at < now() - (p_revoked_days || ' days')::interval;
  GET DIAGNOSTICS v_cnt = ROW_COUNT;

  -- 2) nie wieder gesehen + viele Fehler → weg
  DELETE FROM notifications.web_push_subscriptions
   WHERE revoked_at IS NULL
     AND COALESCE(last_seen, created_at) < now() - (p_inactive_days || ' days')::interval
     AND failure_count >= p_failures;

  GET DIAGNOSTICS v_cnt2 = ROW_COUNT;
  RETURN v_cnt + v_cnt2;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_add_item_history_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$begin
    insert into item_history("pastUser", "currentUser", key)
    values (old."current_holder", new."current_holder", new.id);
    return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.trg_add_user_to_public()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$BEGIN
  INSERT INTO public.user ("userId", email, "displayName", name, role, created_at, verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'displayName', ''),
        COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'displayName', '')),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public."UserRole", -- Default role if not provided
        NOW(),
        TRUE
    );
    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_delete_user_from_subgroups()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
  is_root_group BOOLEAN;
BEGIN
  -- Prüfe, ob die gelöschte group_id eine Hauptgruppe ist
  SELECT parent_group IS NULL INTO is_root_group
  FROM event_group
  WHERE id = OLD."group";

  -- Wenn es keine Hauptgruppe ist, mache nichts
  IF NOT is_root_group THEN
    RETURN OLD;
  END IF;

  -- Lösche alle Mappings in Untergruppen rekursiv
  DELETE FROM group_user_mapping
  WHERE "user" = OLD."user"
    AND "group" IN (
      WITH RECURSIVE subgroups AS (
        SELECT id FROM event_group WHERE parent_group = OLD."group"
        UNION ALL
        SELECT g.id
        FROM event_group g
        INNER JOIN subgroups sg ON g.parent_group = sg.id
      )
      SELECT id FROM subgroups
    );

  RETURN OLD;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
  v_name    text;
  v_display text;
BEGIN
  -- Aus Metadata sinnvolle Werte ziehen, mit Fallbacks
  v_name    := COALESCE(
                 NEW.raw_user_meta_data->>'name',
                 NEW.raw_user_meta_data->>'displayName',
                 'Anonymous'
               );

  v_display := COALESCE(
                 NEW.raw_user_meta_data->>'displayName',
                 v_name
               );

  -- In deine User-Tabelle eintragen (UUID als Text, wie bei dir üblich)
  INSERT INTO public."user"("userId","displayName","email","name")
  VALUES (NEW.id::text, v_display, NEW.email, v_name)
  ON CONFLICT ("userId") DO NOTHING;

  RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_update_attendance_on_max_trial_attendees_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$declare
    newEvent public.events;
begin
    select * into newEvent from events where id = new.id limit 1;
    if (new."max_trial_attendees" < old."max_trial_attendees") then
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'AttendingAsTrial'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'WaitingAsTrial'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
    else
        if (new."max_trial_attendees" > old."max_trial_attendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'WaitingAsTrial'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'AttendingAsTrial'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.trg_update_attendance_on_maxattendees_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
    newEvent public.events;
begin
    select * into newEvent from events where id = new.id limit 1;
    if (new."maxAttendees" < old."maxAttendees") then
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'Attending'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'Waiting'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
    else
        if (new."maxAttendees" > old."maxAttendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'Waiting'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'Attending'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.trg_update_event_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$BEGIN
    -- Update last_update to the current timestamp and set edited to true
    NEW.last_update := NOW();
    NEW.edited := true;
    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_update_normalized_players()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$BEGIN
    NEW.normalized_players := 
        CASE 
            WHEN NEW.player_1 < NEW.player_2 THEN NEW.player_1 || ',' || NEW.player_2
            ELSE NEW.player_2 || ',' || NEW.player_1
        END;
    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_update_waiting_list_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
  BEGIN
    if((Select count(*) from event_attendance_user_mapping where event_attendance_user_mapping.event = NEW.event AND event_attendance_user_mapping.state = 'Attending') < (Select events."maxAttendees" from events where events.id = NEW.event LIMIT 1) AND NEW.state = 'Declined') then

    UPDATE event_attendance_user_mapping
    SET state = 'Attending'
    WHERE event_attendance_user_mapping.user = (SELECT event_attendance_user_mapping.user from event_attendance_user_mapping where event_attendance_user_mapping.state = 'Waiting' AND event_attendance_user_mapping.event = NEW.event order by event_attendance_user_mapping."lastUpdate" Limit 1);
    end if;
    return NEW;
  END;$function$
;

CREATE OR REPLACE FUNCTION util.get_column_info(schema_name text, selected_table text)
 RETURNS TABLE(column_name text, data_type text, is_nullable boolean, foreign_key_schema_name text, foreign_key_table_name text, foreign_key_column_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (c.column_name)
    c.column_name::text,
    CASE 
      WHEN c.data_type = 'USER-DEFINED' THEN CONCAT('ENUM,', c.udt_name::text)
      ELSE c.data_type::text
    END AS data_type,
    (c.is_nullable = 'YES') AS is_nullable,
    ccu.table_schema::text AS foreign_key_schema_name,
    ccu.table_name::text AS foreign_key_table_name,
    ccu.column_name::text AS foreign_key_column_name
  FROM
    information_schema.columns AS c
  LEFT JOIN information_schema.key_column_usage AS kcu
    ON c.table_name = kcu.table_name
    AND c.table_schema = kcu.table_schema
    AND c.column_name = kcu.column_name
  LEFT JOIN information_schema.table_constraints AS tc
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.constraint_type = 'FOREIGN KEY'
  LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  LEFT JOIN pg_type t 
    ON t.typname = c.udt_name
  WHERE
    c.table_schema = schema_name
    AND c.table_name = selected_table
  ORDER BY
    c.column_name,
    -- Priorisiere Zeilen mit vorhandener Foreign-Key-Relation (ccu.column_name IS NOT NULL)
    (ccu.column_name IS NOT NULL) DESC;
END;$function$
;

CREATE OR REPLACE FUNCTION util.get_enum_types()
 RETURNS TABLE(enum_name text, enum_values text[])
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$BEGIN
    RETURN QUERY
    SELECT 
        pg_type.typname::text AS enum_name,
        ARRAY_AGG(pg_enum.enumlabel::text) AS enum_values
    FROM 
        pg_enum
    JOIN 
        pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE 
        pg_type.typcategory = 'E'  -- 'E' indicates enum types
        AND pg_type.typname NOT IN ('aal_level', 'action', 'code_challenge_method', 'equality_op','factor_status','factor_type','key_status','key_type','one_time_token_type','request_status')  -- Replace with actual enum names to exclude
    GROUP BY 
        pg_type.typname;
END;$function$
;

CREATE OR REPLACE FUNCTION util.get_primary_keys(schema_name text, table_name text)
 RETURNS TABLE(column_name text)
 LANGUAGE sql
 STABLE
AS $function$select a.attname as column_name
  from pg_index i
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  join pg_class c on c.oid = i.indrelid
  join pg_namespace n on n.oid = c.relnamespace
  where i.indisprimary and n.nspname = schema_name and c.relname = table_name
  order by array_position(i.indkey, a.attnum);$function$
;

CREATE OR REPLACE FUNCTION util.get_public_table_names()
 RETURNS TABLE(table_name text, table_schema text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$BEGIN
    RETURN QUERY
    SELECT t.table_name::text, t.table_schema::text
    FROM information_schema.tables AS t
    WHERE (t.table_schema = 'public' OR t.table_schema = 'permissions' OR t.table_schema = 'games' OR t.table_schema = 'audit')
      AND t.table_type = 'BASE TABLE';
END;$function$
;

grant delete on table "notifications"."notification_outbox" to "anon";

grant insert on table "notifications"."notification_outbox" to "anon";

grant references on table "notifications"."notification_outbox" to "anon";

grant select on table "notifications"."notification_outbox" to "anon";

grant trigger on table "notifications"."notification_outbox" to "anon";

grant truncate on table "notifications"."notification_outbox" to "anon";

grant update on table "notifications"."notification_outbox" to "anon";

grant delete on table "notifications"."notification_outbox" to "authenticated";

grant insert on table "notifications"."notification_outbox" to "authenticated";

grant references on table "notifications"."notification_outbox" to "authenticated";

grant select on table "notifications"."notification_outbox" to "authenticated";

grant trigger on table "notifications"."notification_outbox" to "authenticated";

grant truncate on table "notifications"."notification_outbox" to "authenticated";

grant update on table "notifications"."notification_outbox" to "authenticated";

grant delete on table "notifications"."notification_outbox" to "service_role";

grant insert on table "notifications"."notification_outbox" to "service_role";

grant references on table "notifications"."notification_outbox" to "service_role";

grant select on table "notifications"."notification_outbox" to "service_role";

grant trigger on table "notifications"."notification_outbox" to "service_role";

grant truncate on table "notifications"."notification_outbox" to "service_role";

grant update on table "notifications"."notification_outbox" to "service_role";

grant delete on table "notifications"."notification_outbox_targets" to "anon";

grant insert on table "notifications"."notification_outbox_targets" to "anon";

grant references on table "notifications"."notification_outbox_targets" to "anon";

grant select on table "notifications"."notification_outbox_targets" to "anon";

grant trigger on table "notifications"."notification_outbox_targets" to "anon";

grant truncate on table "notifications"."notification_outbox_targets" to "anon";

grant update on table "notifications"."notification_outbox_targets" to "anon";

grant delete on table "notifications"."notification_outbox_targets" to "authenticated";

grant insert on table "notifications"."notification_outbox_targets" to "authenticated";

grant references on table "notifications"."notification_outbox_targets" to "authenticated";

grant select on table "notifications"."notification_outbox_targets" to "authenticated";

grant trigger on table "notifications"."notification_outbox_targets" to "authenticated";

grant truncate on table "notifications"."notification_outbox_targets" to "authenticated";

grant update on table "notifications"."notification_outbox_targets" to "authenticated";

grant delete on table "notifications"."notification_outbox_targets" to "service_role";

grant insert on table "notifications"."notification_outbox_targets" to "service_role";

grant references on table "notifications"."notification_outbox_targets" to "service_role";

grant select on table "notifications"."notification_outbox_targets" to "service_role";

grant trigger on table "notifications"."notification_outbox_targets" to "service_role";

grant truncate on table "notifications"."notification_outbox_targets" to "service_role";

grant update on table "notifications"."notification_outbox_targets" to "service_role";

grant delete on table "notifications"."notification_retention" to "anon";

grant insert on table "notifications"."notification_retention" to "anon";

grant references on table "notifications"."notification_retention" to "anon";

grant select on table "notifications"."notification_retention" to "anon";

grant trigger on table "notifications"."notification_retention" to "anon";

grant truncate on table "notifications"."notification_retention" to "anon";

grant update on table "notifications"."notification_retention" to "anon";

grant select on table "notifications"."notification_retention" to "authenticated";

grant delete on table "notifications"."notification_retention" to "service_role";

grant insert on table "notifications"."notification_retention" to "service_role";

grant references on table "notifications"."notification_retention" to "service_role";

grant select on table "notifications"."notification_retention" to "service_role";

grant trigger on table "notifications"."notification_retention" to "service_role";

grant truncate on table "notifications"."notification_retention" to "service_role";

grant update on table "notifications"."notification_retention" to "service_role";

grant delete on table "notifications"."notification_topics" to "anon";

grant insert on table "notifications"."notification_topics" to "anon";

grant references on table "notifications"."notification_topics" to "anon";

grant select on table "notifications"."notification_topics" to "anon";

grant trigger on table "notifications"."notification_topics" to "anon";

grant truncate on table "notifications"."notification_topics" to "anon";

grant update on table "notifications"."notification_topics" to "anon";

grant delete on table "notifications"."notification_topics" to "authenticated";

grant insert on table "notifications"."notification_topics" to "authenticated";

grant references on table "notifications"."notification_topics" to "authenticated";

grant select on table "notifications"."notification_topics" to "authenticated";

grant trigger on table "notifications"."notification_topics" to "authenticated";

grant truncate on table "notifications"."notification_topics" to "authenticated";

grant update on table "notifications"."notification_topics" to "authenticated";

grant delete on table "notifications"."notification_topics" to "service_role";

grant insert on table "notifications"."notification_topics" to "service_role";

grant references on table "notifications"."notification_topics" to "service_role";

grant select on table "notifications"."notification_topics" to "service_role";

grant trigger on table "notifications"."notification_topics" to "service_role";

grant truncate on table "notifications"."notification_topics" to "service_role";

grant update on table "notifications"."notification_topics" to "service_role";

grant delete on table "notifications"."notifications" to "anon";

grant insert on table "notifications"."notifications" to "anon";

grant references on table "notifications"."notifications" to "anon";

grant select on table "notifications"."notifications" to "anon";

grant trigger on table "notifications"."notifications" to "anon";

grant truncate on table "notifications"."notifications" to "anon";

grant update on table "notifications"."notifications" to "anon";

grant delete on table "notifications"."notifications" to "authenticated";

grant references on table "notifications"."notifications" to "authenticated";

grant select on table "notifications"."notifications" to "authenticated";

grant trigger on table "notifications"."notifications" to "authenticated";

grant truncate on table "notifications"."notifications" to "authenticated";

grant update on table "notifications"."notifications" to "authenticated";

grant delete on table "notifications"."notifications" to "service_role";

grant insert on table "notifications"."notifications" to "service_role";

grant references on table "notifications"."notifications" to "service_role";

grant select on table "notifications"."notifications" to "service_role";

grant trigger on table "notifications"."notifications" to "service_role";

grant truncate on table "notifications"."notifications" to "service_role";

grant update on table "notifications"."notifications" to "service_role";

grant delete on table "notifications"."object_subscriptions" to "anon";

grant insert on table "notifications"."object_subscriptions" to "anon";

grant references on table "notifications"."object_subscriptions" to "anon";

grant select on table "notifications"."object_subscriptions" to "anon";

grant trigger on table "notifications"."object_subscriptions" to "anon";

grant truncate on table "notifications"."object_subscriptions" to "anon";

grant update on table "notifications"."object_subscriptions" to "anon";

grant delete on table "notifications"."object_subscriptions" to "authenticated";

grant insert on table "notifications"."object_subscriptions" to "authenticated";

grant references on table "notifications"."object_subscriptions" to "authenticated";

grant select on table "notifications"."object_subscriptions" to "authenticated";

grant trigger on table "notifications"."object_subscriptions" to "authenticated";

grant truncate on table "notifications"."object_subscriptions" to "authenticated";

grant update on table "notifications"."object_subscriptions" to "authenticated";

grant delete on table "notifications"."object_subscriptions" to "service_role";

grant insert on table "notifications"."object_subscriptions" to "service_role";

grant references on table "notifications"."object_subscriptions" to "service_role";

grant select on table "notifications"."object_subscriptions" to "service_role";

grant trigger on table "notifications"."object_subscriptions" to "service_role";

grant truncate on table "notifications"."object_subscriptions" to "service_role";

grant update on table "notifications"."object_subscriptions" to "service_role";

grant delete on table "notifications"."user_notification_preferences" to "anon";

grant insert on table "notifications"."user_notification_preferences" to "anon";

grant references on table "notifications"."user_notification_preferences" to "anon";

grant select on table "notifications"."user_notification_preferences" to "anon";

grant trigger on table "notifications"."user_notification_preferences" to "anon";

grant truncate on table "notifications"."user_notification_preferences" to "anon";

grant update on table "notifications"."user_notification_preferences" to "anon";

grant delete on table "notifications"."user_notification_preferences" to "authenticated";

grant insert on table "notifications"."user_notification_preferences" to "authenticated";

grant references on table "notifications"."user_notification_preferences" to "authenticated";

grant select on table "notifications"."user_notification_preferences" to "authenticated";

grant trigger on table "notifications"."user_notification_preferences" to "authenticated";

grant truncate on table "notifications"."user_notification_preferences" to "authenticated";

grant update on table "notifications"."user_notification_preferences" to "authenticated";

grant delete on table "notifications"."user_notification_preferences" to "service_role";

grant insert on table "notifications"."user_notification_preferences" to "service_role";

grant references on table "notifications"."user_notification_preferences" to "service_role";

grant select on table "notifications"."user_notification_preferences" to "service_role";

grant trigger on table "notifications"."user_notification_preferences" to "service_role";

grant truncate on table "notifications"."user_notification_preferences" to "service_role";

grant update on table "notifications"."user_notification_preferences" to "service_role";

grant delete on table "notifications"."web_push_subscriptions" to "anon";

grant insert on table "notifications"."web_push_subscriptions" to "anon";

grant references on table "notifications"."web_push_subscriptions" to "anon";

grant select on table "notifications"."web_push_subscriptions" to "anon";

grant trigger on table "notifications"."web_push_subscriptions" to "anon";

grant truncate on table "notifications"."web_push_subscriptions" to "anon";

grant update on table "notifications"."web_push_subscriptions" to "anon";

grant delete on table "notifications"."web_push_subscriptions" to "authenticated";

grant insert on table "notifications"."web_push_subscriptions" to "authenticated";

grant references on table "notifications"."web_push_subscriptions" to "authenticated";

grant select on table "notifications"."web_push_subscriptions" to "authenticated";

grant trigger on table "notifications"."web_push_subscriptions" to "authenticated";

grant truncate on table "notifications"."web_push_subscriptions" to "authenticated";

grant update on table "notifications"."web_push_subscriptions" to "authenticated";

grant delete on table "notifications"."web_push_subscriptions" to "service_role";

grant insert on table "notifications"."web_push_subscriptions" to "service_role";

grant references on table "notifications"."web_push_subscriptions" to "service_role";

grant select on table "notifications"."web_push_subscriptions" to "service_role";

grant trigger on table "notifications"."web_push_subscriptions" to "service_role";

grant truncate on table "notifications"."web_push_subscriptions" to "service_role";

grant update on table "notifications"."web_push_subscriptions" to "service_role";


  create policy "notification_retention_select_admin"
  on "notifications"."notification_retention"
  as permissive
  for select
  to authenticated
using (public.authorize('supabase.admin'::text));



  create policy "notification_retention_write_admin"
  on "notifications"."notification_retention"
  as permissive
  for all
  to authenticated
using (public.authorize('supabase.admin'::text))
with check (public.authorize('supabase.admin'::text));



  create policy "notification_topics_select_all"
  on "notifications"."notification_topics"
  as permissive
  for select
  to authenticated
using (true);



  create policy "allow_all_admin_notifiy_users"
  on "notifications"."notifications"
  as permissive
  for all
  to authenticated
using (( SELECT public.authorize('admin.notify_users'::text) AS authorize));



  create policy "notifications_delete_own"
  on "notifications"."notifications"
  as permissive
  for delete
  to authenticated
using (("user" = (auth.uid())::text));



  create policy "notifications_select_own"
  on "notifications"."notifications"
  as permissive
  for select
  to authenticated
using (("user" = (auth.uid())::text));



  create policy "notifications_update_own"
  on "notifications"."notifications"
  as permissive
  for update
  to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));



  create policy "os_self"
  on "notifications"."object_subscriptions"
  as permissive
  for all
  to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));



  create policy "unp_delete_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for delete
  to authenticated
using (("user" = (auth.uid())::text));



  create policy "unp_insert_self"
  on "notifications"."user_notification_preferences"
  as permissive
  for insert
  to authenticated
with check (("user" = (auth.uid())::text));



  create policy "unp_select_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for select
  to authenticated
using (("user" = (auth.uid())::text));



  create policy "unp_select_self"
  on "notifications"."user_notification_preferences"
  as permissive
  for select
  to authenticated
using (("user" = (auth.uid())::text));



  create policy "unp_update_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for update
  to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));



  create policy "unp_update_self"
  on "notifications"."user_notification_preferences"
  as permissive
  for update
  to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));



  create policy "unp_upsert_self"
  on "notifications"."user_notification_preferences"
  as permissive
  for insert
  to authenticated
with check (("user" = (auth.uid())::text));



  create policy "webpush_insert_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for insert
  to authenticated
with check (("user" = (auth.uid())::text));



  create policy "webpush_insert_supabase_admin"
  on "notifications"."web_push_subscriptions"
  as permissive
  for select
  to public
using (( SELECT public.authorize('supabase.admin'::text) AS authorize));



  create policy "webpush_select_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for select
  to authenticated
using (("user" = (auth.uid())::text));



  create policy "webpush_update_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for update
  to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));


CREATE TRIGGER trg_audit_user_notification_preferences AFTER INSERT OR DELETE OR UPDATE ON notifications.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_game_added_to_notify AFTER INSERT ON games.match FOR EACH ROW EXECUTE FUNCTION games.trg_game_added_to_notify();

CREATE TRIGGER fetch_player_info_after_rglink_change AFTER UPDATE OF rg_link ON games.players FOR EACH ROW EXECUTE FUNCTION games.trg_fetch_player_info_on_change();

CREATE TRIGGER set_normalized_players BEFORE INSERT OR UPDATE ON games.teams FOR EACH ROW EXECUTE FUNCTION public.trg_update_normalized_players();

CREATE TRIGGER trg_challenge_added_to_notify AFTER INSERT ON public.challenge FOR EACH ROW EXECUTE FUNCTION notifications._trg_challenge_added_to_notify();

CREATE TRIGGER trg_challenge_entry_added_to_notify AFTER INSERT ON public.challenge_stats FOR EACH ROW EXECUTE FUNCTION notifications._trg_challenge_entry_added_to_notify();

CREATE TRIGGER "WaitingListAttendanceTrigger" AFTER DELETE OR UPDATE ON public.event_attendance_user_mapping FOR EACH ROW EXECUTE FUNCTION public.trg_update_waiting_list_attendance();

CREATE TRIGGER trg_event_comment_created_to_notify AFTER INSERT ON public.event_comments FOR EACH ROW EXECUTE FUNCTION notifications._trg_event_comment_created_to_notify();

CREATE TRIGGER trg_update_event_comment BEFORE UPDATE ON public.event_comments FOR EACH ROW EXECUTE FUNCTION public.trg_update_event_comment();

CREATE TRIGGER maxattendees_change_trigger AFTER UPDATE ON public.events FOR EACH ROW WHEN ((new."maxAttendees" <> old."maxAttendees")) EXECUTE FUNCTION public.trg_update_attendance_on_maxattendees_change();

CREATE TRIGGER trg_event_canceled_to_notify AFTER UPDATE ON public.events FOR EACH ROW WHEN (((new."isCancelled" IS TRUE) AND (COALESCE(old."isCancelled", false) IS FALSE))) EXECUTE FUNCTION notifications._trg_event_canceled_to_notify();

CREATE TRIGGER trg_event_updated_to_notify AFTER UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION notifications._trg_event_updated_to_notify();

CREATE TRIGGER trg_events_max_trial_attendees_change AFTER UPDATE ON public.events FOR EACH ROW WHEN ((new.max_trial_attendees <> old.max_trial_attendees)) EXECUTE FUNCTION public.trg_update_attendance_on_max_trial_attendees_change();

CREATE TRIGGER delete_user_from_subgroups AFTER DELETE ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION public.trg_delete_user_from_subgroups();

CREATE TRIGGER trg_group_join_requested_to_notify AFTER INSERT ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION notifications._trg_group_join_requested_to_notify();

CREATE TRIGGER trg_group_request_confirmed_to_notify AFTER UPDATE ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION notifications._trg_group_request_confirmed_to_notify();

CREATE TRIGGER item_history_trigger AFTER UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.trg_add_item_history_entry();

CREATE TRIGGER trg_item_handover_to_notify AFTER UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION notifications._trg_item_handover_to_notify();

CREATE TRIGGER trg_payment_fulfilled_to_notify AFTER UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION notifications._trg_payment_fulfilled_to_notify();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.trg_handle_new_auth_user();


