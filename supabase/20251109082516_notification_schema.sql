drop trigger if exists "trg_audit_user_notification_preferences" on "public"."user_notification_preferences";

drop trigger if exists "trg_game_added_to_notify" on "games"."match";

drop trigger if exists "trg_challenge_added_to_notify" on "public"."challenge";

drop trigger if exists "trg_challenge_entry_added_to_notify" on "public"."challenge_stats";

drop trigger if exists "trg_event_comment_created_to_notify" on "public"."event_comments";

drop trigger if exists "trg_event_canceled_to_notify" on "public"."events";

drop trigger if exists "trg_event_updated_to_notify" on "public"."events";

drop trigger if exists "trg_group_join_requested_to_notify" on "public"."group_user_mapping";

drop trigger if exists "trg_group_request_confirmed_to_notify" on "public"."group_user_mapping";

drop trigger if exists "trg_item_handover_to_notify" on "public"."items";

drop trigger if exists "trg_payment_fulfilled_to_notify" on "public"."payments";

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

CREATE TRIGGER trg_item_handover_to_notify AFTER UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION notifications._trg_item_handover_to_notify();

CREATE TRIGGER trg_payment_fulfilled_to_notify AFTER UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION notifications._trg_payment_fulfilled_to_notify();

CREATE TRIGGER trg_group_join_requested_to_notify AFTER INSERT ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION notifications._trg_group_join_requested_to_notify();

CREATE TRIGGER trg_group_request_confirmed_to_notify AFTER UPDATE ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION notifications._trg_group_request_confirmed_to_notify();

CREATE TRIGGER trg_event_canceled_to_notify AFTER UPDATE ON public.events FOR EACH ROW WHEN (((new."isCancelled" IS TRUE) AND (COALESCE(old."isCancelled", false) IS FALSE))) EXECUTE FUNCTION notifications._trg_event_canceled_to_notify();

CREATE TRIGGER trg_event_updated_to_notify AFTER UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION notifications._trg_event_updated_to_notify();

CREATE TRIGGER trg_event_comment_created_to_notify AFTER INSERT ON public.event_comments FOR EACH ROW EXECUTE FUNCTION notifications._trg_event_comment_created_to_notify();

CREATE TRIGGER trg_challenge_added_to_notify AFTER INSERT ON public.challenge FOR EACH ROW EXECUTE FUNCTION notifications._trg_challenge_added_to_notify();

CREATE TRIGGER trg_challenge_entry_added_to_notify AFTER INSERT ON public.challenge_stats FOR EACH ROW EXECUTE FUNCTION notifications._trg_challenge_entry_added_to_notify();

CREATE TRIGGER trg_audit_user_notification_preferences AFTER INSERT OR DELETE OR UPDATE ON notifications.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_game_added_to_notify AFTER INSERT ON games.match FOR EACH ROW EXECUTE FUNCTION notifications.trg_game_added_to_notify();
