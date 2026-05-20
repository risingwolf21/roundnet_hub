set check_function_bodies = off;

-- Step 1: Add type and set_awarded columns to games.sets
ALTER TABLE games.sets
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS set_awarded boolean DEFAULT NULL;

-- Step 2: Recreate add_match_with_sets with optional spezi_set param
CREATE OR REPLACE FUNCTION "games"."add_match_with_sets"(
  "player_1a" "uuid", "player_1a_rating" numeric,
  "player_2a" "uuid", "player_2a_rating" numeric,
  "player_1b" "uuid", "player_1b_rating" numeric,
  "player_2b" "uuid", "player_2b_rating" numeric,
  "match_sets" json,
  "event" "uuid" DEFAULT NULL::"uuid",
  "created_by" "uuid" DEFAULT NULL::"uuid",
  "rated" boolean DEFAULT true,
  "player_names" json DEFAULT '{}'::json,
  "is_public" boolean DEFAULT true,
  "spezi_set" json DEFAULT NULL::json
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
  v_match_id uuid;
  v_set_count int := 1;
  v_set_record json;
BEGIN
  -- Auth Check
  IF (NOT (SELECT public.authorize('event.create.constellations'))) THEN
    IF auth.uid() NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
      RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen oder autorisiert sein';
    END IF;
  END IF;

  -- Player 1A
  IF player_1a IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1a) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_1a, player_1a_rating, NULLIF(player_names->>player_1a::text, ''), 0, games.calculate_effective_rating(player_1a_rating, NULL, 0));
  END IF;
  -- Player 2A
  IF player_2a IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2a) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_2a, player_2a_rating, NULLIF(player_names->>player_2a::text, ''), 0, games.calculate_effective_rating(player_2a_rating, NULL, 0));
  END IF;
  -- Player 1B
  IF player_1b IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1b) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_1b, player_1b_rating, NULLIF(player_names->>player_1b::text, ''), 0, games.calculate_effective_rating(player_1b_rating, NULL, 0));
  END IF;
  -- Player 2B
  IF player_2b IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2b) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_2b, player_2b_rating, NULLIF(player_names->>player_2b::text, ''), 0, games.calculate_effective_rating(player_2b_rating, NULL, 0));
  END IF;

  -- Match Creation
  INSERT INTO games.match (a_player_1, a_player_2, b_player_1, b_player_2, event, created_by, rated, is_public)
  VALUES (player_1a, player_2a, player_1b, player_2b, event, COALESCE(created_by, auth.uid()), rated, is_public)
  RETURNING id INTO v_match_id;

  -- Normal Sets Insertion
  FOR v_set_record IN SELECT * FROM json_array_elements(match_sets) LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score)
    VALUES (v_match_id, v_set_count, (v_set_record->>'team_a_score')::numeric, (v_set_record->>'team_b_score')::numeric);
    v_set_count := v_set_count + 1;
  END LOOP;

  -- Spezi Set Insertion (optional)
  IF spezi_set IS NOT NULL THEN
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score, type, set_awarded)
    VALUES (
      v_match_id,
      v_set_count,
      (spezi_set->>'team_a_score')::numeric,
      (spezi_set->>'team_b_score')::numeric,
      'spezi',
      (spezi_set->>'set_awarded')::boolean
    );
  END IF;

  RETURN v_match_id;
END;$$;

-- Step 3: Recreate apply_elo_for_match with type = 'normal' filter
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

    -- Statistiken aggregieren (nur normale Sätze)
    SELECT
        COALESCE(count(*) FILTER (WHERE team_a_score > team_b_score), 0),
        COALESCE(count(*) FILTER (WHERE team_b_score > team_a_score), 0),
        COALESCE(sum(team_a_score), 0),
        COALESCE(sum(team_b_score), 0),
        count(*)
    INTO v_sets_a, v_sets_b, v_pts_a, v_pts_b, v_total_sets
    FROM games.sets WHERE match = p_match AND type = 'normal';

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
$function$;

-- Step 4: Recreate user_matches view filtering to normal sets only
CREATE OR REPLACE VIEW "games"."user_matches" WITH ("security_invoker"='on') AS
 WITH "match_stats" AS (
         SELECT "s"."match",
            "count"(*) FILTER (WHERE ("s"."team_a_score" > "s"."team_b_score")) AS "sets_won_a",
            "count"(*) FILTER (WHERE ("s"."team_b_score" > "s"."team_a_score")) AS "sets_won_b",
            "string_agg"((("s"."team_a_score" || ':'::"text") || "s"."team_b_score"), ', '::"text" ORDER BY "s"."created_at") AS "scores_list"
           FROM "games"."sets" "s"
          WHERE "s"."type" = 'normal'
          GROUP BY "s"."match"
        ), "player_names" AS (
         SELECT "m_1"."id" AS "mid",
            "games"."get_player_short_name"("m_1"."a_player_1") AS "n_a1",
            "games"."get_player_short_name"("m_1"."a_player_2") AS "n_a2",
            "games"."get_player_short_name"("m_1"."b_player_1") AS "n_b1",
            "games"."get_player_short_name"("m_1"."b_player_2") AS "n_b2"
           FROM "games"."match" "m_1"
        )
 SELECT "m"."id" AS "match_id",
    "m"."created_at",
    "m"."event",
    "m"."rated",
    "m"."is_public",
    "concat_ws"(' / '::"text", NULLIF("pn"."n_a1", ''::"text"), NULLIF("pn"."n_a2", ''::"text")) AS "team_a_name",
    "concat_ws"(' / '::"text", NULLIF("pn"."n_b1", ''::"text"), NULLIF("pn"."n_b2", ''::"text")) AS "team_b_name",
    "m"."a_player_1" AS "team_a_p1",
    "m"."a_player_2" AS "team_a_p2",
    "m"."b_player_1" AS "team_b_p1",
    "m"."b_player_2" AS "team_b_p2",
    COALESCE("ms"."scores_list", ''::"text") AS "set_scores",
    COALESCE("ms"."sets_won_a", (0)::bigint) AS "sets_won_a",
    COALESCE("ms"."sets_won_b", (0)::bigint) AS "sets_won_b",
    COALESCE("round"(("el"."k_eff" * ("el"."outcome_a" - "el"."expected_a")), 2), (0)::numeric) AS "elo_change_a",
    COALESCE("round"(("el"."k_eff" * (((1)::numeric - "el"."outcome_a") - "el"."expected_b")), 2), (0)::numeric) AS "elo_change_b",
        CASE
            WHEN ("ms"."sets_won_a" > "ms"."sets_won_b") THEN 'team_a'::"text"
            WHEN ("ms"."sets_won_b" > "ms"."sets_won_a") THEN 'team_b'::"text"
            WHEN (("ms"."sets_won_a" = "ms"."sets_won_b") AND ("ms"."match" IS NOT NULL)) THEN 'draw'::"text"
            ELSE 'undetermined'::"text"
        END AS "winner_side"
   FROM ((("games"."match" "m"
     JOIN "player_names" "pn" ON (("pn"."mid" = "m"."id")))
     LEFT JOIN "match_stats" "ms" ON (("ms"."match" = "m"."id")))
     LEFT JOIN "games"."elo_calc_log" "el" ON (("el"."match" = "m"."id")));
