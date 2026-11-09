drop policy "Allow authorized update access" on "games"."players";

drop policy "Enable select for authenticated users only" on "games"."players";

drop policy "teams_insert_all" on "games"."teams";

drop policy "teams_select_self_or_public" on "games"."teams";

drop policy "teams_update_self_or_perm" on "games"."teams";

drop policy "Allow select when match is public" on "games"."teams";

drop function if exists "games"."add_match_with_sets"(player_1a text, player_2a text, player_1b text, player_2b text, team_a text, team_b text, match_sets json, event uuid);

drop function if exists "games"."add_match_with_sets"(player_1a text, player_2a text, player_1b text, player_2b text, team_a text, team_b text, match_sets json, event uuid, created_by text, rated boolean);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(team_a text, player_1a text, player_2a text, team_b text, player_1b text, player_2b text, match_sets json, event uuid DEFAULT NULL::uuid, created_by text DEFAULT NULL::text, rated boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
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

  -- Caller muss Teilnehmer sein (mind. in einem Team)
  IF auth.uid()::text NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
    RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen';
  END IF;

  -- Team A
  team_a_norm := CASE WHEN player_1a < player_2a THEN player_1a||','||player_2a ELSE player_2a||','||player_1a END;
  INSERT INTO games.teams (player_1, player_2, name, normalized_players)
  VALUES (player_1a, player_2a, team_a, team_a_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_a_id FROM games.teams WHERE normalized_players = team_a_norm;

  -- Team B
  team_b_norm := CASE WHEN player_1b < player_2b THEN player_1b||','||player_2b ELSE player_2b||','||player_1b END;
  INSERT INTO games.teams (player_1, player_2, name, normalized_players)
  VALUES (player_1b, player_2b, team_b, team_b_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_b_id FROM games.teams WHERE normalized_players = team_b_norm;

  -- Match
  INSERT INTO games.match (team_a, team_b, event, created_by, rated)
  VALUES (team_a_id, team_b_id, event, created_by, rated)
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
END;
$function$
;

CREATE OR REPLACE FUNCTION games.is_member_of_match(p_team_a uuid, p_team_b uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'games', 'public'
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM games.teams t
    WHERE t.id IN (p_team_a, p_team_b)
      AND auth.uid()::text IN (t.player_1, t.player_2)
  );
$function$
;

CREATE OR REPLACE FUNCTION games.is_member_of_teams(p_team_a uuid, p_team_b uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'games', 'public'
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM games.teams t
    WHERE (t.id = p_team_a OR t.id = p_team_b)
      AND auth.uid()::text IN (t.player_1, t.player_2)
  );
$function$
;

create policy "match_delete_participant_or_admin"
on "games"."match"
as permissive
for delete
to authenticated
using ((games.is_member_of_teams(team_a, team_b) OR authorize('games.admin'::text)));


create policy "match_insert_participant_or_admin"
on "games"."match"
as permissive
for insert
to authenticated
with check ((games.is_member_of_teams(team_a, team_b) OR authorize('games.admin'::text)));


create policy "match_select_participant_or_admin"
on "games"."match"
as permissive
for select
to authenticated
using ((games.is_member_of_teams(team_a, team_b) OR authorize('games.admin'::text)));


create policy "match_update_participant_or_admin"
on "games"."match"
as permissive
for update
to authenticated
using ((games.is_member_of_teams(team_a, team_b) OR authorize('games.admin'::text)))
with check ((games.is_member_of_teams(team_a, team_b) OR authorize('games.admin'::text)));


create policy "sets_delete_if_participant_or_admin"
on "games"."sets"
as permissive
for delete
to authenticated
using ((games.is_match_participant(match) OR authorize('games.admin'::text)));


create policy "sets_insert_if_participant_or_admin"
on "games"."sets"
as permissive
for insert
to authenticated
with check ((games.is_match_participant(match) OR authorize('games.admin'::text)));


create policy "sets_select_if_participant_or_admin"
on "games"."sets"
as permissive
for select
to authenticated
using ((games.is_match_participant(match) OR authorize('games.admin'::text)));


create policy "sets_update_if_participant_or_admin"
on "games"."sets"
as permissive
for update
to authenticated
using ((games.is_match_participant(match) OR authorize('games.admin'::text)))
with check ((games.is_match_participant(match) OR authorize('games.admin'::text)));


create policy "teams_insert_if_member"
on "games"."teams"
as permissive
for insert
to authenticated
with check ((((auth.uid())::text = player_1) OR ((auth.uid())::text = player_2) OR authorize('games.manage'::text)));


create policy "teams_select_admin"
on "games"."teams"
as permissive
for select
to authenticated
using (authorize('games.admin'::text));


create policy "teams_select_if_in_user_match"
on "games"."teams"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM games.match m
  WHERE (((m.team_a = teams.id) OR (m.team_b = teams.id)) AND games.is_member_of_teams(m.team_a, m.team_b)))));


create policy "teams_select_if_member"
on "games"."teams"
as permissive
for select
to authenticated
using ((((auth.uid())::text = player_1) OR ((auth.uid())::text = player_2)));


create policy "teams_update_if_member"
on "games"."teams"
as permissive
for update
to authenticated
using ((((auth.uid())::text = player_1) OR ((auth.uid())::text = player_2) OR authorize('games.manage'::text)))
with check ((((auth.uid())::text = player_1) OR ((auth.uid())::text = player_2) OR authorize('games.manage'::text)));


create policy "Allow select when match is public"
on "games"."teams"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM games.match m
  WHERE (((m.team_a = teams.id) OR (m.team_b = teams.id)) AND m.is_public))));


drop policy "bring_items_select_if_group_and_enabled" on "public"."event_bring_items";

drop policy "bring_items_write_if_group_admin_or_role" on "public"."event_bring_items";

drop policy "bring_pledges_delete_owner_or_admin" on "public"."event_bring_pledges";

drop policy "bring_pledges_delete_owner_or_editors" on "public"."event_bring_pledges";

drop policy "bring_pledges_insert_member_enabled" on "public"."event_bring_pledges";

drop policy "bring_pledges_insert_self" on "public"."event_bring_pledges";

drop policy "bring_pledges_select_if_group_and_enabled" on "public"."event_bring_pledges";

drop policy "bring_pledges_update_owner_or_editors" on "public"."event_bring_pledges";

drop policy "Allow delete with items.manage permission" on "public"."items";

drop policy "Allow insert with items.manage permission and group" on "public"."items";

drop policy "Allow update with items.manage permission and in group" on "public"."items";

drop policy "Select when user is in group of item" on "public"."items";

drop policy "Insert as admin if no other user in group" on "public"."group_user_mapping";

drop policy "Insert as user when group is public and needs no joni request" on "public"."group_user_mapping";

drop policy "Insert users when user is admin in group" on "public"."group_user_mapping";

drop policy "Insert when user requests to join" on "public"."group_user_mapping";

revoke delete on table "public"."item_history" from "authenticated";

revoke update on table "public"."item_history" from "authenticated";

revoke delete on table "public"."items" from "authenticated";

revoke insert on table "public"."items" from "authenticated";

revoke update on table "public"."items" from "authenticated";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.edit_item(p_id bigint, p_name text DEFAULT NULL::text, p_color text DEFAULT NULL::text, p_type "ItemType" DEFAULT NULL::"ItemType")
 RETURNS items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.items;
BEGIN
  IF NOT public.authorize('items.manage') THEN
    RAISE EXCEPTION 'missing permission items.manage (user=%)', auth.uid()::text
      USING ERRCODE='42501';
  END IF;

  UPDATE public.items
  SET name         = COALESCE(p_name,  name),
      color        = COALESCE(p_color, color),
      type         = COALESCE(p_type,  type),
      "lastUpdate" = now()
  WHERE id = p_id
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item % not found', p_id
      USING ERRCODE='23503';
  END IF;

  RETURN r;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.key_handover(p_key_id bigint, p_new_holder text)
 RETURNS TABLE(key_id bigint, holder text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  v_old   text;
  v_group uuid;
BEGIN
  -- Item laden & sperren
  SELECT i."current_holder", i."group"
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
      AND gum."user"  = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'not in group for item %', p_key_id
      USING ERRCODE = '42501',
            DETAIL   = format('actor=%s group=%s', auth.uid()::text, v_group::text),
            HINT     = 'membership in group required';
  END IF;

  -- Ziel-User existiert?
  PERFORM 1 FROM public."user" u WHERE u."userId" = p_new_holder;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'new holder % not found', p_new_holder
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s', p_key_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_user_mapping gum
    WHERE gum."group" = v_group
      AND gum."user"  = p_new_holder
  ) THEN
    RAISE EXCEPTION 'new holder % not in group', p_new_holder
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s', p_key_id);
  END IF;

  -- Nur aktualisieren, wenn sich der Halter wirklich ändert
  IF v_old IS DISTINCT FROM p_new_holder THEN
    UPDATE public.items i
       SET "current_holder" = p_new_holder,
           "lastUpdate"     = now()
     WHERE i.id = p_key_id;
    -- dein bestehender Trigger auf UPDATE OF current_holder schreibt item_history
  END IF;

  RETURN QUERY
  SELECT i.id, i."current_holder"::text
  FROM public.items i
  WHERE i.id = p_key_id;
END;$function$
;

CREATE OR REPLACE FUNCTION public.trg_items_guard_columns()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT public.authorize('items.manage') THEN
    -- erlaubte Änderungen für Nicht-Manager: ausschließlich current_holder
    IF (NEW.name  IS DISTINCT FROM OLD.name)
       OR (NEW.color IS DISTINCT FROM OLD.color)
       OR (NEW.type  IS DISTINCT FROM OLD.type)
       OR (NEW."group" IS DISTINCT FROM OLD."group")
    THEN
      RAISE EXCEPTION 'only current_holder can be updated by non-managers';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_items_handover_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$BEGIN
  IF TG_OP = 'UPDATE' AND NEW.current_holder IS DISTINCT FROM OLD.current_holder THEN
    INSERT INTO public.item_history("pastUser", "currentUser", key)
    VALUES (OLD.current_holder, NEW.current_holder, NEW.id);
  END IF;
  RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

create policy "items_select_member"
on "public"."event_bring_items"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_items.event) AND (gum."user" = (auth.uid())::text)))));


create policy "items_write_edit_or_manage"
on "public"."event_bring_items"
as permissive
for all
to authenticated
using ((authorize('event.edit'::text) OR authorize('items.manage'::text)))
with check ((authorize('event.edit'::text) OR authorize('items.manage'::text)));


create policy "ebp_delete_self_or_manager"
on "public"."event_bring_pledges"
as permissive
for delete
to authenticated
using ((((user_id = (auth.uid())::text) OR authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((event_bring_items bi
     JOIN events e ON ((e.id = bi.event)))
     JOIN group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = (auth.uid())::text))))));


create policy "ebp_insert_self"
on "public"."event_bring_pledges"
as permissive
for insert
to authenticated
with check (((user_id = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM ((event_bring_items bi
     JOIN events e ON ((e.id = bi.event)))
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (gum."user" = (auth.uid())::text) AND (e.items_enabled IS TRUE))))));


create policy "ebp_select_member"
on "public"."event_bring_pledges"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM ((event_bring_items bi
     JOIN events e ON ((e.id = bi.event)))
     JOIN group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = (auth.uid())::text)))));


create policy "ebp_update_self_or_manager"
on "public"."event_bring_pledges"
as permissive
for update
to authenticated
using ((((user_id = (auth.uid())::text) OR authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((event_bring_items bi
     JOIN events e ON ((e.id = bi.event)))
     JOIN group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = (auth.uid())::text))))))
with check ((((user_id = (auth.uid())::text) OR authorize('event.edit'::text)) AND (EXISTS ( SELECT 1
   FROM ((event_bring_items bi
     JOIN events e ON ((e.id = bi.event)))
     JOIN group_user_mapping g ON ((g."group" = e."group")))
  WHERE ((bi.id = event_bring_pledges.item) AND (g."user" = (auth.uid())::text))))));


create policy "gum_insert_self_public_open"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check ((("user" = (auth.uid())::text) AND (role = 'user'::"GroupRole") AND (EXISTS ( SELECT 1
   FROM event_group eg
  WHERE ((eg.id = group_user_mapping."group") AND (eg.is_public = true) AND (eg.need_request_to_join = false))))));


create policy "gum_select_self"
on "public"."group_user_mapping"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));


create policy "item_history_insert_if_member"
on "public"."item_history"
as permissive
for insert
to authenticated
with check ((( SELECT i."group"
   FROM items i
  WHERE (i.id = item_history.key)) IN ( SELECT gum."group"
   FROM group_user_mapping gum
  WHERE (gum."user" = (auth.uid())::text))));


create policy "item_history_select_if_member"
on "public"."item_history"
as permissive
for select
to authenticated
using ((( SELECT i."group"
   FROM items i
  WHERE (i.id = item_history.key)) IN ( SELECT gum."group"
   FROM group_user_mapping gum
  WHERE (gum."user" = (auth.uid())::text))));


create policy "items_select_if_member"
on "public"."items"
as permissive
for select
to authenticated
using (("group" IN ( SELECT gum."group"
   FROM group_user_mapping gum
  WHERE (gum."user" = (auth.uid())::text))));


create policy "items_update_holder_if_member"
on "public"."items"
as permissive
for update
to authenticated
using (("group" IN ( SELECT gum."group"
   FROM group_user_mapping gum
  WHERE (gum."user" = (auth.uid())::text))))
with check (("group" IN ( SELECT gum."group"
   FROM group_user_mapping gum
  WHERE (gum."user" = (auth.uid())::text))));


create policy "items_update_manage"
on "public"."items"
as permissive
for update
to authenticated
using (authorize('items.manage'::text))
with check (authorize('items.manage'::text));


create policy "Insert as admin if no other user in group"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check (((role = 'admin'::"GroupRole") AND (NOT (EXISTS ( SELECT 1
   FROM group_user_mapping gum
  WHERE (gum."group" = group_user_mapping."group"))))));


create policy "Insert as user when group is public and needs no joni request"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check (((role = 'user'::"GroupRole") AND (EXISTS ( SELECT 1
   FROM event_group
  WHERE ((event_group.id = group_user_mapping."group") AND (event_group.need_request_to_join = false) AND event_group.is_public))) AND (NOT (EXISTS ( SELECT 1
   FROM group_user_mapping gum
  WHERE ((gum."user" = (( SELECT auth.uid() AS uid))::text) AND (gum."group" = group_user_mapping."group")))))));


create policy "Insert users when user is admin in group"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check (((role = 'user'::"GroupRole") AND is_user_admin_in_group("group")));


create policy "Insert when user requests to join"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check ((role = 'joinRequested'::"GroupRole"));


CREATE TRIGGER t_guard_items_columns BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION trg_items_guard_columns();

CREATE TRIGGER trg_items_handover_log BEFORE UPDATE OF current_holder ON public.items FOR EACH ROW EXECUTE FUNCTION trg_items_handover_log();

GRANT SELECT ON games.user_matches TO authenticated;
