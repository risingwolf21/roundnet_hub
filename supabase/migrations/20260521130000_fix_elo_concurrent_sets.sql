-- Fix race condition: trg_sets_recalc_elo fires AFTER INSERT ON games.sets FOR EACH ROW.
-- When add_match_with_sets inserts multiple sets in a loop, the trigger fires once per
-- set, calling apply_elo_for_match multiple times within the same transaction on the
-- same match. This creates incorrect intermediate ELO history entries (e.g. ELO
-- calculated with only 1 of 2 sets).
--
-- Fix: acquire a transaction-level advisory lock at the start of apply_elo_for_match
-- keyed on the match UUID. This serializes concurrent calls for the same match so the
-- second trigger invocation waits for the first to finish before reading player ratings.
-- The lock is automatically released when the enclosing transaction ends.

CREATE OR REPLACE FUNCTION games.apply_elo_for_match(p_match uuid)
 RETURNS void
 LANGUAGE plpgsql
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
    -- Serialize concurrent calls for the same match within a transaction.
    -- When multiple sets are inserted in a loop (add_match_with_sets), the trigger
    -- fires once per set. This lock ensures the second call waits for the first
    -- to complete so it reads the correct committed player ratings and does not
    -- produce duplicate / partial ELO history entries.
    PERFORM pg_advisory_xact_lock(hashtext('elo_for_match_' || p_match::text));

    -- Config & Daten laden
    SELECT * INTO v_cfg FROM games.elo_config WHERE id = 1;

    SELECT m.rated,
           p_a1.ka_index as r_a1, p_a1.rg_index as rg_a1, p_a1.matches_played as m_a1, p_a1.effective_rating_cached as eff_a1,
           p_a2.ka_index as r_a2, p_a2.rg_index as rg_a2, p_a2.matches_played as m_a2, p_a2.effective_rating_cached as eff_a2,
           p_b1.ka_index as r_b1, p_b1.rg_index as rg_b1, p_b1.matches_played as m_b1, p_b1.effective_rating_cached as eff_b1,
           p_b2.ka_index as r_b2, p_b2.rg_index as rg_b2, p_b2.matches_played as m_b2, p_b2.effective_rating_cached as eff_b2,
           m.a_player_1 as p_a1_id, m.a_player_2 as p_a2_id, m.b_player_1 as p_b1_id, m.b_player_2 as p_b2_id
    INTO rec FROM games.match m
    JOIN games.players p_a1 ON m.a_player_1 = p_a1.player JOIN games.players p_a2 ON m.a_player_2 = p_a2.player
    JOIN games.players p_b1 ON m.b_player_1 = p_b1.player JOIN games.players p_b2 ON m.b_player_2 = p_b2.player
    WHERE m.id = p_match FOR UPDATE;

    -- Idempotenz
    FOR hist IN SELECT * FROM games.elo_history WHERE match = p_match LOOP
        UPDATE games.players SET ka_index = ka_index - hist.delta, matches_played = matches_played - 1 WHERE player = hist."user";
    END LOOP;
    DELETE FROM games.elo_history WHERE match = p_match;

    -- Statistiken aggregieren
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

    -- Physik berechnen
    calc := games.calculate_match_physics(rec.eff_a1, rec.eff_a2, rec.eff_b1, rec.eff_b2, rec.m_a1, rec.m_a2, rec.m_b1, rec.m_b2, outcome_a, rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id);
    v_cat_a := games.team_category(rec.p_a1_id, rec.p_a2_id);
    v_cat_b := games.team_category(rec.p_b1_id, rec.p_b2_id);
    v_eff_a := ((rec.eff_a1 + rec.eff_a2)/2.0) + games.category_offset(v_cat_a);
    v_eff_b := ((rec.eff_b1 + rec.eff_b2)/2.0) + games.category_offset(v_cat_b);

    IF NOT COALESCE(rec.rated, true) THEN RETURN; END IF;

    -- Logging mit Snapshot
    INSERT INTO games.elo_calc_log(
        match, calculated_at, eff_team_a, eff_team_b, expected_a, expected_b,
        k_base, k_eff, category_a, category_b, upset_levels, upset_multiplier,
        outcome_a, sets_a, sets_b, points_a, points_b,
        a1_user, a2_user, b1_user, b2_user,
        rg_a1_used, rg_a2_used, rg_b1_used, rg_b2_used,
        ka_a1_used, ka_a2_used, ka_b1_used, ka_b2_used, cfg_snapshot
    )
    VALUES (
        p_match, now(), v_eff_a, v_eff_b, calc.exp_a, 1.0-calc.exp_a,
        v_cfg.k_factor, (v_cfg.k_factor * calc.global_conf), v_cat_a, v_cat_b, 0, 1.0,
        outcome_a, v_sets_a, v_sets_b, v_pts_a, v_pts_b,
        rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id,
        rec.rg_a1, rec.rg_a2, rec.rg_b1, rec.rg_b2,
        rec.r_a1, rec.r_a2, rec.r_b1, rec.r_b2,
        jsonb_build_object('w_rg', v_cfg.w_rg, 'w_ka', v_cfg.w_ka, 'rg_offset', v_cfg.rg_offset, 'rg_scale', v_cfg.rg_scale, 'k_factor', v_cfg.k_factor)
    )
    ON CONFLICT (match) DO UPDATE SET
        calculated_at = excluded.calculated_at, outcome_a = excluded.outcome_a,
        sets_a = excluded.sets_a, sets_b = excluded.sets_b;

    -- Spieler Updates
    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a1 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a1_id;
    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a2 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a2_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b1 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b1_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b2 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b2_id;

    -- History schreiben
    INSERT INTO games.elo_history(match, "user", old_rating, new_rating, delta, eff_old_rating, eff_new_rating)
    VALUES
        (p_match, rec.p_a1_id, rec.r_a1, rec.r_a1 + calc.base_delta, calc.base_delta, rec.eff_a1, rec.eff_a1 + calc.final_sync_delta),
        (p_match, rec.p_a2_id, rec.r_a2, rec.r_a2 + calc.base_delta, calc.base_delta, rec.eff_a2, rec.eff_a2 + calc.final_sync_delta),
        (p_match, rec.p_b1_id, rec.r_b1, rec.r_b1 - calc.base_delta, -calc.base_delta, rec.eff_b1, rec.eff_b1 - calc.final_sync_delta),
        (p_match, rec.p_b2_id, rec.r_b2, rec.r_b2 - calc.base_delta, -calc.base_delta, rec.eff_b2, rec.eff_b2 - calc.final_sync_delta);
END;
$function$
;
