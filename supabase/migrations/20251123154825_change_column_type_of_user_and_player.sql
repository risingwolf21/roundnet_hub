drop policy "os_self" on "notifications"."object_subscriptions";

drop policy "unp_insert_self" on "notifications"."user_notification_preferences";

drop policy "unp_select_self" on "notifications"."user_notification_preferences";

drop policy "unp_update_self" on "notifications"."user_notification_preferences";

drop policy "unp_upsert_self" on "notifications"."user_notification_preferences";

drop policy "elo_calc_log_select_if_participant" on "games"."elo_calc_log";

drop policy "el_history_if_participant" on "games"."elo_history";

drop policy "players_self_select" on "games"."players";

drop policy "players_update_self" on "games"."players";

drop policy "Allow everything when user has permission games.update.score an" on "games"."sets";

drop policy "sets_select_public_or_participant" on "games"."sets";

drop policy "Allow delete when userid in team" on "games"."teams";

drop policy "teams_insert_if_member" on "games"."teams";

drop policy "teams_select_if_member" on "games"."teams";

drop policy "teams_update_if_member" on "games"."teams";

drop policy "notifications_delete_own" on "notifications"."notifications";

drop policy "notifications_select_own" on "notifications"."notifications";

drop policy "notifications_update_own" on "notifications"."notifications";

drop policy "unp_delete_own" on "notifications"."user_notification_preferences";

drop policy "unp_select_own" on "notifications"."user_notification_preferences";

drop policy "unp_update_own" on "notifications"."user_notification_preferences";

drop policy "webpush_insert_self" on "notifications"."web_push_subscriptions";

drop policy "webpush_select_self" on "notifications"."web_push_subscriptions";

drop policy "webpush_update_self" on "notifications"."web_push_subscriptions";

drop policy "Allow delete when admin of group" on "public"."challenge";

drop policy "Allow insert when admin of group" on "public"."challenge";

drop policy "Allow update when user is admin of challenge group" on "public"."challenge";

drop policy "Select challenges for user with group" on "public"."challenge";

drop policy "challenge_stats_delete" on "public"."challenge_stats";

drop policy "challenge_stats_insert" on "public"."challenge_stats";

drop policy "challenge_stats_select" on "public"."challenge_stats";

drop policy "challenge_stats_update" on "public"."challenge_stats";

drop policy "attendance_delete_self_or_manager" on "public"."event_attendance_user_mapping";

drop policy "attendance_insert_self_or_manager" on "public"."event_attendance_user_mapping";

drop policy "attendance_select_member" on "public"."event_attendance_user_mapping";

drop policy "attendance_update_self_or_manager" on "public"."event_attendance_user_mapping";

drop policy "items_select_member" on "public"."event_bring_items";

drop policy "ebp_delete_self_or_manager" on "public"."event_bring_pledges";

drop policy "ebp_insert_self" on "public"."event_bring_pledges";

drop policy "ebp_select_if_in_group" on "public"."event_bring_pledges";

drop policy "ebp_select_member" on "public"."event_bring_pledges";

drop policy "ebp_update_self_or_manager" on "public"."event_bring_pledges";

drop policy "Allow delete with event.comment permission on own comment" on "public"."event_comments";

drop policy "Allow insert with event.comment permission on own comment" on "public"."event_comments";

drop policy "Allow update with event.comment permission on own comment" on "public"."event_comments";

drop policy "Allow delete when admin of group" on "public"."event_group";

drop policy "Allow update for admin in group" on "public"."event_group";

drop policy "Select if user is member" on "public"."event_group";

drop policy "Select subgroups only if user is member of parent group" on "public"."event_group";

drop policy "Select events for user in group" on "public"."events";

drop policy "events_delete_with_perm" on "public"."events";

drop policy "events_insert_with_perm" on "public"."events";

drop policy "events_select_group_member" on "public"."events";

drop policy "events_update_with_perm" on "public"."events";

drop policy "Delete when admin or own user" on "public"."group_user_mapping";

drop policy "gum_insert_self_public_open" on "public"."group_user_mapping";

drop policy "gum_select_self" on "public"."group_user_mapping";

drop policy "Insert for own user" on "public"."history";

drop policy "Select for own user" on "public"."history";

drop policy "Update for own user" on "public"."history";

drop policy "item_history_insert_if_member" on "public"."item_history";

drop policy "item_history_select_if_member" on "public"."item_history";

drop policy "items_select_if_member" on "public"."items";

drop policy "items_update_holder_if_member" on "public"."items";

drop policy "Allow insert for own" on "public"."payments";

drop policy "Allow own payment or if drinks.confirm.payments permission is p" on "public"."payments";

drop policy "user_activity_all_self" on "public"."user_activity";

drop policy "udg_self_read" on "public"."user_direct_grants";

revoke delete on table "notifications"."object_subscriptions" from "anon";

revoke insert on table "notifications"."object_subscriptions" from "anon";

revoke references on table "notifications"."object_subscriptions" from "anon";

revoke select on table "notifications"."object_subscriptions" from "anon";

revoke trigger on table "notifications"."object_subscriptions" from "anon";

revoke truncate on table "notifications"."object_subscriptions" from "anon";

revoke update on table "notifications"."object_subscriptions" from "anon";

revoke delete on table "notifications"."object_subscriptions" from "authenticated";

revoke insert on table "notifications"."object_subscriptions" from "authenticated";

revoke references on table "notifications"."object_subscriptions" from "authenticated";

revoke select on table "notifications"."object_subscriptions" from "authenticated";

revoke trigger on table "notifications"."object_subscriptions" from "authenticated";

revoke truncate on table "notifications"."object_subscriptions" from "authenticated";

revoke update on table "notifications"."object_subscriptions" from "authenticated";

revoke delete on table "notifications"."object_subscriptions" from "service_role";

revoke insert on table "notifications"."object_subscriptions" from "service_role";

revoke references on table "notifications"."object_subscriptions" from "service_role";

revoke select on table "notifications"."object_subscriptions" from "service_role";

revoke trigger on table "notifications"."object_subscriptions" from "service_role";

revoke truncate on table "notifications"."object_subscriptions" from "service_role";

revoke update on table "notifications"."object_subscriptions" from "service_role";

alter table "games"."match" drop constraint "match_created_by_fkey";

alter table "games"."players" drop constraint "players_player_key";

alter table "notifications"."web_push_subscriptions" drop constraint "web_push_subscriptions_user_endpoint_key";

alter table "public"."event_bring_pledges" drop constraint "event_bring_pledges_item_user_id_key";

alter table "public"."event_bring_pledges" drop constraint "event_bring_pledges_user_id_fkey";

alter table "public"."history" drop constraint "history_user_fkey";

alter table "public"."item_history" drop constraint "item_history_currentUser_fkey";

alter table "public"."item_history" drop constraint "item_history_pastUser_fkey";

alter table "public"."items" drop constraint "keys_user_fkey";

alter table "public"."payments" drop constraint "payments_userid_fkey";

alter table "public"."user_direct_grants" drop constraint "user_direct_grants_user_fkey";

alter table "games"."elo_history" drop constraint "elo_history_user_fkey";

alter table "games"."players" drop constraint "players_player_fkey";

alter table "games"."teams" drop constraint "teams_player_1_fkey";

alter table "games"."teams" drop constraint "teams_player_2_fkey";

alter table "public"."challenge_stats" drop constraint "challenge_stats_user_fkey";

alter table "public"."event_attendance_user_mapping" drop constraint "event_attendance_user_mapping_user_fkey";

alter table "public"."event_bring_items" drop constraint "event_bring_items_created_by_fkey";

alter table "public"."event_comments" drop constraint "event_comments_user_fkey";

alter table "public"."group_user_mapping" drop constraint "group_user_mapping_user_fkey";

alter table "public"."vouchers" drop constraint "vouchers_user_fkey";

drop function if exists "games"."add_match_with_sets"(team_a text, player_1a text, player_1a_rating numeric, player_2a text, player_2a_rating numeric, team_b text, player_1b text, player_1b_rating numeric, player_2b text, player_2b_rating numeric, match_sets json, event uuid, created_by text, rated boolean);

drop function if exists "games"."effective_rating_for_player"(p_player text);

drop function if exists "games"."effective_team_rating_with_category"(p_p1 text, p_p2 text);

drop function if exists "games"."team_category"(p_p1 text, p_p2 text);

drop function if exists "notifications"."enqueue_notification"(p_user text, p_title text, p_body text, p_data jsonb, p_urgency text, p_ttl_seconds integer, p_tenant uuid, p_dedupe_key text, p_topic text, p_source_type text, p_source_id uuid);

drop function if exists "notifications"."is_topic_enabled_for_user"(p_user text, p_tenant uuid, p_topic text, p_scope_type text, p_scope_id uuid);

drop function if exists "notifications"."notify_challenge_added"(p_challenge uuid, p_actor text);

drop function if exists "notifications"."notify_challenge_entry_added"(p_challenge uuid, p_actor text);

drop function if exists "notifications"."notify_event_canceled"(p_event uuid, p_actor text);

drop function if exists "notifications"."notify_event_comment_created"(p_event uuid, p_comment uuid, p_text text, p_author text);

drop function if exists "notifications"."notify_event_updated"(p_event uuid, p_body text, p_actor text);

drop function if exists "notifications"."notify_game_added"(p_match uuid, p_actor text);

drop function if exists "notifications"."notify_group_join_requested"(p_group uuid, p_user text, p_actor text);

drop function if exists "notifications"."notify_group_request_confirmed"(p_group uuid, p_user text, p_actor text);

drop function if exists "notifications"."notify_item_handover"(p_item bigint, p_from text, p_to text, p_actor text);

drop function if exists "notifications"."notify_item_handover"(p_item uuid, p_from text, p_to text, p_actor text);

drop function if exists "notifications"."notify_users"(p_users text[], p_topic text, p_scope text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid);

drop function if exists "public"."create_group_with_user"(group_name text, group_description text, group_color text, is_public boolean, need_request boolean, user_id text, role public."GroupRole", parent uuid);

drop function if exists "public"."eventcreation"();

drop function if exists "public"."get_attending_users"(event_id bigint);

drop function if exists "public"."get_or_create_payment_for_user"(user_id text);

drop function if exists "public"."grant_user_grants"(p_user text, p_tenant uuid, p_perms text[], p_feats text[]);

drop function if exists "public"."key_handover"(p_key_id bigint, p_new_holder text);

drop function if exists "public"."refresh_user_grants"(p_user text);

drop function if exists "public"."revoke_user_grants"(p_user text, p_tenant uuid, p_perms text[], p_feats text[]);

drop function if exists "public"."update_attendance"(p_event uuid, p_user text, p_state public."EventAttendance");

drop view if exists "games"."players_public";

drop view if exists "games"."user_matches";

drop view if exists "public"."challenge_user_points";

drop view if exists "public"."event_bring_item_status";

drop view if exists "public"."event_bring_overview";

drop view if exists "public"."event_groups_view";

drop view if exists "public"."events_user_view";

drop view if exists "public"."user_grants_view";

drop view if exists "public"."user_vouchers";

alter table "notifications"."object_subscriptions" drop constraint "object_subscriptions_pkey";

alter table "public"."event_attendance_user_mapping" drop constraint "event_attendance_user_mapping_pkey";

alter table "public"."group_user_mapping" drop constraint "group_user_mapping_pkey";

alter table "public"."user" drop constraint "users_pkey";

alter table "public"."user_activity" drop constraint "user_activity_pkey";

alter table "public"."user_direct_grants" drop constraint "pk_user_direct_grants";

alter table "notifications"."user_notification_preferences" drop constraint "user_notification_preferences_pkey";

drop index if exists "games"."players_player_key";

drop index if exists "notifications"."idx_notif_user_created";

drop index if exists "notifications"."idx_notif_user_unread";

drop index if exists "notifications"."idx_notifications_user_created";

drop index if exists "notifications"."idx_notifications_user_read";

drop index if exists "notifications"."idx_wps_user_active";

drop index if exists "notifications"."object_subscriptions_pkey";

drop index if exists "notifications"."web_push_subscriptions_user_endpoint_key";

drop index if exists "notifications"."webpush_one_active_per_device";

drop index if exists "notifications"."webpush_uq_user_device_active";

drop index if exists "public"."event_attendance_user_mapping_pkey";

drop index if exists "public"."event_bring_pledges_item_user_id_key";

drop index if exists "public"."group_user_mapping_pkey";

drop index if exists "public"."idx_challenge_stats_user_chal_created";

drop index if exists "public"."idx_challenge_stats_user_challenge_created";

drop index if exists "public"."idx_event_bring_pledges_user";

drop index if exists "public"."idx_udg_user";

drop index if exists "public"."pk_user_direct_grants";

drop index if exists "public"."user_activity_pkey";

drop index if exists "public"."users_pkey";

drop index if exists "games"."players_pkey";

drop index if exists "games"."unique_player_combination";

drop index if exists "notifications"."user_notification_preferences_pkey";

drop table "notifications"."object_subscriptions";

alter table "games"."elo_calc_log" alter column "a1_user" set data type uuid using "a1_user"::uuid;

alter table "games"."elo_calc_log" alter column "a2_user" set data type uuid using "a2_user"::uuid;

alter table "games"."elo_calc_log" alter column "b1_user" set data type uuid using "b1_user"::uuid;

alter table "games"."elo_calc_log" alter column "b2_user" set data type uuid using "b2_user"::uuid;

alter table "games"."elo_history" alter column "user" set data type uuid using "user"::uuid;

alter table "games"."players" alter column "player" drop default;

alter table "games"."players" alter column "player" set data type uuid using "player"::uuid;

alter table "games"."teams" alter column "player_1" set data type uuid using "player_1"::uuid;

alter table "games"."teams" alter column "player_2" set data type uuid using "player_2"::uuid;

alter table "notifications"."notification_outbox" alter column "user" set data type uuid using "user"::uuid;

alter table "notifications"."notifications" alter column "user" set default gen_random_uuid();

alter table "notifications"."notifications" alter column "user" set data type uuid using "user"::uuid;

alter table "notifications"."user_notification_preferences" alter column "user" set default gen_random_uuid();

alter table "notifications"."user_notification_preferences" alter column "user" set data type uuid using "user"::uuid;

alter table "notifications"."web_push_subscriptions" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."challenge_stats" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."event_attendance_user_mapping" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."event_bring_items" alter column "created_by" set default auth.uid();

alter table "public"."event_bring_items" alter column "created_by" drop not null;

alter table "public"."event_bring_items" alter column "created_by" set data type uuid using "created_by"::uuid;

alter table "public"."event_bring_pledges" drop column "user_id";

alter table "public"."event_bring_pledges" add column "user" uuid not null default gen_random_uuid();

alter table "public"."event_comments" alter column "user" set default gen_random_uuid();

alter table "public"."event_comments" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."group_user_mapping" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."history" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."item_history" drop column "currentUser";

alter table "public"."item_history" drop column "pastUser";

alter table "public"."item_history" add column "current_user" uuid;

alter table "public"."item_history" add column "past_user" uuid;

alter table "public"."items" alter column "current_holder" set data type uuid using "current_holder"::uuid;

alter table "public"."payments" drop column "userId";

alter table "public"."payments" add column "user" uuid not null default gen_random_uuid();

alter table "public"."user" drop column "userId";

alter table "public"."user" add column "id" uuid not null;

alter table "public"."user_activity" alter column "user" set default gen_random_uuid();

alter table "public"."user_activity" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."user_direct_grants" alter column "user" set default gen_random_uuid();

alter table "public"."user_direct_grants" alter column "user" set data type uuid using "user"::uuid;

alter table "public"."vouchers" alter column "user" set not null;

alter table "public"."vouchers" alter column "user" set data type uuid using "user"::uuid;

CREATE UNIQUE INDEX players_player_uuid_key ON games.players USING btree (player);

CREATE UNIQUE INDEX user_direct_grants_pkey ON public.user_direct_grants USING btree (tenant, kind, key, "user");

CREATE UNIQUE INDEX user_id_key ON public."user" USING btree (id);

CREATE UNIQUE INDEX user_pkey ON public."user" USING btree (id);

CREATE UNIQUE INDEX players_pkey ON games.players USING btree (player);

CREATE UNIQUE INDEX unique_player_combination ON games.teams USING btree (player_1, player_2);

CREATE UNIQUE INDEX user_notification_preferences_pkey ON notifications.user_notification_preferences USING btree (tenant, topic, channel, scope_type_norm, scope_id_norm, "user");

alter table "public"."user" add constraint "user_pkey" PRIMARY KEY using index "user_pkey";

alter table "public"."user_direct_grants" add constraint "user_direct_grants_pkey" PRIMARY KEY using index "user_direct_grants_pkey";

alter table "notifications"."user_notification_preferences" add constraint "user_notification_preferences_pkey" PRIMARY KEY using index "user_notification_preferences_pkey";

alter table "games"."players" add constraint "players_player_uuid_key" UNIQUE using index "players_player_uuid_key";

alter table "notifications"."notification_outbox" add constraint "notification_outbox_user_uuid_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "notifications"."notification_outbox" validate constraint "notification_outbox_user_uuid_fkey";

alter table "notifications"."notifications" add constraint "notifications_user_uuid_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "notifications"."notifications" validate constraint "notifications_user_uuid_fkey";

alter table "notifications"."user_notification_preferences" add constraint "user_notification_preferences_user_uuid_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "notifications"."user_notification_preferences" validate constraint "user_notification_preferences_user_uuid_fkey";

alter table "notifications"."web_push_subscriptions" add constraint "web_push_subscriptions_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "notifications"."web_push_subscriptions" validate constraint "web_push_subscriptions_user_fkey";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."event_bring_pledges" validate constraint "event_bring_pledges_user_fkey";

alter table "public"."history" add constraint "history_user_uuid_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."history" validate constraint "history_user_uuid_fkey";

alter table "public"."item_history" add constraint "item_history_current_user_uuid_fkey" FOREIGN KEY ("current_user") REFERENCES public."user"(id) not valid;

alter table "public"."item_history" validate constraint "item_history_current_user_uuid_fkey";

alter table "public"."item_history" add constraint "item_history_past_user_uuid_fkey" FOREIGN KEY (past_user) REFERENCES public."user"(id) not valid;

alter table "public"."item_history" validate constraint "item_history_past_user_uuid_fkey";

alter table "public"."items" add constraint "items_current_holder_fkey" FOREIGN KEY (current_holder) REFERENCES public."user"(id) not valid;

alter table "public"."items" validate constraint "items_current_holder_fkey";

alter table "public"."payments" add constraint "payments_user_uuid_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."payments" validate constraint "payments_user_uuid_fkey";

alter table "public"."user" add constraint "user_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."user" validate constraint "user_id_fkey";

alter table "public"."user" add constraint "user_id_key" UNIQUE using index "user_id_key";

alter table "public"."user_activity" add constraint "user_activity_user_uuid_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."user_activity" validate constraint "user_activity_user_uuid_fkey";

alter table "public"."user_direct_grants" add constraint "user_direct_grants_user_uuid_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."user_direct_grants" validate constraint "user_direct_grants_user_uuid_fkey";

alter table "games"."elo_history" add constraint "elo_history_user_fkey" FOREIGN KEY ("user") REFERENCES games.players(player) not valid;

alter table "games"."elo_history" validate constraint "elo_history_user_fkey";

alter table "games"."players" add constraint "players_player_fkey" FOREIGN KEY (player) REFERENCES public."user"(id) not valid;

alter table "games"."players" validate constraint "players_player_fkey";

alter table "games"."teams" add constraint "teams_player_1_fkey" FOREIGN KEY (player_1) REFERENCES games.players(player) not valid;

alter table "games"."teams" validate constraint "teams_player_1_fkey";

alter table "games"."teams" add constraint "teams_player_2_fkey" FOREIGN KEY (player_2) REFERENCES games.players(player) not valid;

alter table "games"."teams" validate constraint "teams_player_2_fkey";

alter table "public"."challenge_stats" add constraint "challenge_stats_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."challenge_stats" validate constraint "challenge_stats_user_fkey";

alter table "public"."event_attendance_user_mapping" add constraint "event_attendance_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."event_attendance_user_mapping" validate constraint "event_attendance_user_mapping_user_fkey";

alter table "public"."event_bring_items" add constraint "event_bring_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."user"(id) not valid;

alter table "public"."event_bring_items" validate constraint "event_bring_items_created_by_fkey";

alter table "public"."event_comments" add constraint "event_comments_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."event_comments" validate constraint "event_comments_user_fkey";

alter table "public"."group_user_mapping" add constraint "group_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."group_user_mapping" validate constraint "group_user_mapping_user_fkey";

alter table "public"."vouchers" add constraint "vouchers_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"(id) not valid;

alter table "public"."vouchers" validate constraint "vouchers_user_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(team_a text, player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, team_b text, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid DEFAULT NULL::uuid, created_by uuid DEFAULT NULL::uuid, rated boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$DECLARE
  team_a_id uuid;
  team_b_id uuid;
  match_id uuid;
  set_count int := 1;
  set_record json;
  team_a_norm text;
  team_b_norm text;
BEGIN
  IF jsonb_typeof(match_sets::jsonb) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', match_sets;
  END IF;

  -- Caller muss Teilnehmer sein (mind. in einem Team) oder die Berechtigung haben
  IF (NOT (Select public.authorize('event.create.constellations'))) THEN
    IF auth.uid() NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
      RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen';
    END IF;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player_uuid" = player_1a) THEN
    INSERT INTO games.players(player_uuid, ka_index) VALUES (player_1a, player_1a_rating);
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player_uuid" = player_2a) THEN
    INSERT INTO games.players(player_uuid, ka_index) VALUES (player_2a, player_2a_rating);
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player_uuid" = player_1b) THEN
    INSERT INTO games.players(player_uuid, ka_index) VALUES (player_1b, player_1b_rating);
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player_uuid" = player_2b) THEN
    INSERT INTO games.players(player_uuid, ka_index) VALUES (player_2b, player_2b_rating);
  END IF;

  -- Team A
  team_a_norm := CASE WHEN player_1a < player_2a THEN player_1a||','||player_2a ELSE player_2a||','||player_1a END;
  INSERT INTO games.teams (player_1_uuid, player_2_uuid, name, normalized_players)
  VALUES (player_1a, player_2a, team_a, team_a_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_a_id FROM games.teams WHERE normalized_players = team_a_norm;

  -- Team B
  team_b_norm := CASE WHEN player_1b < player_2b THEN player_1b||','||player_2b ELSE player_2b||','||player_1b END;
  INSERT INTO games.teams (player_1_uuid, player_2_uuid, name, normalized_players)
  VALUES (player_1b, player_2b, team_b, team_b_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_b_id FROM games.teams WHERE normalized_players = team_b_norm;

  -- Match
  INSERT INTO games.match (team_a, team_b, event, created_by, rated)
  VALUES (team_a_id, team_b_id, event, CASE WHEN created_by = null THEN auth.uid()::text ELSE created_by END, rated)
  RETURNING id INTO match_id;

  -- Sets
  FOR set_record IN SELECT * FROM json_array_elements(match_sets)
  LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score)
    VALUES (
      match_id,
      set_count,
      (set_record->>'team_a_score')::numeric,
      (set_record->>'team_b_score')::numeric
    );
    set_count := set_count + 1;
  END LOOP;

  RETURN match_id;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Fehler beim Hinzufügen von Match: %', SQLERRM;
END;$function$
;

CREATE OR REPLACE FUNCTION games.effective_rating_for_player(p_player uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'games', 'pg_temp'
AS $function$
  select games.compute_effective_player_from_values(p.ka_index, p.rg_index)
  from games.players p
  where p.player_uuid = p_player;
$function$
;

CREATE OR REPLACE FUNCTION games.effective_team_rating_with_category(p_p1 uuid, p_p2 uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'games', 'pg_temp'
AS $function$
  SELECT (games.effective_rating_for_player(p_p1)
        + games.effective_rating_for_player(p_p2))/2.0
       + games.category_offset(games.team_category(p_p1,p_p2));
$function$
;

CREATE OR REPLACE FUNCTION games.team_category(p_p1 uuid, p_p2 uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'games', 'pg_temp'
AS $function$select case
    when coalesce((select gender from games.players where player_uuid=p_p1),'m')='m'
     and coalesce((select gender from games.players where player_uuid=p_p2),'m')='m'
      then 'men'
    when coalesce((select gender from games.players where player_uuid=p_p1),'w')='w'
     and coalesce((select gender from games.players where player_uuid=p_p2),'w')='w'
      then 'women'
    else 'mixed'
  end;$function$
;

CREATE OR REPLACE FUNCTION notifications.enqueue_notification(p_user uuid, p_title text, p_body text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb, p_urgency text DEFAULT 'normal'::text, p_ttl_seconds integer DEFAULT NULL::integer, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_dedupe_key text DEFAULT NULL::text, p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
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

CREATE OR REPLACE FUNCTION notifications.is_topic_enabled_for_user(p_user uuid, p_tenant uuid, p_topic text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select coalesce((
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
  ), true);
$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_challenge_added(p_challenge uuid, p_actor uuid DEFAULT NULL::uuid)
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
    select distinct gum."user_uuid" as uid
      from public.group_user_mapping gum
     where gum."group" = v_group
       and gum."user_uuid" <> coalesce(p_actor, '')
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

CREATE OR REPLACE FUNCTION notifications.notify_event_canceled(p_event uuid, p_actor uuid DEFAULT NULL::uuid)
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
    select distinct gum."user_uuid" as uid
      from public.group_user_mapping gum
     where gum."group" = v_group and gum."user_uuid" <> coalesce(p_actor,'')
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

CREATE OR REPLACE FUNCTION notifications.notify_event_comment_created(p_event uuid, p_comment uuid, p_text text, p_author uuid)
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
    where u."user_uuid" = p_author;

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
       and eum."user_uuid" <> coalesce(p_author, '')
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

CREATE OR REPLACE FUNCTION notifications.notify_event_updated(p_event uuid, p_body text, p_actor uuid DEFAULT NULL::uuid)
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
       and eum."user_uuid" <> coalesce(p_actor, '')
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

CREATE OR REPLACE FUNCTION notifications.notify_game_added(p_match uuid, p_actor uuid DEFAULT NULL::uuid)
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
      select t1.player_1_uuid as uid from mt join games.teams t1 on t1.id = mt.team_a
      union all
      select t1.player_2_uuid       from mt join games.teams t1 on t1.id = mt.team_a
      union all
      select t2.player_1_uuid       from mt join games.teams t2 on t2.id = mt.team_b
      union all
      select t2.player_2_uuid       from mt join games.teams t2 on t2.id = mt.team_b
    ) u
    where uid is not null and uid <> coalesce(p_actor,'')::text
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

CREATE OR REPLACE FUNCTION notifications.notify_group_join_requested(p_group uuid, p_user uuid, p_actor uuid DEFAULT NULL::uuid)
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
   where u."user_uuid" = p_user;

  v_body := coalesce(v_user_display, p_user::text) || ' möchte der Gruppe "' || coalesce(v_group_name, '') || '" beitreten.';

  with recipients as (
      -- only admins of this group, exclude actor if present
      select distinct gum."user_uuid" as uid
        from public.group_user_mapping gum
       where gum."group" = p_group
         and gum.role = 'admin'
         and gum."user_uuid" <> coalesce(p_actor, '')
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

CREATE OR REPLACE FUNCTION notifications.notify_group_request_confirmed(p_group uuid, p_user uuid, p_actor uuid DEFAULT NULL::uuid)
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
    select p_user as uid
     where p_user <> coalesce(p_actor,'')
       and public.is_topic_enabled_for_user(p_user, v_tenant, v_topic, 'group', p_group)
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

CREATE OR REPLACE FUNCTION notifications.notify_item_handover(p_item uuid, p_from uuid, p_to uuid, p_actor uuid DEFAULT NULL::uuid)
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

CREATE OR REPLACE FUNCTION notifications.notify_users(p_users uuid[], p_topic text, p_scope text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare
v_cnt    int  := 0;
v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin

  with allowed as (
    select distinct "user_uuid" as uid from public.user where "user_uuid" = any (p_users)
    and notifications.is_topic_enabled_for_user("user_uuid", v_tenant, p_topic, p_scope, null)
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

CREATE OR REPLACE FUNCTION public.create_group_with_user(group_name text, group_description text, group_color text, is_public boolean, need_request boolean, user_id uuid, role public."GroupRole", parent uuid DEFAULT NULL::uuid)
 RETURNS public.event_group
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  new_group public.event_group;
begin
  -- Neue Gruppe anlegen und vollständiges Objekt in Variable speichern
  insert into public.event_group (
    name, description, color, is_public, need_request_to_join, parent_group
  ) values (
    group_name, group_description, group_color, is_public, need_request, parent
  )
  returning * into new_group;

  -- Mapping mit dem Ersteller anlegen
  insert into public.group_user_mapping ("user_uuid", "group", role)
  values (user_id, new_group.id, role);

  -- Ganze Gruppe zurückgeben
  return new_group;

exception
  when others then
    raise exception 'Fehler beim Erstellen der Gruppe: %', sqlerrm;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_or_create_payment_for_user(user_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
payment_id bigint;
BEGIN
SELECT id
INTO payment_id
FROM payments
WHERE "user_uuid" = user_id
  AND "paymentState" = 'Open';
IF
payment_id IS NULL THEN
        INSERT INTO payments ("user_uuid", "amountToPay", "paymentState")
        VALUES (user_id, 0, 'Open')
        RETURNING id INTO payment_id;
END IF;
RETURN payment_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.grant_user_grants(p_user uuid, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not v_is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Normalize: leere Arrays abfangen
  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  -- (optional) fehlende Stammsätze anlegen – falls FK existiert
  if array_length(p_perms,1) is not null then
    insert into public.permissions(name)
    select distinct k from unnest(p_perms) u(k)
    on conflict do nothing;

    insert into public.user_direct_grants("user_uuid", tenant, kind, key)
    select p_user, p_tenant, 'perm', k from unnest(p_perms) u(k)
    on conflict do nothing;
  end if;

  if array_length(p_feats,1) is not null then
    insert into public.features(name)
    select distinct k from unnest(p_feats) u(k)
    on conflict do nothing;

    insert into public.user_direct_grants("user_uuid", tenant, kind, key)
    select p_user, p_tenant, 'feat', k from unnest(p_feats) u(k)
    on conflict do nothing;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.key_handover(p_key_id bigint, p_new_holder uuid)
 RETURNS TABLE(key_id bigint, holder uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
  v_old   uuid;
  v_group uuid;
BEGIN
  -- Item laden & sperren
  SELECT i."current_holder_uuid", i."group"
    INTO v_old, v_group
  FROM public.items AS i
  WHERE i.id = p_key_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item % not found', p_key_id
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s new_holder=%s', p_key_id, p_new_holder);
  END IF;

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'item % has no group', p_key_id
      USING ERRCODE = '23514',
            DETAIL   = format('key_id=%s new_holder=%s', p_key_id, p_new_holder);
  END IF;

  -- Nur Gruppenmitglieder dürfen übergeben/übernehmen
  IF NOT EXISTS (
    SELECT 1
    FROM public.group_user_mapping gum
    WHERE gum."group" = v_group
      AND gum."user_uuid"  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not in group for item %', p_key_id
      USING ERRCODE = '42501',
            DETAIL   = format('actor=%s group=%s', auth.uid()::text, v_group::text),
            HINT     = 'membership in group required';
  END IF;

  -- Ziel-User existiert?
  PERFORM 1 FROM public."user" u WHERE u."user_uuid" = p_new_holder;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'new holder % not found', p_new_holder
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s', p_key_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_user_mapping gum
    WHERE gum."group" = v_group
      AND gum."user_uuid"  = p_new_holder
  ) THEN
    RAISE EXCEPTION 'new holder % not in group', p_new_holder
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s', p_key_id);
  END IF;

  -- Nur aktualisieren, wenn sich der Halter wirklich ändert
  IF v_old IS DISTINCT FROM p_new_holder THEN
    UPDATE public.items i
       SET "current_holder_uuid" = p_new_holder,
           "lastUpdate"     = now()
     WHERE i.id = p_key_id;
    -- dein bestehender Trigger auf UPDATE OF current_holder schreibt item_history
  END IF;

  RETURN QUERY
  SELECT i.id, i."current_holder"
  FROM public.items i
  WHERE i.id = p_key_id;
END;$function$
;

CREATE OR REPLACE FUNCTION public.revoke_user_grants(p_user uuid, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not v_is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    delete from public.user_direct_grants
     where "user_uuid" = p_user
       and tenant = p_tenant
       and kind   = 'perm'
       and key    = any(p_perms);
  end if;

  if array_length(p_feats,1) is not null then
    delete from public.user_direct_grants
     where "user_uuid" = p_user
       and tenant = p_tenant
       and kind   = 'feat'
       and key    = any(p_feats);
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_attendance(p_event uuid, p_user uuid, p_state public."EventAttendance")
 RETURNS SETOF public.event_attendance_user_mapping
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$DECLARE
  v_is_member   boolean;
  v_event_open  boolean;
  v_max         numeric;
  v_max_trial   numeric;
  v_accepted    bigint;
  v_accepted_trial bigint;
  v_final_state public."EventAttendance";
BEGIN
  -- 1) Actor muss Mitglied der Event-Gruppe sein
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user_uuid" = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'forbidden: not a member of the event''s group' USING ERRCODE = '42501';
  END IF;

  -- 2) Event offen & nicht abgesagt
  SELECT (e."startingDateTime" > now() AND e."isCancelled" = FALSE)
  FROM public.events e
  WHERE e.id = p_event
  INTO v_event_open;

  IF COALESCE(v_event_open, false) = false THEN
    RAISE EXCEPTION 'event closed: cannot change attendance' USING ERRCODE = '22023';
  END IF;

  -- 3) Für andere zu-/absagen nur mit Permission
  IF p_user <> auth.uid() AND NOT public.authorize('event.attendance.manage') THEN
    RAISE EXCEPTION 'forbidden: cannot update other user''s attendance' USING ERRCODE = '42501';
  END IF;

  -- 4) Kapazität (Accepted zählt)
  SELECT e."maxAttendees" INTO v_max FROM public.events e WHERE e.id = p_event;
  SELECT e."max_trial_attendees" INTO v_max_trial FROM public.events e WHERE e.id = p_event;

  SELECT COUNT(*)::bigint
  INTO v_accepted
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'Attending';

  SELECT COUNT(*)::bigint
  INTO v_accepted_trial
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'AttendingAsTrial';

  -- 5) Ziel-State bestimmen
  IF p_state = 'Declined' THEN
    v_final_state := 'Declined';

  ELSIF p_state = 'Attending' AND v_max IS NOT NULL AND v_accepted >= v_max THEN
    -- Kapazität voll -> auf Waiting (außer Declined)
    v_final_state := 'Waiting';

  ELSIF p_state = 'AttendingAsTrial' AND v_max_trial IS NOT NULL AND v_accepted_trial >= v_max_trial THEN
    -- Kapazität bei Trial voll -> auf WaitingAsTrial (außer Declined)
    v_final_state := 'WaitingAsTrial';

  ELSE
    v_final_state := p_state;
  END IF;

  -- Letzte Sicherheit. Als Trial User darf ich nicht Attendning oder Waiting als State haben
  IF (SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user_uuid" = auth.uid()
      AND gum."role" = 'trial'
  )) THEN
    IF v_final_state = 'Attending' THEN
      v_final_state = 'AttendingAsTrial';
    ELSIF v_final_state = 'Waiting' THEN
      v_final_state = 'WaitingAsTrial';
    END IF;
  END IF;

  -- 6) Upsert (RLS prüft zusätzlich INSERT/UPDATE-Policies)
  RETURN QUERY
  INSERT INTO public.event_attendance_user_mapping("user_uuid","event","state")
  VALUES (p_user, p_event, v_final_state)
  ON CONFLICT ("user_uuid","event") DO UPDATE
  SET state = EXCLUDED.state
  RETURNING *;
END;$function$
;

CREATE OR REPLACE FUNCTION games.apply_elo_for_match(p_match uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
  cfg record;
  v_rated boolean;
  m_team_a uuid; m_team_b uuid;
  a1 text; a2 text; b1 text; b2 text;

  -- aktuelle KA-Indizes (nur fürs Logging)
  r_a1 numeric; r_a2 numeric; r_b1 numeric; r_b2 numeric;
  rg_a1 numeric; rg_a2 numeric; rg_b1 numeric; rg_b2 numeric;
  eff_a1_old numeric; eff_a1_new numeric;
  eff_a2_old numeric; eff_a2_new numeric;
  eff_b1_old numeric; eff_b1_new numeric;
  eff_b2_old numeric; eff_b2_new numeric;

  eff_a numeric; eff_b numeric;          -- effektive Teamratings (rg+ka + Kategorie-Offset)
  cat_a text; cat_b text;                 -- 'men' / 'mixed' / 'women'
  rank_a int; rank_b int;                 -- men=3, mixed=2, women=1

  a_sets int; b_sets int; a_pts int; b_pts int;
  outcome_a numeric; exp_a numeric; delta numeric; k_eff numeric;

  hist record;
  log_rec games.elo_calc_log%ROWTYPE;
BEGIN

  SELECT * INTO log_rec FROM games.elo_calc_log WHERE match = p_match;

  SELECT k_factor, upset_bonus_per_level INTO cfg
  FROM games.elo_config WHERE id=1;

  SELECT rated INTO v_rated
  FROM games."match"
  WHERE id = p_match
  FOR UPDATE; 

  -- Match + Teams
  SELECT team_a, team_b INTO m_team_a, m_team_b
  FROM games."match" WHERE id = p_match FOR UPDATE;

  SELECT t.player_1_uuid, t.player_2_uuid INTO a1, a2 FROM games.teams t WHERE t.id = m_team_a;
  SELECT t.player_1_uuid, t.player_2_uuid INTO b1, b2 FROM games.teams t WHERE t.id = m_team_b;

  -- idempotent: Deltas zurückrollen & löschen
  FOR hist IN SELECT * FROM games.elo_history WHERE match=p_match LOOP
    UPDATE games.players SET ka_index = ka_index - hist.delta WHERE player = hist."user";
  END LOOP;
  DELETE FROM games.elo_history WHERE match=p_match;

  INSERT INTO games.players (player_uuid) VALUES (a1) ON CONFLICT (player_uuid) DO NOTHING;
  INSERT INTO games.players (player_uuid) VALUES (a2) ON CONFLICT (player_uuid) DO NOTHING;
  INSERT INTO games.players (player_uuid) VALUES (b1) ON CONFLICT (player_uuid) DO NOTHING;
  INSERT INTO games.players (player_uuid) VALUES (b2) ON CONFLICT (player_uuid) DO NOTHING;

  -- aktueller KA-Wert, NICHT effective rating:
  SELECT COALESCE(ka_index, 1000) INTO r_a1 FROM games.players WHERE player_uuid = a1;
  SELECT COALESCE(ka_index, 1000) INTO r_a2 FROM games.players WHERE player_uuid = a2;
  SELECT COALESCE(ka_index, 1000) INTO r_b1 FROM games.players WHERE player_uuid = b1;
  SELECT COALESCE(ka_index, 1000) INTO r_b2 FROM games.players WHERE player_uuid = b2;

  SELECT rg_index INTO rg_a1 FROM games.players WHERE player_uuid = a1;
  SELECT rg_index INTO rg_a2 FROM games.players WHERE player_uuid = a2;
  SELECT rg_index INTO rg_b1 FROM games.players WHERE player_uuid = b1;
  SELECT rg_index INTO rg_b2 FROM games.players WHERE player_uuid = b2;

  IF log_rec IS NOT NULL
     AND log_rec.a1_user = a1
     AND log_rec.a2_user = a2
     AND log_rec.b1_user = b1
     AND log_rec.b2_user = b2
  THEN
    rg_a1 := COALESCE(log_rec.rg_a1_used, rg_a1);
    rg_a2 := COALESCE(log_rec.rg_a2_used, rg_a2);
    rg_b1 := COALESCE(log_rec.rg_b1_used, rg_b1);
    rg_b2 := COALESCE(log_rec.rg_b2_used, rg_b2);
  END IF;

  -- Kategorien & Ränge (men=3, mixed=2, women=1)
  cat_a := games.team_category(a1,a2);
  cat_b := games.team_category(b1,b2);
  rank_a := CASE cat_a WHEN 'men' THEN 3 WHEN 'mixed' THEN 2 ELSE 1 END;
  rank_b := CASE cat_b WHEN 'men' THEN 3 WHEN 'mixed' THEN 2 ELSE 1 END;

  -- Ergebnis aus Sets (Siege, Punkte als Tie-Breaker)
  SELECT
    SUM(CASE WHEN s.team_a_score > s.team_b_score THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN s.team_b_score > s.team_a_score THEN 1 ELSE 0 END)::int,
    COALESCE(SUM(s.team_a_score),0)::int,
    COALESCE(SUM(s.team_b_score),0)::int
  INTO a_sets, b_sets, a_pts, b_pts
  FROM games.sets s WHERE s.match = p_match;

  IF COALESCE(a_sets,0)+COALESCE(b_sets,0)=0 AND COALESCE(a_pts,0)+COALESCE(b_pts,0)=0 THEN
    RETURN;
  END IF;

  IF a_sets > b_sets THEN outcome_a := 1.0;
  ELSIF a_sets < b_sets THEN outcome_a := 0.0;
  ELSE
    IF a_pts > b_pts THEN outcome_a := 1.0;
    ELSIF a_pts < b_pts THEN outcome_a := 0.0;
    ELSE outcome_a := 0.5;
    END IF;
  END IF;

  eff_a1_old := games.compute_effective_player_from_values(r_a1, rg_a1);
  eff_a2_old := games.compute_effective_player_from_values(r_a2, rg_a2);
  eff_b1_old := games.compute_effective_player_from_values(r_b1, rg_b1);
  eff_b2_old := games.compute_effective_player_from_values(r_b2, rg_b2);

  -- Effektive Teamratings inkl. Kategorie
  eff_a := (eff_a1_old + eff_a2_old)/2.0 + games.category_offset(games.team_category(a1,a2));
  eff_b := (eff_b1_old + eff_b2_old)/2.0 + games.category_offset(games.team_category(b1,b2));

  -- Erwartung mit Kategorie-Offsets
  exp_a := 1.0 / (1.0 + POWER(10.0, (eff_b - eff_a)/400.0));

  -- Optionaler Upset-Bonus, wenn "schwächerer" Kategorie-Rang gewinnt
   k_eff := cfg.k_factor;
  if (rank_a < rank_b and outcome_a = 1.0) then
    k_eff := cfg.k_factor * (1 + cfg.upset_bonus_per_level * (rank_b - rank_a));
  elsif (rank_b < rank_a and outcome_a = 0.0) then
    k_eff := cfg.k_factor * (1 + cfg.upset_bonus_per_level * (rank_a - rank_b));
  end if;

  delta := k_eff * (outcome_a - exp_a);

  eff_a1_new := games.compute_effective_player_from_values(r_a1 + delta, rg_a1);
  eff_a2_new := games.compute_effective_player_from_values(r_a2 + delta, rg_a2);
  eff_b1_new := games.compute_effective_player_from_values(r_b1 - delta, rg_b1);
  eff_b2_new := games.compute_effective_player_from_values(r_b2 - delta, rg_b2);

  IF NOT COALESCE(v_rated, true) THEN
    RETURN;
  END IF;

  INSERT INTO games.elo_calc_log(
    match, calculated_at,
    eff_team_a, eff_team_b,
    expected_a, expected_b,
    k_base, k_eff,
    category_a, category_b,
    upset_levels, upset_multiplier,
    outcome_a, sets_a, sets_b, points_a, points_b,
    a1_user, a2_user, b1_user, b2_user,
    rg_a1_used, rg_a2_used, rg_b1_used, rg_b2_used,
    cfg_snapshot
  )
  VALUES (
    p_match, now(),
    eff_a, eff_b,
    exp_a, 1 - exp_a,
    cfg.k_factor, k_eff,
    cat_a, cat_b,
    greatest(abs(rank_a - rank_b), 0), 1.0,
    outcome_a, a_sets, b_sets, a_pts, b_pts,
    a1, a2, b1, b2,
    rg_a1, rg_a2, rg_b1, rg_b2,
    -- optionaler Konfig-Snapshot (oder NULL weglassen)
    jsonb_build_object(
      'w_rg',(SELECT w_rg FROM games.elo_config WHERE id=1),
      'w_ka',(SELECT w_ka FROM games.elo_config WHERE id=1),
      'rg_offset',(SELECT rg_offset FROM games.elo_config WHERE id=1),
      'rg_scale',(SELECT rg_scale FROM games.elo_config WHERE id=1),
      'k_factor', cfg.k_factor
    )
  )
  ON CONFLICT (match) DO UPDATE SET
  calculated_at = excluded.calculated_at,
  eff_team_a    = excluded.eff_team_a,
  eff_team_b    = excluded.eff_team_b,
  expected_a    = excluded.expected_a,
  expected_b    = excluded.expected_b,
  k_base        = excluded.k_base,
  k_eff         = excluded.k_eff,
  category_a    = excluded.category_a,
  category_b    = excluded.category_b,
  upset_levels  = excluded.upset_levels,
  upset_multiplier = excluded.upset_multiplier,
  outcome_a     = excluded.outcome_a,
  sets_a        = excluded.sets_a,
  sets_b        = excluded.sets_b,
  points_a      = excluded.points_a,
  points_b      = excluded.points_b,
  -- WICHTIG: RG-Snapshots & cfg nur setzen, wenn noch nicht vorhanden (bewahrt den Erst-Snapshot)
  a1_user       = COALESCE(games.elo_calc_log.a1_user, excluded.a1_user),
  a2_user       = COALESCE(games.elo_calc_log.a2_user, excluded.a2_user),
  b1_user       = COALESCE(games.elo_calc_log.b1_user, excluded.b1_user),
  b2_user       = COALESCE(games.elo_calc_log.b2_user, excluded.b2_user),
  rg_a1_used    = COALESCE(games.elo_calc_log.rg_a1_used, excluded.rg_a1_used),
  rg_a2_used    = COALESCE(games.elo_calc_log.rg_a2_used, excluded.rg_a2_used),
  rg_b1_used    = COALESCE(games.elo_calc_log.rg_b1_used, excluded.rg_b1_used),
  rg_b2_used    = COALESCE(games.elo_calc_log.rg_b2_used, excluded.rg_b2_used),
  cfg_snapshot  = COALESCE(games.elo_calc_log.cfg_snapshot, excluded.cfg_snapshot);

  -- nur KA-Index anpassen + History
  UPDATE games.players SET ka_index = ka_index + delta WHERE player = a1;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, a1, r_a1, r_a1 + delta,  delta, eff_a1_old, eff_a1_new);

  UPDATE games.players SET ka_index = ka_index + delta WHERE player = a2;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, a2, r_a2, r_a2 + delta,  delta, eff_a2_old, eff_a2_new);

  UPDATE games.players SET ka_index = ka_index - delta WHERE player = b1;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, b1, r_b1, r_b1 - delta, -delta, eff_b1_old, eff_b1_new);

  UPDATE games.players SET ka_index = ka_index - delta WHERE player = b2;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, b2, r_b2, r_b2 - delta, -delta, eff_b2_old, eff_b2_new);
END;$function$
;

CREATE OR REPLACE FUNCTION games.is_match_participant(p_match uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'games', 'pg_temp'
AS $function$select exists (
    select 1
    from games."match" m
    join games.teams ta on ta.id = m.team_a
    join games.teams tb on tb.id = m.team_b
    where m.id = p_match
      and auth.uid() in (ta.player_1_uuid, ta.player_2_uuid, tb.player_1_uuid, tb.player_2_uuid)
  );$function$
;

CREATE OR REPLACE FUNCTION games.is_member_of_match(p_team_a uuid, p_team_b uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$SELECT EXISTS (
    SELECT 1
    FROM games.teams t
    WHERE t.id IN (p_team_a, p_team_b)
      AND auth.uid() IN (t.player_1_uuid, t.player_2_uuid)
  );$function$
;

CREATE OR REPLACE FUNCTION games.is_member_of_teams(p_team_a uuid, p_team_b uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
 SET row_security TO 'off'
AS $function$SELECT EXISTS (
    SELECT 1
    FROM games.teams t
    WHERE (t.id = p_team_a OR t.id = p_team_b)
      AND auth.uid() IN (t.player_1_uuid, t.player_2_uuid)
  );$function$
;

create or replace view "games"."players_public" as  SELECT player,
    gender,
    rg_id,
    rg_link,
    rg_avatar_url,
    pro_status,
        CASE
            WHEN (hide_rating AND (auth.uid() <> player)) THEN NULL::numeric
            ELSE ka_index
        END AS ka_index,
        CASE
            WHEN (hide_rating AND (auth.uid() <> player)) THEN NULL::numeric
            ELSE rg_index
        END AS rg_index,
        CASE
            WHEN (hide_rating AND (auth.uid() <> player)) THEN NULL::numeric
            ELSE effective_rating_cached
        END AS effective_rating_cached,
    hide_rating
   FROM games.players p;


CREATE OR REPLACE FUNCTION games.preview_elo_for_match(p_match uuid)
 RETURNS TABLE(eff_team_a numeric, eff_team_b numeric, expected_a numeric, expected_b numeric, k_base integer, k_eff numeric, category_a text, category_b text, upset_levels integer, upset_multiplier numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'games', 'pg_temp'
AS $function$with cfg as (select * from games.elo_config where id=1),
  m as (select team_a, team_b from games."match" where id = p_match),
  t as (
    select
      (select player_1_uuid from games.teams where id = m.team_a) as a1,
      (select player_2_uuid from games.teams where id = m.team_a) as a2,
      (select player_1_uuid from games.teams where id = m.team_b) as b1,
      (select player_2_uuid from games.teams where id = m.team_b) as b2
    from m
  ),
  cat as (
    select
      games.team_category(t.a1,t.a2) as cat_a,
      games.team_category(t.b1,t.b2) as cat_b
    from t
  ),
  eff as (
    select
      games.effective_team_rating_with_category(t.a1,t.a2) as eff_a,
      games.effective_team_rating_with_category(t.b1,t.b2) as eff_b
    from t
  ),
  exp as (
    select
      1.0 / (1.0 + power(10.0, (eff.eff_b - eff.eff_a)/400.0)) as ea
    from eff
  )
  select
    eff.eff_a, eff.eff_b,
    exp.ea, 1-exp.ea,
    cfg.k_factor as k_base,
    cfg.k_factor::numeric as k_eff,  -- hier ohne Upset-Bonus (der hängt vom tatsächlichen Sieger ab)
    cat.cat_a, cat.cat_b,
    abs( (case cat.cat_a when 'men' then 3 when 'mixed' then 2 else 1 end)
        - (case cat.cat_b when 'men' then 3 when 'mixed' then 2 else 1 end) ) as upset_levels,
    1.0 as upset_multiplier
  from cfg, eff, exp, cat;$function$
;

CREATE OR REPLACE FUNCTION games.recompute_all_elo_from_scratch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE rec RECORD;
BEGIN
  -- nur der lokale Index wird zurückgesetzt
  UPDATE games.players SET ka_index = 1000;
  DELETE FROM games.elo_history;

  FOR rec IN
    SELECT m.id
    FROM games."match" m
    LEFT JOIN LATERAL (
      SELECT MIN(s.created_at) AS first_set_at
      FROM games.sets s WHERE s.match = m.id
    ) ss ON TRUE
    ORDER BY COALESCE(ss.first_set_at, m.created_at) NULLS LAST, m.id
  LOOP
    PERFORM games.apply_elo_for_match(rec.id);
  END LOOP;
END;$function$
;

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
      'player',  new.player_uuid
    ),
    5000
  );
        RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION games.trg_user_to_player()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$BEGIN
  -- Minimal: nur die Player-ID anlegen; Defaults (ka_index=1000 etc.) greifen.
  INSERT INTO games.players (player_uuid)
  VALUES (NEW."id")
  ON CONFLICT (player_uuid) DO NOTHING;

  RETURN NEW;
END;$function$
;

create or replace view "games"."user_matches" as  SELECT g.id,
    g.created_at,
    t1.name AS team_a_name,
    t1.player_1 AS team_a_player_1,
    t1.player_2 AS team_a_player_2,
    t2.name AS team_b_name,
    t2.player_1 AS team_b_player_1,
    t2.player_2 AS team_b_player_2,
    g.rated,
    string_agg((((s.team_a_score)::text || ':'::text) || (s.team_b_score)::text), ', '::text) AS set_results
   FROM (((games.match g
     LEFT JOIN games.teams t1 ON ((g.team_a = t1.id)))
     LEFT JOIN games.teams t2 ON ((g.team_b = t2.id)))
     LEFT JOIN games.sets s ON ((g.id = s.match)))
  WHERE ((t1.player_1 = auth.uid()) OR (t1.player_2 = auth.uid()) OR (t2.player_1 = auth.uid()) OR (t2.player_2 = auth.uid()))
  GROUP BY g.id, g.created_at, t1.name, t1.player_1, t1.player_2, t2.name, t2.player_1, t2.player_2;


CREATE OR REPLACE FUNCTION notifications._trg_challenge_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_challenge_added(new.id, auth.uid());
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_challenge_entry_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_challenge_entry_added(new."challenge", auth.uid());
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_canceled_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_event_canceled(new.id, auth.uid());
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
  
  perform notifications.notify_event_updated(new.id, v_body, auth.uid());

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
    perform notifications.notify_group_join_requested(new."group", new."user", auth.uid());
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
    perform notifications.notify_group_request_confirmed(new."group", new."user", auth.uid());
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
  if new."current_holder_uuid" is distinct from old."current_holder_uuid" then
    perform notifications.notify_item_handover(
      new.id,
      old."current_holder_uuid",
      new."current_holder_uuid",
      auth.uid()
    );
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.mark_all_notifications_read(p_topic text DEFAULT NULL::text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$with upd as (
    update notifications.notifications n
       set read_at = now()
     where n."user" = auth.uid()
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
     and "user" = auth.uid();$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_drink_payment_fulfilled(p_payment uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_user   uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'drink.payment.fulfilled';
  v_cnt    int := 0;
  v_url    text := '/';
  v_body text := '💸 Deine Zahlung wurde bestätigt 💸';
  v_title text := 'Zahlung eingegangen';
begin
  select p."user" into v_user from public.payments p where p.id_uuid = p_payment;
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
    auth.uid(), v_tenant, p_topic, coalesce(p_channel,'webpush'),
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

CREATE OR REPLACE FUNCTION notifications.trg_game_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  perform notifications.notify_game_added(new.id, auth.uid());
  return new;
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
     and "user" = auth.uid();
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.upsert_webpush_subscription(p_endpoint text, p_p256dh text, p_auth text, p_device_id text, p_user_agent text, p_platform text)
 RETURNS notifications.web_push_subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_user uuid := auth.uid();
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

CREATE OR REPLACE FUNCTION public.add_drinks_history(items json)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    user_id uuid := auth.uid();
    payment_id bigint;
    drink_record json;
    voucher_record RECORD;
    total_drink_count numeric;
    drink_id bigint;
    drink_count numeric;
    drink_price numeric;
    drink_amount numeric;
BEGIN
    IF jsonb_typeof(items::jsonb) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', items;
    END IF;

    -- get or create payment id
    SELECT id
    INTO payment_id
    FROM payments
    WHERE "user_uuid" = user_id
    AND "paymentState" = 'Open';
    IF
    payment_id IS NULL THEN
            INSERT INTO payments ("user_uuid", "amountToPay", "paymentState")
            VALUES (user_id, 0, 'Open')
            RETURNING id INTO payment_id;
    END IF;

    IF payment_id IS NULL THEN
        RAISE EXCEPTION 'Es wurde kein Payment gefunden oder konnte nicht erstellt werden';
    END IF;

    -- Iterate over all drinks that need to be added
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
        drink_id := (drink_record->>'id')::numeric;
        drink_count := (drink_record->>'count')::numeric;
        drink_price := (drink_record->>'price')::numeric;
        raise log 'Adding drink %', drink_record;
        total_drink_count := drink_count; -- Initialize remaining count for this drink
        -- Loop over the vouchers of the user
        FOR voucher_record IN SELECT id, available FROM user_vouchers
        LOOP
            -- If the remaining count is fulfilled, exit the loop
            IF total_drink_count <= 0 THEN
                EXIT;
            END IF;
            -- Check if the voucher has enough available count
            IF voucher_record.available > 0 THEN
                IF voucher_record.available < total_drink_count THEN
                    -- Create a history entry with the voucher for the available amount
                    drink_amount := drink_price * voucher_record.available;
                    INSERT INTO history (drink, "user_uuid", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, voucher_record.available, drink_amount, voucher_record.id);
                    -- Decrease the remaining count
                    total_drink_count := total_drink_count - voucher_record.available;
                ELSE
                    drink_amount := drink_price * total_drink_count;
                    -- Create a history entry with the voucher for the remaining count
                    INSERT INTO history (drink, "user_uuid", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount, voucher_record.id);
                    -- Set remaining count to zero as it is fulfilled
                    total_drink_count := 0;
                END IF;
            END IF;
        END LOOP;
        -- If there is still remaining count, create a history entry without a voucher
        IF total_drink_count > 0 THEN
            drink_amount := drink_price * total_drink_count;
            INSERT INTO history (drink, "user_uuid", payment, count, amount)
            VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount);
        END IF;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Drinks: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.authorize(requested_permission text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$SELECT EXISTS (
    SELECT 1
    FROM public.user_grants_view ugv
    WHERE ugv."user" = (select auth.uid())
      AND ugv.kind  = 'perm'
      AND ugv.key   = requested_permission
      AND ugv.tenant = '00000000-0000-0000-0000-000000000000'::uuid
  );$function$
;

create or replace view "public"."challenge_user_points" as  SELECT cs.challenge,
    cs."user",
    u."displayName",
    u."avatarUrl",
    sum(cs.count) AS total_points
   FROM (public.challenge_stats cs
     JOIN public."user" u ON ((cs."user" = u.id)))
  GROUP BY cs.challenge, cs."user", u."avatarUrl", u."displayName";


CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
    claims jsonb;
    permissions text[];
    features text[];
  begin

    Select array(select distinct gp."permission"::text from public."group_permissions" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user_uuid" = (event->>'user_id') and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into permissions;

    Select array(select distinct gp."feature"::text from public."group_features" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user_uuid" = (event->>'user_id') and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into features;

    claims := event->'claims';

    if permissions is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_permissions}', to_jsonb(permissions));
    else
      claims := jsonb_set(claims, '{user_permissions}', '[]'::jsonb);
    end if;

    if features is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_features}', to_jsonb(features));
    else
      claims := jsonb_set(claims, '{user_features}', '[]'::jsonb);
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;$function$
;

create or replace view "public"."event_bring_item_status" as  SELECT bi.id AS item_id,
    bi.event AS event_id,
    bi.name,
    bi.unit,
    bi.required_qty,
    COALESCE(sum(p.qty), (0)::numeric) AS pledged_qty,
    GREATEST((bi.required_qty - COALESCE(sum(p.qty), (0)::numeric)), (0)::numeric) AS shortfall,
    GREATEST((COALESCE(sum(p.qty), (0)::numeric) - bi.required_qty), (0)::numeric) AS surplus,
    (COALESCE(sum(p.qty), (0)::numeric) >= bi.required_qty) AS fulfilled
   FROM (public.event_bring_items bi
     LEFT JOIN public.event_bring_pledges p ON ((p.item = bi.id)))
  GROUP BY bi.id, bi.event, bi.name, bi.unit, bi.required_qty;


create or replace view "public"."event_bring_overview" as  SELECT i.event,
    i.id AS item_id,
    i.name,
    i.unit,
    i.required_qty,
    COALESCE(sum(
        CASE
            WHEN (p.status = ANY (ARRAY['pledged'::text, 'fulfilled'::text])) THEN p.qty
            ELSE (0)::numeric
        END), (0)::numeric) AS pledged_qty,
    (i.required_qty - COALESCE(sum(
        CASE
            WHEN (p.status = ANY (ARRAY['pledged'::text, 'fulfilled'::text])) THEN p.qty
            ELSE (0)::numeric
        END), (0)::numeric)) AS remaining_qty
   FROM (public.event_bring_items i
     LEFT JOIN public.event_bring_pledges p ON ((p.item = i.id)))
  GROUP BY i.event, i.id, i.name, i.unit, i.required_qty;


create or replace view "public"."event_groups_view" as  SELECT eg.created_at,
    eg.description,
    eg.name,
    eg.color,
    eg.id,
    eg.is_public,
    eg.need_request_to_join,
    eg.parent_group,
    eg.visible,
    gum.role
   FROM (public.event_group eg
     LEFT JOIN public.group_user_mapping gum ON (((eg.id = gum."group") AND (gum."user" = ( SELECT auth.uid() AS uid)))));


create or replace view "public"."events_user_view" as  SELECT e.id,
    e.created_at,
    e.title,
    e.description,
    e."meetingDateTime",
    e."startingDateTime",
    e."endDateTime",
    e.key,
    e."isCancelled",
    e.place,
    e."group",
    e.recurrence,
    e."answerDeadline",
    e."recurrenceEnd",
    e."maxAttendees",
    e.max_trial_attendees,
    e.required_item,
    e.constellations_enabled,
    eaus.state AS user_state,
    gus.role AS user_group_role,
    ( SELECT count(*) AS count
           FROM public.event_attendance_user_mapping ea
          WHERE ((ea.event = e.id) AND (ea.state = 'Attending'::public."EventAttendance"))) AS attending_count,
    ( SELECT count(*) AS count
           FROM public.event_attendance_user_mapping ea
          WHERE ((ea.event = e.id) AND (ea.state = 'Declined'::public."EventAttendance"))) AS declined_count
   FROM ((public.events e
     LEFT JOIN public.event_attendance_user_mapping eaus ON (((e.id = eaus.event) AND (eaus."user" = ( SELECT auth.uid() AS uid)))))
     JOIN public.group_user_mapping gus ON (((e."group" = gus."group") AND (gus."user" = ( SELECT auth.uid() AS uid)))));


CREATE OR REPLACE FUNCTION public.grant_group_grants(p_group uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
  v_is_group_admin boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  -- Gruppen-Admin?
  select exists(
           select 1
             from public.group_user_mapping gum
            where gum."group" = p_group
              and gum."user_uuid"  = v_uid
              and gum."role"  = 'admin'
         )
    into v_is_group_admin;

  if not (v_is_admin or v_is_group_admin) then
    raise exception 'forbidden (not group admin)' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    insert into public.permissions(name)
    select distinct k from unnest(p_perms) u(k)
    on conflict do nothing;

    insert into public.group_permissions("group","permission")
    select p_group, k from unnest(p_perms) u(k)
    on conflict do nothing;
  end if;

  if array_length(p_feats,1) is not null then
    begin
      insert into public.features(name)
      select distinct k from unnest(p_feats) u(k)
      on conflict do nothing;

      insert into public.group_features("group","feature")
      select p_group, k from unnest(p_feats) u(k)
      on conflict do nothing;
    exception
      when undefined_table then
        -- installations ohne group_features: ignorieren
        raise notice 'group_features table not found – skipping feature grants for group %', p_group;
    end;
  end if;
end;$function$
;

CREATE OR REPLACE FUNCTION public.increase_challenge_stats_count(challenge_id uuid, amount numeric, to_create_at timestamp with time zone, image_url text DEFAULT NULL::text)
 RETURNS public.challenge_stats
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
  c          public.challenge;
  new_stat   public.challenge_stats;
  uid        uuid := auth.uid();
  week_start timestamptz;
  week_end   timestamptz;
  day_start  timestamptz;
  day_end    timestamptz;
  week_sum   numeric;
  day_sum    numeric;
BEGIN
  -- Basic inputs
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  SELECT * INTO c FROM public.challenge WHERE id = challenge_id;
  IF c IS NULL THEN
    RAISE EXCEPTION 'Could not select given challenge';
  END IF;

  IF c.automated THEN
    RAISE EXCEPTION 'This challenge is automated. You can not add any points manually';
  END IF;

  -- Membership check (clear error instead of vague RLS failure)
  IF NOT EXISTS (
    SELECT 1 FROM public.group_user_mapping gum
     WHERE gum."group" = c."group"
       AND gum."user_uuid"  = uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of the challenge''s group' USING ERRCODE = '42501';
  END IF;

  -- Reject single-call overflow irrespective of prior rows
  IF amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;
  IF amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  -- Windows anchored on the attempted timestamp
  week_start := date_trunc('week', to_create_at);
  week_end   := week_start + interval '7 days';
  day_start  := date_trunc('day', to_create_at);
  day_end    := day_start + interval '1 day';

  -- RLS-immune sums (only for the caller's own uid)
  week_sum := public._sum_challenge_points_for_self(uid, challenge_id, week_start, week_end);
  day_sum  := public._sum_challenge_points_for_self(uid, challenge_id, day_start, day_end);

  -- Cumulative caps
  IF week_sum + amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  IF day_sum + amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;

  -- Insert for the actor (RLS still applies to the INSERT)
  INSERT INTO public.challenge_stats ("user","challenge","count","created_at","image_url")
  VALUES (uid, challenge_id, amount, to_create_at, image_url)
  RETURNING * INTO new_stat;

  RETURN new_stat;
END;$function$
;

CREATE OR REPLACE FUNCTION public.is_user_admin_in_group(group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$SELECT EXISTS (
    SELECT 1
    FROM group_user_mapping
    WHERE "group" = group_id AND "user_uuid" = auth.uid()
    AND "role" = 'admin'
  );$function$
;

CREATE OR REPLACE FUNCTION public.is_user_in_group(group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$SELECT EXISTS (
    SELECT 1
    FROM group_user_mapping
    WHERE "group" = group_id AND "user_uuid" = auth.uid() AND ("role" = 'user'::public."GroupRole" OR "role" = 'admin'::public."GroupRole" OR "role" = 'trial'::public."GroupRole")
  );$function$
;

CREATE OR REPLACE FUNCTION public.revoke_group_grants(p_group uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
  v_is_group_admin boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  select exists(
           select 1
             from public.group_user_mapping gum
            where gum."group" = p_group
              and gum."user_uuid"  = v_uid
              and gum."role"  = 'admin'
         )
    into v_is_group_admin;

  if not (v_is_admin or v_is_group_admin) then
    raise exception 'forbidden (not group admin)' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    delete from public.group_permissions
     where "group" = p_group
       and "permission" = any(p_perms);
  end if;

  if array_length(p_feats,1) is not null then
    begin
      delete from public.group_features
       where "group" = p_group
         and "feature" = any(p_feats);
    exception
      when undefined_table then
        raise notice 'group_features table not found – skipping feature revokes for group %', p_group;
    end;
  end if;
end;$function$
;

CREATE OR REPLACE FUNCTION public.trg_add_item_history_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$begin
    insert into item_history("past_user", "current_user", key)
    values (old."current_holder_uuid", new."current_holder_uuid", new.id);
    return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.trg_add_user_to_public()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$BEGIN
  INSERT INTO public.user ("user_uuid", email, "displayName", name, role, created_at, verified)
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
  WHERE "user_uuid" = OLD."user_uuid"
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
  INSERT INTO public."user"("user_uuid","displayName","email","name")
  VALUES (NEW.id, v_display, NEW.email, v_name)
  ON CONFLICT ("user_uuid") DO NOTHING;

  RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_items_handover_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$BEGIN
  IF TG_OP = 'UPDATE' AND NEW.current_holder_uuid IS DISTINCT FROM OLD.current_holder_uuid THEN
    INSERT INTO public.item_history("past_user", "current_user", key)
    VALUES (OLD.current_holder_uuid, NEW.current_holder_uuid, NEW.id);
  END IF;
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
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user_uuid"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'AttendingAsTrial'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'WaitingAsTrial'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user_uuid" IN (SELECT * FROM users_to_update);
    else
        if (new."max_trial_attendees" > old."max_trial_attendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user_uuid"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'WaitingAsTrial'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'AttendingAsTrial'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user_uuid" IN (SELECT * FROM users_to_update);
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
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user_uuid"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'Attending'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'Waiting'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user_uuid" IN (SELECT * FROM users_to_update);
    else
        if (new."maxAttendees" > old."maxAttendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user_uuid"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'Waiting'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'Attending'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user_uuid" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;$function$
;

CREATE OR REPLACE FUNCTION public.trg_update_normalized_players()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$BEGIN
    NEW.normalized_players := 
        CASE 
            WHEN NEW.player_1_uuid < NEW.player_2_uuid THEN NEW.player_1_uuid || ',' || NEW.player_2_uuid
            ELSE NEW.player_2_uuid || ',' || NEW.player_1_uuid
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
    WHERE event_attendance_user_mapping."user_uuid" = (SELECT event_attendance_user_mapping."user_uuid" from event_attendance_user_mapping where event_attendance_user_mapping.state = 'Waiting' AND event_attendance_user_mapping.event = NEW.event order by event_attendance_user_mapping."lastUpdate" Limit 1);
    end if;
    return NEW;
  END;$function$
;

create or replace view "public"."user_grants_view" as  SELECT DISTINCT ON ("user", kind, key, tenant) "user",
    kind,
    key,
    tenant,
    granted_by
   FROM ( SELECT udg."user",
            udg.kind,
            udg.key,
            udg.tenant,
            'direct'::text AS granted_by
           FROM public.user_direct_grants udg
          WHERE (udg."user" = auth.uid())
        UNION ALL
         SELECT gum."user",
            'perm'::public.grant_kind AS kind,
            gp.permission AS key,
            '00000000-0000-0000-0000-000000000000'::uuid AS tenant,
            'group'::text AS granted_by
           FROM (public.group_user_mapping gum
             JOIN public.group_permissions gp ON ((gp."group" = gum."group")))
          WHERE ((gum.role IS NOT NULL) AND (gum.role <> 'joinRequested'::public."GroupRole") AND (gum."user" = auth.uid()))
        UNION ALL
         SELECT gum."user",
            'feat'::public.grant_kind AS kind,
            gf.feature AS key,
            '00000000-0000-0000-0000-000000000000'::uuid AS tenant,
            'group'::text AS granted_by
           FROM (public.group_user_mapping gum
             JOIN public.group_features gf ON ((gf."group" = gum."group")))
          WHERE ((gum.role IS NOT NULL) AND (gum.role <> 'joinRequested'::public."GroupRole") AND (gum."user" = auth.uid()))) s
  ORDER BY "user", kind, key, tenant,
        CASE granted_by
            WHEN 'direct'::text THEN 0
            ELSE 1
        END;


create or replace view "public"."user_vouchers" as  SELECT v.id,
    v.created_at,
    v.title,
    (v.total_drinks - COALESCE(sum(h.count), (0)::numeric)) AS available
   FROM (public.vouchers v
     LEFT JOIN public.history h ON ((v.id = h.voucher)))
  WHERE (v."user" = auth.uid())
  GROUP BY v.id, v.title, v.total_drinks
 HAVING (COALESCE(sum(h.count), (0)::numeric) < v.total_drinks);


CREATE OR REPLACE FUNCTION util.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$declare
    claims jsonb;
    permissions text[];
    features text[];
  begin

    Select array(select distinct gp.permission from group_user_mapping gum join group_permissions gp on gp."group" = gum."group" where gum."user_uuid" = (select auth.uid() as uid) and gum.role <> 'joinRequested'::"GroupRole") into permissions;

    Select array(select distinct gf.feature from group_user_mapping gum join group_features gf on gf."group" = gum."group" where gum."user_uuid" = (select auth.uid() as uid) and gum.role <> 'joinRequested'::"GroupRole") into features;

    claims := event->'claims';

    if permissions is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_permissions}', to_jsonb(permissions));
    else
      claims := jsonb_set(claims, '{user_permissions}', '[]'::jsonb);
    end if;

    if features is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_features}', to_jsonb(features));
    else
      claims := jsonb_set(claims, '{user_features}', '[]'::jsonb);
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;$function$
;


  create policy "unp_insert_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for insert
  to authenticated
with check (("user" = auth.uid()));



  create policy "elo_calc_log_select_if_participant"
  on "games"."elo_calc_log"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = elo_calc_log.match) AND ((auth.uid() = ta.player_1) OR (auth.uid() = ta.player_2) OR (auth.uid() = tb.player_1) OR (auth.uid() = tb.player_2))))));



  create policy "el_history_if_participant"
  on "games"."elo_history"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = elo_history.match) AND ((auth.uid() = ta.player_1) OR (auth.uid() = ta.player_2) OR (auth.uid() = tb.player_1) OR (auth.uid() = tb.player_2))))));



  create policy "players_self_select"
  on "games"."players"
  as permissive
  for select
  to authenticated
using ((player = auth.uid()));



  create policy "players_update_self"
  on "games"."players"
  as permissive
  for update
  to public
using ((player = ( SELECT auth.uid() AS uid)));



  create policy "Allow everything when user has permission games.update.score an"
  on "games"."sets"
  as permissive
  for all
  to public
using ((( SELECT public.authorize('games.update.score'::text) AS authorize) AND (EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = sets.match) AND ((ta.player_1 = auth.uid()) OR (ta.player_2 = auth.uid()) OR (tb.player_1 = auth.uid()) OR (tb.player_2 = auth.uid())))))));



  create policy "sets_select_public_or_participant"
  on "games"."sets"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM games.match m
  WHERE ((m.id = sets.match) AND (m.is_public = true)))) OR (EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = sets.match) AND ((auth.uid() = ta.player_1) OR (auth.uid() = ta.player_2) OR (auth.uid() = tb.player_1) OR (auth.uid() = tb.player_2)))))));



  create policy "Allow delete when userid in team"
  on "games"."teams"
  as permissive
  for delete
  to authenticated
using (((player_1 = ( SELECT auth.uid() AS uid)) OR (player_2 = ( SELECT auth.uid() AS uid))));



  create policy "teams_insert_if_member"
  on "games"."teams"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = player_1) OR (auth.uid() = player_2) OR public.authorize('games.manage'::text)));



  create policy "teams_select_if_member"
  on "games"."teams"
  as permissive
  for select
  to authenticated
using (((auth.uid() = player_1) OR (auth.uid() = player_2)));



  create policy "teams_update_if_member"
  on "games"."teams"
  as permissive
  for update
  to authenticated
using (((auth.uid() = player_1) OR (auth.uid() = player_2) OR public.authorize('games.manage'::text)))
with check (((auth.uid() = player_1) OR (auth.uid() = player_2) OR public.authorize('games.manage'::text)));



  create policy "notifications_delete_own"
  on "notifications"."notifications"
  as permissive
  for delete
  to authenticated
using (("user" = auth.uid()));



  create policy "notifications_select_own"
  on "notifications"."notifications"
  as permissive
  for select
  to authenticated
using (("user" = auth.uid()));



  create policy "notifications_update_own"
  on "notifications"."notifications"
  as permissive
  for update
  to authenticated
using (("user" = auth.uid()))
with check (("user" = auth.uid()));



  create policy "unp_delete_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for delete
  to authenticated
using (("user" = auth.uid()));



  create policy "unp_select_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for select
  to authenticated
using (("user" = auth.uid()));



  create policy "unp_update_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for update
  to authenticated
using (("user" = auth.uid()))
with check (("user" = auth.uid()));



  create policy "webpush_insert_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for insert
  to authenticated
with check (("user" = auth.uid()));



  create policy "webpush_select_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for select
  to authenticated
using (("user" = auth.uid()));



  create policy "webpush_update_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for update
  to authenticated
using (("user" = auth.uid()))
with check (("user" = auth.uid()));



  create policy "Allow delete when admin of group"
  on "public"."challenge"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = challenge."group") AND (gum."user" = auth.uid()) AND (gum.role = 'admin'::public."GroupRole")))));



  create policy "Allow insert when admin of group"
  on "public"."challenge"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = challenge."group") AND (gum."user" = auth.uid()) AND (gum.role = 'admin'::public."GroupRole")))));



  create policy "Allow update when user is admin of challenge group"
  on "public"."challenge"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = challenge."group") AND (gum."user" = auth.uid()) AND (gum.role = 'admin'::public."GroupRole")))));



  create policy "Select challenges for user with group"
  on "public"."challenge"
  as permissive
  for select
  to public
using ((( SELECT challenge."group") IN ( SELECT group_user_mapping."group"
   FROM public.group_user_mapping
  WHERE (group_user_mapping."user" = ( SELECT auth.uid() AS uid)))));



  create policy "challenge_stats_delete"
  on "public"."challenge_stats"
  as permissive
  for delete
  to authenticated
using ((("user" = auth.uid()) OR (public.authorize('challenge.manage'::text) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = auth.uid())))))));



  create policy "challenge_stats_insert"
  on "public"."challenge_stats"
  as permissive
  for insert
  to authenticated
with check (((("user" = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = auth.uid()))))) OR public.authorize('challenge.manage'::text)));



  create policy "challenge_stats_select"
  on "public"."challenge_stats"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = auth.uid())))) OR public.authorize('challenge.manage'::text)));



  create policy "challenge_stats_update"
  on "public"."challenge_stats"
  as permissive
  for update
  to authenticated
using ((("user" = auth.uid()) OR (public.authorize('challenge.manage'::text) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = auth.uid())))))))
with check ((("user" = auth.uid()) OR (public.authorize('challenge.manage'::text) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = auth.uid())))))));



  create policy "attendance_delete_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for delete
  to authenticated
using (((("user" = auth.uid()) OR public.authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = auth.uid()))))));



  create policy "attendance_insert_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for insert
  to authenticated
with check (((("user" = auth.uid()) OR public.authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))));



  create policy "attendance_select_member"
  on "public"."event_attendance_user_mapping"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = auth.uid())))));



  create policy "attendance_update_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = auth.uid())))))
with check (((("user" = auth.uid()) OR public.authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))));



  create policy "items_select_member"
  on "public"."event_bring_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_items.event) AND (gum."user" = auth.uid())))));



  create policy "ebp_delete_self_or_manager"
  on "public"."event_bring_pledges"
  as permissive
  for delete
  to authenticated
using (((("user" = auth.uid()) OR public.authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = auth.uid()))))));



  create policy "ebp_insert_self"
  on "public"."event_bring_pledges"
  as permissive
  for insert
  to authenticated
with check ((("user" = auth.uid()) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (gum."user" = auth.uid()) AND (e.items_enabled IS TRUE))))));



  create policy "ebp_select_if_in_group"
  on "public"."event_bring_pledges"
  as permissive
  for select
  to public
using ((( SELECT events."group"
   FROM public.events
  WHERE (events.id = event_bring_pledges.event)
 LIMIT 1) IN ( SELECT group_user_mapping."group"
   FROM public.group_user_mapping
  WHERE (group_user_mapping."user" = ( SELECT auth.uid() AS uid)))));



  create policy "ebp_select_member"
  on "public"."event_bring_pledges"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = auth.uid())))));



  create policy "ebp_update_self_or_manager"
  on "public"."event_bring_pledges"
  as permissive
  for update
  to authenticated
using (((("user" = auth.uid()) OR public.authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = auth.uid()))))))
with check (((("user" = auth.uid()) OR public.authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = auth.uid()))))));



  create policy "Allow delete with event.comment permission on own comment"
  on "public"."event_comments"
  as permissive
  for delete
  to public
using ((( SELECT public.authorize('event.comment'::text) AS authorize) AND ("user" = ( SELECT auth.uid() AS uid))));



  create policy "Allow insert with event.comment permission on own comment"
  on "public"."event_comments"
  as permissive
  for insert
  to public
with check ((( SELECT public.authorize('event.comment'::text) AS authorize) AND ("user" = ( SELECT auth.uid() AS uid)) AND public.check_reply_to(reply_to)));



  create policy "Allow update with event.comment permission on own comment"
  on "public"."event_comments"
  as permissive
  for update
  to public
using ((( SELECT public.authorize('event.comment'::text) AS authorize) AND ("user" = auth.uid())))
with check (true);



  create policy "Allow delete when admin of group"
  on "public"."event_group"
  as permissive
  for delete
  to authenticated
using ((( SELECT count(*) AS count
   FROM public.group_user_mapping
  WHERE ((group_user_mapping."user" = ( SELECT auth.uid() AS uid)) AND (group_user_mapping.role = 'admin'::public."GroupRole"))) > 0));



  create policy "Allow update for admin in group"
  on "public"."event_group"
  as permissive
  for update
  to authenticated
using ((( SELECT count(*) AS count
   FROM public.group_user_mapping
  WHERE ((group_user_mapping."user" = ( SELECT auth.uid() AS uid)) AND (group_user_mapping.role = 'admin'::public."GroupRole"))) > 0));



  create policy "Select if user is member"
  on "public"."event_group"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = event_group.id) AND (gum."user" = ( SELECT auth.uid() AS uid)) AND ((gum.role = 'admin'::public."GroupRole") OR (gum.role = 'user'::public."GroupRole"))))));



  create policy "Select subgroups only if user is member of parent group"
  on "public"."event_group"
  as permissive
  for select
  to public
using (((is_public = true) AND (parent_group IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = event_group.parent_group) AND (gum."user" = ( SELECT auth.uid() AS uid)) AND ((gum.role = 'admin'::public."GroupRole") OR (gum.role = 'user'::public."GroupRole")))))));



  create policy "Select events for user in group"
  on "public"."events"
  as permissive
  for select
  to authenticated
using ((( SELECT events."group") IN ( SELECT group_user_mapping."group"
   FROM public.group_user_mapping
  WHERE ((group_user_mapping."user" = auth.uid()) AND ((group_user_mapping.role = 'user'::public."GroupRole") OR (group_user_mapping.role = 'admin'::public."GroupRole"))))));



  create policy "events_delete_with_perm"
  on "public"."events"
  as permissive
  for delete
  to authenticated
using ((public.authorize('event.delete'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = auth.uid()))))));



  create policy "events_insert_with_perm"
  on "public"."events"
  as permissive
  for insert
  to authenticated
with check ((public.authorize('event.create'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = auth.uid()))))));



  create policy "events_select_group_member"
  on "public"."events"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = auth.uid())))));



  create policy "events_update_with_perm"
  on "public"."events"
  as permissive
  for update
  to authenticated
using ((public.authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = auth.uid()))))))
with check ((public.authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = auth.uid()))))));



  create policy "Delete when admin or own user"
  on "public"."group_user_mapping"
  as permissive
  for delete
  to public
using ((public.is_user_admin_in_group("group") OR ("user" = ( SELECT auth.uid() AS uid))));



  create policy "gum_insert_self_public_open"
  on "public"."group_user_mapping"
  as permissive
  for insert
  to authenticated
with check ((("user" = auth.uid()) AND (role = 'user'::public."GroupRole") AND (EXISTS ( SELECT 1
   FROM public.event_group eg
  WHERE ((eg.id = group_user_mapping."group") AND eg.is_public AND (NOT eg.need_request_to_join))))));



  create policy "gum_select_self"
  on "public"."group_user_mapping"
  as permissive
  for select
  to authenticated
using (("user" = auth.uid()));



  create policy "Insert for own user"
  on "public"."history"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = "user"));



  create policy "Select for own user"
  on "public"."history"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = "user"));



  create policy "Update for own user"
  on "public"."history"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = "user"));



  create policy "item_history_insert_if_member"
  on "public"."item_history"
  as permissive
  for insert
  to authenticated
with check ((( SELECT i."group"
   FROM public.items i
  WHERE (i.id = item_history.key)) IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = auth.uid()))));



  create policy "item_history_select_if_member"
  on "public"."item_history"
  as permissive
  for select
  to authenticated
using ((( SELECT i."group"
   FROM public.items i
  WHERE (i.id = item_history.key)) IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = auth.uid()))));



  create policy "items_select_if_member"
  on "public"."items"
  as permissive
  for select
  to authenticated
using (("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = auth.uid()))));



  create policy "items_update_holder_if_member"
  on "public"."items"
  as permissive
  for update
  to authenticated
using (("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = auth.uid()))))
with check (("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = auth.uid()))));



  create policy "Allow insert for own"
  on "public"."payments"
  as permissive
  for insert
  to authenticated
with check (("user" = ( SELECT auth.uid() AS uid)));



  create policy "Allow own payment or if drinks.confirm.payments permission is p"
  on "public"."payments"
  as permissive
  for select
  to authenticated
using ((( SELECT public.authorize('drinks.confirm.payments'::text) AS authorize) OR ("user" = ( SELECT auth.uid() AS uid))));



  create policy "user_activity_all_self"
  on "public"."user_activity"
  as permissive
  for all
  to authenticated
using (("user" = auth.uid()))
with check (("user" = auth.uid()));



  create policy "udg_self_read"
  on "public"."user_direct_grants"
  as permissive
  for select
  to authenticated
using (("user" = auth.uid()));


update "public"."event_bring_pledges" set "user" = "user_id"::uuid;

update "public"."item_history" set "current_user" = "currentUser"::uuid;

update "public"."item_history" set "past_user" = "pastUser"::uuid;

update "public"."payments" set "past_user" = "pastUser"::uuid;

alter table "public"."event_bring_pledges" drop column "user_id";

alter table "public"."user" drop column "userId";

alter table "public"."item_history" drop column "currentUser";

alter table "public"."item_history" drop column "pastUser";

alter table "public"."payments" drop column "userId";