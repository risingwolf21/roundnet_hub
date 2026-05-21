drop trigger if exists "trg_on_elo_config_recompute" on "games"."elo_config";

drop function if exists "games"."recompute_all_effective_player_ratings"();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(team_a text, player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, team_b text, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid DEFAULT NULL::uuid, created_by uuid DEFAULT NULL::uuid, rated boolean DEFAULT true, player_names json DEFAULT '{}'::json)
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
  INSERT INTO games.match (team_a, team_b, event, created_by, rated)
  VALUES (team_a_id, team_b_id, event, COALESCE(created_by, auth.uid()), rated)
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

CREATE OR REPLACE FUNCTION games.calculate_effective_rating(ka numeric, rg numeric, m_count integer DEFAULT 0)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_rg_offset numeric;
  v_rg_scale  numeric;
  v_rg_normalized numeric;
  v_weight_ka numeric;
  v_dampening numeric;
BEGIN
  -- 1. FALL: SPIELER HAT RG-INDEX
  IF rg IS NOT NULL AND rg > 0 THEN
    SELECT rg_offset, rg_scale INTO STRICT v_rg_offset, v_rg_scale FROM games.elo_config WHERE id = 1;
    v_rg_normalized := v_rg_offset + (rg * v_rg_scale);
    
    -- Dynamische Gewichtung: Startet bei 15% KA, geht hoch auf 50% KA nach 20 Spielen
    v_weight_ka := LEAST(0.5, 0.15 + (m_count * 0.02)); 
    RETURN (v_rg_normalized * (1 - v_weight_ka)) + (ka * v_weight_ka);
  END IF;

  -- 2. FALL: GAST / KEIN RG
  -- Dämpfung: Bei 0 Spielen zählt KA nur zu 50%, Rest ist 1000. Nach 10 Spielen 100% KA.
  v_dampening := LEAST(1.0, 0.5 + (m_count * 0.05));
  RETURN (ka * v_dampening) + (1000 * (1 - v_dampening));
END;
$function$
;

CREATE OR REPLACE FUNCTION games.determine_k_factor(m_count integer, base_k numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
BEGIN
  RETURN CASE 
    WHEN m_count < 10 THEN base_k * 2.0  -- Neue Spieler: Doppelte Volatilität (z.B. 64)
    WHEN m_count < 30 THEN base_k * 1.5  -- Mittlere Erfahrung (z.B. 48)
    ELSE base_k                          -- Etablierte Spieler (z.B. 32)
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_analytics_attendance_ranking(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(user_name text, attendance_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u."name" as user_name,
    COUNT(*) as attendance_count
  FROM public.event_attendance_user_mapping ea
  JOIN public.events e ON e.id = ea.event
  JOIN public."user" u ON u.id = ea."user"
  WHERE 
    e."startingDateTime" BETWEEN p_start AND p_end
    AND ea.state IN ('Attending', 'AttendingAsTrainer')
    AND e."isCancelled" IS FALSE
  GROUP BY u.id, u.name
  ORDER BY attendance_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_analytics_drinks_ranking(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(user_name text, drinks_count bigint, total_spend numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.name as user_name,
    COUNT(*) as drinks_count,
    SUM(pt.amount) as total_spend -- Falls 'amount' der Preis ist
  FROM public.history pt -- BITTE PRÜFEN: Name deiner Transaktions-Tabelle
  JOIN public."user" u ON u.id = pt."user"
  WHERE 
    pt.created_at BETWEEN p_start AND p_end
  GROUP BY u.name
  ORDER BY drinks_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_challenge_zero_points_candidates(p_challenge_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(user_name text, attendance_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
BEGIN
  -- 1. Gruppe der Challenge ermitteln
  SELECT "group" INTO v_group_id
  FROM public.challenge
  WHERE id = p_challenge_id;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  RETURN QUERY
  WITH group_members AS (
    -- Alle Mitglieder der Gruppe holen
    SELECT gum."user"
    FROM public.group_user_mapping gum
    WHERE gum."group" = v_group_id
  ),
  user_points AS (
    -- Punkte pro User in dieser Challenge berechnen
    SELECT 
      cs."user", 
      SUM(cs.count) as total_points
    FROM public.challenge_stats cs
    WHERE cs.challenge = p_challenge_id
    GROUP BY cs."user"
  ),
  zero_point_users AS (
    -- Nur User behalten, die NULL (keine Einträge) oder 0 Punkte haben
    SELECT gm."user"
    FROM group_members gm
    LEFT JOIN user_points up ON gm."user" = up."user"
    WHERE COALESCE(up.total_points, 0) = 0
  )
  -- Ergebnis zusammenbauen mit Attendance Count
  SELECT 
    u.name as user_name,
    (
      -- Subquery für die Anzahl der Trainings
      SELECT COUNT(*)
      FROM public.event_attendance_user_mapping ea
      JOIN public.events e ON e.id = ea.event
      WHERE ea."user" = zp."user"
        -- Nur relevante Status zählen (Anwesend oder Trainer)
        AND ea.state IN ('Attending', 'AttendingAsTrainer')
        -- Zeitraum prüfen
        AND e."startingDateTime" >= p_start
        AND e."startingDateTime" <= p_end
        -- Nur wenn Event nicht abgesagt ist
        AND e."isCancelled" IS FALSE
    ) as attendance_count
  FROM zero_point_users zp
  JOIN public."user" u ON u.id = zp."user"
  ORDER BY attendance_count DESC, user_name ASC;

END;
$function$
;


