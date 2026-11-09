set check_function_bodies = off;

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

  -- aktueller KA-Wert, NICHT effective rating:
  SELECT COALESCE(ka_index, 1000) INTO r_a1 FROM games.players WHERE player = a1;
  SELECT COALESCE(ka_index, 1000) INTO r_a2 FROM games.players WHERE player = a2;
  SELECT COALESCE(ka_index, 1000) INTO r_b1 FROM games.players WHERE player = b1;
  SELECT COALESCE(ka_index, 1000) INTO r_b2 FROM games.players WHERE player = b2;

  SELECT rg_index INTO rg_a1 FROM games.players WHERE player = a1;
  SELECT rg_index INTO rg_a2 FROM games.players WHERE player = a2;
  SELECT rg_index INTO rg_b1 FROM games.players WHERE player = b1;
  SELECT rg_index INTO rg_b2 FROM games.players WHERE player = b2;

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


