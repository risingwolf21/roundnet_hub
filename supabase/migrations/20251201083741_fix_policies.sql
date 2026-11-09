drop policy "elo_calc_log_select_if_participant" on "games"."elo_calc_log";

drop policy "el_history_if_participant" on "games"."elo_history";

drop policy "match_update_rated_by_creator" on "games"."match";

drop policy "players_self_select" on "games"."players";

drop policy "Allow everything when user has permission games.update.score an" on "games"."sets";

drop policy "sets_select_public_or_participant" on "games"."sets";

drop policy "teams_insert_if_member" on "games"."teams";

drop policy "teams_select_if_member" on "games"."teams";

drop policy "teams_update_if_member" on "games"."teams";

drop policy "notifications_delete_own" on "notifications"."notifications";

drop policy "notifications_select_own" on "notifications"."notifications";

drop policy "notifications_update_own" on "notifications"."notifications";

drop policy "unp_delete_own" on "notifications"."user_notification_preferences";

drop policy "unp_insert_own" on "notifications"."user_notification_preferences";

drop policy "unp_select_own" on "notifications"."user_notification_preferences";

drop policy "unp_update_own" on "notifications"."user_notification_preferences";

drop policy "webpush_insert_self" on "notifications"."web_push_subscriptions";

drop policy "webpush_select_self" on "notifications"."web_push_subscriptions";

drop policy "webpush_update_self" on "notifications"."web_push_subscriptions";

drop policy "Allow delete when admin of group" on "public"."challenge";

drop policy "Allow insert when admin of group" on "public"."challenge";

drop policy "Allow update when user is admin of challenge group" on "public"."challenge";

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

drop policy "ebp_select_member" on "public"."event_bring_pledges";

drop policy "ebp_update_self_or_manager" on "public"."event_bring_pledges";

drop policy "Allow update with event.comment permission on own comment" on "public"."event_comments";

drop policy "Select events for user in group" on "public"."events";

drop policy "events_delete_with_perm" on "public"."events";

drop policy "events_insert_with_perm" on "public"."events";

drop policy "events_select_group_member" on "public"."events";

drop policy "events_update_with_perm" on "public"."events";

drop policy "gum_insert_self_public_open" on "public"."group_user_mapping";

drop policy "gum_select_self" on "public"."group_user_mapping";

drop policy "item_history_insert_if_member" on "public"."item_history";

drop policy "item_history_select_if_member" on "public"."item_history";

drop policy "items_select_if_member" on "public"."items";

drop policy "items_update_holder_if_member" on "public"."items";

drop policy "user_activity_all_self" on "public"."user_activity";

drop policy "udg_self_read" on "public"."user_direct_grants";

drop policy "Insert as user when group is public and needs no joni request" on "public"."group_user_mapping";

drop policy "Insert when user requests to join" on "public"."group_user_mapping";

drop index if exists "public"."ix_items_event";

drop index if exists "public"."ix_pledges_item";

drop index if exists "public"."uq_group_permissions_group_permission";

drop function if exists "public"."is_app_client";

CREATE UNIQUE INDEX IF NOT EXISTS players_pkey ON games.players USING btree (player);

alter table "games"."players" add constraint "players_pkey" PRIMARY KEY using index "players_pkey";

alter table "games"."players" drop constraint "players_player_uuid_key" cascade;

drop index if exists "games"."players_player_uuid_key";

drop index if exists "games"."teams_normalized_players_uidx";

alter table "games"."elo_history" add constraint "elo_history_user_fkey" FOREIGN KEY ("user") REFERENCES games.players(player) not valid;

alter table "games"."elo_history" validate constraint "elo_history_user_fkey";

alter table "games"."teams" add constraint "teams_player_1_fkey" FOREIGN KEY (player_1) REFERENCES games.players(player) not valid;

alter table "games"."teams" validate constraint "teams_player_1_fkey";

alter table "games"."teams" add constraint "teams_player_2_fkey" FOREIGN KEY (player_2) REFERENCES games.players(player) not valid;

alter table "games"."teams" validate constraint "teams_player_2_fkey";

/*
  Uninstall testing dependencies
*/

drop extension if exists "supabase-dbdev";

drop extension if exists "pg_tle";

drop extension if exists "pgtap";

/*
  ----------------------------------------------------------------------
*/

  create policy "elo_calc_log_select_if_participant"
  on "games"."elo_calc_log"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = elo_calc_log.match) AND ((( SELECT auth.uid() AS uid) = ta.player_1) OR (( SELECT auth.uid() AS uid) = ta.player_2) OR (( SELECT auth.uid() AS uid) = tb.player_1) OR (( SELECT auth.uid() AS uid) = tb.player_2))))));



  create policy "el_history_if_participant"
  on "games"."elo_history"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = elo_history.match) AND ((( SELECT auth.uid() AS uid) = ta.player_1) OR (( SELECT auth.uid() AS uid) = ta.player_2) OR (( SELECT auth.uid() AS uid) = tb.player_1) OR (( SELECT auth.uid() AS uid) = tb.player_2))))));



  create policy "match_update_rated_by_creator"
  on "games"."match"
  as permissive
  for update
  to authenticated
using (((( SELECT auth.uid() AS uid))::text = created_by))
with check (((( SELECT auth.uid() AS uid))::text = created_by));



  create policy "players_self_select"
  on "games"."players"
  as permissive
  for select
  to authenticated
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
  WHERE ((m.id = sets.match) AND ((((( SELECT auth.uid() AS uid) = ta.player_1) OR (( SELECT auth.uid() AS uid) = ta.player_2)) OR (( SELECT auth.uid() AS uid) = tb.player_1)) OR (( SELECT auth.uid() AS uid) = tb.player_2)))))));



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
  WHERE ((m.id = sets.match) AND ((((( SELECT auth.uid() AS uid) = ta.player_1) OR (( SELECT auth.uid() AS uid) = ta.player_2)) OR (( SELECT auth.uid() AS uid) = tb.player_1)) OR (( SELECT auth.uid() AS uid) = tb.player_2)))))));



  create policy "teams_insert_if_member"
  on "games"."teams"
  as permissive
  for insert
  to authenticated
with check (((( SELECT auth.uid() AS uid) = player_1) OR (( SELECT auth.uid() AS uid) = player_2) OR public.authorize('games.manage'::text)));



  create policy "teams_select_if_member"
  on "games"."teams"
  as permissive
  for select
  to authenticated
using (((( SELECT auth.uid() AS uid) = player_1) OR (( SELECT auth.uid() AS uid) = player_2)));



  create policy "teams_update_if_member"
  on "games"."teams"
  as permissive
  for update
  to authenticated
using (((( SELECT auth.uid() AS uid) = player_1) OR (( SELECT auth.uid() AS uid) = player_2) OR public.authorize('games.manage'::text)))
with check (((( SELECT auth.uid() AS uid) = player_1) OR (( SELECT auth.uid() AS uid) = player_2) OR public.authorize('games.manage'::text)));



  create policy "notifications_delete_own"
  on "notifications"."notifications"
  as permissive
  for delete
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)));



  create policy "notifications_select_own"
  on "notifications"."notifications"
  as permissive
  for select
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)));



  create policy "notifications_update_own"
  on "notifications"."notifications"
  as permissive
  for update
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)))
with check (("user" = ( SELECT auth.uid() AS uid)));



  create policy "unp_delete_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for delete
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)));



  create policy "unp_insert_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for insert
  to authenticated
with check (("user" = ( SELECT auth.uid() AS uid)));



  create policy "unp_select_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for select
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)));



  create policy "unp_update_own"
  on "notifications"."user_notification_preferences"
  as permissive
  for update
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)))
with check (("user" = ( SELECT auth.uid() AS uid)));



  create policy "webpush_insert_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for insert
  to authenticated
with check (("user" = ( SELECT auth.uid() AS uid)));



  create policy "webpush_select_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for select
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)));



  create policy "webpush_update_self"
  on "notifications"."web_push_subscriptions"
  as permissive
  for update
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)))
with check (("user" = ( SELECT auth.uid() AS uid)));



  create policy "Allow delete when admin of group"
  on "public"."challenge"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = challenge."group") AND (gum."user" = ( SELECT auth.uid() AS uid)) AND (gum.role = 'admin'::public."GroupRole")))));



  create policy "Allow insert when admin of group"
  on "public"."challenge"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = challenge."group") AND (gum."user" = ( SELECT auth.uid() AS uid)) AND (gum.role = 'admin'::public."GroupRole")))));



  create policy "Allow update when user is admin of challenge group"
  on "public"."challenge"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = challenge."group") AND (gum."user" = ( SELECT auth.uid() AS uid)) AND (gum.role = 'admin'::public."GroupRole")))));



  create policy "challenge_stats_delete"
  on "public"."challenge_stats"
  as permissive
  for delete
  to authenticated
using ((("user" = ( SELECT auth.uid() AS uid)) OR (public.authorize('challenge.manage'::text) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = ( SELECT auth.uid() AS uid))))))));



  create policy "challenge_stats_insert"
  on "public"."challenge_stats"
  as permissive
  for insert
  to authenticated
with check (((("user" = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = ( SELECT auth.uid() AS uid)))))) OR public.authorize('challenge.manage'::text)));



  create policy "challenge_stats_select"
  on "public"."challenge_stats"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = ( SELECT auth.uid() AS uid))))) OR public.authorize('challenge.manage'::text)));



  create policy "challenge_stats_update"
  on "public"."challenge_stats"
  as permissive
  for update
  to authenticated
using ((("user" = ( SELECT auth.uid() AS uid)) OR (public.authorize('challenge.manage'::text) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = ( SELECT auth.uid() AS uid))))))))
with check ((("user" = ( SELECT auth.uid() AS uid)) OR (public.authorize('challenge.manage'::text) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = challenge_stats.challenge) AND (gum."user" = ( SELECT auth.uid() AS uid))))))));



  create policy "attendance_delete_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for delete
  to authenticated
using (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = ( SELECT auth.uid() AS uid)))))));



  create policy "attendance_insert_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for insert
  to authenticated
with check (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
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
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = ( SELECT auth.uid() AS uid))))));



  create policy "attendance_update_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for update
  to authenticated
using (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))))
with check (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
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
  WHERE ((e.id = event_bring_items.event) AND (gum."user" = ( SELECT auth.uid() AS uid))))));



  create policy "ebp_delete_self_or_manager"
  on "public"."event_bring_pledges"
  as permissive
  for delete
  to authenticated
using (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = ( SELECT auth.uid() AS uid)))))));



  create policy "ebp_insert_self"
  on "public"."event_bring_pledges"
  as permissive
  for insert
  to authenticated
with check ((("user" = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (gum."user" = ( SELECT auth.uid() AS uid)) AND (e.items_enabled IS TRUE))))));



  create policy "ebp_select_member"
  on "public"."event_bring_pledges"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = ( SELECT auth.uid() AS uid))))));



  create policy "ebp_update_self_or_manager"
  on "public"."event_bring_pledges"
  as permissive
  for update
  to authenticated
using (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = ( SELECT auth.uid() AS uid)))))))
with check (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((public.event_bring_items bi
     JOIN public.events e ON ((e.id = bi.event)))
     JOIN public.group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = ( SELECT auth.uid() AS uid)))))));



  create policy "Allow update with event.comment permission on own comment"
  on "public"."event_comments"
  as permissive
  for update
  to public
using ((( SELECT public.authorize('event.comment'::text) AS authorize) AND ("user" = ( SELECT auth.uid() AS uid))))
with check (true);



  create policy "Select events for user in group"
  on "public"."events"
  as permissive
  for select
  to authenticated
using ((( SELECT events."group") IN ( SELECT group_user_mapping."group"
   FROM public.group_user_mapping
  WHERE ((group_user_mapping."user" = ( SELECT auth.uid() AS uid)) AND ((group_user_mapping.role = 'user'::public."GroupRole") OR (group_user_mapping.role = 'admin'::public."GroupRole"))))));



  create policy "events_delete_with_perm"
  on "public"."events"
  as permissive
  for delete
  to authenticated
using ((public.authorize('event.delete'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = ( SELECT auth.uid() AS uid)))))));



  create policy "events_insert_with_perm"
  on "public"."events"
  as permissive
  for insert
  to authenticated
with check ((public.authorize('event.create'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = ( SELECT auth.uid() AS uid)))))));



  create policy "events_select_group_member"
  on "public"."events"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = ( SELECT auth.uid() AS uid))))));



  create policy "events_update_with_perm"
  on "public"."events"
  as permissive
  for update
  to authenticated
using ((public.authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = ( SELECT auth.uid() AS uid)))))))
with check ((public.authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM public.group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = ( SELECT auth.uid() AS uid)))))));



  create policy "gum_select_self"
  on "public"."group_user_mapping"
  as permissive
  for select
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)));



  create policy "item_history_insert_if_member"
  on "public"."item_history"
  as permissive
  for insert
  to authenticated
with check ((( SELECT i."group"
   FROM public.items i
  WHERE (i.id = item_history.key)) IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid)))));



  create policy "item_history_select_if_member"
  on "public"."item_history"
  as permissive
  for select
  to authenticated
using ((( SELECT i."group"
   FROM public.items i
  WHERE (i.id = item_history.key)) IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid)))));



  create policy "items_select_if_member"
  on "public"."items"
  as permissive
  for select
  to authenticated
using (("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid)))));



  create policy "items_update_holder_if_member"
  on "public"."items"
  as permissive
  for update
  to authenticated
using (("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid)))))
with check (("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid)))));



  create policy "user_activity_all_self"
  on "public"."user_activity"
  as permissive
  for all
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)))
with check (("user" = ( SELECT auth.uid() AS uid)));



  create policy "udg_self_read"
  on "public"."user_direct_grants"
  as permissive
  for select
  to authenticated
using (("user" = ( SELECT auth.uid() AS uid)));

CREATE OR REPLACE FUNCTION public.is_group_public_joinable(p_group uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET "search_path" TO 'public', 'pg_temp'
AS $function$begin
return (SELECT EXISTS (SELECT 1
   FROM event_group eg
  WHERE eg.id = p_group AND eg.is_public AND NOT eg.need_request_to_join));
  end;$function$
;


  create policy "Insert as user when group is public and needs no joni request"
  on "public"."group_user_mapping"
  as permissive
  for insert
  to authenticated
with check (((role = 'user'::public."GroupRole") AND public.is_group_public_joinable("group")));



  create policy "Insert when user requests to join"
  on "public"."group_user_mapping"
  as permissive
  for insert
  to authenticated
with check (((role = 'joinRequested'::public."GroupRole") AND public.is_group_public_joinable("group")));



  create policy "gum_insert_self_public_open"
  on "public"."group_user_mapping"
  as permissive
  for insert
  to authenticated
with check ((("user" = ( SELECT auth.uid() AS uid)) AND (role = 'user'::public."GroupRole") AND public.is_group_public_joinable("group")));


create or replace view public.user_grants_view with(security_invoker = on) as
select distinct
  on ("user", kind, key, tenant) "user",
  kind,
  key,
  tenant,
  granted_by
from
  (
    select
      udg."user",
      udg.kind,
      udg.key,
      udg.tenant,
      'direct'::text as granted_by
    from
      user_direct_grants udg
    where
      udg."user" = auth.uid ()
    union all
    select
      gum."user",
      'perm'::grant_kind as kind,
      gp.permission as key,
      '00000000-0000-0000-0000-000000000000'::uuid as tenant,
      'group'::text as granted_by
    from
      group_user_mapping gum
      join group_permissions gp on gp."group" = gum."group"
    where
      gum.role is not null
      and gum.role <> 'joinRequested'::"GroupRole"
      and gum."user" = auth.uid ()
    union all
    select
      gum."user",
      'feat'::grant_kind as kind,
      gf.feature as key,
      '00000000-0000-0000-0000-000000000000'::uuid as tenant,
      'group'::text as granted_by
    from
      group_user_mapping gum
      join group_features gf on gf."group" = gum."group"
    where
      gum.role is not null
      and gum.role <> 'joinRequested'::"GroupRole"
      and gum."user" = auth.uid ()
  ) s
order by
  "user",
  kind,
  key,
  tenant,
  (
    case granted_by
      when 'direct'::text then 0
      else 1
    end
  );