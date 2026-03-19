drop policy "Enable read access for all users" on "games"."elo_config";

drop policy "match_insert_participant_or_admin" on "games"."match";

drop policy "match_select_participant_or_admin" on "games"."match";

drop policy "Allow authorized delete access" on "games"."players";

drop policy "Allow authorized insert access" on "games"."players";

drop policy "Allow authorized select access" on "games"."players";

drop policy "Enable select with event.create.constellations permission" on "games"."players";

drop policy "players_self_select" on "games"."players";

drop policy "Allow select when game is public" on "games"."sets";

drop policy "sets_insert_if_participant_or_admin" on "games"."sets";

drop policy "sets_select_if_participant_or_admin" on "games"."sets";

drop policy "sets_select_public_or_participant" on "games"."sets";

drop policy "Allow delete when userid in team" on "games"."teams";

drop policy "teams_select_if_member" on "games"."teams";

drop policy "elo_calc_log_select_if_participant" on "games"."elo_calc_log";

drop policy "el_history_if_participant" on "games"."elo_history";

drop function if exists "games"."add_match_with_sets"(team_a text, player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, team_b text, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid, created_by uuid, rated boolean, player_names json);

drop view if exists "games"."user_matches";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(team_a text, player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, team_b text, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid DEFAULT NULL::uuid, created_by uuid DEFAULT NULL::uuid, is_public boolean DEFAULT true, rated boolean DEFAULT true, player_names json DEFAULT '{}'::json)
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

  -- 1. AUTH CHECK
  -- Wir erlauben das Erstellen, wenn der User autorisiert ist ODER selbst mitspielt.
  -- Hinweis: Wenn player_1a ein neuer Gast ist (UUID generiert im Frontend), 
  -- wird auth.uid() != player_1a sein. Das ist okay, solange der Ersteller einer der anderen ist.
  IF (NOT (Select public.authorize('event.create.constellations'))) THEN
    IF auth.uid() NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
      RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen oder autorisiert sein';
    END IF;
  END IF;

  -- 2. PLAYER INITIALIZATION (Inklusive Gast-Namen)
  -- Wir nutzen eine Hilfsschleife oder machen es explizit für alle 4:
  
  -- Player 1A
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1a) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_1a::text, '');
    BEGIN
      INSERT INTO games.players (
        player, 
        ka_index, 
        display_name, 
        matches_played, 
        effective_rating_cached
      ) VALUES (
        player_1a, 
        player_1a_rating, 
        v_name,
        0, 
        games.calculate_effective_rating(player_1a_rating, NULL, 0)
    );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_1a;
    END;
  END IF;

  -- Player 2A
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2a) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_2a::text, '');
    BEGIN
      INSERT INTO games.players (
        player, 
        ka_index, 
        display_name, 
        matches_played, 
        effective_rating_cached
      ) VALUES (
        player_2a, 
        player_2a_rating, 
        v_name,
        0, 
        games.calculate_effective_rating(player_2a_rating, NULL, 0)
    );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_2a;
    END;
  END IF;

  -- Player 1B
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1b) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_1b::text, '');
    BEGIN
      INSERT INTO games.players (
        player, 
        ka_index, 
        display_name, 
        matches_played, 
        effective_rating_cached
      ) VALUES (
        player_1b, 
        player_1b_rating, 
        v_name,
        0, 
        games.calculate_effective_rating(player_1b_rating, NULL, 0)
    );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_1b;
    END;
  END IF;

  -- Player 2B
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2b) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_2b::text, '');
    BEGIN
      INSERT INTO games.players (
        player, 
        ka_index, 
        display_name, 
        matches_played, 
        effective_rating_cached
      ) VALUES (
        player_2b, 
        player_2b_rating, 
        v_name,
        0, 
        games.calculate_effective_rating(player_2b_rating, NULL, 0)
    );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_2b;
    END;
  END IF;

  -- 3. TEAM HANDLING (Normalisierung zur Vermeidung von Dubletten)
  team_a_norm := CASE WHEN player_1a < player_2a THEN player_1a||','||player_2a ELSE player_2a||','||player_1a END;
  INSERT INTO games.teams (player_1, player_2, name, normalized_players)
  VALUES (player_1a, player_2a, team_a, team_a_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_a_id FROM games.teams WHERE normalized_players = team_a_norm;

  team_b_norm := CASE WHEN player_1b < player_2b THEN player_1b||','||player_2b ELSE player_2b||','||player_1b END;
  INSERT INTO games.teams (player_1, player_2, name, normalized_players)
  VALUES (player_1b, player_2b, team_b, team_b_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_b_id FROM games.teams WHERE normalized_players = team_b_norm;

  -- 4. MATCH CREATION
  INSERT INTO games.match (team_a, team_b, event, created_by, rated, is_public)
  VALUES (team_a_id, team_b_id, event, COALESCE(created_by, auth.uid()), rated, is_public)
  RETURNING id INTO match_id;

  -- 5. SETS HANDLING
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

CREATE OR REPLACE FUNCTION games.is_match_public_or_match_member(p_match uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE 
  v_is_member boolean;
  v_is_public boolean;
BEGIN
  -- 1. Direkte Zuweisung des Skalarwerts aus der Funktion
  v_is_member := games.is_match_participant(p_match);
  
  -- 2. Auslesen der Match-Eigenschaft (LIMIT 1 ist unnötig, wenn ID der Primary Key ist)
  SELECT is_public INTO v_is_public 
  FROM games.match 
  WHERE id = p_match;

  -- 3. COALESCE nutzen, um NULL-Werte abzufangen (z.B. wenn die Match-ID nicht existiert)
  RETURN COALESCE(v_is_member, false) OR COALESCE(v_is_public, false);
END;
$function$
;

create or replace view "games"."user_matches" as  WITH match_stats AS (
         SELECT s.match,
            count(*) FILTER (WHERE (s.team_a_score > s.team_b_score)) AS sets_won_a,
            count(*) FILTER (WHERE (s.team_b_score > s.team_a_score)) AS sets_won_b,
            string_agg(((s.team_a_score || ':'::text) || s.team_b_score), ', '::text ORDER BY s.created_at) AS scores_list
           FROM games.sets s
          GROUP BY s.match
        )
 SELECT m.id AS match_id,
    m.created_at,
    m.event,
    m.rated,
    m.is_public,
    m.team_a AS team_a_id,
    t_a.name AS team_a_name,
    t_a.player_1 AS team_a_p1,
    t_a.player_2 AS team_a_p2,
    m.team_b AS team_b_id,
    t_b.name AS team_b_name,
    t_b.player_1 AS team_b_p1,
    t_b.player_2 AS team_b_p2,
    COALESCE(ms.scores_list, ''::text) AS set_scores,
    COALESCE(ms.sets_won_a, (0)::bigint) AS sets_won_a,
    COALESCE(ms.sets_won_b, (0)::bigint) AS sets_won_b,
    COALESCE(round((el.k_eff * (el.outcome_a - el.expected_a)), 2), (0)::numeric) AS elo_change_a,
    COALESCE(round((el.k_eff * (((1)::numeric - el.outcome_a) - el.expected_b)), 2), (0)::numeric) AS elo_change_b,
        CASE
            WHEN (ms.sets_won_a > ms.sets_won_b) THEN 'team_a'::text
            WHEN (ms.sets_won_b > ms.sets_won_a) THEN 'team_b'::text
            WHEN ((ms.sets_won_a = ms.sets_won_b) AND (ms.match IS NOT NULL)) THEN 'draw'::text
            ELSE 'undetermined'::text
        END AS winner_side,
        CASE
            WHEN (ms.sets_won_a > ms.sets_won_b) THEN m.team_a
            WHEN (ms.sets_won_b > ms.sets_won_a) THEN m.team_b
            ELSE NULL::uuid
        END AS winner_team_id
   FROM ((((games.match m
     JOIN games.teams t_a ON ((m.team_a = t_a.id)))
     JOIN games.teams t_b ON ((m.team_b = t_b.id)))
     LEFT JOIN match_stats ms ON ((ms.match = m.id)))
     LEFT JOIN games.elo_calc_log el ON ((el.match = m.id)));

grant select on "games"."user_matches" to authenticated;

  create policy "match_select_if_public_or_member"
  on "games"."match"
  as permissive
  for select
  to authenticated
using ((games.is_match_public_or_match_member(id) OR public.authorize('games.admin'::text)));



  create policy "players_select_all"
  on "games"."players"
  as permissive
  for select
  to authenticated
using (true);



  create policy "sets_select_public_or_member"
  on "games"."sets"
  as permissive
  for select
  to authenticated
using (( SELECT games.is_match_public_or_match_member(sets.match) AS is_match_public_or_match_member));



  create policy "elo_calc_log_select_if_participant"
  on "games"."elo_calc_log"
  as permissive
  for select
  to authenticated
using (( SELECT games.is_match_public_or_match_member(elo_calc_log.match) AS result));



  create policy "el_history_if_participant"
  on "games"."elo_history"
  as permissive
  for select
  to authenticated
using (( SELECT games.is_match_public_or_match_member(elo_history.match) AS result));



