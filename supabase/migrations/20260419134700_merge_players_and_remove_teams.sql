drop trigger if exists "trg_match_recalc_elo" on "games"."match";

drop trigger if exists "set_normalized_players" on "games"."teams";

drop trigger if exists "trg_audit_teams" on "games"."teams";

drop policy "Allow everything when user has permission games.update.score an" on "games"."sets";

drop policy "Allow select when match is public" on "games"."teams";

drop policy "teams_insert_if_member" on "games"."teams";

drop policy "teams_select_admin" on "games"."teams";

drop policy "teams_select_if_in_user_match" on "games"."teams";

drop policy "teams_update_if_member" on "games"."teams";

drop policy "match_delete_participant_or_admin" on "games"."match";

drop policy "match_update_participant_or_admin" on "games"."match";

revoke select on table "games"."teams" from "anon";

revoke delete on table "games"."teams" from "authenticated";

revoke insert on table "games"."teams" from "authenticated";

revoke select on table "games"."teams" from "authenticated";

revoke update on table "games"."teams" from "authenticated";

revoke delete on table "games"."teams" from "dashboard_user";

revoke insert on table "games"."teams" from "dashboard_user";

revoke select on table "games"."teams" from "dashboard_user";

revoke update on table "games"."teams" from "dashboard_user";

revoke delete on table "games"."teams" from "service_role";

revoke insert on table "games"."teams" from "service_role";

revoke select on table "games"."teams" from "service_role";

revoke update on table "games"."teams" from "service_role";

alter table "games"."match" drop constraint "match_team_a_fkey";

alter table "games"."match" drop constraint "match_team_b_fkey";

alter table "games"."teams" drop constraint "teams_player_1_fkey";

alter table "games"."teams" drop constraint "teams_player_2_fkey";

alter table "games"."teams" drop constraint "unique_normalized_players";

ALTER TABLE "games"."match" DROP CONSTRAINT IF EXISTS "check_match_team_a_different";

ALTER TABLE "games"."match" DROP CONSTRAINT IF EXISTS "check_match_team_b_different";

drop function if exists "games"."add_match_with_sets"(team_a text, player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, team_b text, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid, created_by uuid, is_public boolean, rated boolean, player_names json);

drop function if exists "games"."is_member_of_teams"(uuid, uuid);

drop view if exists "games"."leaderboard";

drop view if exists "games"."user_matches";

alter table "games"."teams" drop constraint "teams_pkey";

drop index if exists "games"."ix_match_team_a_fkey";

drop index if exists "games"."ix_match_team_b_fkey";

drop index if exists "games"."ix_teams_player_2_fkey";

drop index if exists "games"."teams_pkey";

drop index if exists "games"."unique_normalized_players";

drop index if exists "games"."unique_player_combination";

alter table "games"."match" add column "a_player_1" uuid;

alter table "games"."match" add column "a_player_2" uuid;

alter table "games"."match" add column "b_player_1" uuid;

alter table "games"."match" add column "b_player_2" uuid;

UPDATE "games"."match" m SET 
  a_player_1 = ta.player_1,
  a_player_2 = ta.player_2,
  b_player_1 = tb.player_1,
  b_player_2 = tb.player_2
FROM games.teams ta, games.teams tb
WHERE m.team_a = ta.id AND m.team_b = tb.id;

ALTER TABLE games.match
  ALTER COLUMN a_player_1 SET NOT NULL,
  ALTER COLUMN b_player_1 SET NOT NULL,
  ALTER COLUMN a_player_2 SET NOT NULL,
  ALTER COLUMN b_player_2 SET NOT NULL;

drop table "games"."teams";

alter table "games"."match" drop column "team_a";

alter table "games"."match" drop column "team_b";

alter table "games"."match" add column "team_a_name" text;

alter table "games"."match" add column "team_b_name" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.get_player_short_name(p_player_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_full_name TEXT;
    v_display_name TEXT;
    v_target_name TEXT;
BEGIN
    -- Daten holen
    SELECT u.name, p.display_name 
    INTO v_full_name, v_display_name
    FROM games.players p
    LEFT JOIN public.user u ON u.id = p.player
    WHERE p.player = p_player_id;

    -- Wir nehmen bevorzugt den verknüpften Namen, ansonsten den Gast-Namen.
    -- NULLIF stellt sicher, dass wir leere Strings ignorieren.
    v_target_name := trim(COALESCE(NULLIF(v_full_name, ''), NULLIF(v_display_name, ''), ''));

    -- Wenn wir nach dem Bereinigen einen gültigen String haben:
    IF v_target_name <> '' THEN
        -- Das letzte Wort extrahieren (funktioniert jetzt für User UND Gäste)
        RETURN (regexp_match(v_target_name, '([^ ]+)$'))[1];
    END IF;

    -- Absoluter Fallback: Die ersten 8 Zeichen der UUID
    RETURN substring(p_player_id::text from 1 for 8);
END;
$function$;

UPDATE "games"."match"
SET 
  team_a_name = concat_ws(' / ', 
    NULLIF("games"."get_player_short_name"(a_player_1), 'Unbekannt'), 
    NULLIF("games"."get_player_short_name"(a_player_2), 'Unbekannt')
  ),
  team_b_name = concat_ws(' / ', 
    NULLIF("games"."get_player_short_name"(b_player_1), 'Unbekannt'), 
    NULLIF("games"."get_player_short_name"(b_player_2), 'Unbekannt')
  );

alter table "games"."match" add constraint "check_match_all_players_unique" CHECK (((a_player_1 <> a_player_2) AND (a_player_1 <> b_player_1) AND (a_player_1 <> b_player_2) AND (a_player_2 <> b_player_1) AND (a_player_2 <> b_player_2) AND (b_player_1 <> b_player_2))) not valid;

alter table "games"."match" validate constraint "check_match_all_players_unique";

alter table "games"."match" add constraint "match_a_player_1_fkey" FOREIGN KEY (a_player_1) REFERENCES games.players(player) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "games"."match" validate constraint "match_a_player_1_fkey";

alter table "games"."match" add constraint "match_a_player_2_fkey" FOREIGN KEY (a_player_2) REFERENCES games.players(player) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "games"."match" validate constraint "match_a_player_2_fkey";

alter table "games"."match" add constraint "match_b_player_1_fkey" FOREIGN KEY (b_player_1) REFERENCES games.players(player) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "games"."match" validate constraint "match_b_player_1_fkey";

alter table "games"."match" add constraint "match_b_player_2_fkey" FOREIGN KEY (b_player_2) REFERENCES games.players(player) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "games"."match" validate constraint "match_b_player_2_fkey";

INSERT INTO public.permissions(name, description) VALUES ('games.admin.merge_accounts', 'Erlaubt das Mergen von Player und User Accounts');

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
  "is_public" boolean DEFAULT true -- HIER IST DER FEHLENDE PARAMETER
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

  -- Match Creation (is_public im INSERT hinzugefügt)
  INSERT INTO games.match (a_player_1, a_player_2, b_player_1, b_player_2, event, created_by, rated, is_public)
  VALUES (player_1a, player_2a, player_1b, player_2b, event, COALESCE(created_by, auth.uid()), rated, is_public)
  RETURNING id INTO v_match_id;

  -- Sets Insertion
  FOR v_set_record IN SELECT * FROM json_array_elements(match_sets) LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score)
    VALUES (v_match_id, v_set_count, (v_set_record->>'team_a_score')::numeric, (v_set_record->>'team_b_score')::numeric);
    v_set_count := v_set_count + 1;
  END LOOP;

  RETURN v_match_id;
END;$$;


CREATE OR REPLACE FUNCTION games.merge_guest_player(target_user_id uuid, guest_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- 1. AUTH CHECK
    IF NOT public.authorize('games.admin.merge_accounts') THEN
        RAISE EXCEPTION 'Dir fehlt die Berechtigung, Accounts zu mergen!';
    END IF;

    -- 2. PRE-CHECK: Identische IDs
    IF target_user_id = guest_player_id THEN
        RAISE EXCEPTION 'Diese Accounts sind bereits gemerged oder identisch!';
    END IF;

    -- 3. PRE-CHECK: Selbes Team in der Vergangenheit?
    IF EXISTS (
        SELECT 1 FROM games.match
        WHERE (a_player_1 = target_user_id AND a_player_2 = guest_player_id)
           OR (a_player_1 = guest_player_id AND a_player_2 = target_user_id)
           OR (b_player_1 = target_user_id AND b_player_2 = guest_player_id)
           OR (b_player_1 = guest_player_id AND b_player_2 = target_user_id)
    ) THEN
        RAISE EXCEPTION 'Merge abgebrochen: Der Gast-Account und der echte Account wurden bereits im selben Team eingesetzt. Bitte korrigiere erst das betroffene Match.';
    END IF;

    -- 4. PRE-CHECK: Gegner in der Vergangenheit?
    IF EXISTS (
        SELECT 1 FROM games.match
        WHERE ((a_player_1 = target_user_id OR a_player_2 = target_user_id) AND (b_player_1 = guest_player_id OR b_player_2 = guest_player_id))
           OR ((a_player_1 = guest_player_id OR a_player_2 = guest_player_id) AND (b_player_1 = target_user_id OR b_player_2 = target_user_id))
    ) THEN
        RAISE EXCEPTION 'Merge abgebrochen: Die Accounts haben in der Vergangenheit gegeneinander gespielt.';
    END IF;

    -- 5. UPDATES: Match-Tabelle aktualisieren
    UPDATE games.match SET a_player_1 = target_user_id WHERE a_player_1 = guest_player_id;
    UPDATE games.match SET a_player_2 = target_user_id WHERE a_player_2 = guest_player_id;
    UPDATE games.match SET b_player_1 = target_user_id WHERE b_player_1 = guest_player_id;
    UPDATE games.match SET b_player_2 = target_user_id WHERE b_player_2 = guest_player_id;

    -- 6. UPDATES: Elo-Log aktualisieren
    UPDATE games.elo_calc_log SET a1_user = target_user_id WHERE a1_user = guest_player_id;
    UPDATE games.elo_calc_log SET a2_user = target_user_id WHERE a2_user = guest_player_id;
    UPDATE games.elo_calc_log SET b1_user = target_user_id WHERE b1_user = guest_player_id;
    UPDATE games.elo_calc_log SET b2_user = target_user_id WHERE b2_user = guest_player_id;

    -- 7. CLEANUP: Gast-Account löschen
    DELETE FROM games.players WHERE player = guest_player_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION games.trg_update_match_team_names()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Team A Namen zusammenbauen
    NEW.team_a_name := concat_ws(' / ', 
        NULLIF(games.get_player_short_name(NEW.a_player_1), 'Unbekannt'), 
        NULLIF(games.get_player_short_name(NEW.a_player_2), 'Unbekannt')
    );

    -- Team B Namen zusammenbauen
    NEW.team_b_name := concat_ws(' / ', 
        NULLIF(games.get_player_short_name(NEW.b_player_1), 'Unbekannt'), 
        NULLIF(games.get_player_short_name(NEW.b_player_2), 'Unbekannt')
    );

    RETURN NEW;
END;
$function$
;

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

CREATE OR REPLACE FUNCTION games.is_match_participant(p_match uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'games', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM games."match" m
    WHERE m.id = p_match
      AND (select auth.uid() as uid) IN (m.a_player_1, m.a_player_2, m.b_player_1, m.b_player_2)
  );
$function$
;

create or replace view "games"."leaderboard" as  WITH trend_calculation AS (
         SELECT h."user",
            sum((h.eff_new_rating - h.eff_old_rating)) AS total_trend
           FROM (games.elo_history h
             JOIN games.match m ON ((h.match = m.id)))
          WHERE (m.created_at >= (now() - '30 days'::interval))
          GROUP BY h."user"
        )
 SELECT p.player AS player_id,
    p.linked_user_id,
    COALESCE(u."avatarUrl", p.rg_avatar_url, ''::text) AS avatar_url,
    COALESCE(u."displayName", p.display_name, 'Unbekannter Spieler'::text) AS name,
    p.effective_rating_cached AS rating,
    round(COALESCE(t.total_trend, (0)::numeric), 1) AS trend_30_days,
    p.matches_played,
    rank() OVER (ORDER BY p.effective_rating_cached DESC) AS "position",
    LEAST(100, (p.matches_played * 10)) AS confidence_level,
        CASE
            WHEN (p.matches_played < 5) THEN 'Provisional'::text
            WHEN ((p.matches_played >= 5) AND (p.matches_played < 20)) THEN 'Active'::text
            ELSE 'Veteran'::text
        END AS activity_status
   FROM ((games.players p
     LEFT JOIN public."user" u ON ((p.linked_user_id = u.id)))
     LEFT JOIN trend_calculation t ON ((p.player = t."user")))
  WHERE (p.matches_played > 0)
  ORDER BY p.effective_rating_cached DESC;


create or replace view "games"."user_matches" with (security_invoker = on) as  WITH match_stats AS (
         SELECT s.match,
            count(*) FILTER (WHERE (s.team_a_score > s.team_b_score)) AS sets_won_a,
            count(*) FILTER (WHERE (s.team_b_score > s.team_a_score)) AS sets_won_b,
            string_agg(((s.team_a_score || ':'::text) || s.team_b_score), ', '::text ORDER BY s.created_at) AS scores_list
           FROM games.sets s
          GROUP BY s.match
        ),
  player_names AS (
    -- Wir berechnen die Kurznamen vorab, um die Haupt-Query sauber zu halten
    SELECT 
      m.id AS mid,
      games.get_player_short_name(m.a_player_1) AS n_a1,
      games.get_player_short_name(m.a_player_2) AS n_a2,
      games.get_player_short_name(m.b_player_1) AS n_b1,
      games.get_player_short_name(m.b_player_2) AS n_b2
    FROM games.match m
  )
 SELECT m.id AS match_id,
    m.created_at,
    m.event,
    m.rated,
    m.is_public,

    concat_ws(' / ', NULLIF(pn.n_a1, ''), NULLIF(pn.n_a2, '')) AS team_a_name,
    concat_ws(' / ', NULLIF(pn.n_b1, ''), NULLIF(pn.n_b2, '')) AS team_b_name,

    m.a_player_1 AS team_a_p1,
    m.a_player_2 AS team_a_p2,
    m.b_player_1 AS team_b_p1,
    m.b_player_2 AS team_b_p2,
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
        END AS winner_side
   FROM ((games.match m
     JOIN player_names pn ON pn.mid = m.id
     LEFT JOIN match_stats ms ON ((ms.match = m.id)))
     LEFT JOIN games.elo_calc_log el ON ((el.match = m.id)));


CREATE OR REPLACE FUNCTION notifications.notify_game_added(p_match uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_topic  text := 'game.added';
  v_url    text := '/matches/' || p_match::text;
  v_body   text := '🤾 Es wurde ein neues Spiel mit dir hinzugefügt 🤾';
  v_title  text;
  v_team_a_name text;
  v_team_b_name text;
  v_recipients uuid[];
begin

  select "team_a_name", "team_b_name" into v_team_a_name, v_team_b_name from "games"."match" where id = p_match;

  v_title := v_team_a_name || ' vs. ' || v_team_b_name;

  v_recipients := array(
    with match_players as (
      select unnest(array[a_player_1, a_player_2, b_player_1, b_player_2]) as uid
      from games."match" where id = p_match
    ),
    rec as (
      select distinct uid from match_players
      where uid is not null and uid::text <> coalesce(p_actor::text,'')
    )
    select distinct p.player -- Wir nehmen die Player-UUID
      from rec ap
      join games.players p on p.player = ap.uid
      where p.player is not null 
        AND p.linked_user_id IS NOT NULL
        AND (p_actor is null or p.player <> p_actor)
  );

  IF array_length(v_recipients, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('match', p_match, 'url', v_url),
    'game',
    p_match,
    'normal',
    'game',
    p_match
  );
end;$function$
;


  create policy "match_insert_participant_or_admin"
  on "games"."match"
  as permissive
  for insert
  to authenticated
with check ((((((( SELECT auth.uid() AS uid) = a_player_1) OR (( SELECT auth.uid() AS uid) = a_player_2)) OR (( SELECT auth.uid() AS uid) = b_player_1)) OR (( SELECT auth.uid() AS uid) = b_player_2)) OR public.authorize('games.admin'::text)));



  create policy "match_select_participant_or_admin"
  on "games"."match"
  as permissive
  for select
  to authenticated
using ((((((( SELECT auth.uid() AS uid) = a_player_1) OR (( SELECT auth.uid() AS uid) = a_player_2)) OR (( SELECT auth.uid() AS uid) = b_player_1)) OR (( SELECT auth.uid() AS uid) = b_player_2)) OR public.authorize('games.admin'::text)));



  create policy "match_delete_participant_or_admin"
  on "games"."match"
  as permissive
  for delete
  to authenticated
using ((public.authorize('games.admin'::text) OR (((((( SELECT auth.uid() AS uid) = a_player_1) OR (( SELECT auth.uid() AS uid) = a_player_2)) OR (( SELECT auth.uid() AS uid) = b_player_1)) OR (( SELECT auth.uid() AS uid) = b_player_2)) AND public.authorize('games.delete.own'::text))));



  create policy "match_update_participant_or_admin"
  on "games"."match"
  as permissive
  for update
  to authenticated
using ((((((( SELECT auth.uid() AS uid) = a_player_1) OR (( SELECT auth.uid() AS uid) = a_player_2)) OR (( SELECT auth.uid() AS uid) = b_player_1)) OR (( SELECT auth.uid() AS uid) = b_player_2)) OR public.authorize('games.admin'::text)))
with check ((((((( SELECT auth.uid() AS uid) = a_player_1) OR (( SELECT auth.uid() AS uid) = a_player_2)) OR (( SELECT auth.uid() AS uid) = b_player_1)) OR (( SELECT auth.uid() AS uid) = b_player_2)) OR public.authorize('games.admin'::text)));


CREATE TRIGGER update_match_team_names_trigger BEFORE INSERT OR UPDATE OF a_player_1, a_player_2, b_player_1, b_player_2 ON games.match FOR EACH ROW EXECUTE FUNCTION games.trg_update_match_team_names();

GRANT SELECT ON "games"."user_matches" TO authenticated;
