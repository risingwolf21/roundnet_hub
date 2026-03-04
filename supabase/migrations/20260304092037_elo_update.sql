-- Löscht pgTAP aus dem extensions-Schema
DROP EXTENSION IF EXISTS "pgtap" CASCADE;

-- Löscht die Basejump Test-Helper aus dem public-Schema
DROP EXTENSION IF EXISTS "basejump-supabase_test_helpers" CASCADE;

-- Löscht supabase-dbdev aus dem public-Schema
DROP EXTENSION IF EXISTS "supabase-dbdev" CASCADE;

drop trigger if exists "trg_players_set_effective_cached" on "games"."players";

drop function if exists "games"."compute_effective_player_from_values"(ka numeric, rg numeric);

alter table "games"."players" add column "matches_played" integer default 0;

alter table "games"."players" add constraint "players_linked_user_id_fkey1" FOREIGN KEY (linked_user_id) REFERENCES public."user"(id) ON DELETE SET NULL not valid;

alter table "games"."players" validate constraint "players_linked_user_id_fkey1";

set check_function_bodies = off;

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

create or replace view "games"."leaderboard" with (security_invoker = on) as  SELECT p.player AS player_id,
    COALESCE(u."displayName", p.display_name, 'Unbekannter Spieler'::text) AS name,
    p.effective_rating_cached AS rating,
    p.matches_played,
    rank() OVER (ORDER BY p.effective_rating_cached DESC) AS "position",
    LEAST(100, (p.matches_played * 10)) AS confidence_level,
        CASE
            WHEN (p.matches_played < 5) THEN 'Provisional'::text
            WHEN ((p.matches_played >= 5) AND (p.matches_played < 20)) THEN 'Active'::text
            ELSE 'Veteran'::text
        END AS activity_status
   FROM (games.players p
     LEFT JOIN public."user" u ON ((p.linked_user_id = u.id)))
  WHERE (p.matches_played > 0)
  ORDER BY p.effective_rating_cached DESC;


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
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
  cfg record;
  v_rated boolean;
  m_team_a uuid; m_team_b uuid;
  a1 uuid; a2 uuid; b1 uuid; b2 uuid;

  -- aktuelle KA-Indizes (nur fürs Logging)
  m_count_a1 int; m_count_a2 int; m_count_b1 int; m_count_b2 int;
  k_a1 numeric; k_a2 numeric; k_b1 numeric; k_b2 numeric;
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

  SELECT t.player_1, t.player_2 INTO a1, a2 FROM games.teams t WHERE t.id = m_team_a;
  SELECT t.player_1, t.player_2 INTO b1, b2 FROM games.teams t WHERE t.id = m_team_b;

  -- idempotent: Deltas zurückrollen & löschen
  FOR hist IN SELECT * FROM games.elo_history WHERE match=p_match LOOP
    UPDATE games.players SET ka_index = ka_index - hist.delta WHERE player = hist."user";
  END LOOP;
  DELETE FROM games.elo_history WHERE match=p_match;

  IF a1 IS NULL OR a2 IS NULL OR b1 IS NULL OR b2 IS NULL THEN
    RAISE NOTICE 'Skipping ELO: missing players for match %, %, %, %', a1, a2, b1, b2;
    RETURN;
  END IF;

  INSERT INTO games.players (player) VALUES (a1) ON CONFLICT (player) DO NOTHING;
  INSERT INTO games.players (player) VALUES (a2) ON CONFLICT (player) DO NOTHING;
  INSERT INTO games.players (player) VALUES (b1) ON CONFLICT (player) DO NOTHING;
  INSERT INTO games.players (player) VALUES (b2) ON CONFLICT (player) DO NOTHING;

  SELECT COALESCE(ka_index, 1000), COALESCE(matches_played, 0), rg_index 
  INTO r_a1, m_count_a1, rg_a1 FROM games.players WHERE player = a1;

  SELECT COALESCE(ka_index, 1000), COALESCE(matches_played, 0), rg_index 
  INTO r_a2, m_count_a2, rg_a2 FROM games.players WHERE player = a2;

  SELECT COALESCE(ka_index, 1000), COALESCE(matches_played, 0), rg_index 
  INTO r_b1, m_count_b1, rg_b1 FROM games.players WHERE player = b1;

  SELECT COALESCE(ka_index, 1000), COALESCE(matches_played, 0), rg_index 
  INTO r_b2, m_count_b2, rg_b2 FROM games.players WHERE player = b2;

  -- 2. EFFEKTIVE RATINGS BERECHNEN (Nutzt jetzt die neue Logik inkl. m_count)
  eff_a1_old := games.calculate_effective_rating(r_a1, rg_a1, m_count_a1);
  eff_a2_old := games.calculate_effective_rating(r_a2, rg_a2, m_count_a2);
  eff_b1_old := games.calculate_effective_rating(r_b1, rg_b1, m_count_b1);
  eff_b2_old := games.calculate_effective_rating(r_b2, rg_b2, m_count_b2);

  -- 3. DYNAMISCHEN K-FAKTOR BESTIMMEN
  k_a1 := games.determine_k_factor(m_count_a1, cfg.k_factor);
  k_a2 := games.determine_k_factor(m_count_a2, cfg.k_factor);
  k_b1 := games.determine_k_factor(m_count_b1, cfg.k_factor);
  k_b2 := games.determine_k_factor(m_count_b2, cfg.k_factor);

  -- Der effektive K-Faktor für das Match ist der Durchschnitt aller Beteiligten
  -- So "lernen" Gäste schneller, während Profis stabil bleiben
  k_eff := (k_a1 + k_a2 + k_b1 + k_b2) / 4.0;

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

  -- Effektive Teamratings inkl. Kategorie
  eff_a := COALESCE((eff_a1_old + eff_a2_old)/2.0, 1000.0) + games.category_offset(cat_a);
  eff_b := COALESCE((eff_b1_old + eff_b2_old)/2.0, 1000.0) + games.category_offset(cat_b);

  -- Erwartung mit Kategorie-Offsets
  exp_a := 1.0 / (1.0 + POWER(10.0, (eff_b - eff_a)/400.0));

  -- Optionaler Upset-Bonus, wenn "schwächerer" Kategorie-Rang gewinnt
  if (rank_a < rank_b and outcome_a = 1.0) then
    k_eff := k_eff * (1 + cfg.upset_bonus_per_level * (rank_b - rank_a));
  elsif (rank_b < rank_a and outcome_a = 0.0) then
    k_eff := k_eff * (1 + cfg.upset_bonus_per_level * (rank_a - rank_b));
  end if;

  delta := k_eff * (outcome_a - exp_a);

  -- 4. NEW EFFECTIVE RATINGS (Logging/History)
  -- Wichtig: Hier m_count + 1 nutzen, da das Spiel ja gerade zählt!
  eff_a1_new := games.calculate_effective_rating(r_a1 + delta, rg_a1, m_count_a1 + 1);
  eff_a2_new := games.calculate_effective_rating(r_a2 + delta, rg_a2, m_count_a2 + 1);
  eff_b1_new := games.calculate_effective_rating(r_b1 - delta, rg_b1, m_count_b1 + 1);
  eff_b2_new := games.calculate_effective_rating(r_b2 - delta, rg_b2, m_count_b2 + 1);

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
  UPDATE games.players SET 
    ka_index = ka_index + delta,
    effective_rating_cached = eff_a1_new,
    matches_played = matches_played + 1 
  WHERE player = a1;

  UPDATE games.players SET 
    ka_index = ka_index + delta,
    effective_rating_cached = eff_a2_new,
    matches_played = matches_played + 1 
  WHERE player = a2;

  UPDATE games.players SET 
    ka_index = ka_index + delta,
    effective_rating_cached = eff_b1_new,
    matches_played = matches_played + 1 
  WHERE player = b1;

  UPDATE games.players SET 
    ka_index = ka_index + delta,
    effective_rating_cached = eff_b2_new,
    matches_played = matches_played + 1 
  WHERE player = b2;

  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, a1, r_a1, r_a1 + delta,  delta, eff_a1_old, eff_a1_new);

  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, a2, r_a2, r_a2 + delta,  delta, eff_a2_old, eff_a2_new);

  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, b1, r_b1, r_b1 - delta, -delta, eff_b1_old, eff_b1_new);

  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta,eff_old_rating,eff_new_rating)
    VALUES (p_match, b2, r_b2, r_b2 - delta, -delta, eff_b2_old, eff_b2_new);
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
    effective_rating_cached = 1000;
    
  DELETE FROM games.elo_history;
  DELETE FROM games.elo_calc_log;

  -- 2. Matches chronologisch durchlaufen
  FOR rec IN
    SELECT m.id
    FROM games."match" m
    LEFT JOIN LATERAL (
      SELECT MIN(s.created_at) AS first_set_at
      FROM games.sets s WHERE s.match = m.id
    ) ss ON TRUE
    ORDER BY COALESCE(ss.first_set_at, m.created_at) NULLS LAST, m.id
  LOOP
    -- ELO berechnen (Berechnet ka_index neu)
    PERFORM games.apply_elo_for_match(rec.id);

    -- WICHTIG: Nach dem Match den Counter hochzählen und Cache aktualisieren
    -- Das simuliert den Trigger, der im Live-Betrieb feuert
    UPDATE games.players 
    SET 
        matches_played = matches_played + 1,
        effective_rating_cached = games.calculate_effective_rating(ka_index, rg_index, matches_played + 1)
    WHERE player IN (
        SELECT player_1 FROM games.teams WHERE id IN (SELECT team_a FROM games.match WHERE id = rec.id)
        UNION
        SELECT player_2 FROM games.teams WHERE id IN (SELECT team_a FROM games.match WHERE id = rec.id)
        UNION
        SELECT player_1 FROM games.teams WHERE id IN (SELECT team_b FROM games.match WHERE id = rec.id)
        UNION
        SELECT player_2 FROM games.teams WHERE id IN (SELECT team_b FROM games.match WHERE id = rec.id)
    );
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

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- 1. Zuerst alle Zähler auf 0 setzen (für Spieler ohne Spiele)
    UPDATE games.players SET matches_played = 0;

    -- 2. CTE nutzen, um alle Teilnahmen zu zählen
    WITH player_match_counts AS (
        SELECT 
            player_id, 
            COUNT(*) as total_matches
        FROM (
            -- Wir holen player_1 und player_2 von Team A
            SELECT t.player_1 AS player_id FROM games.match m JOIN games.teams t ON m.team_a = t.id
            UNION ALL
            SELECT t.player_2 FROM games.match m JOIN games.teams t ON m.team_a = t.id
            UNION ALL
            -- Wir holen player_1 und player_2 von Team B
            SELECT t.player_1 FROM games.match m JOIN games.teams t ON m.team_b = t.id
            UNION ALL
            SELECT t.player_2 FROM games.match m JOIN games.teams t ON m.team_b = t.id
        ) as all_participations
        WHERE player_id IS NOT NULL
        GROUP BY player_id
    )
    -- 3. Die players Tabelle basierend auf den gezählten Werten aktualisieren
    UPDATE games.players p
    SET 
        matches_played = pmc.total_matches,
        -- WICHTIG: Auch das effektive Rating neu cachen, da sich die Gewichtung nun ändert
        effective_rating_cached = games.calculate_effective_rating(p.ka_index, p.rg_index, pmc.total_matches::int)
    FROM player_match_counts pmc
    WHERE p.player = pmc.player_id;

    RAISE NOTICE 'Matches_played erfolgreich für alle Spieler aktualisiert.';
END $$;