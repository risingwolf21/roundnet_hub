drop policy "admin_all" on "games"."elo_calc_log";

drop policy "admin_all" on "games"."elo_config";

drop policy "admin_all" on "games"."elo_history";

drop policy "admin_all" on "games"."match";

drop policy "admin_all" on "games"."players";

drop policy "admin_all" on "games"."sets";

drop policy "admin_all" on "games"."teams";

drop policy "admin_all" on "public"."challenge";

drop policy "admin_all" on "public"."challenge_stats";

drop policy "admin_all" on "public"."drink";

drop policy "admin_all" on "public"."event_attendance_user_mapping";

drop policy "admin_all" on "public"."event_bring_items";

drop policy "admin_all" on "public"."event_bring_pledges";

drop policy "admin_all" on "public"."event_comments";

drop policy "admin_all" on "public"."event_group";

drop policy "admin_all" on "public"."events";

drop policy "admin_all" on "public"."features";

drop policy "admin_all" on "public"."group_features";

drop policy "admin_all" on "public"."group_permissions";

drop policy "Insert as admin if no other user in group" on "public"."group_user_mapping";

drop policy "Insert as user when group is public and needs no joni request" on "public"."group_user_mapping";

drop policy "Update group user mapping when admin of group" on "public"."group_user_mapping";

drop policy "admin_all" on "public"."group_user_mapping";

drop policy "gum_insert_self_public_open" on "public"."group_user_mapping";

drop policy "admin_all" on "public"."history";

drop policy "admin_all" on "public"."item_history";

drop policy "admin_all" on "public"."items";

drop policy "admin_all" on "public"."notification_outbox";

drop policy "admin_all" on "public"."notification_outbox_targets";

drop policy "admin_all" on "public"."notification_retention";

drop policy "admin_all" on "public"."notification_topics";

drop policy "admin_all" on "public"."notifications";

drop policy "admin_all" on "public"."object_subscriptions";

drop policy "admin_all" on "public"."payments";

drop policy "admin_all" on "public"."permissions";

drop policy "admin_all" on "public"."user";

drop policy "admin_all" on "public"."user_activity";

drop policy "admin_all" on "public"."user_direct_grants";

drop policy "admin_all" on "public"."user_grants";

drop policy "admin_all" on "public"."user_notification_preferences";

drop policy "admin_all" on "public"."vouchers";

drop policy "admin_all" on "public"."web_push_subscriptions";

drop policy if exists "admin_all" on "audit"."log";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.group_has_no_members(p_group uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.group_user_mapping gum
    WHERE gum."group" = p_group
  );
$function$
;

create policy "Insert as admin if no other user in group"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check (((role = 'admin'::"GroupRole") AND group_has_no_members("group")));


create policy "Insert as user when group is public and needs no joni request"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check (((role = 'user'::"GroupRole") AND (EXISTS ( SELECT 1
   FROM event_group
  WHERE ((event_group.id = group_user_mapping."group") AND (NOT event_group.need_request_to_join) AND event_group.is_public)))));


create policy "Update group user mapping when admin of group"
on "public"."group_user_mapping"
as permissive
for update
to public
using (is_user_admin_in_group("group"))
with check (is_user_admin_in_group("group"));

create policy "gum_insert_self_public_open"
on "public"."group_user_mapping"
as permissive
for insert
to authenticated
with check ((("user" = (auth.uid())::text) AND (role = 'user'::"GroupRole") AND (EXISTS ( SELECT 1
   FROM event_group eg
  WHERE ((eg.id = group_user_mapping."group") AND eg.is_public AND (NOT eg.need_request_to_join))))));


create schema if not exists "util";

GRANT USAGE ON SCHEMA "util" TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA "util" TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA "util" TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA "util" TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA "util" GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA "util" GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA "util" GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION util.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
  declare
    claims jsonb;
    permissions text[];
    features text[];
  begin

    Select array(select distinct gp.permission from group_user_mapping gum join group_permissions gp on gp."group" = gum."group" where gum."user" = (select auth.uid() as uid)::text and gum.role <> 'joinRequested'::"GroupRole") into permissions;

    Select array(select distinct gf.feature from group_user_mapping gum join group_features gf on gf."group" = gum."group" where gum."user" = (select auth.uid() as uid)::text and gum.role <> 'joinRequested'::"GroupRole") into features;

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
  end;
$function$
;

CREATE OR REPLACE FUNCTION util.jwt_claims()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
$function$
;

CREATE OR REPLACE FUNCTION util.jwt_has_permission(p_perm text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(COALESCE(util.jwt_claims()->'permissions','[]'::jsonb)) AS t(perm)
    WHERE perm = p_perm
  );
$function$
;


CREATE OR REPLACE FUNCTION games.add_match_with_sets(team_a text, player_1a text, player_1a_rating numeric, player_2a text, player_2a_rating numeric, team_b text, player_1b text, player_1b_rating numeric, player_2b text, player_2b_rating numeric, match_sets json, event uuid DEFAULT NULL::uuid, created_by text DEFAULT NULL::text, rated boolean DEFAULT true)
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

  -- Caller muss Teilnehmer sein (mind. in einem Team) oder die Berechtigung haben
  IF (NOT (Select public.authorize('event.create.constellations'))) THEN
    IF auth.uid()::text NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
      RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen';
    END IF;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1a) THEN
    INSERT INTO games.players(player, ka_index) VALUES (player_1a, player_1a_rating);
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2a) THEN
    INSERT INTO games.players(player, ka_index) VALUES (player_2a, player_2a_rating);
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1b) THEN
    INSERT INTO games.players(player, ka_index) VALUES (player_1b, player_1b_rating);
  END IF;

  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2b) THEN
    INSERT INTO games.players(player, ka_index) VALUES (player_2b, player_2b_rating);
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
END;
$function$
;
