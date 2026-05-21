create extension if not exists "hypopg" with schema "extensions";

create extension if not exists "index_advisor" with schema "extensions";

drop policy "user_activity_all_self" on "public"."user_activity";

drop policy "user_activity_select_admin" on "public"."user_activity";

revoke delete on table "public"."user_activity" from "anon";

revoke insert on table "public"."user_activity" from "anon";

revoke references on table "public"."user_activity" from "anon";

revoke select on table "public"."user_activity" from "anon";

revoke trigger on table "public"."user_activity" from "anon";

revoke truncate on table "public"."user_activity" from "anon";

revoke update on table "public"."user_activity" from "anon";

revoke delete on table "public"."user_activity" from "authenticated";

revoke insert on table "public"."user_activity" from "authenticated";

revoke references on table "public"."user_activity" from "authenticated";

revoke select on table "public"."user_activity" from "authenticated";

revoke trigger on table "public"."user_activity" from "authenticated";

revoke truncate on table "public"."user_activity" from "authenticated";

revoke update on table "public"."user_activity" from "authenticated";

revoke delete on table "public"."user_activity" from "service_role";

revoke insert on table "public"."user_activity" from "service_role";

revoke references on table "public"."user_activity" from "service_role";

revoke select on table "public"."user_activity" from "service_role";

revoke trigger on table "public"."user_activity" from "service_role";

revoke truncate on table "public"."user_activity" from "service_role";

revoke update on table "public"."user_activity" from "service_role";

alter table "public"."user_activity" drop constraint "user_activity_user_uuid_fkey";

drop index if exists "notifications"."webpush_uq_endpoint";

drop table "public"."user_activity";

alter table "notifications"."notification_retention" add column "id" bigint not null default '0'::bigint;

CREATE INDEX ix_elo_history_user_fkey ON games.elo_history USING btree ("user");

CREATE INDEX ix_match_event_fkey ON games.match USING btree (event);

CREATE INDEX ix_match_team_a_fkey ON games.match USING btree (team_a);

CREATE INDEX ix_match_team_b_fkey ON games.match USING btree (team_b);

CREATE INDEX ix_players_linked_user_id_fkey ON games.players USING btree (linked_user_id);

CREATE INDEX ix_sets_match_fkey ON games.sets USING btree (match);

CREATE INDEX ix_teams_player_2_fkey ON games.teams USING btree (player_2);

CREATE INDEX match_event_idx ON games.match USING btree (event);

CREATE INDEX sets_match_idx ON games.sets USING btree (match);

CREATE INDEX ix_notification_outbox_targets_subscription_id_fkey ON notifications.notification_outbox_targets USING btree (subscription_id);

CREATE INDEX ix_notification_outbox_user_uuid_fkey ON notifications.notification_outbox USING btree ("user");

CREATE INDEX ix_notifications_user_uuid_fkey ON notifications.notifications USING btree ("user");

CREATE INDEX ix_user_notification_preferences_user_uuid_fkey ON notifications.user_notification_preferences USING btree ("user");

CREATE UNIQUE INDEX notification_retention_pkey ON notifications.notification_retention USING btree (id);

CREATE INDEX notifications_user_idx ON notifications.notifications USING btree ("user");

CREATE INDEX challenge_stats_challenge_idx ON public.challenge_stats USING btree (challenge);

CREATE INDEX event_comments_event_idx ON public.event_comments USING btree (event);

CREATE INDEX group_user_mapping_group_idx ON public.group_user_mapping USING btree ("group");

CREATE INDEX ix_challenge_group_fkey ON public.challenge USING btree ("group");

CREATE INDEX ix_challenge_stats_challenge_fkey ON public.challenge_stats USING btree (challenge);

CREATE INDEX ix_challenge_stats_user_fkey ON public.challenge_stats USING btree ("user");

CREATE INDEX ix_event_bring_items_created_by_fkey ON public.event_bring_items USING btree (created_by);

CREATE INDEX ix_event_bring_pledges_user_fkey ON public.event_bring_pledges USING btree ("user");

CREATE INDEX ix_event_comments_event_fkey ON public.event_comments USING btree (event);

CREATE INDEX ix_event_comments_reply_to_fkey ON public.event_comments USING btree (reply_to);

CREATE INDEX ix_event_comments_user_fkey ON public.event_comments USING btree ("user");

CREATE INDEX ix_event_group_parent_group_fkey ON public.event_group USING btree (parent_group);

CREATE INDEX ix_event_transformation_applications_transformation_id_fkey ON public.event_transformation_applications USING btree (transformation_id);

CREATE INDEX ix_events_group_fkey ON public.events USING btree ("group");

CREATE INDEX ix_group_features_feature_fkey ON public.group_features USING btree (feature);

CREATE INDEX ix_group_permission_permission_fkey ON public.group_permissions USING btree (permission);

CREATE INDEX ix_group_user_mapping_group_fkey ON public.group_user_mapping USING btree ("group");

CREATE INDEX ix_history_drink_fkey ON public.history USING btree (drink);

CREATE INDEX ix_history_payment_fkey ON public.history USING btree (payment);

CREATE INDEX ix_history_user_uuid_fkey ON public.history USING btree ("user");

CREATE INDEX ix_history_voucher_fkey ON public.history USING btree (voucher);

CREATE INDEX ix_item_history_current_user_uuid_fkey ON public.item_history USING btree ("current_user");

CREATE INDEX ix_item_history_key_fkey ON public.item_history USING btree (key);

CREATE INDEX ix_item_history_past_user_uuid_fkey ON public.item_history USING btree (past_user);

CREATE INDEX ix_items_current_holder_fkey ON public.items USING btree (current_holder);

CREATE INDEX ix_items_group_fkey ON public.items USING btree ("group");

CREATE INDEX ix_payments_user_uuid_fkey ON public.payments USING btree ("user");

CREATE INDEX ix_user_direct_grants_user_uuid_fkey ON public.user_direct_grants USING btree ("user");

CREATE INDEX ix_vouchers_user_fkey ON public.vouchers USING btree ("user");

alter table "notifications"."notification_retention" add constraint "notification_retention_pkey" PRIMARY KEY using index "notification_retention_pkey";


