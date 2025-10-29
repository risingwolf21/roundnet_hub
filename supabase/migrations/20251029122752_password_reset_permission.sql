set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(team_a text, player_1a text, player_1a_rating numeric, player_2a text, player_2a_rating numeric, team_b text, player_1b text, player_1b_rating numeric, player_2b text, player_2b_rating numeric, match_sets json, event uuid DEFAULT NULL::uuid, created_by text DEFAULT NULL::text, rated boolean DEFAULT true)
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
END;$function$
;

INSERT INTO
  public.permissions (name, description)
VALUES
  (
    'reset_user_password',
    'Passwörter von Nutzern zurücksetzen. Benötigt ebenfalls user.role="admin"'
  ) ON CONFLICT DO NOTHING;
