alter table "games"."elo_calc_log" add column "ka_a1_used" numeric;

alter table "games"."elo_calc_log" add column "ka_a2_used" numeric;

alter table "games"."elo_calc_log" add column "ka_b1_used" numeric;

alter table "games"."elo_calc_log" add column "ka_b2_used" numeric;

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

CREATE OR REPLACE FUNCTION games.apply_elo_for_match(p_match uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'games', 'public', 'pg_catalog'
AS $function$

DECLARE
    rec record;
    outcome_a numeric;
    calc games.elo_calculation_result;
    hist record;

    v_cat_a text; v_cat_b text;
    v_eff_a numeric; v_eff_b numeric;
    v_sets_a int; v_sets_b int;
    v_pts_a int; v_pts_b int;
    v_total_sets int; 
    v_cfg record;
BEGIN
    -- 1. Konfiguration laden
    SELECT * INTO v_cfg FROM games.elo_config WHERE id = 1;
    
    -- 2. Match- & Spielerdaten laden (KA, RG und Effektive Ratings)
    SELECT m.team_a, m.team_b, m.rated,
           p_a1.ka_index as r_a1, p_a1.rg_index as rg_a1, p_a1.matches_played as m_a1, p_a1.effective_rating_cached as eff_a1,
           p_a2.ka_index as r_a2, p_a2.rg_index as rg_a2, p_a2.matches_played as m_a2, p_a2.effective_rating_cached as eff_a2,
           p_b1.ka_index as r_b1, p_b1.rg_index as rg_b1, p_b1.matches_played as m_b1, p_b1.effective_rating_cached as eff_b1,
           p_b2.ka_index as r_b2, p_b2.rg_index as rg_b2, p_b2.matches_played as m_b2, p_b2.effective_rating_cached as eff_b2,
           ta.player_1 as p_a1_id, ta.player_2 as p_a2_id, tb.player_1 as p_b1_id, tb.player_2 as p_b2_id
    INTO rec FROM games.match m 
    JOIN games.teams ta ON m.team_a = ta.id JOIN games.teams tb ON m.team_b = tb.id
    JOIN games.players p_a1 ON ta.player_1 = p_a1.player JOIN games.players p_a2 ON ta.player_2 = p_a2.player
    JOIN games.players p_b1 ON tb.player_1 = p_b1.player JOIN games.players p_b2 ON tb.player_2 = p_b2.player
    WHERE m.id = p_match FOR UPDATE;

    -- 3. Idempotenz (Rollback alter Werte)
    FOR hist IN SELECT * FROM games.elo_history WHERE match = p_match LOOP
        UPDATE games.players SET ka_index = ka_index - hist.delta, matches_played = matches_played - 1 WHERE player = hist."user";
    END LOOP;
    DELETE FROM games.elo_history WHERE match = p_match;

    -- 4. Statistiken & Race-Condition Check
    SELECT 
        COALESCE(count(*) FILTER (WHERE team_a_score > team_b_score), 0),
        COALESCE(count(*) FILTER (WHERE team_b_score > team_a_score), 0),
        COALESCE(sum(team_a_score), 0),
        COALESCE(sum(team_b_score), 0),
        count(*) 
    INTO v_sets_a, v_sets_b, v_pts_a, v_pts_b, v_total_sets
    FROM games.sets WHERE match = p_match;

    IF v_total_sets = 0 THEN RETURN; END IF;

    outcome_a := CASE 
        WHEN v_sets_a > v_sets_b THEN 1.0
        WHEN v_sets_b > v_sets_a THEN 0.0
        ELSE (CASE WHEN v_pts_a > v_pts_b THEN 1.0 WHEN v_pts_b > v_pts_a THEN 0.0 ELSE 0.5 END)
    END;

    -- 5. Physik & Team-Werte berechnen
    calc := games.calculate_match_physics(rec.eff_a1, rec.eff_a2, rec.eff_b1, rec.eff_b2, rec.m_a1, rec.m_a2, rec.m_b1, rec.m_b2, outcome_a, rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id);
    v_cat_a := games.team_category(rec.p_a1_id, rec.p_a2_id);
    v_cat_b := games.team_category(rec.p_b1_id, rec.p_b2_id);
    v_eff_a := ((rec.eff_a1 + rec.eff_a2)/2.0) + games.category_offset(v_cat_a);
    v_eff_b := ((rec.eff_b1 + rec.eff_b2)/2.0) + games.category_offset(v_cat_b);

    IF NOT COALESCE(rec.rated, true) THEN RETURN; END IF;

    -- 6. Erweitertes Logging (KA und RG Snapshots)
    INSERT INTO games.elo_calc_log(
        match, calculated_at, eff_team_a, eff_team_b, expected_a, expected_b,
        k_base, k_eff, category_a, category_b,
        upset_levels, upset_multiplier,
        outcome_a, sets_a, sets_b, points_a, points_b,
        a1_user, a2_user, b1_user, b2_user, 
        rg_a1_used, rg_a2_used, rg_b1_used, rg_b2_used,
        ka_a1_used, ka_a2_used, ka_b1_used, ka_b2_used, -- NEUE SPALTEN
        cfg_snapshot
    )
    VALUES (
        p_match, now(), v_eff_a, v_eff_b, calc.exp_a, 1.0 - calc.exp_a,
        v_cfg.k_factor, (v_cfg.k_factor * calc.global_conf), v_cat_a, v_cat_b, 0, 1.0,
        outcome_a, v_sets_a, v_sets_b, v_pts_a, v_pts_b,
        rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id, 
        rec.rg_a1, rec.rg_a2, rec.rg_b1, rec.rg_b2,
        rec.r_a1, rec.r_a2, rec.r_b1, rec.r_b2, -- KA-Werte (r_a1 etc.)
        jsonb_build_object('w_rg', v_cfg.w_rg, 'w_ka', v_cfg.w_ka, 'rg_offset', v_cfg.rg_offset, 'rg_scale', v_cfg.rg_scale, 'k_factor', v_cfg.k_factor)
    )
    ON CONFLICT (match) DO UPDATE SET
        calculated_at = excluded.calculated_at, 
        eff_team_a = excluded.eff_team_a, eff_team_b = excluded.eff_team_b,
        expected_a = excluded.expected_a, expected_b = excluded.expected_b,
        outcome_a = excluded.outcome_a, sets_a = excluded.sets_a, sets_b = excluded.sets_b,
        points_a = excluded.points_a, points_b = excluded.points_b,
        -- KA-Werte im Update-Fall nur setzen wenn nicht vorhanden (Snapshot-Prinzip)
        ka_a1_used = COALESCE(games.elo_calc_log.ka_a1_used, excluded.ka_a1_used),
        ka_a2_used = COALESCE(games.elo_calc_log.ka_a2_used, excluded.ka_a2_used),
        ka_b1_used = COALESCE(games.elo_calc_log.ka_b1_used, excluded.ka_b1_used),
        ka_b2_used = COALESCE(games.elo_calc_log.ka_b2_used, excluded.ka_b2_used);

    -- 7. Spieler & History Updates
    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a1 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a1_id;
    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a2 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a2_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b1 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b1_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b2 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b2_id;

    INSERT INTO games.elo_history(match, "user", old_rating, new_rating, delta, eff_old_rating, eff_new_rating)
    VALUES 
        (p_match, rec.p_a1_id, rec.r_a1, rec.r_a1 + calc.base_delta, calc.base_delta, rec.eff_a1, rec.eff_a1 + calc.final_sync_delta),
        (p_match, rec.p_a2_id, rec.r_a2, rec.r_a2 + calc.base_delta, calc.base_delta, rec.eff_a2, rec.eff_a2 + calc.final_sync_delta),
        (p_match, rec.p_b1_id, rec.r_b1, rec.r_b1 - calc.base_delta, -calc.base_delta, rec.eff_b1, rec.eff_b1 - calc.final_sync_delta),
        (p_match, rec.p_b2_id, rec.r_b2, rec.r_b2 - calc.base_delta, -calc.base_delta, rec.eff_b2, rec.eff_b2 - calc.final_sync_delta);
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

CREATE OR REPLACE FUNCTION games.calculate_match_physics(p_eff_a1 numeric, p_eff_a2 numeric, p_eff_b1 numeric, p_eff_b2 numeric, p_m_count_a1 integer, p_m_count_a2 integer, p_m_count_b1 integer, p_m_count_b2 integer, p_outcome_a numeric, p_p1_id uuid, p_p2_id uuid, p_p3_id uuid, p_p4_id uuid)
 RETURNS games.elo_calculation_result
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'games', 'public', 'pg_catalog'
AS $function$

DECLARE
    cfg record;
    cat_a text; cat_b text;
    eff_team_a numeric; eff_team_b numeric;
    res games.elo_calculation_result;
BEGIN
    SELECT k_factor INTO cfg FROM games.elo_config WHERE id=1;

    res.global_conf := (games.get_confidence_level(p_m_count_a1) + 
                        games.get_confidence_level(p_m_count_a2) + 
                        games.get_confidence_level(p_m_count_b1) + 
                        games.get_confidence_level(p_m_count_b2)) / 4.0;

    cat_a := games.team_category(p_p1_id, p_p2_id);
    cat_b := games.team_category(p_p3_id, p_p4_id);
    
    eff_team_a := ((p_eff_a1 + p_eff_a2)/2.0) + games.category_offset(cat_a);
    eff_team_b := ((p_eff_b1 + p_eff_b2)/2.0) + games.category_offset(cat_b);
    
    res.exp_a := 1.0 / (1.0 + POWER(10.0, (eff_team_b - eff_team_a)/400.0));
    res.v_outcome_a := p_outcome_a;
    
    res.base_delta := cfg.k_factor * (res.v_outcome_a - res.exp_a);
    res.final_sync_delta := res.base_delta * res.global_conf;

    IF res.v_outcome_a = 1.0 AND res.final_sync_delta < 1.0 THEN 
        res.final_sync_delta := 1.0; 
    ELSIF res.v_outcome_a = 0.0 AND res.final_sync_delta > -1.0 THEN 
        res.final_sync_delta := -1.0; 
    END IF;

    RETURN res;
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

CREATE OR REPLACE FUNCTION games.get_confidence_level(p_matches_played integer)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'games', 'public', 'pg_catalog'
AS $function$
DECLARE
    v_start_confidence numeric := 0.20;
    v_full_confidence_at int := 20;
    v_conf numeric;
BEGIN
    IF p_matches_played >= v_full_confidence_at THEN
        RETURN 1.0;
    END IF;
    v_conf := v_start_confidence + 
              (p_matches_played::numeric / v_full_confidence_at::numeric) * (1.0 - v_start_confidence);
    RETURN LEAST(1.0, GREATEST(v_start_confidence, v_conf));
END;
$function$
;

CREATE OR REPLACE FUNCTION games.predict_elo_for_match(p_match_id uuid, p_simulated_outcome numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'games', 'public', 'pg_catalog'
AS $function$

DECLARE
    rec record;
    v_out numeric;
    calc games.elo_calculation_result;
BEGIN
    SELECT 
        p_a1.matches_played as m_a1, p_a2.matches_played as m_a2,
        p_a1.effective_rating_cached as eff_a1, p_a2.effective_rating_cached as eff_a2,
        p_b1.matches_played as m_b1, p_b2.matches_played as m_b2,
        p_b1.effective_rating_cached as eff_b1, p_b2.effective_rating_cached as eff_b2,
        ta.player_1 as p_a1_id, ta.player_2 as p_a2_id,
        tb.player_1 as p_b1_id, tb.player_2 as p_b2_id
    INTO rec
    FROM games.match m
    JOIN games.teams ta ON m.team_a = ta.id JOIN games.teams tb ON m.team_b = tb.id
    JOIN games.players p_a1 ON ta.player_1 = p_a1.player JOIN games.players p_a2 ON ta.player_2 = p_a2.player
    JOIN games.players p_b1 ON tb.player_1 = p_b1.player JOIN games.players p_b2 ON tb.player_2 = p_b2.player
    WHERE m.id = p_match_id;

    IF p_simulated_outcome IS NOT NULL THEN
        v_out := p_simulated_outcome;
    ELSE
        SELECT CASE 
            WHEN (SELECT count(*) FROM games.sets WHERE match = p_match_id AND team_a_score > team_b_score) > 
                 (SELECT count(*) FROM games.sets WHERE match = p_match_id AND team_b_score > team_a_score) THEN 1.0
            WHEN (SELECT count(*) FROM games.sets WHERE match = p_match_id AND team_b_score > team_a_score) > 
                 (SELECT count(*) FROM games.sets WHERE match = p_match_id AND team_a_score > team_b_score) THEN 0.0
            ELSE 0.5 END INTO v_out;
    END IF;

    calc := games.calculate_match_physics(rec.eff_a1, rec.eff_a2, rec.eff_b1, rec.eff_b2, rec.m_a1, rec.m_a2, rec.m_b1, rec.m_b2, v_out, rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id);

    RETURN jsonb_build_object(
        'outcome', v_out,
        'points_change', round(calc.final_sync_delta, 2),
        'confidence', round(calc.global_conf, 2),
        'expected_win_prob', round(calc.exp_a, 2)
    );
END;$function$
;

CREATE OR REPLACE FUNCTION games.recompute_all_elo_from_scratch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE 
  rec RECORD;
BEGIN
  -- 1. Alles auf Startzustand setzen
  UPDATE games.players SET 
    ka_index = 1000, 
    matches_played = 0, 
    effective_rating_cached = games.calculate_effective_rating(ka_index, rg_index, 0);
    
  DELETE FROM games.elo_history;
  DELETE FROM games.elo_calc_log;

  -- 2. Matches chronologisch durchlaufen
  FOR rec IN SELECT id FROM games.match ORDER BY created_at ASC LOOP
    PERFORM games.apply_elo_for_match(rec.id);
  END LOOP;
END;$function$
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