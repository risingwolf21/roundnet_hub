create extension if not exists "pgtap" with schema "extensions";


drop policy "match_select_if_participant" on "games"."sets";

drop policy "teams_update_all" on "games"."teams";

revoke delete on table "games"."match" from "anon";

revoke insert on table "games"."match" from "anon";

revoke select on table "games"."match" from "anon";

revoke update on table "games"."match" from "anon";

revoke delete on table "games"."players" from "anon";

revoke insert on table "games"."players" from "anon";

revoke update on table "games"."players" from "anon";

revoke delete on table "games"."sets" from "anon";

revoke insert on table "games"."sets" from "anon";

revoke select on table "games"."sets" from "anon";

revoke update on table "games"."sets" from "anon";

revoke delete on table "games"."teams" from "anon";

revoke insert on table "games"."teams" from "anon";

revoke select on table "games"."teams" from "anon";

revoke update on table "games"."teams" from "anon";

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
  WHERE ((m.id = sets.match) AND (((((auth.uid())::text = ta.player_1) OR ((auth.uid())::text = ta.player_2)) OR ((auth.uid())::text = tb.player_1)) OR ((auth.uid())::text = tb.player_2)))))));


create policy "teams_update_self_or_perm"
on "games"."teams"
as permissive
for update
to authenticated
using (((((auth.uid())::text = player_1) OR ((auth.uid())::text = player_2)) OR authorize('games.teams.manage'::text)))
with check (((((auth.uid())::text = player_1) OR ((auth.uid())::text = player_2)) OR authorize('games.teams.manage'::text)));



drop policy "Allow select for all users" on "public"."event_attendance_user_mapping";

drop policy "Enable delete for users based on user_id" on "public"."event_attendance_user_mapping";

drop policy "Insert when user in group for given event" on "public"."event_attendance_user_mapping";

drop policy "Update attendance for given event when user is in group" on "public"."event_attendance_user_mapping";

drop policy "bring_pledges_update_delete_owner_or_admin" on "public"."event_bring_pledges";

drop policy "Allow delete with event.delete permission" on "public"."events";

revoke delete on table "public"."challenge" from "anon";

revoke insert on table "public"."challenge" from "anon";

revoke references on table "public"."challenge" from "anon";

revoke select on table "public"."challenge" from "anon";

revoke trigger on table "public"."challenge" from "anon";

revoke truncate on table "public"."challenge" from "anon";

revoke update on table "public"."challenge" from "anon";

revoke delete on table "public"."challenge_stats" from "anon";

revoke insert on table "public"."challenge_stats" from "anon";

revoke references on table "public"."challenge_stats" from "anon";

revoke select on table "public"."challenge_stats" from "anon";

revoke trigger on table "public"."challenge_stats" from "anon";

revoke truncate on table "public"."challenge_stats" from "anon";

revoke update on table "public"."challenge_stats" from "anon";

revoke delete on table "public"."drink" from "anon";

revoke insert on table "public"."drink" from "anon";

revoke references on table "public"."drink" from "anon";

revoke select on table "public"."drink" from "anon";

revoke trigger on table "public"."drink" from "anon";

revoke truncate on table "public"."drink" from "anon";

revoke update on table "public"."drink" from "anon";

revoke delete on table "public"."event_attendance_user_mapping" from "anon";

revoke insert on table "public"."event_attendance_user_mapping" from "anon";

revoke references on table "public"."event_attendance_user_mapping" from "anon";

revoke select on table "public"."event_attendance_user_mapping" from "anon";

revoke trigger on table "public"."event_attendance_user_mapping" from "anon";

revoke truncate on table "public"."event_attendance_user_mapping" from "anon";

revoke update on table "public"."event_attendance_user_mapping" from "anon";

revoke delete on table "public"."event_bring_items" from "anon";

revoke insert on table "public"."event_bring_items" from "anon";

revoke references on table "public"."event_bring_items" from "anon";

revoke select on table "public"."event_bring_items" from "anon";

revoke trigger on table "public"."event_bring_items" from "anon";

revoke truncate on table "public"."event_bring_items" from "anon";

revoke update on table "public"."event_bring_items" from "anon";

revoke delete on table "public"."event_bring_pledges" from "anon";

revoke insert on table "public"."event_bring_pledges" from "anon";

revoke references on table "public"."event_bring_pledges" from "anon";

revoke select on table "public"."event_bring_pledges" from "anon";

revoke trigger on table "public"."event_bring_pledges" from "anon";

revoke truncate on table "public"."event_bring_pledges" from "anon";

revoke update on table "public"."event_bring_pledges" from "anon";

revoke delete on table "public"."event_comments" from "anon";

revoke insert on table "public"."event_comments" from "anon";

revoke references on table "public"."event_comments" from "anon";

revoke select on table "public"."event_comments" from "anon";

revoke trigger on table "public"."event_comments" from "anon";

revoke truncate on table "public"."event_comments" from "anon";

revoke update on table "public"."event_comments" from "anon";

revoke delete on table "public"."event_group" from "anon";

revoke insert on table "public"."event_group" from "anon";

revoke references on table "public"."event_group" from "anon";

revoke select on table "public"."event_group" from "anon";

revoke trigger on table "public"."event_group" from "anon";

revoke truncate on table "public"."event_group" from "anon";

revoke update on table "public"."event_group" from "anon";

revoke delete on table "public"."events" from "anon";

revoke insert on table "public"."events" from "anon";

revoke references on table "public"."events" from "anon";

revoke select on table "public"."events" from "anon";

revoke trigger on table "public"."events" from "anon";

revoke truncate on table "public"."events" from "anon";

revoke update on table "public"."events" from "anon";

revoke delete on table "public"."features" from "anon";

revoke insert on table "public"."features" from "anon";

revoke references on table "public"."features" from "anon";

revoke select on table "public"."features" from "anon";

revoke trigger on table "public"."features" from "anon";

revoke truncate on table "public"."features" from "anon";

revoke update on table "public"."features" from "anon";

revoke delete on table "public"."features" from "authenticated";

revoke insert on table "public"."features" from "authenticated";

revoke references on table "public"."features" from "authenticated";

revoke select on table "public"."features" from "authenticated";

revoke trigger on table "public"."features" from "authenticated";

revoke truncate on table "public"."features" from "authenticated";

revoke update on table "public"."features" from "authenticated";

revoke delete on table "public"."group_features" from "anon";

revoke insert on table "public"."group_features" from "anon";

revoke references on table "public"."group_features" from "anon";

revoke select on table "public"."group_features" from "anon";

revoke trigger on table "public"."group_features" from "anon";

revoke truncate on table "public"."group_features" from "anon";

revoke update on table "public"."group_features" from "anon";

revoke delete on table "public"."group_permissions" from "anon";

revoke insert on table "public"."group_permissions" from "anon";

revoke references on table "public"."group_permissions" from "anon";

revoke select on table "public"."group_permissions" from "anon";

revoke trigger on table "public"."group_permissions" from "anon";

revoke truncate on table "public"."group_permissions" from "anon";

revoke update on table "public"."group_permissions" from "anon";

revoke delete on table "public"."group_user_mapping" from "anon";

revoke insert on table "public"."group_user_mapping" from "anon";

revoke references on table "public"."group_user_mapping" from "anon";

revoke select on table "public"."group_user_mapping" from "anon";

revoke trigger on table "public"."group_user_mapping" from "anon";

revoke truncate on table "public"."group_user_mapping" from "anon";

revoke update on table "public"."group_user_mapping" from "anon";

revoke delete on table "public"."history" from "anon";

revoke insert on table "public"."history" from "anon";

revoke references on table "public"."history" from "anon";

revoke select on table "public"."history" from "anon";

revoke trigger on table "public"."history" from "anon";

revoke truncate on table "public"."history" from "anon";

revoke update on table "public"."history" from "anon";

revoke delete on table "public"."item_history" from "anon";

revoke insert on table "public"."item_history" from "anon";

revoke references on table "public"."item_history" from "anon";

revoke select on table "public"."item_history" from "anon";

revoke trigger on table "public"."item_history" from "anon";

revoke truncate on table "public"."item_history" from "anon";

revoke update on table "public"."item_history" from "anon";

revoke delete on table "public"."items" from "anon";

revoke insert on table "public"."items" from "anon";

revoke references on table "public"."items" from "anon";

revoke select on table "public"."items" from "anon";

revoke trigger on table "public"."items" from "anon";

revoke truncate on table "public"."items" from "anon";

revoke update on table "public"."items" from "anon";

revoke delete on table "public"."notification_token" from "anon";

revoke insert on table "public"."notification_token" from "anon";

revoke references on table "public"."notification_token" from "anon";

revoke select on table "public"."notification_token" from "anon";

revoke trigger on table "public"."notification_token" from "anon";

revoke truncate on table "public"."notification_token" from "anon";

revoke update on table "public"."notification_token" from "anon";

revoke delete on table "public"."notifications" from "anon";

revoke insert on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke select on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."payments" from "anon";

revoke insert on table "public"."payments" from "anon";

revoke references on table "public"."payments" from "anon";

revoke select on table "public"."payments" from "anon";

revoke trigger on table "public"."payments" from "anon";

revoke truncate on table "public"."payments" from "anon";

revoke update on table "public"."payments" from "anon";

revoke delete on table "public"."permissions" from "anon";

revoke insert on table "public"."permissions" from "anon";

revoke references on table "public"."permissions" from "anon";

revoke select on table "public"."permissions" from "anon";

revoke trigger on table "public"."permissions" from "anon";

revoke truncate on table "public"."permissions" from "anon";

revoke update on table "public"."permissions" from "anon";

revoke delete on table "public"."permissions" from "authenticated";

revoke insert on table "public"."permissions" from "authenticated";

revoke references on table "public"."permissions" from "authenticated";

revoke select on table "public"."permissions" from "authenticated";

revoke trigger on table "public"."permissions" from "authenticated";

revoke truncate on table "public"."permissions" from "authenticated";

revoke update on table "public"."permissions" from "authenticated";

revoke delete on table "public"."user" from "anon";

revoke insert on table "public"."user" from "anon";

revoke references on table "public"."user" from "anon";

revoke select on table "public"."user" from "anon";

revoke trigger on table "public"."user" from "anon";

revoke truncate on table "public"."user" from "anon";

revoke update on table "public"."user" from "anon";

revoke delete on table "public"."user_calendar_event_mapping" from "anon";

revoke insert on table "public"."user_calendar_event_mapping" from "anon";

revoke references on table "public"."user_calendar_event_mapping" from "anon";

revoke select on table "public"."user_calendar_event_mapping" from "anon";

revoke trigger on table "public"."user_calendar_event_mapping" from "anon";

revoke truncate on table "public"."user_calendar_event_mapping" from "anon";

revoke update on table "public"."user_calendar_event_mapping" from "anon";

revoke delete on table "public"."user_calender_settings" from "anon";

revoke insert on table "public"."user_calender_settings" from "anon";

revoke references on table "public"."user_calender_settings" from "anon";

revoke select on table "public"."user_calender_settings" from "anon";

revoke trigger on table "public"."user_calender_settings" from "anon";

revoke truncate on table "public"."user_calender_settings" from "anon";

revoke update on table "public"."user_calender_settings" from "anon";

revoke delete on table "public"."user_notification_settings" from "anon";

revoke insert on table "public"."user_notification_settings" from "anon";

revoke references on table "public"."user_notification_settings" from "anon";

revoke select on table "public"."user_notification_settings" from "anon";

revoke trigger on table "public"."user_notification_settings" from "anon";

revoke truncate on table "public"."user_notification_settings" from "anon";

revoke update on table "public"."user_notification_settings" from "anon";

revoke delete on table "public"."vouchers" from "anon";

revoke insert on table "public"."vouchers" from "anon";

revoke references on table "public"."vouchers" from "anon";

revoke select on table "public"."vouchers" from "anon";

revoke trigger on table "public"."vouchers" from "anon";

revoke truncate on table "public"."vouchers" from "anon";

revoke update on table "public"."vouchers" from "anon";

drop function if exists "public"."update_attendance"(eventid uuid, userid text, state "EventAttendance");

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.as_service()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM set_config('role','service_role', true);
  -- service_role hat keine sub-Claim – setzen wir leer
  PERFORM set_config('request.jwt.claims','{}', true);
END $function$
;

CREATE OR REPLACE FUNCTION public.update_attendance(p_event uuid, p_user text, p_state "EventAttendance")
 RETURNS SETOF event_attendance_user_mapping
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_member   boolean;
  v_event_open  boolean;
  v_max         numeric;
  v_accepted    bigint;
  v_final_state public."EventAttendance";
BEGIN
  -- 1) Actor muss Mitglied der Event-Gruppe sein
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = auth.uid()::text
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
  IF p_user <> auth.uid()::text AND NOT public.authorize('event.attendance.manage') THEN
    RAISE EXCEPTION 'forbidden: cannot update other user''s attendance' USING ERRCODE = '42501';
  END IF;

  -- 4) Kapazität (Accepted zählt)
  SELECT e."maxAttendees" INTO v_max FROM public.events e WHERE e.id = p_event;

  SELECT COUNT(*)::bigint
  INTO v_accepted
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'Attending';  -- ggf. an Enum-Werte anpassen

  -- 5) Ziel-State bestimmen
  IF p_state = 'Declined' THEN
    v_final_state := 'Declined';

  ELSIF v_max IS NOT NULL AND v_accepted >= v_max THEN
    -- Kapazität voll -> auf Waiting (außer Declined)
    v_final_state := 'Waiting';

  ELSE
    v_final_state := p_state;
  END IF;

  -- 6) Upsert (RLS prüft zusätzlich INSERT/UPDATE-Policies)
  RETURN QUERY
  INSERT INTO public.event_attendance_user_mapping("user","event","state")
  VALUES (p_user, p_event, v_final_state)
  ON CONFLICT ("user","event") DO UPDATE
  SET state = EXCLUDED.state
  RETURNING *;
END;
$function$
;

create policy "attendance_delete_self_or_manager"
on "public"."event_attendance_user_mapping"
as permissive
for delete
to authenticated
using (((("user" = (auth.uid())::text) OR authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = (auth.uid())::text))))));


create policy "attendance_insert_self_or_manager"
on "public"."event_attendance_user_mapping"
as permissive
for insert
to authenticated
with check (((("user" = (auth.uid())::text) OR authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = (auth.uid())::text)))) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))));


create policy "attendance_select_member"
on "public"."event_attendance_user_mapping"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = (auth.uid())::text)))));


create policy "attendance_update_self_or_manager"
on "public"."event_attendance_user_mapping"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = (auth.uid())::text)))))
with check (((("user" = (auth.uid())::text) OR authorize('event.attendance.manage'::text)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))));


 

create policy "bring_pledges_delete_owner_or_editors"
on "public"."event_bring_pledges"
as permissive
for delete
to authenticated
using (((user_id = (auth.uid())::text) OR (authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_pledges.event) AND (gum."user" = (auth.uid())::text)))))));


create policy "bring_pledges_insert_member_enabled"
on "public"."event_bring_pledges"
as permissive
for insert
to authenticated
with check (((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_pledges.event) AND (gum."user" = (auth.uid())::text) AND (e.items_enabled = true)))) AND (user_id = (auth.uid())::text)));


create policy "bring_pledges_update_owner_or_editors"
on "public"."event_bring_pledges"
as permissive
for update
to authenticated
using (((user_id = (auth.uid())::text) OR (authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_pledges.event) AND (gum."user" = (auth.uid())::text)))))))
with check (true);


create policy "events_delete_with_perm"
on "public"."events"
as permissive
for delete
to authenticated
using ((authorize('event.delete'::text) AND (EXISTS ( SELECT 1
   FROM group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = (auth.uid())::text))))));


create policy "events_insert_with_perm"
on "public"."events"
as permissive
for insert
to authenticated
with check ((authorize('event.create'::text) AND (EXISTS ( SELECT 1
   FROM group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = (auth.uid())::text))))));


create policy "events_select_group_member"
on "public"."events"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = (auth.uid())::text)))));


create policy "events_update_with_perm"
on "public"."events"
as permissive
for update
to authenticated
using ((authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = (auth.uid())::text))))))
with check ((authorize('event.edit'::text) AND (EXISTS ( SELECT 1
   FROM group_user_mapping gum
  WHERE ((gum."group" = events."group") AND (gum."user" = (auth.uid())::text))))));

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name    text;
  v_display text;
BEGIN
  -- Aus Metadata sinnvolle Werte ziehen, mit Fallbacks
  v_name    := COALESCE(
                 NEW.raw_user_meta_data->>'name',
                 NEW.raw_user_meta_data->>'displayName'
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
END;
$$;

-- Sauber (re)deployen: alten Trigger weg, neuen anlegen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();