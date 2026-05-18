-- 1. Vorab-Aufräumen
drop function if exists "games"."effective_rating_for_player"(p_player uuid);
drop function if exists "games"."effective_team_rating_with_category"(p_p1 uuid, p_p2 uuid);
drop function if exists "games"."is_member_of_match"(p_team_a uuid, p_team_b uuid);
drop function if exists "games"."preview_elo_for_match"(p_match uuid);

set check_function_bodies = off;

CREATE TYPE games.elo_calculation_result AS (
    v_outcome_a numeric,
    base_delta numeric,
    final_sync_delta numeric,
    exp_a numeric,
    global_conf numeric
);

-- 3. HILFSFUNKTIONEN
CREATE OR REPLACE FUNCTION games.get_confidence_level(p_matches_played integer)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
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
$function$;

CREATE OR REPLACE FUNCTION games.calculate_match_physics(p_eff_a1 numeric, p_eff_a2 numeric, p_eff_b1 numeric, p_eff_b2 numeric, p_m_count_a1 integer, p_m_count_a2 integer, p_m_count_b1 integer, p_m_count_b2 integer, p_outcome_a numeric, p_p1_id uuid, p_p2_id uuid, p_p3_id uuid, p_p4_id uuid)
 RETURNS games.elo_calculation_result
 LANGUAGE plpgsql
 STABLE
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
$function$;

-- 4. VORSCHAU (PREDICT)
CREATE OR REPLACE FUNCTION games.predict_elo_for_match(p_match_id uuid, p_simulated_outcome numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
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
END;$function$;

-- 5. HAUPTFUNKTION (APPLY)
CREATE OR REPLACE FUNCTION games.apply_elo_for_match(p_match uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec record;
    outcome_a numeric;
    calc games.elo_calculation_result;
    hist record;
BEGIN
    SELECT m.team_a, m.team_b, m.rated,
           p_a1.ka_index as r_a1, p_a1.matches_played as m_a1, p_a1.effective_rating_cached as eff_a1,
           p_a2.ka_index as r_a2, p_a2.matches_played as m_a2, p_a2.effective_rating_cached as eff_a2,
           p_b1.ka_index as r_b1, p_b1.matches_played as m_b1, p_b1.effective_rating_cached as eff_b1,
           p_b2.ka_index as r_b2, p_b2.matches_played as m_b2, p_b2.effective_rating_cached as eff_b2,
           ta.player_1 as p_a1_id, ta.player_2 as p_a2_id, tb.player_1 as p_b1_id, tb.player_2 as p_b2_id
    INTO rec FROM games.match m 
    JOIN games.teams ta ON m.team_a = ta.id JOIN games.teams tb ON m.team_b = tb.id
    JOIN games.players p_a1 ON ta.player_1 = p_a1.player JOIN games.players p_a2 ON ta.player_2 = p_a2.player
    JOIN games.players p_b1 ON tb.player_1 = p_b1.player JOIN games.players p_b2 ON tb.player_2 = p_b2.player
    WHERE m.id = p_match FOR UPDATE;

    -- Idempotenz: Bestehende Einträge für dieses Match rückgängig machen
    FOR hist IN SELECT * FROM games.elo_history WHERE match=p_match LOOP
        UPDATE games.players SET ka_index = ka_index - hist.delta, matches_played = matches_played - 1 WHERE player = hist."user";
    END LOOP;
    DELETE FROM games.elo_history WHERE match=p_match;

    -- Ergebnis-Ermittlung
    SELECT CASE 
        WHEN (SELECT count(*) FROM games.sets WHERE match = p_match AND team_a_score > team_b_score) > 
             (SELECT count(*) FROM games.sets WHERE match = p_match AND team_b_score > team_a_score) THEN 1.0
        WHEN (SELECT count(*) FROM games.sets WHERE match = p_match AND team_b_score > team_a_score) > 
             (SELECT count(*) FROM games.sets WHERE match = p_match AND team_a_score > team_b_score) THEN 0.0
        ELSE 
            CASE 
                WHEN (SELECT sum(team_a_score) FROM games.sets WHERE match = p_match) > (SELECT sum(team_b_score) FROM games.sets WHERE match = p_match) THEN 1.0
                WHEN (SELECT sum(team_b_score) FROM games.sets WHERE match = p_match) > (SELECT sum(team_a_score) FROM games.sets WHERE match = p_match) THEN 0.0
                ELSE 0.5 
            END
    END INTO outcome_a;

    -- Physik berechnen
    calc := games.calculate_match_physics(rec.eff_a1, rec.eff_a2, rec.eff_b1, rec.eff_b2, rec.m_a1, rec.m_a2, rec.m_b1, rec.m_b2, outcome_a, rec.p_a1_id, rec.p_a2_id, rec.p_b1_id, rec.p_b2_id);

    IF NOT COALESCE(rec.rated, true) THEN RETURN; END IF;

    -- UPDATES (Referenzen auf rec.eff_... korrigiert)
    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a1 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a1_id;
    UPDATE games.players SET ka_index = ka_index + calc.base_delta, effective_rating_cached = rec.eff_a2 + calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_a2_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b1 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b1_id;
    UPDATE games.players SET ka_index = ka_index - calc.base_delta, effective_rating_cached = rec.eff_b2 - calc.final_sync_delta, matches_played = matches_played + 1 WHERE player = rec.p_b2_id;

    -- HISTORY (Referenzen auf rec.r_... und rec.eff_... korrigiert)
    INSERT INTO games.elo_history(match, "user", old_rating, new_rating, delta, eff_old_rating, eff_new_rating)
    VALUES 
        (p_match, rec.p_a1_id, rec.r_a1, rec.r_a1 + calc.base_delta, calc.base_delta, rec.eff_a1, rec.eff_a1 + calc.final_sync_delta),
        (p_match, rec.p_a2_id, rec.r_a2, rec.r_a2 + calc.base_delta, calc.base_delta, rec.eff_a2, rec.eff_a2 + calc.final_sync_delta),
        (p_match, rec.p_b1_id, rec.r_b1, rec.r_b1 - calc.base_delta, -calc.base_delta, rec.eff_b1, rec.eff_b1 - calc.final_sync_delta),
        (p_match, rec.p_b2_id, rec.r_b2, rec.r_b2 - calc.base_delta, -calc.base_delta, rec.eff_b2, rec.eff_b2 - calc.final_sync_delta);
END;$function$;