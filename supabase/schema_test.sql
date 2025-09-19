
\restrict jkrobjnfizxoUFgAV9zLY9FFzkxqqGh28qw8yJaRmgsCwZM9Z2RC39itC6io5uu


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_tle";






CREATE EXTENSION IF NOT EXISTS "supabase-dbdev" WITH SCHEMA "public";






CREATE SCHEMA IF NOT EXISTS "games";


ALTER SCHEMA "games" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgtap" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."EventAttendance" AS ENUM (
    'Declined',
    'Attending',
    'Unanswered',
    'Waiting',
    'AttendingAsTrainer',
    'RequestedAttendance'
);


ALTER TYPE "public"."EventAttendance" OWNER TO "postgres";


CREATE TYPE "public"."EventRecurrence" AS ENUM (
    'Weekly',
    'Fortnightly',
    'Monthly',
    'None'
);


ALTER TYPE "public"."EventRecurrence" OWNER TO "postgres";


CREATE TYPE "public"."Feature" AS ENUM (
    'drinks',
    'events',
    'items',
    'challenges',
    'games',
    'events.constellations'
);


ALTER TYPE "public"."Feature" OWNER TO "postgres";


CREATE TYPE "public"."GroupRole" AS ENUM (
    'user',
    'admin',
    'joinRequested'
);


ALTER TYPE "public"."GroupRole" OWNER TO "postgres";


CREATE TYPE "public"."ItemType" AS ENUM (
    'mtvStorage',
    'mtvGym',
    'mtvGymPalazzo',
    'goethe'
);


ALTER TYPE "public"."ItemType" OWNER TO "postgres";


CREATE TYPE "public"."PaymentState" AS ENUM (
    'Open',
    'Fulfilled'
);


ALTER TYPE "public"."PaymentState" OWNER TO "postgres";


CREATE TYPE "public"."ProductType" AS ENUM (
    'Drink',
    'Special',
    'None'
);


ALTER TYPE "public"."ProductType" OWNER TO "postgres";


CREATE TYPE "public"."UserRole" AS ENUM (
    'user',
    'admin',
    'procure',
    'finance',
    'trainer'
);


ALTER TYPE "public"."UserRole" OWNER TO "postgres";


CREATE TYPE "public"."grant_kind" AS ENUM (
    'perm',
    'feat'
);


ALTER TYPE "public"."grant_kind" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."add_match_with_sets"("team_a" "text", "player_1a" "text", "player_2a" "text", "team_b" "text", "player_1b" "text", "player_2b" "text", "match_sets" json, "event" "uuid" DEFAULT NULL::"uuid", "created_by" "text" DEFAULT NULL::"text", "rated" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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

  -- Caller muss Teilnehmer sein (mind. in einem Team)
  IF auth.uid()::text NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
    RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen';
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
  VALUES (team_a_id, team_b_id, event, created_by, rated)
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
END;
$$;


ALTER FUNCTION "games"."add_match_with_sets"("team_a" "text", "player_1a" "text", "player_2a" "text", "team_b" "text", "player_1b" "text", "player_2b" "text", "match_sets" json, "event" "uuid", "created_by" "text", "rated" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."apply_elo_for_match"("p_match" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$DECLARE
  cfg record;
  v_rated boolean;
  m_team_a uuid; m_team_b uuid;
  a1 text; a2 text; b1 text; b2 text;

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
END;$$;


ALTER FUNCTION "games"."apply_elo_for_match"("p_match" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."category_offset"("p_cat" "text") RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'games', 'pg_temp'
    AS $$
  SELECT CASE p_cat
           WHEN 'men'   THEN (SELECT men_offset   FROM games.elo_config WHERE id=1)
           WHEN 'women' THEN (SELECT women_offset FROM games.elo_config WHERE id=1)
           ELSE              (SELECT mixed_offset FROM games.elo_config WHERE id=1)
         END;
$$;


ALTER FUNCTION "games"."category_offset"("p_cat" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."compute_effective_player_from_values"("ka" numeric, "rg" numeric) RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'games', 'pg_temp'
    AS $_$
  with cfg as (select rg_offset, rg_scale from games.elo_config where id=1)
  select case
    when $1 is not null and $2 is not null then
      -- KA und kalibriertes RG mitteln
      ($1 + (c.rg_scale * ($2 - c.rg_offset))) / 2.0
    when $1 is not null then
      $1
    when $2 is not null then
      c.rg_scale * ($2 - c.rg_offset)
    else
      1000
  end
  from cfg c;
$_$;


ALTER FUNCTION "games"."compute_effective_player_from_values"("ka" numeric, "rg" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."effective_rating_for_player"("p_player" "text") RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'games', 'pg_temp'
    AS $$
  select games.compute_effective_player_from_values(p.ka_index, p.rg_index)
  from games.players p
  where p.player = p_player;
$$;


ALTER FUNCTION "games"."effective_rating_for_player"("p_player" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."effective_team_rating_with_category"("p_p1" "text", "p_p2" "text") RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'games', 'pg_temp'
    AS $$
  SELECT (games.effective_rating_for_player(p_p1)
        + games.effective_rating_for_player(p_p2))/2.0
       + games.category_offset(games.team_category(p_p1,p_p2));
$$;


ALTER FUNCTION "games"."effective_team_rating_with_category"("p_p1" "text", "p_p2" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."fetch_all_player_infos_from_pz"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'games', 'pg_temp'
    AS $$declare player_record RECORD;

begin for player_record in
select
  *
from
  games.players LOOP perform public.invoke_edge_function (
    'fetch-player-info',
    jsonb_build_object('rg_link', player_record.rg_link, 'player', player_record.player),
    5000
  );

end LOOP;

end;$$;


ALTER FUNCTION "games"."fetch_all_player_infos_from_pz"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."fetch_player_info_on_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin
perform public.invoke_edge_function(
    'fetch-player-info',
    jsonb_build_object(
      'rg_link', new.rg_link,
      'player',  new.player
    ),
    5000
  );
        RETURN NEW;
END;$$;


ALTER FUNCTION "games"."fetch_player_info_on_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."is_match_participant"("p_match" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'games', 'pg_temp'
    AS $$
  select exists (
    select 1
    from games."match" m
    join games.teams ta on ta.id = m.team_a
    join games.teams tb on tb.id = m.team_b
    where m.id = p_match
      and auth.uid()::text in (ta.player_1, ta.player_2, tb.player_1, tb.player_2)
  );
$$;


ALTER FUNCTION "games"."is_match_participant"("p_match" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."is_member_of_match"("p_team_a" "uuid", "p_team_b" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    SET "row_security" TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM games.teams t
    WHERE t.id IN (p_team_a, p_team_b)
      AND auth.uid()::text IN (t.player_1, t.player_2)
  );
$$;


ALTER FUNCTION "games"."is_member_of_match"("p_team_a" "uuid", "p_team_b" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."is_member_of_teams"("p_team_a" "uuid", "p_team_b" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    SET "row_security" TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM games.teams t
    WHERE (t.id = p_team_a OR t.id = p_team_b)
      AND auth.uid()::text IN (t.player_1, t.player_2)
  );
$$;


ALTER FUNCTION "games"."is_member_of_teams"("p_team_a" "uuid", "p_team_b" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."preview_elo_for_match"("p_match" "uuid") RETURNS TABLE("eff_team_a" numeric, "eff_team_b" numeric, "expected_a" numeric, "expected_b" numeric, "k_base" integer, "k_eff" numeric, "category_a" "text", "category_b" "text", "upset_levels" integer, "upset_multiplier" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'games', 'pg_temp'
    AS $$
  with cfg as (select * from games.elo_config where id=1),
  m as (select team_a, team_b from games."match" where id = p_match),
  t as (
    select
      (select player_1 from games.teams where id = m.team_a) as a1,
      (select player_2 from games.teams where id = m.team_a) as a2,
      (select player_1 from games.teams where id = m.team_b) as b1,
      (select player_2 from games.teams where id = m.team_b) as b2
    from m
  ),
  cat as (
    select
      games.team_category(t.a1,t.a2) as cat_a,
      games.team_category(t.b1,t.b2) as cat_b
    from t
  ),
  eff as (
    select
      games.effective_team_rating_with_category(t.a1,t.a2) as eff_a,
      games.effective_team_rating_with_category(t.b1,t.b2) as eff_b
    from t
  ),
  exp as (
    select
      1.0 / (1.0 + power(10.0, (eff.eff_b - eff.eff_a)/400.0)) as ea
    from eff
  )
  select
    eff.eff_a, eff.eff_b,
    exp.ea, 1-exp.ea,
    cfg.k_factor as k_base,
    cfg.k_factor::numeric as k_eff,  -- hier ohne Upset-Bonus (der hängt vom tatsächlichen Sieger ab)
    cat.cat_a, cat.cat_b,
    abs( (case cat.cat_a when 'men' then 3 when 'mixed' then 2 else 1 end)
        - (case cat.cat_b when 'men' then 3 when 'mixed' then 2 else 1 end) ) as upset_levels,
    1.0 as upset_multiplier
  from cfg, eff, exp, cat;
$$;


ALTER FUNCTION "games"."preview_elo_for_match"("p_match" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."recompute_all_effective_player_ratings"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE games.players p
  SET effective_rating_cached =
      games.compute_effective_player_from_values(p.ka_index, p.rg_index);
END;
$$;


ALTER FUNCTION "games"."recompute_all_effective_player_ratings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."recompute_all_elo_from_scratch"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE rec RECORD;
BEGIN
  -- nur der lokale Index wird zurückgesetzt
  UPDATE games.players SET ka_index = 1000;
  DELETE FROM games.elo_history;

  FOR rec IN
    SELECT m.id
    FROM games."match" m
    LEFT JOIN LATERAL (
      SELECT MIN(s.created_at) AS first_set_at
      FROM games.sets s WHERE s.match = m.id
    ) ss ON TRUE
    ORDER BY COALESCE(ss.first_set_at, m.created_at) NULLS LAST, m.id
  LOOP
    PERFORM games.apply_elo_for_match(rec.id);
  END LOOP;
END;
$$;


ALTER FUNCTION "games"."recompute_all_elo_from_scratch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."team_category"("p_p1" "text", "p_p2" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'games', 'pg_temp'
    AS $$select case
    when coalesce((select gender from games.players where player=p_p1),'m')='m'
     and coalesce((select gender from games.players where player=p_p2),'m')='m'
      then 'men'
    when coalesce((select gender from games.players where player=p_p1),'w')='w'
     and coalesce((select gender from games.players where player=p_p2),'w')='w'
      then 'women'
    else 'mixed'
  end;$$;


ALTER FUNCTION "games"."team_category"("p_p1" "text", "p_p2" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."trg_on_elo_config_recompute"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM games.recompute_all_effective_player_ratings();
  RETURN NULL;
END;
$$;


ALTER FUNCTION "games"."trg_on_elo_config_recompute"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."trg_players_set_effective_cached"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.effective_rating_cached :=
    COALESCE(games.compute_effective_player_from_values(NEW.ka_index, NEW.rg_index), 1000);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "games"."trg_players_set_effective_cached"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."trg_recalc_match_elo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform games.apply_elo_for_match( case when tg_op = 'DELETE' then old.id else new.id end );
  return null;
end;
$$;


ALTER FUNCTION "games"."trg_recalc_match_elo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."trg_recalc_sets_elo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  m uuid;
begin
  if tg_op in ('INSERT','UPDATE') then
    m := new.match;
  else
    m := old.match;
  end if;
  perform games.apply_elo_for_match(m);
  return null;
end;
$$;


ALTER FUNCTION "games"."trg_recalc_sets_elo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."trg_user_to_player"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Minimal: nur die Player-ID anlegen; Defaults (ka_index=1000 etc.) greifen.
  INSERT INTO games.players (player)
  VALUES (NEW."userId"::text)
  ON CONFLICT (player) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "games"."trg_user_to_player"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" bigint, "p_urgency" "text" DEFAULT 'normal'::"text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public._enqueue_notification_core(
    p_user,
    p_tenant,
    p_topic,
    p_title,
    -- numerische ID ins Payload mergen
    p_data || jsonb_build_object('source_id_bigint', p_source_id),
    p_source_type,
    null::uuid,
    p_urgency
  )
$$;


ALTER FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" bigint, "p_urgency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" "uuid", "p_urgency" "text" DEFAULT 'normal'::"text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public._enqueue_notification_core(
    p_user, p_tenant, p_topic, p_title, p_data, p_source_type, p_source_id, p_urgency
  )
$$;


ALTER FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" "uuid", "p_urgency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_enqueue_notification_core"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_uuid" "uuid", "p_urgency" "text" DEFAULT 'normal'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_nid uuid;
  v_outbox_id bigint;

  v_has_channel boolean;
  v_has_title   boolean;
  v_has_body    boolean;
  v_has_topic   boolean;

  v_cols text;
  v_vals text;
  v_cmd  text;
  v_body_text text := coalesce(p_data->>'body', p_title);
begin
  -- 1) UI-Notification
  insert into public.notifications("user", tenant, topic, title, data, source_type, source_id)
  values (p_user, p_tenant, p_topic, p_title, p_data, p_source_type, p_source_uuid)
  returning id into v_nid;

  -- 2) Spalten in notification_outbox erkennen
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='notification_outbox' and column_name='channel'
  ) into v_has_channel;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='notification_outbox' and column_name='title'
  ) into v_has_title;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='notification_outbox' and column_name='body'
  ) into v_has_body;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='notification_outbox' and column_name='topic'
  ) into v_has_topic;

  -- 3) dynamisches INSERT in outbox
  v_cols := '"user", tenant';
  v_vals := format('%L, %L', p_user, p_tenant);

  if v_has_channel then
    v_cols := v_cols || ', channel';
    v_vals := v_vals || format(', %L', 'webpush');
  end if;

  v_cols := v_cols || ', urgency, status, notification';
  v_vals := v_vals || format(', %L, %L, %L',
                             coalesce(p_urgency, 'normal'),
                             'pending',
                             v_nid::text);

  if v_has_title then
    v_cols := v_cols || ', title';
    v_vals := v_vals || format(', %L', p_title);
  end if;

  if v_has_body then
    v_cols := v_cols || ', body';
    v_vals := v_vals || format(', %L', v_body_text);
  end if;

  if v_has_topic then
    v_cols := v_cols || ', topic';
    v_vals := v_vals || format(', %L', p_topic);
  end if;

  v_cmd := format('insert into public.notification_outbox(%s) values (%s) returning id', v_cols, v_vals);
  execute v_cmd into v_outbox_id;

  -- 4) Targets: alle aktiven WebPush-Subs des Users
  insert into public.notification_outbox_targets(outbox_id, subscription_id, status, attempt_count, next_attempt_at)
  select v_outbox_id, s.id, 'pending', 0, now()
    from public.web_push_subscriptions s
   where s."user" = p_user
     and s.revoked_at is null;
end;
$$;


ALTER FUNCTION "public"."_enqueue_notification_core"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_uuid" "uuid", "p_urgency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_match_participants_uids"("p_match" "uuid") RETURNS TABLE("uid" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with m as (
    select team_a, team_b
      from games."match"
     where id = p_match
  ),
  team_ids as (
    select unnest(array[team_a, team_b]) as team_id
      from m
  ),
  players as (
    select unnest(array[t.player_1, t.player_2])::text as uid
      from games.teams t
      join team_ids ti on t.id = ti.team_id
  )
  select distinct uid
    from players
   where uid is not null
$$;


ALTER FUNCTION "public"."_match_participants_uids"("p_match" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_challenge_added"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.added';
  v_url    text := '/challenges/' || new.id::text;
  v_uid    text;
begin
  for v_uid in
    with u as (
      select distinct gum."user"::text as uid
      from public.group_user_mapping gum
      where gum."group" = new."group"
    )
    select u.uid
    from u
    where public.is_topic_enabled_for_user(u.uid, v_tenant, v_topic, 'challenge', new.id)
  loop
    perform public._enqueue_notification(
      v_uid, v_tenant, v_topic,
      'Neue Challenge'::text,
      jsonb_build_object('challenge', new.id, 'url', v_url),
      'challenge'::text, new.id, 'normal'::text
    );
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_challenge_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_challenge_entry_added"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.entry.added';
  v_ch uuid;
  v_grp uuid;
  v_url text;
begin
  select c.id, c."group" into v_ch, v_grp
    from public.challenge c
   where c.id = new."challenge";

  if v_ch is null then
    return new;
  end if;

  v_url := '/challenges/' || v_ch::text;

  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_grp
       and gum."user" <> new."user"
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', v_ch)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Neuer Challenge-Eintrag',
           jsonb_build_object('challenge', v_ch, 'by', new."user", 'stat', new.id, 'url', v_url),
           'challenge', v_ch, 'normal'
         )
    from allowed a;

  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_challenge_entry_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_drink_payment_fulfilled"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'drinks.payment.fulfilled';
  v_url    text := '/';
begin
  if old."paymentState" is distinct from new.status and new."paymentState" = 'Fulfilled' then
    if public.is_topic_enabled_for_user(new."user", v_tenant, v_topic, 'payment', new.id) then
      perform public._enqueue_notification(
        new."user", v_tenant, v_topic,
        'Zahlung bestätigt',
        jsonb_build_object('payment', new.id, 'url', v_url),
        'payment', new.id, 'normal'
      );
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_drink_payment_fulfilled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_event_canceled"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.canceled';
  v_url    text := '/training/event/' || new.id::text;
begin
  if coalesce(old."isCancelled", false) = false and new."isCancelled" = true then
    with recipients as (
      select distinct eum."user" as uid
        from public.event_attendance_user_mapping eum
       where eum.event = new.id
         and eum.state::text  = 'Attending'
    ), allowed as (
      select r.uid
        from recipients r
       where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', new.id)
    )
    select public._enqueue_notification(
             a.uid, v_tenant, v_topic,
             'Event abgesagt',
             jsonb_build_object('event', new.id, 'url', v_url),
             'event', new.id, 'high'
           )
      from allowed a;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_event_canceled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_event_comment_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.comment.created';
  v_url    text := '/training/event/' || new.event::text;
begin
  with recipients as (
    select distinct eum."user" as uid
      from public.event_attendance_user_mapping eum
     where eum.event = new.event
       and eum.state::text  = 'Attending'
       and eum."user" <> coalesce(new."user",'')
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', new.event)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Neuer Kommentar zum Event',
           jsonb_build_object('event', new.event, 'comment', new.id, 'url', v_url),
           'event', new.event, 'normal'
         )
    from allowed a;

  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_event_comment_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_event_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.updated';
  v_url    text := '/training/event/' || new.id::text;
begin
  with recipients as (
    select distinct eum."user" as uid
      from public.event_attendance_user_mapping eum
     where eum.event = new.id
       and eum.state::text  = 'Attending'
  ), allowed as (
    select r.uid
      from recipients r
     where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', new.id)
  )
  select public._enqueue_notification(
           a.uid, v_tenant, v_topic,
           'Event aktualisiert',
           jsonb_build_object('event', new.id, 'url', v_url),
           'event', new.id, 'normal'
         )
    from allowed a;

  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_event_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_game_added"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'game.added';
  v_url    text := '/matches/' || new.id::text; -- ggf. spezifischer, z.B. '/games/<id>'
  v_uid    text;
begin
  -- Alle Teilnehmer des Matches, die Topic aktiviert haben
  for v_uid in
    with u as (
      select distinct uid::text
      from public._match_participants_uids(new.id)
    )
    select u.uid
    from u
    where public.is_topic_enabled_for_user(u.uid, v_tenant, v_topic)
  loop
    perform public._enqueue_notification(
      v_uid, v_tenant, v_topic,
      'Neues Spiel eingetragen'::text,
      jsonb_build_object('match', new.id, 'url', v_url),
      'game'::text, new.id, 'normal'::text
    );
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_game_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_group_request_confirmed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'group.request.confirmed';
  v_url    text := '/';
begin
  if old.role = 'joinRequested' and new.role in ('user','admin') then
    if public.is_topic_enabled_for_user(new."user", v_tenant, v_topic, 'group', new."group") then
      perform public._enqueue_notification(
        new."user", v_tenant, v_topic,
        'Gruppenbeitritt bestätigt',
        jsonb_build_object('group', new."group", 'url', v_url),
        'group', new."group", 'normal'
      );
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_group_request_confirmed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_notify_item_handover"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'item.handover';
  v_url    text := '/keys';
  v_uid    text;
begin
  for v_uid in
    with u(uid) as (
      select old.current_holder::text where old.current_holder is not null
      union
      select new.current_holder::text where new.current_holder is not null
    )
    select u.uid
    from u
    where public.is_topic_enabled_for_user(u.uid, v_tenant, v_topic)
  loop
    -- BIGINT-Overload: letzter Parameter ist BIGINT (new.id)
    perform public._enqueue_notification(
      v_uid, v_tenant, v_topic,
      'Item-Übergabe'::text,
      jsonb_build_object('item', new.id, 'from', old.current_holder, 'to', new.current_holder, 'url', v_url),
      'item'::text, new.id, 'normal'::text
    );
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."_notify_item_handover"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_sum_challenge_points_for_self"("uid" "text", "challenge_id" "uuid", "from_ts" timestamp with time zone, "to_ts" timestamp with time zone) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE s numeric;
BEGIN
  IF uid IS NULL OR challenge_id IS NULL OR from_ts IS NULL OR to_ts IS NULL THEN
    RAISE EXCEPTION 'invalid args';
  END IF;

  IF uid <> auth.uid()::text THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(cs."count"), 0)
    INTO s
    FROM public.challenge_stats cs
   WHERE cs."user" = uid
     AND cs."challenge" = challenge_id
     AND cs.created_at >= from_ts
     AND cs.created_at <  to_ts;

  RETURN s;
END;
$$;


ALTER FUNCTION "public"."_sum_challenge_points_for_self"("uid" "text", "challenge_id" "uuid", "from_ts" timestamp with time zone, "to_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_trg_refresh_from_udg"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- alle betroffenen User in diesem Statement
  PERFORM public.refresh_user_grants(u."user")
  FROM (
    SELECT DISTINCT "user" FROM new_table
    UNION
    SELECT DISTINCT "user" FROM old_table
  ) AS u;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."_trg_refresh_from_udg"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_trg_refresh_from_udg_stmt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  rec record;
  sql text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- nur NEW TABLE existiert
    sql := 'SELECT DISTINCT "user" AS u FROM new_table';
  ELSIF TG_OP = 'DELETE' THEN
    -- nur OLD TABLE existiert
    sql := 'SELECT DISTINCT "user" AS u FROM old_table';
  ELSE
    -- UPDATE: beide vorhanden
    sql := 'SELECT DISTINCT u FROM (
              SELECT "user" AS u FROM new_table
              UNION
              SELECT "user" AS u FROM old_table
            ) s';
  END IF;

  FOR rec IN EXECUTE sql LOOP
    PERFORM public.refresh_user_grants(rec.u);
  END LOOP;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."_trg_refresh_from_udg_stmt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_drinks_history"("items" json) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    user_id text := auth.uid()::text;
    payment_id bigint;
    drink_record json;
    voucher_record RECORD;
    total_drink_count numeric;
    drink_id bigint;
    drink_count numeric;
    drink_price numeric;
    drink_amount numeric;
BEGIN
    IF jsonb_typeof(items::jsonb) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', items;
    END IF;

    -- get or create payment id
    SELECT id
    INTO payment_id
    FROM payments
    WHERE "userId" = user_id
    AND "paymentState" = 'Open';
    IF
    payment_id IS NULL THEN
            INSERT INTO payments ("userId", "amountToPay", "paymentState")
            VALUES (user_id, 0, 'Open')
            RETURNING id INTO payment_id;
    END IF;

    IF payment_id IS NULL THEN
        RAISE EXCEPTION 'Es wurde kein Payment gefunden oder konnte nicht erstellt werden';
    END IF;

    -- Iterate over all drinks that need to be added
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
        drink_id := (drink_record->>'id')::numeric;
        drink_count := (drink_record->>'count')::numeric;
        drink_price := (drink_record->>'price')::numeric;
        raise log 'Adding drink %', drink_record;
        total_drink_count := drink_count; -- Initialize remaining count for this drink
        -- Loop over the vouchers of the user
        FOR voucher_record IN SELECT id, available FROM user_vouchers
        LOOP
            -- If the remaining count is fulfilled, exit the loop
            IF total_drink_count <= 0 THEN
                EXIT;
            END IF;
            -- Check if the voucher has enough available count
            IF voucher_record.available > 0 THEN
                IF voucher_record.available < total_drink_count THEN
                    -- Create a history entry with the voucher for the available amount
                    drink_amount := drink_price * voucher_record.available;
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, voucher_record.available, drink_amount, voucher_record.id);
                    -- Decrease the remaining count
                    total_drink_count := total_drink_count - voucher_record.available;
                ELSE
                    drink_amount := drink_price * total_drink_count;
                    -- Create a history entry with the voucher for the remaining count
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount, voucher_record.id);
                    -- Set remaining count to zero as it is fulfilled
                    total_drink_count := 0;
                END IF;
            END IF;
        END LOOP;
        -- If there is still remaining count, create a history entry without a voucher
        IF total_drink_count > 0 THEN
            drink_amount := drink_price * total_drink_count;
            INSERT INTO history (drink, "user", payment, count, amount)
            VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount);
        END IF;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Drinks: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."add_drinks_history"("items" json) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_item_history_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
    insert into item_history("pastUser", "currentUser", key)
    values (old."current_holder", new."current_holder", new.id);
    return new;
end;
$$;


ALTER FUNCTION "public"."add_item_history_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_to_public"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$BEGIN
  INSERT INTO public.user ("userId", email, "displayName", name, role, created_at, verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'displayName', ''),
        COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'displayName', '')),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public."UserRole", -- Default role if not provided
        NOW(),
        TRUE
    );
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."add_user_to_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."as_service"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM set_config('role','service_role', true);
  -- service_role hat keine sub-Claim – setzen wir leer
  PERFORM set_config('request.jwt.claims','{}', true);
END $$;


ALTER FUNCTION "public"."as_service"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize"("requested_permission" "text") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_grants ug
    WHERE ug."user" = auth.uid()::text
      AND ug.kind  = 'perm'
      AND ug.key   = requested_permission
      AND ug.tenant = '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;


ALTER FUNCTION "public"."authorize"("requested_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize"("requested_permission" "text", "p_tenant" "uuid") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_grants ug
    WHERE ug."user" = auth.uid()::text
      AND ug.kind  = 'perm'
      AND ug.key   = requested_permission
      AND ug.tenant = COALESCE(p_tenant, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;


ALTER FUNCTION "public"."authorize"("requested_permission" "text", "p_tenant" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_parent_groups"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$DECLARE current_id uuid;
    BEGIN
    -- Keine Prüfung notwendig, wenn kein parent gesetzt wird
    IF NEW.parent_group IS NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Zyklus-Prüfung: Laufe die Kette der Parents nach oben
    current_id := NEW.parent_group;
    WHILE current_id IS NOT NULL LOOP
        -- Zyklus entdeckt?
        IF current_id = NEW.id THEN
            RAISE EXCEPTION 'Zyklische Gruppenbeziehung nicht erlaubt';
        END IF;

        -- Nächsten Parent holen
        SELECT parent_group INTO current_id
        FROM event_group WHERE id = current_id;
    END LOOP;

    -- 2. Oberste Parent-Gruppe darf selbst keinen Parent haben
    current_id := NEW.parent_group;
    LOOP
        SELECT parent_group INTO current_id
        FROM event_group WHERE id = current_id;

        EXIT WHEN current_id IS NULL;

        -- Wenn wir eine Parent-Gruppe finden, die selbst eine Parent hat, ist es ein Fehler
        IF current_id IS NOT NULL THEN
            -- aktuelle Parent hat eine eigene Parent → nicht erlaubt
            RAISE EXCEPTION 'Die oberste Parent-Gruppe darf keinen Parent haben';
        END IF;
    END LOOP;

    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."check_parent_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_reply_to"("value" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN value IS NULL OR NOT EXISTS (
        SELECT 1 
        FROM event_comments 
        WHERE id = value AND reply_to IS NOT NULL
    );
END;
$$;


ALTER FUNCTION "public"."check_reply_to"("value" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_version"("input_version" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN

IF
'1.6.0'::text = input_version THEN
        RETURN TRUE;
ELSE
        raise exception 'Version mismatch';
END IF;
END;
$$;


ALTER FUNCTION "public"."check_version"("input_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_outbox_targets"("p_limit" integer DEFAULT 100, "p_lease_seconds" integer DEFAULT 55, "p_worker" "text" DEFAULT 'push-worker'::"text") RETURNS TABLE("target_id" bigint, "outbox_id" bigint, "user_id" "text", "endpoint" "text", "p256dh" "text", "auth" "text", "payload" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  return query
  with due as (
    select t.id as target_id, t.outbox_id
      from public.notification_outbox_targets t
      join public.notification_outbox o on o.id = t.outbox_id
     where t.status in ('pending','retry')
       and coalesce(t.next_attempt_at, now()) <= now()
       and (t.leased_at is null or t.leased_at < now() - (p_lease_seconds || ' seconds')::interval)
     order by coalesce(t.next_attempt_at, now()), t.id
     limit p_limit
     for update
  ),
  upd as (
    update public.notification_outbox_targets t
       set status = 'sending',
           leased_at = now(),
           leased_by = p_worker
      from due d
     where t.id = d.target_id
     returning t.id as target_id, t.outbox_id
  )
  select
    u.target_id,
    u.outbox_id,
    o."user" as user_id,
    s.endpoint,
    s.p256dh,
    s.auth,
    o.data as payload
  from upd u
  join public.notification_outbox o on o.id = u.outbox_id
  join public.web_push_subscriptions s on s.id = (
    select t.subscription_id
      from public.notification_outbox_targets t
     where t.id = u.target_id
  )
  where s.revoked_at is null;
end;
$$;


ALTER FUNCTION "public"."claim_outbox_targets"("p_limit" integer, "p_lease_seconds" integer, "p_worker" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_all_notifications"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_notif int;
  v_t int; v_o int;
  v_subs int;
begin
  v_notif := public.cleanup_notifications();
  select deleted_targets, deleted_outbox into v_t, v_o from public.cleanup_outbox();
  v_subs  := public.cleanup_revoked_subscriptions();

  return jsonb_build_object(
    'deleted_notifications', v_notif,
    'deleted_targets', v_t,
    'deleted_outbox', v_o,
    'deleted_revoked_subscriptions', v_subs
  );
end;
$$;


ALTER FUNCTION "public"."cleanup_all_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_notifications"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_deleted int := 0;
  v_keep_read interval;
begin
  select keep_read_for into v_keep_read
  from public.notification_retention
  where tenant = '00000000-0000-0000-0000-000000000000';

  delete from public.notifications n
   where (n.read_at is not null and n.created_at < now() - coalesce(v_keep_read, interval '30 days'))
      or (n.expires_at is not null and n.expires_at < now());

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


ALTER FUNCTION "public"."cleanup_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_outbox"() RETURNS TABLE("deleted_targets" integer, "deleted_outbox" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_keep_sent interval;
  v_del_t int := 0;
  v_del_o int := 0;
begin
  select keep_sent_outbox_for into v_keep_sent
  from public.notification_retention
  where tenant = '00000000-0000-0000-0000-000000000000';

  -- alte erfolgreiche Targets weg
  delete from public.notification_outbox_targets t
   using public.notification_outbox o
   where t.outbox_id = o.id
     and t.status in ('sent','skipped')
     and o.sent_at is not null
     and o.sent_at < now() - coalesce(v_keep_sent, interval '7 days');
  get diagnostics v_del_t = row_count;

  -- alte erfolgreiche Outbox wegräumen (wenn keine Targets mehr)
  delete from public.notification_outbox o
   where o.status in ('sent','dead')
     and o.sent_at is not null
     and o.sent_at < now() - coalesce(v_keep_sent, interval '7 days');
  get diagnostics v_del_o = row_count;

  return query select v_del_t, v_del_o;
end;
$$;


ALTER FUNCTION "public"."cleanup_outbox"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_revoked_subscriptions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_keep_rev interval;
  v_deleted int := 0;
begin
  select keep_revoked_sub_for into v_keep_rev
  from public.notification_retention
  where tenant = '00000000-0000-0000-0000-000000000000';

  delete from public.web_push_subscriptions
   where revoked_at is not null
     and revoked_at < now() - coalesce(v_keep_rev, interval '30 days');

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


ALTER FUNCTION "public"."cleanup_revoked_subscriptions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_target_failed"("p_target_id" bigint, "p_status" integer, "p_error" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_outbox bigint;
  v_attempts int;
  v_next timestamptz;
begin
  select outbox_id, coalesce(attempt_count,0)+1 into v_outbox, v_attempts
  from public.notification_outbox_targets where id = p_target_id;

  -- 404/410: Subscription tot -> target 'skipped' + Subscription revoken
  if p_status in (404,410) then
    update public.notification_outbox_targets
       set status='skipped',
           attempt_count = v_attempts,
           last_status = p_status,
           last_error = p_error,
           next_attempt_at = null
     where id = p_target_id;

    update public.web_push_subscriptions s
       set revoked_at = now()
     where s.id = (
       select subscription_id
         from public.notification_outbox_targets
        where id = p_target_id
     );
  else
    -- 403: meist VAPID-Mismatch -> retry mit Backoff, aber limitiert
    if p_status = 403 then
      v_next := now() + (least(v_attempts, 6) * interval '10 seconds'); -- 10s,20s,...60s
    else
      -- generische Fehler: exponentiell mit Cap
      v_next := now() + (power(2, least(v_attempts, 6)) * interval '5 seconds'); -- 5s,10s,...320s
    end if;

    if v_attempts >= 6 then
      update public.notification_outbox_targets
         set status='dead',
             attempt_count = v_attempts,
             last_status = p_status,
             last_error = p_error,
             next_attempt_at = null
       where id = p_target_id;
    else
      update public.notification_outbox_targets
         set status='retry',
             attempt_count = v_attempts,
             last_status = p_status,
             last_error = p_error,
             next_attempt_at = v_next
       where id = p_target_id;
    end if;
  end if;

  -- Outbox auf 'dead' setzen, wenn KEIN target mehr offen und mind. eins 'dead'
  update public.notification_outbox o
     set status = 'dead'
   where o.id = v_outbox
     and not exists (
       select 1 from public.notification_outbox_targets t
        where t.outbox_id = o.id and t.status in ('pending','retry','sending')
     )
     and exists (
       select 1 from public.notification_outbox_targets t
        where t.outbox_id = o.id and t.status = 'dead'
     );
end;
$$;


ALTER FUNCTION "public"."complete_target_failed"("p_target_id" bigint, "p_status" integer, "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_target_sent"("p_target_id" bigint) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  update public.notification_outbox_targets
     set status = 'sent',
         attempt_count = coalesce(attempt_count,0) + 1,
         last_status = 201,
         last_error = null,
         next_attempt_at = null
   where outbox_id = p_target_id;

  -- Outbox ggf. auf 'sent' setzen, wenn alle Targets erledigt
  update public.notification_outbox o
     set status = 'sent',
         sent_at = coalesce(sent_at, now())
   where o.id = (
     select outbox_id from public.notification_outbox_targets where outbox_id = p_target_id
   )
     and not exists (
       select 1 from public.notification_outbox_targets t
        where t.outbox_id = o.id and t.status in ('pending','retry','sending')
     );
$$;


ALTER FUNCTION "public"."complete_target_sent"("p_target_id" bigint) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."event_group" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "color" "text" DEFAULT '#000000'::"text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "need_request_to_join" boolean DEFAULT false NOT NULL,
    "parent_group" "uuid",
    "visible" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."event_group" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."event_group"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  new_group public.event_group;
begin
  -- Neue Gruppe anlegen und vollständiges Objekt in Variable speichern
  insert into public.event_group (
    name, description, color, is_public, need_request_to_join, parent_group
  ) values (
    group_name, group_description, group_color, is_public, need_request, parent
  )
  returning * into new_group;

  -- Mapping mit dem Ersteller anlegen
  insert into public.group_user_mapping ("user", "group", role)
  values (user_id, new_group.id, role);

  -- Ganze Gruppe zurückgeben
  return new_group;

exception
  when others then
    raise exception 'Fehler beim Erstellen der Gruppe: %', sqlerrm;
end;
$$;


ALTER FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_next_occurrences"("p_run_at" timestamp with time zone, "p_horizon" interval) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_inserted int := 0;
begin
  -- Weekly & Fortnightly in einem Rutsch.
  -- Für Monthly kann separat erweitert werden.
  with base as (
    -- pro Serie (key) eine "Basis-Zeile": früheste Instanz als Referenz
    select distinct on (e."key")
           e."key",
           e."group",
           e.title, e.description, e.place,
           e.recurrence,
           e."answerDeadline", e."maxAttendees", e."recurrenceEnd",
           e.items_enabled, e.constellations_enabled, e.required_item,
           e."startingDateTime" as base_start,
           (e."endDateTime" - e."startingDateTime") as dur
    from public.events e
    where e.recurrence in ('Weekly','Fortnightly')
    order by e."key", e."startingDateTime"
  ),
  expanded as (
    select b.*,
           case b.recurrence
             when 'Weekly'      then interval '7 days'
             when 'Fortnightly' then interval '14 days'
           end as step
    from base b
  ),
  seeds as (
    select
      e.*,
      -- nächste Serie-Startzeit ≥ p_run_at, an 'step' ausgerichtet
      (
        e.base_start
        + ceil(
            extract(epoch from (p_run_at - e.base_start))
            / extract(epoch from e.step)
          )::int * e.step
      ) as ns
    from expanded e
  ),
  horizon as (
    select s.*, (s.ns + p_horizon) as hz
    from seeds s
  ),
  candidates as (
    -- inklusiv bis hz (<=)
    select h."key", h."group", h.title, h.description, h.place, h.recurrence,
           h."answerDeadline", h."maxAttendees", h."recurrenceEnd",
           h.items_enabled, h.constellations_enabled, h.required_item,
           h.dur,
           gs as start_time,
           (gs + h.dur) as end_time
    from horizon h,
         lateral generate_series(h.ns, h.hz, h.step) as gs
    where (h."recurrenceEnd" is null or gs <= h."recurrenceEnd")
  ),
  to_insert as (
    -- Anti-Join: nimm nur die, die es noch nicht gibt
    select c.*
    from candidates c
    left join public.events e
      on e."key" = c."key" and e."startingDateTime" = c.start_time
    where e.id is null
  )
  insert into public.events(
    "key", title, description, recurrence,
    "startingDateTime","endDateTime","group",
    place, "answerDeadline","maxAttendees","recurrenceEnd",
    items_enabled, constellations_enabled, required_item
  )
  select "key", title, description, recurrence,
         start_time, end_time, "group",
         place, "answerDeadline","maxAttendees","recurrenceEnd",
         items_enabled, constellations_enabled, required_item
  from to_insert
  on conflict ("key","startingDateTime") do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;


ALTER FUNCTION "public"."create_next_occurrences"("p_run_at" timestamp with time zone, "p_horizon" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  declare
    claims jsonb;
    permissions text[];
    features text[];
  begin

    Select array(select distinct gp."permission"::text from public."group_permissions" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user" = (event->>'user_id')::text and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into permissions;

    Select array(select distinct gp."feature"::text from public."group_features" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user" = (event->>'user_id')::text and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into features;

    claims := event->'claims';

    if permissions is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_permissions}', to_jsonb(permissions));
    else
      claims := jsonb_set(claims, '{user_permissions}', '[]'::jsonb);
    end if;

    if features is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_features}', to_jsonb(features));
    else
      claims := jsonb_set(claims, '{user_features}', '[]'::jsonb);
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_from_subgroups"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$DECLARE
  is_root_group BOOLEAN;
BEGIN
  -- Prüfe, ob die gelöschte group_id eine Hauptgruppe ist
  SELECT parent_group IS NULL INTO is_root_group
  FROM event_group
  WHERE id = OLD."group";

  -- Wenn es keine Hauptgruppe ist, mache nichts
  IF NOT is_root_group THEN
    RETURN OLD;
  END IF;

  -- Lösche alle Mappings in Untergruppen rekursiv
  DELETE FROM group_user_mapping
  WHERE "user" = OLD."user"
    AND "group" IN (
      WITH RECURSIVE subgroups AS (
        SELECT id FROM event_group WHERE parent_group = OLD."group"
        UNION ALL
        SELECT g.id
        FROM event_group g
        INNER JOIN subgroups sg ON g.parent_group = sg.id
      )
      SELECT id FROM subgroups
    );

  RETURN OLD;
END;$$;


ALTER FUNCTION "public"."delete_user_from_subgroups"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#88AEBF'::"text" NOT NULL,
    "type" "public"."ItemType" NOT NULL,
    "lastUpdate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_holder" "text",
    "group" "uuid"
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edit_item"("p_id" bigint, "p_name" "text" DEFAULT NULL::"text", "p_color" "text" DEFAULT NULL::"text", "p_type" "public"."ItemType" DEFAULT NULL::"public"."ItemType") RETURNS "public"."items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE r public.items;
BEGIN
  IF NOT public.authorize('items.manage') THEN
    RAISE EXCEPTION 'missing permission items.manage (user=%)', auth.uid()::text
      USING ERRCODE='42501';
  END IF;

  UPDATE public.items
  SET name         = COALESCE(p_name,  name),
      color        = COALESCE(p_color, color),
      type         = COALESCE(p_type,  type),
      "lastUpdate" = now()
  WHERE id = p_id
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item % not found', p_id
      USING ERRCODE='23503';
  END IF;

  RETURN r;
END;
$$;


ALTER FUNCTION "public"."edit_item"("p_id" bigint, "p_name" "text", "p_color" "text", "p_type" "public"."ItemType") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_notification"("p_user" "text", "p_title" "text", "p_body" "text" DEFAULT NULL::"text", "p_data" "jsonb" DEFAULT NULL::"jsonb", "p_urgency" "text" DEFAULT 'normal'::"text", "p_ttl_seconds" integer DEFAULT NULL::integer, "p_tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid", "p_dedupe_key" "text" DEFAULT NULL::"text", "p_topic" "text" DEFAULT NULL::"text", "p_source_type" "text" DEFAULT NULL::"text", "p_source_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_id bigint;
  v_nid uuid;
begin
  -- optional: zuerst In-App Notification anlegen
  insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
  values (p_user, p_tenant, coalesce(p_topic,'custom'), p_title, p_body, p_data, p_source_type, p_source_id)
  returning id into v_nid;

  insert into public.notification_outbox("user", title, body, data, urgency, ttl_seconds, tenant, dedupe_key, notification)
  values (p_user, p_title, p_body, p_data, p_urgency, p_ttl_seconds, p_tenant, p_dedupe_key, v_nid)
  returning id into v_id;

  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select v_id, s.id
  from public.web_push_subscriptions s
  where s."user" = p_user and s.revoked_at is null;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."enqueue_notification"("p_user" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_urgency" "text", "p_ttl_seconds" integer, "p_tenant" "uuid", "p_dedupe_key" "text", "p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eventcreation"() RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$declare 
  request_id text;
BEGIN
  select net.http_post(
          url:='https://PROJECT_REF.supabase.co/functions/v1/event-creation',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer REMOVED_KEY"}'::jsonb,
          body:='{"name":"Functions"}'::jsonb
      ) as request_id;
      return request_id;
END;$$;


ALTER FUNCTION "public"."eventcreation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_attending_users"("event_id" bigint) RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
RETURN QUERY
      SELECT userID FROM users WHERE 'eventComments' = any (notificationTags) AND "userId" in (
    SELECT "user" FROM event_attendance_user_mapping WHERE state = 'Attending' AND event = event_id
  );
END;
$$;


ALTER FUNCTION "public"."get_attending_users"("event_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") RETURNS TABLE("column_name" "text", "data_type" "text", "is_nullable" boolean, "foreign_key_schema_name" "text", "foreign_key_table_name" "text", "foreign_key_column_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (c.column_name)
    c.column_name::text,
    CASE 
      WHEN c.data_type = 'USER-DEFINED' THEN CONCAT('ENUM,', c.udt_name::text)
      ELSE c.data_type::text
    END AS data_type,
    (c.is_nullable = 'YES') AS is_nullable,
    ccu.table_schema::text AS foreign_key_schema_name,
    ccu.table_name::text AS foreign_key_table_name,
    ccu.column_name::text AS foreign_key_column_name
  FROM
    information_schema.columns AS c
  LEFT JOIN information_schema.key_column_usage AS kcu
    ON c.table_name = kcu.table_name
    AND c.table_schema = kcu.table_schema
    AND c.column_name = kcu.column_name
  LEFT JOIN information_schema.table_constraints AS tc
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.constraint_type = 'FOREIGN KEY'
  LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  LEFT JOIN pg_type t 
    ON t.typname = c.udt_name
  WHERE
    c.table_schema = schema_name
    AND c.table_name = selected_table
  ORDER BY
    c.column_name,
    -- Priorisiere Zeilen mit vorhandener Foreign-Key-Relation (ccu.column_name IS NOT NULL)
    (ccu.column_name IS NOT NULL) DESC;
END;
$$;


ALTER FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enum_types"() RETURNS TABLE("enum_name" "text", "enum_values" "text"[])
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_type.typname::text AS enum_name,
        ARRAY_AGG(pg_enum.enumlabel::text) AS enum_values
    FROM 
        pg_enum
    JOIN 
        pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE 
        pg_type.typcategory = 'E'  -- 'E' indicates enum types
        AND pg_type.typname NOT IN ('aal_level', 'action', 'code_challenge_method', 'equality_op','factor_status','factor_type','key_status','key_type','one_time_token_type','request_status')  -- Replace with actual enum names to exclude
    GROUP BY 
        pg_type.typname;
END;
$$;


ALTER FUNCTION "public"."get_enum_types"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
payment_id bigint;
BEGIN
SELECT id
INTO payment_id
FROM payments
WHERE "userId" = user_id
  AND "paymentState" = 'Open';
IF
payment_id IS NULL THEN
        INSERT INTO payments ("userId", "amountToPay", "paymentState")
        VALUES (user_id, 0, 'Open')
        RETURNING id INTO payment_id;
END IF;
RETURN payment_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_table_names"() RETURNS TABLE("table_name" "text", "table_schema" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text, t.table_schema::text
    FROM information_schema.tables AS t
    WHERE (t.table_schema = 'public' OR t.table_schema = 'permissions' OR t.table_schema = 'games' OR t.table_schema = 'logs')
      AND t.table_type = 'BASE TABLE';
END;
$$;


ALTER FUNCTION "public"."get_public_table_names"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."getattendingusers"("event_id" bigint) RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
RETURN QUERY
      select "userId" from "user"
      where
        'edit;user' = any (permissions)
      and
        "userId" in (
          select "user" from event_attendance_user_mapping
            where
              state = 'Attending' and event = event_id
  );
END;
$$;


ALTER FUNCTION "public"."getattendingusers"("event_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gettingjsonarray"("items" json) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    voucher_record RECORD;
    drink_record json;
BEGIN
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
       raise log 'logging message: %', drink_record->>'name';
    END LOOP;
    
END;
$$;


ALTER FUNCTION "public"."gettingjsonarray"("items" json) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_group_grants"("p_group" "uuid", "p_perms" "text"[] DEFAULT ARRAY[]::"text"[], "p_feats" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
  v_is_group_admin boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  -- Gruppen-Admin?
  select exists(
           select 1
             from public.group_user_mapping gum
            where gum."group" = p_group
              and gum."user"  = v_uid
              and gum."role"  = 'admin'
         )
    into v_is_group_admin;

  if not (v_is_admin or v_is_group_admin) then
    raise exception 'forbidden (not group admin)' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    insert into public.permissions(name)
    select distinct k from unnest(p_perms) u(k)
    on conflict do nothing;

    insert into public.group_permissions("group","permission")
    select p_group, k from unnest(p_perms) u(k)
    on conflict do nothing;
  end if;

  if array_length(p_feats,1) is not null then
    begin
      insert into public.features(name)
      select distinct k from unnest(p_feats) u(k)
      on conflict do nothing;

      insert into public.group_features("group","feature")
      select p_group, k from unnest(p_feats) u(k)
      on conflict do nothing;
    exception
      when undefined_table then
        -- installations ohne group_features: ignorieren
        raise notice 'group_features table not found – skipping feature grants for group %', p_group;
    end;
  end if;
end;
$$;


ALTER FUNCTION "public"."grant_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_user_grants"("p_user" "text", "p_tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid", "p_perms" "text"[] DEFAULT ARRAY[]::"text"[], "p_feats" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not v_is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Normalize: leere Arrays abfangen
  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  -- (optional) fehlende Stammsätze anlegen – falls FK existiert
  if array_length(p_perms,1) is not null then
    insert into public.permissions(name)
    select distinct k from unnest(p_perms) u(k)
    on conflict do nothing;

    insert into public.user_direct_grants("user", tenant, kind, key)
    select p_user, p_tenant, 'perm', k from unnest(p_perms) u(k)
    on conflict do nothing;
  end if;

  if array_length(p_feats,1) is not null then
    insert into public.features(name)
    select distinct k from unnest(p_feats) u(k)
    on conflict do nothing;

    insert into public.user_direct_grants("user", tenant, kind, key)
    select p_user, p_tenant, 'feat', k from unnest(p_feats) u(k)
    on conflict do nothing;
  end if;
end;
$$;


ALTER FUNCTION "public"."grant_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$DECLARE
  v_name    text;
  v_display text;
BEGIN
  -- Aus Metadata sinnvolle Werte ziehen, mit Fallbacks
  v_name    := COALESCE(
                 NEW.raw_user_meta_data->>'name',
                 NEW.raw_user_meta_data->>'displayName',
                 'Anonymous'
               );

  v_display := COALESCE(
                 NEW.raw_user_meta_data->>'displayName',
                 v_name
               );

  -- In deine User-Tabelle eintragen (UUID als Text, wie bei dir üblich)
  INSERT INTO public."user"("userId","displayName","email","name")
  VALUES (NEW.id::text, v_display, NEW.email, v_name)
  ON CONFLICT ("userId") DO NOTHING;

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inc_target_attempt"("p_outbox_id" bigint, "p_subscription_id" "uuid", "p_status" integer, "p_error" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  update public.notification_outbox_targets
     set attempt_count = attempt_count + 1,
         last_status = p_status,
         last_error = p_error
   where outbox_id = p_outbox_id
     and subscription_id = p_subscription_id;
$$;


ALTER FUNCTION "public"."inc_target_attempt"("p_outbox_id" bigint, "p_subscription_id" "uuid", "p_status" integer, "p_error" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge_stats" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "count" numeric DEFAULT '0'::numeric NOT NULL,
    "image_url" "text",
    "challenge" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."challenge_stats" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increase_challenge_stats_count"("challenge_id" "uuid", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text" DEFAULT NULL::"text") RETURNS "public"."challenge_stats"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  c          public.challenge;
  new_stat   public.challenge_stats;
  uid        text := auth.uid()::text;
  week_start timestamptz;
  week_end   timestamptz;
  day_start  timestamptz;
  day_end    timestamptz;
  week_sum   numeric;
  day_sum    numeric;
BEGIN
  -- Basic inputs
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  SELECT * INTO c FROM public.challenge WHERE id = challenge_id;
  IF c IS NULL THEN
    RAISE EXCEPTION 'Could not select given challenge';
  END IF;

  IF c.automated THEN
    RAISE EXCEPTION 'This challenge is automated. You can not add any points manually';
  END IF;

  -- Membership check (clear error instead of vague RLS failure)
  IF NOT EXISTS (
    SELECT 1 FROM public.group_user_mapping gum
     WHERE gum."group" = c."group"
       AND gum."user"  = uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of the challenge''s group' USING ERRCODE = '42501';
  END IF;

  -- Reject single-call overflow irrespective of prior rows
  IF amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;
  IF amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  -- Windows anchored on the attempted timestamp
  week_start := date_trunc('week', to_create_at);
  week_end   := week_start + interval '7 days';
  day_start  := date_trunc('day', to_create_at);
  day_end    := day_start + interval '1 day';

  -- RLS-immune sums (only for the caller's own uid)
  week_sum := public._sum_challenge_points_for_self(uid, challenge_id, week_start, week_end);
  day_sum  := public._sum_challenge_points_for_self(uid, challenge_id, day_start, day_end);

  -- Cumulative caps
  IF week_sum + amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  IF day_sum + amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;

  -- Insert for the actor (RLS still applies to the INSERT)
  INSERT INTO public.challenge_stats ("user","challenge","count","created_at","image_url")
  VALUES (uid, challenge_id, amount, to_create_at, image_url)
  RETURNING * INTO new_stat;

  RETURN new_stat;
END;
$$;


ALTER FUNCTION "public"."increase_challenge_stats_count"("challenge_id" "uuid", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invoke_edge_function"("p_function_name" "text", "p_body" "jsonb" DEFAULT '{}'::"jsonb", "p_timeout_ms" integer DEFAULT 5000) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_base   text;
  v_token  text;
  v_url    text;
  v_req_id bigint;
  v_headers jsonb;
begin
  -- Secrets zur Laufzeit aus Vault holen
  select decrypted_secret into v_base
  from vault.decrypted_secrets
  where name = 'EDGE_BASE_URL' limit 1;

  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'EDGE_BEARER' limit 1;

  if v_base is null or v_token is null then
    raise exception 'Missing Vault secrets EDGE_BASE_URL or EDGE_BEARER';
  end if;

  v_url := rtrim(v_base, '/') || '/functions/v1/' || p_function_name;

  v_headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || v_token
  );

  -- Asynchroner HTTP-POST (Start nach COMMIT der TX)
  select net.http_post(
           url := v_url,
           body := coalesce(p_body, '{}'::jsonb),
           headers := v_headers,
           timeout_milliseconds := p_timeout_ms
         )
    into v_req_id;

  return v_req_id;
end;
$$;


ALTER FUNCTION "public"."invoke_edge_function"("p_function_name" "text", "p_body" "jsonb", "p_timeout_ms" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" bigint) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select public.is_topic_enabled_for_user($1,$2,$3)
$_$;


ALTER FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
  select public.is_topic_enabled_for_user($1,$2,$3)
$_$;


ALTER FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text" DEFAULT NULL::"text", "p_scope_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select coalesce((
    select enabled
    from public.user_notification_preferences p
    where p."user" = p_user
      and p.tenant  = p_tenant
      and p.topic   = p_topic
      and p.channel = 'webpush'
      and (
           (p.scope_type is null and p_scope_type is null) or
           (p.scope_type = p_scope_type and (p.scope_id is null or p.scope_id = p_scope_id))
      )
    order by (p.scope_type is null) asc, (p.scope_id is null) asc
    limit 1
  ), true);
$$;


ALTER FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_user_mapping
    WHERE "group" = group_id AND "user" = auth.uid()::text
    AND "role" = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_in_group"("group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_user_mapping
    WHERE "group" = group_id AND "user" = auth.uid()::text
  );
$$;


ALTER FUNCTION "public"."is_user_in_group"("group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."key_handover"("p_key_id" bigint, "p_new_holder" "text") RETURNS TABLE("key_id" bigint, "holder" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$DECLARE
  v_old   text;
  v_group uuid;
BEGIN
  -- Item laden & sperren
  SELECT i."current_holder", i."group"
    INTO v_old, v_group
  FROM public.items AS i
  WHERE i.id = p_key_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item % not found', p_key_id
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s new_holder=%s', p_key_id, p_new_holder);
  END IF;

  IF v_group IS NULL THEN
    RAISE EXCEPTION 'item % has no group', p_key_id
      USING ERRCODE = '23514',
            DETAIL   = format('key_id=%s new_holder=%s', p_key_id, p_new_holder);
  END IF;

  -- Nur Gruppenmitglieder dürfen übergeben/übernehmen
  IF NOT EXISTS (
    SELECT 1
    FROM public.group_user_mapping gum
    WHERE gum."group" = v_group
      AND gum."user"  = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'not in group for item %', p_key_id
      USING ERRCODE = '42501',
            DETAIL   = format('actor=%s group=%s', auth.uid()::text, v_group::text),
            HINT     = 'membership in group required';
  END IF;

  -- Ziel-User existiert?
  PERFORM 1 FROM public."user" u WHERE u."userId" = p_new_holder;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'new holder % not found', p_new_holder
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s', p_key_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_user_mapping gum
    WHERE gum."group" = v_group
      AND gum."user"  = p_new_holder
  ) THEN
    RAISE EXCEPTION 'new holder % not in group', p_new_holder
      USING ERRCODE = '23503',
            DETAIL   = format('key_id=%s', p_key_id);
  END IF;

  -- Nur aktualisieren, wenn sich der Halter wirklich ändert
  IF v_old IS DISTINCT FROM p_new_holder THEN
    UPDATE public.items i
       SET "current_holder" = p_new_holder,
           "lastUpdate"     = now()
     WHERE i.id = p_key_id;
    -- dein bestehender Trigger auf UPDATE OF current_holder schreibt item_history
  END IF;

  RETURN QUERY
  SELECT i.id, i."current_holder"::text
  FROM public.items i
  WHERE i.id = p_key_id;
END;$$;


ALTER FUNCTION "public"."key_handover"("p_key_id" bigint, "p_new_holder" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("p_topic" "text" DEFAULT NULL::"text", "p_source_type" "text" DEFAULT NULL::"text", "p_source_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  with upd as (
    update public.notifications n
       set read_at = now()
     where n."user" = auth.uid()::text
       and n.read_at is null
       and (p_topic is null or n.topic = p_topic)
       and (p_source_type is null or n.source_type = p_source_type)
       and (p_source_id is null or n.source_id = p_source_id)
     returning 1
  )
  select count(*)::int from upd;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"("p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  update public.notifications
     set read_at = now()
   where id = p_id
     and "user" = auth.uid()::text;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_user_grants"("p_user" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_global uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'p_user required';
  END IF;

  -- Cache für p_user komplett aus Quellen (group + direct) neu aufbauen
  DELETE FROM public.user_grants ug
   WHERE ug."user" = p_user
     AND ug.granted_by IN ('group','direct');

  -- Gruppen-Permissions → Cache
  IF to_regclass('public.group_user_mapping') IS NOT NULL
     AND to_regclass('public.group_permissions')  IS NOT NULL THEN
    INSERT INTO public.user_grants ("user", tenant, kind, key, granted_by)
    SELECT p_user, v_global, 'perm'::public.grant_kind, q.perm, 'group'
    FROM (
      SELECT DISTINCT gp."permission" AS perm
      FROM public.group_user_mapping gum
      JOIN public.group_permissions  gp ON gp."group" = gum."group"
      WHERE gum."user" = p_user
    ) q
    ON CONFLICT ("user", kind, key, tenant) DO NOTHING;
  END IF;

  -- Gruppen-Features → Cache (falls vorhanden)
  IF to_regclass('public.group_features') IS NOT NULL THEN
    INSERT INTO public.user_grants ("user", tenant, kind, key, granted_by)
    SELECT p_user, v_global, 'feat'::public.grant_kind, q.feat, 'group'
    FROM (
      SELECT DISTINCT gf."feature" AS feat
      FROM public.group_user_mapping gum
      JOIN public.group_features    gf ON gf."group" = gum."group"
      WHERE gum."user" = p_user
    ) q
    ON CONFLICT ("user", kind, key, tenant) DO NOTHING;
  END IF;

  -- ➕ Direkte Grants → Cache  (Tenant aus Quelle übernehmen)
  INSERT INTO public.user_grants ("user", tenant, kind, key, granted_by)
  SELECT p_user, g.tenant, g.kind, g.key, 'direct'
  FROM public.user_direct_grants g
  WHERE g."user" = p_user
  ON CONFLICT ("user", kind, key, tenant) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."refresh_user_grants"("p_user" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_web_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text" DEFAULT NULL::"text", "p_platform" "text" DEFAULT NULL::"text", "p_expiration" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_uid text := auth.uid()::text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28P01'; end if;

  insert into public.web_push_subscriptions("user", endpoint, p256dh, auth, ua, platform, expiration_time, last_seen, revoked_at)
  values (v_uid, p_endpoint, p_p256dh, p_auth, p_ua, p_platform, p_expiration, now(), null)
  on conflict ("user", endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        ua = excluded.ua,
        platform = excluded.platform,
        expiration_time = excluded.expiration_time,
        last_seen = now(),
        revoked_at = null
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."register_web_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text", "p_platform" "text", "p_expiration" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_group_grants"("p_group" "uuid", "p_perms" "text"[] DEFAULT ARRAY[]::"text"[], "p_feats" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
  v_is_group_admin boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  select exists(
           select 1
             from public.group_user_mapping gum
            where gum."group" = p_group
              and gum."user"  = v_uid
              and gum."role"  = 'admin'
         )
    into v_is_group_admin;

  if not (v_is_admin or v_is_group_admin) then
    raise exception 'forbidden (not group admin)' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    delete from public.group_permissions
     where "group" = p_group
       and "permission" = any(p_perms);
  end if;

  if array_length(p_feats,1) is not null then
    begin
      delete from public.group_features
       where "group" = p_group
         and "feature" = any(p_feats);
    exception
      when undefined_table then
        raise notice 'group_features table not found – skipping feature revokes for group %', p_group;
    end;
  end if;
end;
$$;


ALTER FUNCTION "public"."revoke_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_user_grants"("p_user" "text", "p_tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid", "p_perms" "text"[] DEFAULT ARRAY[]::"text"[], "p_feats" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not v_is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    delete from public.user_direct_grants
     where "user" = p_user
       and tenant = p_tenant
       and kind   = 'perm'
       and key    = any(p_perms);
  end if;

  if array_length(p_feats,1) is not null then
    delete from public.user_direct_grants
     where "user" = p_user
       and tenant = p_tenant
       and kind   = 'feat'
       and key    = any(p_feats);
  end if;
end;
$$;


ALTER FUNCTION "public"."revoke_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "user" "text" NOT NULL,
    "tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "channel" "text" DEFAULT 'webpush'::"text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "scope_type" "text",
    "scope_id" "uuid",
    "scope_type_norm" "text" GENERATED ALWAYS AS (COALESCE("scope_type", '_'::"text")) STORED NOT NULL,
    "scope_id_norm" "uuid" GENERATED ALWAYS AS (COALESCE("scope_id", '00000000-0000-0000-0000-000000000000'::"uuid")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_notification_pref"("p_topic" "text", "p_enabled" boolean, "p_channel" "text" DEFAULT 'webpush'::"text", "p_scope_type" "text" DEFAULT NULL::"text", "p_scope_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."user_notification_preferences"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_row public.user_notification_preferences;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  insert into public.user_notification_preferences(
    "user", tenant, topic, channel, enabled, scope_type, scope_id
  ) values (
    auth.uid()::text, v_tenant, p_topic, coalesce(p_channel,'webpush'),
    p_enabled, p_scope_type, p_scope_id
  )
  on conflict ("user", tenant, topic, channel, scope_type_norm, scope_id_norm)
  do update set
    enabled    = excluded.enabled,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."set_notification_pref"("p_topic" "text", "p_enabled" boolean, "p_channel" "text", "p_scope_type" "text", "p_scope_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_login"("uid" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
END; $$;


ALTER FUNCTION "public"."test_login"("uid" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_seed_grant_feature"("p_group" "uuid", "p_feature" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.features(name) VALUES (p_feature)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.group_features("group","feature")
  VALUES (p_group, p_feature)
  ON CONFLICT DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."test_seed_grant_feature"("p_group" "uuid", "p_feature" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_seed_grant_permission"("p_group" "uuid", "p_perm" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.permissions(name) VALUES (p_perm)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.group_permissions("group","permission")
  VALUES (p_group, p_perm)
  ON CONFLICT DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."test_seed_grant_permission"("p_group" "uuid", "p_perm" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_check_item_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_required numeric;
  v_sum      numeric;
  v_new_qty  numeric;
BEGIN
  SELECT required_qty INTO v_required FROM public.event_bring_items WHERE id = NEW.item;
  IF v_required IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  -- Bestandsaufnahme nur aus pledges, die nicht 'cancelled' sind
  SELECT COALESCE(SUM(qty),0) INTO v_sum
  FROM public.event_bring_pledges
  WHERE item = NEW.item
    AND status IN ('pledged','fulfilled')
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'); -- beim UPDATE die eigene Zeile ausnehmen

  v_new_qty := CASE WHEN NEW.status IN ('pledged','fulfilled') THEN COALESCE(NEW.qty,0) ELSE 0 END;

  IF v_sum + v_new_qty > v_required THEN
    RAISE EXCEPTION 'Capacity exceeded: required=%, current=%, new=%', v_required, v_sum, v_new_qty;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_check_item_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_items_guard_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NOT public.authorize('items.manage') THEN
    -- erlaubte Änderungen für Nicht-Manager: ausschließlich current_holder
    IF (NEW.name  IS DISTINCT FROM OLD.name)
       OR (NEW.color IS DISTINCT FROM OLD.color)
       OR (NEW.type  IS DISTINCT FROM OLD.type)
       OR (NEW."group" IS DISTINCT FROM OLD."group")
    THEN
      RAISE EXCEPTION 'only current_holder can be updated by non-managers';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_items_guard_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_items_handover_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$BEGIN
  IF TG_OP = 'UPDATE' AND NEW.current_holder IS DISTINCT FROM OLD.current_holder THEN
    INSERT INTO public.item_history("pastUser", "currentUser", key)
    VALUES (OLD.current_holder, NEW.current_holder, NEW.id);
  END IF;
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."trg_items_handover_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_pledge_sanity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.qty is null or new.qty <= 0 then
    raise exception 'qty must be > 0' using errcode = '23514';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."trg_pledge_sanity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_grants_on_group_features"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    BEGIN
      PERFORM public.refresh_user_grants(gum."user")
      FROM public.group_user_mapping gum
      WHERE gum."group" = COALESCE(NEW."group", OLD."group");
      RETURN NULL;
    END;
    $$;


ALTER FUNCTION "public"."trg_refresh_grants_on_group_features"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_grants_on_group_permissions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- alle Users der betroffenen Gruppe refreshen
  PERFORM public.refresh_user_grants(gum."user")
  FROM public.group_user_mapping gum
  WHERE gum."group" = COALESCE(NEW."group", OLD."group");
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trg_refresh_grants_on_group_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_grants_on_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE uid text;
BEGIN
  uid := COALESCE(NEW."user", OLD."user");
  PERFORM public.refresh_user_grants(uid);
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trg_refresh_grants_on_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_sync_pledge_event_from_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_event uuid;
BEGIN
  SELECT i.event INTO v_event FROM public.event_bring_items i WHERE i.id = NEW.item;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Unknown item referenced';
  END IF;
  NEW.event := v_event;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_sync_pledge_event_from_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unregister_web_push_subscription"("p_endpoint" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  update public.web_push_subscriptions
     set revoked_at = now()
   where endpoint = p_endpoint
     and "user" = auth.uid()::text;
end;
$$;


ALTER FUNCTION "public"."unregister_web_push_subscription"("p_endpoint" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_attendance_user_mapping" (
    "lastUpdate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "state" "public"."EventAttendance" DEFAULT 'Unanswered'::"public"."EventAttendance" NOT NULL,
    "event" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."event_attendance_user_mapping" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_attendance"("p_event" "uuid", "p_user" "text", "p_state" "public"."EventAttendance") RETURNS SETOF "public"."event_attendance_user_mapping"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_is_member   boolean;
  v_event_open  boolean;
  v_max         numeric;
  v_accepted    bigint;
  v_final_state public."EventAttendance";
BEGIN
  -- 1) Actor muss Mitglied der Event-Gruppe sein
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = auth.uid()::text
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'forbidden: not a member of the event''s group' USING ERRCODE = '42501';
  END IF;

  -- 2) Event offen & nicht abgesagt
  SELECT (e."startingDateTime" > now() AND e."isCancelled" = FALSE)
  FROM public.events e
  WHERE e.id = p_event
  INTO v_event_open;

  IF COALESCE(v_event_open, false) = false THEN
    RAISE EXCEPTION 'event closed: cannot change attendance' USING ERRCODE = '22023';
  END IF;

  -- 3) Für andere zu-/absagen nur mit Permission
  IF p_user <> auth.uid()::text AND NOT public.authorize('event.attendance.manage') THEN
    RAISE EXCEPTION 'forbidden: cannot update other user''s attendance' USING ERRCODE = '42501';
  END IF;

  -- 4) Kapazität (Accepted zählt)
  SELECT e."maxAttendees" INTO v_max FROM public.events e WHERE e.id = p_event;

  SELECT COUNT(*)::bigint
  INTO v_accepted
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'Attending';  -- ggf. an Enum-Werte anpassen

  -- 5) Ziel-State bestimmen
  IF p_state = 'Declined' THEN
    v_final_state := 'Declined';

  ELSIF v_max IS NOT NULL AND v_accepted >= v_max THEN
    -- Kapazität voll -> auf Waiting (außer Declined)
    v_final_state := 'Waiting';

  ELSE
    v_final_state := p_state;
  END IF;

  -- 6) Upsert (RLS prüft zusätzlich INSERT/UPDATE-Policies)
  RETURN QUERY
  INSERT INTO public.event_attendance_user_mapping("user","event","state")
  VALUES (p_user, p_event, v_final_state)
  ON CONFLICT ("user","event") DO UPDATE
  SET state = EXCLUDED.state
  RETURNING *;
END;
$$;


ALTER FUNCTION "public"."update_attendance"("p_event" "uuid", "p_user" "text", "p_state" "public"."EventAttendance") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_attendance_on_maxattendees_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
    newEvent public.events;
begin
    select * into newEvent from events where id = new.id limit 1;
    if (new."maxAttendees" < old."maxAttendees") then
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'Attending'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'Waiting'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
    else
        if (new."maxAttendees" > old."maxAttendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'Waiting'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'Attending'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."update_attendance_on_maxattendees_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Update last_update to the current timestamp and set edited to true
    NEW.last_update := NOW();
    NEW.edited := true;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_normalized_players"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$BEGIN
    NEW.normalized_players := 
        CASE 
            WHEN NEW.player_1 < NEW.player_2 THEN NEW.player_1 || ',' || NEW.player_2
            ELSE NEW.player_2 || ',' || NEW.player_1
        END;
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."update_normalized_players"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."updatewaitinglistattendance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  declare
  BEGIN
    if((Select count(*) from event_attendance_user_mapping where event_attendance_user_mapping.event = NEW.event AND event_attendance_user_mapping.state = 'Attending') < (Select events."maxAttendees" from events where events.id = NEW.event LIMIT 1) AND NEW.state = 'Declined') then

    UPDATE event_attendance_user_mapping
    SET state = 'Attending'
    WHERE event_attendance_user_mapping.user = (SELECT event_attendance_user_mapping.user from event_attendance_user_mapping where event_attendance_user_mapping.state = 'Waiting' AND event_attendance_user_mapping.event = NEW.event order by event_attendance_user_mapping."lastUpdate" Limit 1);
    end if;
    return NEW;
  END;
  $$;


ALTER FUNCTION "public"."updatewaitinglistattendance"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."elo_calc_log" (
    "match" "uuid" NOT NULL,
    "calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eff_team_a" numeric NOT NULL,
    "eff_team_b" numeric NOT NULL,
    "expected_a" numeric NOT NULL,
    "expected_b" numeric NOT NULL,
    "k_base" integer NOT NULL,
    "k_eff" numeric NOT NULL,
    "category_a" "text" NOT NULL,
    "category_b" "text" NOT NULL,
    "upset_levels" integer NOT NULL,
    "upset_multiplier" numeric NOT NULL,
    "outcome_a" numeric NOT NULL,
    "sets_a" integer NOT NULL,
    "sets_b" integer NOT NULL,
    "points_a" integer NOT NULL,
    "points_b" integer NOT NULL,
    "rated" boolean DEFAULT true NOT NULL,
    "a1_user" "text",
    "a2_user" "text",
    "b1_user" "text",
    "b2_user" "text",
    "cfg_snapshot" "jsonb",
    "rg_a1_used" numeric,
    "rg_a2_used" numeric,
    "rg_b1_used" numeric,
    "rg_b2_used" numeric
);


ALTER TABLE "games"."elo_calc_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."elo_config" (
    "id" integer DEFAULT 1 NOT NULL,
    "w_rg" numeric DEFAULT 0.5 NOT NULL,
    "w_ka" numeric DEFAULT 0.5 NOT NULL,
    "rg_offset" numeric DEFAULT 0 NOT NULL,
    "rg_scale" numeric DEFAULT 1 NOT NULL,
    "k_factor" integer DEFAULT 32 NOT NULL,
    "men_offset" numeric DEFAULT 0 NOT NULL,
    "mixed_offset" numeric DEFAULT '-50'::integer NOT NULL,
    "women_offset" numeric DEFAULT '-100'::integer NOT NULL,
    "upset_bonus_per_level" numeric DEFAULT 0.15 NOT NULL
);


ALTER TABLE "games"."elo_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."elo_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "match" "uuid" NOT NULL,
    "user" "text" NOT NULL,
    "old_rating" numeric NOT NULL,
    "new_rating" numeric NOT NULL,
    "delta" numeric NOT NULL,
    "eff_new_rating" numeric,
    "eff_old_rating" numeric
);


ALTER TABLE "games"."elo_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."match" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_a" "uuid" NOT NULL,
    "team_b" "uuid" NOT NULL,
    "event" "uuid",
    "is_public" boolean DEFAULT false NOT NULL,
    "created_by" "text",
    "rated" boolean DEFAULT true NOT NULL
);


ALTER TABLE "games"."match" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."players" (
    "player" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ka_index" numeric DEFAULT '1000'::numeric NOT NULL,
    "rg_id" "text",
    "rg_link" "text",
    "rg_index" numeric,
    "rg_avatar_url" "text",
    "pro_status" boolean DEFAULT false NOT NULL,
    "gender" "text" DEFAULT 'm'::"text" NOT NULL,
    "effective_rating_cached" numeric DEFAULT 1000 NOT NULL,
    "hide_rating" boolean DEFAULT false NOT NULL
);


ALTER TABLE "games"."players" OWNER TO "postgres";


CREATE OR REPLACE VIEW "games"."players_public" WITH ("security_invoker"='true') AS
 SELECT "player",
    "gender",
    "rg_id",
    "rg_link",
    "rg_avatar_url",
    "pro_status",
        CASE
            WHEN ("hide_rating" AND (("auth"."uid"())::"text" <> "player")) THEN NULL::numeric
            ELSE "ka_index"
        END AS "ka_index",
        CASE
            WHEN ("hide_rating" AND (("auth"."uid"())::"text" <> "player")) THEN NULL::numeric
            ELSE "rg_index"
        END AS "rg_index",
        CASE
            WHEN ("hide_rating" AND (("auth"."uid"())::"text" <> "player")) THEN NULL::numeric
            ELSE "effective_rating_cached"
        END AS "effective_rating_cached",
    "hide_rating"
   FROM "games"."players" "p";


ALTER VIEW "games"."players_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "match" "uuid" NOT NULL,
    "set_number" bigint NOT NULL,
    "team_a_score" bigint NOT NULL,
    "team_b_score" bigint NOT NULL
);


ALTER TABLE "games"."sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "player_1" "text" NOT NULL,
    "player_2" "text" NOT NULL,
    "name" "text" NOT NULL,
    "normalized_players" "text" NOT NULL
);


ALTER TABLE "games"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "games"."user_matches" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::timestamp with time zone AS "created_at",
    NULL::"text" AS "team_a_name",
    NULL::"text" AS "team_a_player_1",
    NULL::"text" AS "team_a_player_2",
    NULL::"text" AS "team_b_name",
    NULL::"text" AS "team_b_player_1",
    NULL::"text" AS "team_b_player_2",
    NULL::boolean AS "rated",
    NULL::"text" AS "set_results";


ALTER VIEW "games"."user_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "max_points_per_week" bigint,
    "automated" boolean DEFAULT false NOT NULL,
    "end_date" timestamp with time zone,
    "group" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "max_points_per_day" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "challenge_max_points_per_day_check" CHECK (("max_points_per_day" >= 0))
);


ALTER TABLE "public"."challenge" OWNER TO "postgres";


ALTER TABLE "public"."challenge_stats" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."challenge_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "displayName" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "userId" "text" DEFAULT ''::"text" NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "role" "public"."UserRole" DEFAULT 'user'::"public"."UserRole" NOT NULL,
    "disabled" boolean DEFAULT false NOT NULL,
    "avatarUrl" "text",
    "name" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."challenge_user_points" WITH ("security_invoker"='on') AS
 SELECT "cs"."challenge",
    "cs"."user",
    "u"."displayName",
    "u"."avatarUrl",
    "sum"("cs"."count") AS "total_points"
   FROM ("public"."challenge_stats" "cs"
     JOIN "public"."user" "u" ON (("cs"."user" = "u"."userId")))
  GROUP BY "cs"."challenge", "cs"."user", "u"."avatarUrl", "u"."displayName";


ALTER VIEW "public"."challenge_user_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "meetingDateTime" timestamp with time zone,
    "startingDateTime" timestamp with time zone NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "endDateTime" timestamp with time zone NOT NULL,
    "key" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "isCancelled" boolean DEFAULT false NOT NULL,
    "place" "text",
    "recurrence" "public"."EventRecurrence" DEFAULT 'None'::"public"."EventRecurrence" NOT NULL,
    "answerDeadline" timestamp with time zone,
    "maxAttendees" numeric,
    "recurrenceEnd" timestamp with time zone,
    "required_item" "public"."ItemType",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group" "uuid" NOT NULL,
    "constellations_enabled" boolean DEFAULT false NOT NULL,
    "items_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "events_end_after_start" CHECK (("endDateTime" > "startingDateTime"))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."current_distinct_event" WITH ("security_invoker"='on') AS
 SELECT DISTINCT ON ("key") "id",
    "created_at",
    "description",
    "meetingDateTime",
    "startingDateTime",
    "title",
    "endDateTime",
    "key",
    "isCancelled",
    "place",
    "recurrence",
    "group",
    "answerDeadline",
    "maxAttendees",
    "recurrenceEnd",
    "constellations_enabled"
   FROM "public"."events"
  WHERE ((("endDateTime" > "now"()) OR ("endDateTime" IS NULL)) AND ("startingDateTime" > "now"()) AND ("recurrence" <> 'None'::"public"."EventRecurrence"))
  ORDER BY "key",
        CASE
            WHEN (("startingDateTime" - "now"()) >= '00:00:00'::interval) THEN ("startingDateTime" - "now"())
            ELSE ("now"() - "startingDateTime")
        END;


ALTER VIEW "public"."current_distinct_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drink" (
    "id" bigint NOT NULL,
    "name" character varying,
    "price" real DEFAULT '0'::real,
    "stock" bigint,
    "imageUrl" "text",
    "active" boolean DEFAULT false NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "previousDrink" bigint,
    "type" "public"."ProductType" DEFAULT 'None'::"public"."ProductType" NOT NULL
);


ALTER TABLE "public"."drink" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."distinct_drinks" WITH ("security_invoker"='on') AS
 SELECT DISTINCT ON ("id") "id",
    "name",
    "price",
    "stock",
    "type",
    "active",
    "deleted",
    "imageUrl",
    "previousDrink"
   FROM "public"."drink"
  WHERE ("active" AND ("deleted" IS FALSE))
  ORDER BY "id";


ALTER VIEW "public"."distinct_drinks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."distinct_event" WITH ("security_invoker"='on') AS
 SELECT DISTINCT ON ("key") "id",
    "created_at",
    "description",
    "meetingDateTime",
    "startingDateTime",
    "title",
    "endDateTime",
    "key",
    "isCancelled",
    "place",
    "recurrence",
    "group",
    "answerDeadline",
    "maxAttendees",
    "recurrenceEnd",
    "constellations_enabled"
   FROM "public"."events"
  WHERE (("startingDateTime" > "now"()) AND ("recurrence" <> 'None'::"public"."EventRecurrence"))
  ORDER BY "key", "startingDateTime" DESC;


ALTER VIEW "public"."distinct_event" OWNER TO "postgres";


ALTER TABLE "public"."drink" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."drink_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."event_bring_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "unit" "text" DEFAULT 'Stk'::"text" NOT NULL,
    "required_qty" numeric NOT NULL,
    "notes" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "text" DEFAULT ("auth"."uid"())::"text" NOT NULL,
    CONSTRAINT "event_bring_items_required_qty_check" CHECK (("required_qty" >= (0)::numeric))
);


ALTER TABLE "public"."event_bring_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_bring_pledges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event" "uuid" NOT NULL,
    "item" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "qty" numeric NOT NULL,
    "status" "text" DEFAULT 'pledged'::"text" NOT NULL,
    "notes" "text",
    CONSTRAINT "event_bring_pledges_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "event_bring_pledges_status_check" CHECK (("status" = ANY (ARRAY['pledged'::"text", 'fulfilled'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "pledges_qty_positive" CHECK (("qty" > (0)::numeric))
);


ALTER TABLE "public"."event_bring_pledges" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_bring_item_status" WITH ("security_invoker"='true') AS
 SELECT "bi"."id" AS "item_id",
    "bi"."event" AS "event_id",
    "bi"."name",
    "bi"."unit",
    "bi"."required_qty",
    COALESCE("sum"("p"."qty"), (0)::numeric) AS "pledged_qty",
    GREATEST(("bi"."required_qty" - COALESCE("sum"("p"."qty"), (0)::numeric)), (0)::numeric) AS "shortfall",
    GREATEST((COALESCE("sum"("p"."qty"), (0)::numeric) - "bi"."required_qty"), (0)::numeric) AS "surplus",
    (COALESCE("sum"("p"."qty"), (0)::numeric) >= "bi"."required_qty") AS "fulfilled"
   FROM ("public"."event_bring_items" "bi"
     LEFT JOIN "public"."event_bring_pledges" "p" ON (("p"."item" = "bi"."id")))
  GROUP BY "bi"."id", "bi"."event", "bi"."name", "bi"."unit", "bi"."required_qty";


ALTER VIEW "public"."event_bring_item_status" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_bring_overview" WITH ("security_invoker"='true') AS
 SELECT "i"."event",
    "i"."id" AS "item_id",
    "i"."name",
    "i"."unit",
    "i"."required_qty",
    COALESCE("sum"(
        CASE
            WHEN ("p"."status" = ANY (ARRAY['pledged'::"text", 'fulfilled'::"text"])) THEN "p"."qty"
            ELSE (0)::numeric
        END), (0)::numeric) AS "pledged_qty",
    ("i"."required_qty" - COALESCE("sum"(
        CASE
            WHEN ("p"."status" = ANY (ARRAY['pledged'::"text", 'fulfilled'::"text"])) THEN "p"."qty"
            ELSE (0)::numeric
        END), (0)::numeric)) AS "remaining_qty"
   FROM ("public"."event_bring_items" "i"
     LEFT JOIN "public"."event_bring_pledges" "p" ON (("p"."item" = "i"."id")))
  GROUP BY "i"."event", "i"."id", "i"."name", "i"."unit", "i"."required_qty";


ALTER VIEW "public"."event_bring_overview" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_comments" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "comment" "text" DEFAULT ''::"text" NOT NULL,
    "displayName" "text" DEFAULT ''::"text" NOT NULL,
    "event" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reply_to" "uuid",
    "edited" boolean DEFAULT false NOT NULL,
    "last_update" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_user_mapping" (
    "user" "text" NOT NULL,
    "group" "uuid" NOT NULL,
    "role" "public"."GroupRole" DEFAULT 'user'::"public"."GroupRole" NOT NULL
);


ALTER TABLE "public"."group_user_mapping" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_groups_view" WITH ("security_invoker"='on') AS
 SELECT "eg"."created_at",
    "eg"."description",
    "eg"."name",
    "eg"."color",
    "eg"."id",
    "eg"."is_public",
    "eg"."need_request_to_join",
    "eg"."parent_group",
    "eg"."visible",
    "gum"."role"
   FROM ("public"."event_group" "eg"
     LEFT JOIN "public"."group_user_mapping" "gum" ON ((("eg"."id" = "gum"."group") AND ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text"))));


ALTER VIEW "public"."event_groups_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."events_user_view" WITH ("security_invoker"='on') AS
 SELECT "e"."id",
    "e"."created_at",
    "e"."title",
    "e"."description",
    "e"."meetingDateTime",
    "e"."startingDateTime",
    "e"."endDateTime",
    "e"."key",
    "e"."isCancelled",
    "e"."place",
    "e"."group",
    "e"."recurrence",
    "e"."answerDeadline",
    "e"."recurrenceEnd",
    "e"."maxAttendees",
    "e"."required_item",
    "e"."constellations_enabled",
    "eaus"."state" AS "user_state",
    ( SELECT "count"(*) AS "count"
           FROM "public"."event_attendance_user_mapping" "ea"
          WHERE (("ea"."event" = "e"."id") AND ("ea"."state" = 'Attending'::"public"."EventAttendance"))) AS "attending_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."event_attendance_user_mapping" "ea"
          WHERE (("ea"."event" = "e"."id") AND ("ea"."state" = 'Declined'::"public"."EventAttendance"))) AS "declined_count"
   FROM ("public"."events" "e"
     LEFT JOIN "public"."event_attendance_user_mapping" "eaus" ON ((("e"."id" = "eaus"."event") AND ("eaus"."user" = ( SELECT ("auth"."uid"())::"text" AS "uid")))));


ALTER VIEW "public"."events_user_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."features" (
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_features" (
    "group" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature" "text" NOT NULL
);


ALTER TABLE "public"."group_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_permissions" (
    "group" "uuid" NOT NULL,
    "permission" "text" NOT NULL
);


ALTER TABLE "public"."group_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."history" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "drink" bigint NOT NULL,
    "user" "text" NOT NULL,
    "count" bigint NOT NULL,
    "payment" bigint NOT NULL,
    "amount" numeric DEFAULT '0'::numeric NOT NULL,
    "voucher" "uuid"
);


ALTER TABLE "public"."history" OWNER TO "postgres";


ALTER TABLE "public"."history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."item_history" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pastUser" "text",
    "currentUser" "text",
    "key" bigint
);


ALTER TABLE "public"."item_history" OWNER TO "postgres";


ALTER TABLE "public"."item_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."key_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."keys_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notification_outbox" (
    "id" bigint NOT NULL,
    "user" "text" NOT NULL,
    "tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid" NOT NULL,
    "title" "text",
    "body" "text",
    "data" "jsonb",
    "urgency" "text" DEFAULT 'normal'::"text" NOT NULL,
    "ttl_seconds" integer,
    "dedupe_key" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_error" "text",
    "notification" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "channel" "text" DEFAULT 'webpush'::"text" NOT NULL,
    CONSTRAINT "notification_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'sent'::"text", 'dead'::"text"]))),
    CONSTRAINT "notification_outbox_urgency_check" CHECK (("urgency" = ANY (ARRAY['very-low'::"text", 'low'::"text", 'normal'::"text", 'high'::"text"])))
);


ALTER TABLE "public"."notification_outbox" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notification_outbox_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notification_outbox_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notification_outbox_id_seq" OWNED BY "public"."notification_outbox"."id";



CREATE TABLE IF NOT EXISTS "public"."notification_outbox_targets" (
    "outbox_id" bigint NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_status" integer,
    "last_error" "text",
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "leased_at" timestamp with time zone,
    "leased_by" "text",
    CONSTRAINT "notification_outbox_targets_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."notification_outbox_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_retention" (
    "tenant" "uuid" NOT NULL,
    "keep_unread_for" interval DEFAULT '180 days'::interval NOT NULL,
    "keep_read_for" interval DEFAULT '30 days'::interval NOT NULL,
    "keep_sent_outbox_for" interval DEFAULT '7 days'::interval NOT NULL,
    "keep_revoked_sub_for" interval DEFAULT '30 days'::interval NOT NULL
);


ALTER TABLE "public"."notification_retention" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_topics" (
    "topic" "text" NOT NULL,
    "description" "text",
    "scope_type" "text" NOT NULL,
    "default_enabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."notification_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "body" "text",
    "title" "text" NOT NULL,
    "user" "text" NOT NULL,
    "data" "jsonb",
    "dismissed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "source_id" "uuid",
    "source_type" "text",
    "tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid" NOT NULL,
    "topic" "text" NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."object_subscriptions" (
    "user" "text" NOT NULL,
    "tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid" NOT NULL,
    "scope_type" "text" NOT NULL,
    "scope_id" "uuid" NOT NULL,
    "topic" "text",
    "topic_norm" "text" GENERATED ALWAYS AS (COALESCE("topic", '_'::"text")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."object_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "userId" "text" NOT NULL,
    "amountToPay" numeric DEFAULT '0'::numeric NOT NULL,
    "paymentState" "public"."PaymentState" DEFAULT 'Open'::"public"."PaymentState" NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


ALTER TABLE "public"."payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_direct_grants" (
    "user" "text" NOT NULL,
    "tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid" NOT NULL,
    "kind" "public"."grant_kind" NOT NULL,
    "key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_direct_grants" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_features" WITH ("security_invoker"='on') AS
 SELECT DISTINCT "gf"."feature"
   FROM ("public"."group_user_mapping" "gum"
     JOIN "public"."group_features" "gf" ON (("gf"."group" = "gum"."group")))
  WHERE (("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("gum"."role" = 'admin'::"public"."GroupRole") OR ("gum"."role" = 'user'::"public"."GroupRole")));


ALTER VIEW "public"."user_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_grants" (
    "user" "text" NOT NULL,
    "tenant" "uuid" DEFAULT '00000000-0000-0000-0000-000000000000'::"uuid" NOT NULL,
    "kind" "public"."grant_kind" NOT NULL,
    "key" "text" NOT NULL,
    "granted_by" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_grants_granted_by_check" CHECK (("granted_by" = ANY (ARRAY['group'::"text", 'direct'::"text"])))
);


ALTER TABLE "public"."user_grants" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_permissions" WITH ("security_invoker"='on') AS
 SELECT DISTINCT "gp"."permission"
   FROM ("public"."group_user_mapping" "gum"
     JOIN "public"."group_permissions" "gp" ON (("gp"."group" = "gum"."group")))
  WHERE ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text");


ALTER VIEW "public"."user_permissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_vouchers" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::timestamp with time zone AS "created_at",
    NULL::"text" AS "title",
    NULL::numeric AS "available";


ALTER VIEW "public"."user_vouchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text",
    "total_drinks" numeric DEFAULT '0'::numeric NOT NULL,
    "title" "text"
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."web_push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "ua" "text",
    "platform" "text",
    "expiration_time" timestamp with time zone,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."web_push_subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."notification_outbox" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notification_outbox_id_seq"'::"regclass");



ALTER TABLE ONLY "games"."elo_calc_log"
    ADD CONSTRAINT "elo_calc_log_pkey" PRIMARY KEY ("match");



ALTER TABLE ONLY "games"."elo_config"
    ADD CONSTRAINT "elo_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."elo_history"
    ADD CONSTRAINT "elo_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("player");



ALTER TABLE ONLY "games"."players"
    ADD CONSTRAINT "players_player_key" UNIQUE ("player");



ALTER TABLE ONLY "games"."sets"
    ADD CONSTRAINT "sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "unique_normalized_players" UNIQUE ("normalized_players");



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "unique_player_combination" UNIQUE ("player_1", "player_2");



ALTER TABLE ONLY "public"."challenge"
    ADD CONSTRAINT "challenge_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drink"
    ADD CONSTRAINT "drinks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_pkey" PRIMARY KEY ("user", "event");



ALTER TABLE ONLY "public"."event_bring_items"
    ADD CONSTRAINT "event_bring_items_event_name_key" UNIQUE ("event", "name");



ALTER TABLE ONLY "public"."event_bring_items"
    ADD CONSTRAINT "event_bring_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_bring_pledges"
    ADD CONSTRAINT "event_bring_pledges_item_user_id_key" UNIQUE ("item", "user_id");



ALTER TABLE ONLY "public"."event_bring_pledges"
    ADD CONSTRAINT "event_bring_pledges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_group"
    ADD CONSTRAINT "event_group_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."event_group"
    ADD CONSTRAINT "event_group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "features_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."group_features"
    ADD CONSTRAINT "group_features_pkey" PRIMARY KEY ("group", "feature");



ALTER TABLE ONLY "public"."group_permissions"
    ADD CONSTRAINT "group_permission_pkey" PRIMARY KEY ("group", "permission");



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_pkey" PRIMARY KEY ("user", "group");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "key_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_outbox_targets"
    ADD CONSTRAINT "notification_outbox_targets_pkey" PRIMARY KEY ("outbox_id", "subscription_id");



ALTER TABLE ONLY "public"."notification_retention"
    ADD CONSTRAINT "notification_retention_pkey" PRIMARY KEY ("tenant");



ALTER TABLE ONLY "public"."notification_topics"
    ADD CONSTRAINT "notification_topics_pkey" PRIMARY KEY ("topic");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."object_subscriptions"
    ADD CONSTRAINT "object_subscriptions_pkey" PRIMARY KEY ("user", "tenant", "scope_type", "scope_id", "topic_norm");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."user_direct_grants"
    ADD CONSTRAINT "pk_user_direct_grants" PRIMARY KEY ("user", "tenant", "kind", "key");



ALTER TABLE ONLY "public"."user_grants"
    ADD CONSTRAINT "user_grants_pkey" PRIMARY KEY ("user", "kind", "key", "tenant");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("user", "tenant", "topic", "channel", "scope_type_norm", "scope_id_norm");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userId");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_user_endpoint_key" UNIQUE ("user", "endpoint");



CREATE INDEX "ix_elo_history_match" ON "games"."elo_history" USING "btree" ("match");



CREATE UNIQUE INDEX "teams_normalized_players_uidx" ON "games"."teams" USING "btree" ("normalized_players");



CREATE INDEX "events_startingDateTime_key_idx" ON "public"."events" USING "btree" ("startingDateTime", "key");



CREATE INDEX "idx_challenge_stats_user_chal_created" ON "public"."challenge_stats" USING "btree" ("user", "challenge", "created_at");



CREATE INDEX "idx_challenge_stats_user_challenge_created" ON "public"."challenge_stats" USING "btree" ("user", "challenge", "created_at");



CREATE INDEX "idx_event_bring_items_event" ON "public"."event_bring_items" USING "btree" ("event");



CREATE INDEX "idx_event_bring_pledges_event" ON "public"."event_bring_pledges" USING "btree" ("event");



CREATE INDEX "idx_event_bring_pledges_item" ON "public"."event_bring_pledges" USING "btree" ("item");



CREATE INDEX "idx_event_bring_pledges_user" ON "public"."event_bring_pledges" USING "btree" ("user_id");



CREATE INDEX "idx_notif_read_created" ON "public"."notifications" USING "btree" ("read_at", "created_at") WHERE ("read_at" IS NOT NULL);



CREATE INDEX "idx_notif_user_created" ON "public"."notifications" USING "btree" ("user", "created_at" DESC);



CREATE INDEX "idx_notif_user_unread" ON "public"."notifications" USING "btree" ("user") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user", "created_at" DESC);



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user", "read_at");



CREATE INDEX "idx_outbox_due" ON "public"."notification_outbox" USING "btree" ("status", "next_attempt_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "idx_outbox_status" ON "public"."notification_outbox" USING "btree" ("status");



CREATE INDEX "idx_outbox_status_attempt" ON "public"."notification_outbox" USING "btree" ("status", "next_attempt_at");



CREATE INDEX "idx_targets_due" ON "public"."notification_outbox_targets" USING "btree" ("next_attempt_at", "status");



CREATE INDEX "idx_targets_status" ON "public"."notification_outbox_targets" USING "btree" ("status");



CREATE INDEX "idx_targets_status_attempt" ON "public"."notification_outbox_targets" USING "btree" ("status", "next_attempt_at");



CREATE INDEX "idx_udg_kind_key_tenant" ON "public"."user_direct_grants" USING "btree" ("kind", "key", "tenant");



CREATE INDEX "idx_udg_user" ON "public"."user_direct_grants" USING "btree" ("user");



CREATE INDEX "idx_user_grants_kind_key" ON "public"."user_grants" USING "btree" ("kind", "key");



CREATE INDEX "idx_user_grants_user" ON "public"."user_grants" USING "btree" ("user");



CREATE INDEX "idx_wps_revoked" ON "public"."web_push_subscriptions" USING "btree" ("revoked_at") WHERE ("revoked_at" IS NOT NULL);



CREATE INDEX "idx_wps_user_active" ON "public"."web_push_subscriptions" USING "btree" ("user") WHERE ("revoked_at" IS NULL);



CREATE INDEX "ix_items_event" ON "public"."event_bring_items" USING "btree" ("event");



CREATE INDEX "ix_pledges_item" ON "public"."event_bring_pledges" USING "btree" ("item");



CREATE UNIQUE INDEX "uq_events_key_start" ON "public"."events" USING "btree" ("key", "startingDateTime");



CREATE UNIQUE INDEX "uq_group_permissions_group_permission" ON "public"."group_permissions" USING "btree" ("group", "permission");



CREATE OR REPLACE VIEW "games"."user_matches" WITH ("security_invoker"='true') AS
 SELECT "g"."id",
    "g"."created_at",
    "t1"."name" AS "team_a_name",
    "t1"."player_1" AS "team_a_player_1",
    "t1"."player_2" AS "team_a_player_2",
    "t2"."name" AS "team_b_name",
    "t2"."player_1" AS "team_b_player_1",
    "t2"."player_2" AS "team_b_player_2",
    "g"."rated",
    "string_agg"(((("s"."team_a_score")::"text" || ':'::"text") || ("s"."team_b_score")::"text"), ', '::"text") AS "set_results"
   FROM ((("games"."match" "g"
     LEFT JOIN "games"."teams" "t1" ON (("g"."team_a" = "t1"."id")))
     LEFT JOIN "games"."teams" "t2" ON (("g"."team_b" = "t2"."id")))
     LEFT JOIN "games"."sets" "s" ON (("g"."id" = "s"."match")))
  WHERE (("t1"."player_1" = ("auth"."uid"())::"text") OR ("t1"."player_2" = ("auth"."uid"())::"text") OR ("t2"."player_1" = ("auth"."uid"())::"text") OR ("t2"."player_2" = ("auth"."uid"())::"text"))
  GROUP BY "g"."id", "g"."created_at", "t1"."name", "t1"."player_1", "t1"."player_2", "t2"."name", "t2"."player_1", "t2"."player_2";



CREATE OR REPLACE VIEW "public"."user_vouchers" WITH ("security_invoker"='on') AS
 SELECT "v"."id",
    "v"."created_at",
    "v"."title",
    ("v"."total_drinks" - COALESCE("sum"("h"."count"), (0)::numeric)) AS "available"
   FROM ("public"."vouchers" "v"
     LEFT JOIN "public"."history" "h" ON (("v"."id" = "h"."voucher")))
  WHERE ("v"."user" = ("auth"."uid"())::"text")
  GROUP BY "v"."id", "v"."title", "v"."total_drinks"
 HAVING (COALESCE("sum"("h"."count"), (0)::numeric) < "v"."total_drinks");



CREATE OR REPLACE TRIGGER "fetch_player_info_after_rglink_change" AFTER UPDATE OF "rg_link" ON "games"."players" FOR EACH ROW EXECUTE FUNCTION "games"."fetch_player_info_on_change"();



CREATE OR REPLACE TRIGGER "set_normalized_players" BEFORE INSERT OR UPDATE ON "games"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_normalized_players"();



CREATE OR REPLACE TRIGGER "trg_game_added_notify" AFTER INSERT ON "games"."match" FOR EACH ROW EXECUTE FUNCTION "public"."_notify_game_added"();



CREATE OR REPLACE TRIGGER "trg_match_recalc_elo" AFTER INSERT OR UPDATE OF "team_a", "team_b" ON "games"."match" FOR EACH ROW EXECUTE FUNCTION "games"."trg_recalc_match_elo"();



CREATE OR REPLACE TRIGGER "trg_on_elo_config_recompute" AFTER UPDATE OF "w_rg", "w_ka", "rg_offset", "rg_scale" ON "games"."elo_config" FOR EACH ROW EXECUTE FUNCTION "games"."trg_on_elo_config_recompute"();



CREATE OR REPLACE TRIGGER "trg_players_set_effective_cached" BEFORE INSERT OR UPDATE OF "ka_index", "rg_index" ON "games"."players" FOR EACH ROW EXECUTE FUNCTION "games"."trg_players_set_effective_cached"();



CREATE OR REPLACE TRIGGER "trg_sets_recalc_elo" AFTER INSERT OR DELETE OR UPDATE OF "team_a_score", "team_b_score" ON "games"."sets" FOR EACH ROW EXECUTE FUNCTION "games"."trg_recalc_sets_elo"();



CREATE OR REPLACE TRIGGER "WaitingListAttendanceTrigger" AFTER DELETE OR UPDATE ON "public"."event_attendance_user_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."updatewaitinglistattendance"();



CREATE OR REPLACE TRIGGER "check_group_parent" BEFORE INSERT OR UPDATE ON "public"."event_group" FOR EACH ROW EXECUTE FUNCTION "public"."check_parent_groups"();



CREATE OR REPLACE TRIGGER "delete_user_from_subgroups" AFTER DELETE ON "public"."group_user_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."delete_user_from_subgroups"();



CREATE OR REPLACE TRIGGER "item_history_trigger" AFTER UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."add_item_history_entry"();



CREATE OR REPLACE TRIGGER "maxattendees_change_trigger" AFTER UPDATE ON "public"."events" FOR EACH ROW WHEN (("new"."maxAttendees" <> "old"."maxAttendees")) EXECUTE FUNCTION "public"."update_attendance_on_maxattendees_change"();



CREATE OR REPLACE TRIGGER "t_check_capacity_ins" BEFORE INSERT ON "public"."event_bring_pledges" FOR EACH ROW EXECUTE FUNCTION "public"."trg_check_item_capacity"();

ALTER TABLE "public"."event_bring_pledges" DISABLE TRIGGER "t_check_capacity_ins";



CREATE OR REPLACE TRIGGER "t_check_capacity_upd" BEFORE UPDATE OF "qty", "status" ON "public"."event_bring_pledges" FOR EACH ROW EXECUTE FUNCTION "public"."trg_check_item_capacity"();

ALTER TABLE "public"."event_bring_pledges" DISABLE TRIGGER "t_check_capacity_upd";



CREATE OR REPLACE TRIGGER "t_guard_items_columns" BEFORE UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_items_guard_columns"();



CREATE OR REPLACE TRIGGER "t_set_updated_at" BEFORE UPDATE ON "public"."event_bring_pledges" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "t_sync_event" BEFORE INSERT OR UPDATE OF "item" ON "public"."event_bring_pledges" FOR EACH ROW EXECUTE FUNCTION "public"."trg_sync_pledge_event_from_item"();



CREATE OR REPLACE TRIGGER "trg_challenge_added_notify" AFTER INSERT ON "public"."challenge" FOR EACH ROW EXECUTE FUNCTION "public"."_notify_challenge_added"();



CREATE OR REPLACE TRIGGER "trg_challenge_stat_notify" AFTER INSERT ON "public"."challenge_stats" FOR EACH ROW EXECUTE FUNCTION "public"."_notify_challenge_entry_added"();



CREATE OR REPLACE TRIGGER "trg_event_canceled_notify" AFTER UPDATE ON "public"."events" FOR EACH ROW WHEN ((("new"."isCancelled" IS TRUE) AND (COALESCE("old"."isCancelled", false) IS FALSE))) EXECUTE FUNCTION "public"."_notify_event_canceled"();



CREATE OR REPLACE TRIGGER "trg_event_comment_notify" AFTER INSERT ON "public"."event_comments" FOR EACH ROW EXECUTE FUNCTION "public"."_notify_event_comment_created"();



CREATE OR REPLACE TRIGGER "trg_event_updated_notify" AFTER UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."_notify_event_updated"();



CREATE OR REPLACE TRIGGER "trg_group_request_confirmed_notify" AFTER UPDATE ON "public"."group_user_mapping" FOR EACH ROW WHEN ((("old"."role" = 'joinRequested'::"public"."GroupRole") AND ("new"."role" = ANY (ARRAY['user'::"public"."GroupRole", 'admin'::"public"."GroupRole"])))) EXECUTE FUNCTION "public"."_notify_group_request_confirmed"();



CREATE OR REPLACE TRIGGER "trg_item_handover_notify" AFTER UPDATE ON "public"."items" FOR EACH ROW WHEN (("old"."current_holder" IS DISTINCT FROM "new"."current_holder")) EXECUTE FUNCTION "public"."_notify_item_handover"();



CREATE OR REPLACE TRIGGER "trg_items_handover_log" BEFORE UPDATE OF "current_holder" ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_items_handover_log"();



CREATE OR REPLACE TRIGGER "trg_payment_fulfilled_notify" AFTER UPDATE ON "public"."payments" FOR EACH ROW WHEN ((("old"."paymentState" IS DISTINCT FROM "new"."paymentState") AND (("new"."paymentState")::"text" = 'Fulfilled'::"text"))) EXECUTE FUNCTION "public"."_notify_drink_payment_fulfilled"();



CREATE OR REPLACE TRIGGER "trg_pledge_sanity_bi" BEFORE INSERT ON "public"."event_bring_pledges" FOR EACH ROW EXECUTE FUNCTION "public"."trg_pledge_sanity"();



CREATE OR REPLACE TRIGGER "trg_pledge_sanity_bu" BEFORE UPDATE OF "qty" ON "public"."event_bring_pledges" FOR EACH ROW EXECUTE FUNCTION "public"."trg_pledge_sanity"();



CREATE OR REPLACE TRIGGER "trg_refresh_from_udg_del" AFTER DELETE ON "public"."user_direct_grants" REFERENCING OLD TABLE AS "old_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."_trg_refresh_from_udg_stmt"();



CREATE OR REPLACE TRIGGER "trg_refresh_from_udg_ins" AFTER INSERT ON "public"."user_direct_grants" REFERENCING NEW TABLE AS "new_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."_trg_refresh_from_udg_stmt"();



CREATE OR REPLACE TRIGGER "trg_refresh_from_udg_upd" AFTER UPDATE ON "public"."user_direct_grants" REFERENCING OLD TABLE AS "old_table" NEW TABLE AS "new_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."_trg_refresh_from_udg_stmt"();



CREATE OR REPLACE TRIGGER "trg_refresh_grants_on_group_features" AFTER INSERT OR DELETE OR UPDATE ON "public"."group_features" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_grants_on_group_features"();



CREATE OR REPLACE TRIGGER "trg_refresh_grants_on_group_permissions" AFTER INSERT OR DELETE OR UPDATE ON "public"."group_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_grants_on_group_permissions"();



CREATE OR REPLACE TRIGGER "trg_refresh_grants_on_membership" AFTER INSERT OR DELETE OR UPDATE ON "public"."group_user_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_grants_on_membership"();



CREATE OR REPLACE TRIGGER "trg_update_event_comment" BEFORE UPDATE ON "public"."event_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_comment"();



CREATE OR REPLACE TRIGGER "trg_user_to_player" AFTER INSERT ON "public"."user" FOR EACH ROW EXECUTE FUNCTION "games"."trg_user_to_player"();



ALTER TABLE ONLY "games"."elo_calc_log"
    ADD CONSTRAINT "elo_calc_log_match_fkey" FOREIGN KEY ("match") REFERENCES "games"."match"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "games"."elo_history"
    ADD CONSTRAINT "elo_history_match_fkey" FOREIGN KEY ("match") REFERENCES "games"."match"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."elo_history"
    ADD CONSTRAINT "elo_history_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_team_a_fkey" FOREIGN KEY ("team_a") REFERENCES "games"."teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_team_b_fkey" FOREIGN KEY ("team_b") REFERENCES "games"."teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."players"
    ADD CONSTRAINT "players_player_fkey" FOREIGN KEY ("player") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "games"."sets"
    ADD CONSTRAINT "sets_match_fkey" FOREIGN KEY ("match") REFERENCES "games"."match"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "teams_player_1_fkey" FOREIGN KEY ("player_1") REFERENCES "games"."players"("player") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "teams_player_2_fkey" FOREIGN KEY ("player_2") REFERENCES "games"."players"("player") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."challenge"
    ADD CONSTRAINT "challenge_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_challenge_fkey" FOREIGN KEY ("challenge") REFERENCES "public"."challenge"("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_bring_items"
    ADD CONSTRAINT "event_bring_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("userId") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_bring_items"
    ADD CONSTRAINT "event_bring_items_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_bring_pledges"
    ADD CONSTRAINT "event_bring_pledges_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_bring_pledges"
    ADD CONSTRAINT "event_bring_pledges_item_fkey" FOREIGN KEY ("item") REFERENCES "public"."event_bring_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_bring_pledges"
    ADD CONSTRAINT "event_bring_pledges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "public"."event_comments"("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."event_group"
    ADD CONSTRAINT "event_group_parent_group_fkey" FOREIGN KEY ("parent_group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."group_features"
    ADD CONSTRAINT "group_features_feature_fkey" FOREIGN KEY ("feature") REFERENCES "public"."features"("name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_features"
    ADD CONSTRAINT "group_features_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_permissions"
    ADD CONSTRAINT "group_permission_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_permissions"
    ADD CONSTRAINT "group_permission_permission_fkey" FOREIGN KEY ("permission") REFERENCES "public"."permissions"("name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_drink_fkey" FOREIGN KEY ("drink") REFERENCES "public"."drink"("id");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_payment_fkey" FOREIGN KEY ("payment") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_voucher_fkey" FOREIGN KEY ("voucher") REFERENCES "public"."vouchers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "item_history_currentUser_fkey" FOREIGN KEY ("currentUser") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "item_history_key_fkey" FOREIGN KEY ("key") REFERENCES "public"."items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "item_history_pastUser_fkey" FOREIGN KEY ("pastUser") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "keys_user_fkey" FOREIGN KEY ("current_holder") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."notification_outbox_targets"
    ADD CONSTRAINT "notification_outbox_targets_outbox_id_fkey" FOREIGN KEY ("outbox_id") REFERENCES "public"."notification_outbox"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_outbox_targets"
    ADD CONSTRAINT "notification_outbox_targets_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."web_push_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_userid_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."user_direct_grants"
    ADD CONSTRAINT "user_direct_grants_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Allow authorized delete access" ON "games"."match" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('games.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized delete access" ON "games"."players" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('games.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "games"."match" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow authorized insert access" ON "games"."players" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('games.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "games"."players" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('games.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "games"."match" FOR UPDATE TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('games.update'::"text") AS "authorize"));



CREATE POLICY "Allow delete when userid in team" ON "games"."teams" FOR DELETE TO "authenticated" USING ((("player_1" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("player_2" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow everything when user has permission games.update.score an" ON "games"."sets" USING ((( SELECT "public"."authorize"('games.update.score'::"text") AS "authorize") AND (EXISTS ( SELECT 1
   FROM (("games"."match" "m"
     JOIN "games"."teams" "ta" ON (("ta"."id" = "m"."team_a")))
     JOIN "games"."teams" "tb" ON (("tb"."id" = "m"."team_b")))
  WHERE (("m"."id" = "sets"."match") AND (("ta"."player_1" = ("auth"."uid"())::"text") OR ("ta"."player_2" = ("auth"."uid"())::"text") OR ("tb"."player_1" = ("auth"."uid"())::"text") OR ("tb"."player_2" = ("auth"."uid"())::"text")))))));



CREATE POLICY "Allow select when game is public" ON "games"."sets" FOR SELECT USING (( SELECT "match"."is_public"
   FROM "games"."match"
  WHERE ("match"."id" = "sets"."match")));



CREATE POLICY "Allow select when match is public" ON "games"."match" FOR SELECT USING ("is_public");



CREATE POLICY "Allow select when match is public" ON "games"."teams" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "games"."match" "m"
  WHERE ((("m"."team_a" = "teams"."id") OR ("m"."team_b" = "teams"."id")) AND "m"."is_public"))));



CREATE POLICY "Enable read access for all users" ON "games"."elo_config" FOR SELECT USING (true);



CREATE POLICY "Enable select with event.create.constellations permission" ON "games"."players" FOR SELECT USING (( SELECT "public"."authorize"('event.create.constellations'::"text") AS "authorize"));



CREATE POLICY "el_history_if_participant" ON "games"."elo_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("games"."match" "m"
     JOIN "games"."teams" "ta" ON (("ta"."id" = "m"."team_a")))
     JOIN "games"."teams" "tb" ON (("tb"."id" = "m"."team_b")))
  WHERE (("m"."id" = "elo_history"."match") AND ((("auth"."uid"())::"text" = "ta"."player_1") OR (("auth"."uid"())::"text" = "ta"."player_2") OR (("auth"."uid"())::"text" = "tb"."player_1") OR (("auth"."uid"())::"text" = "tb"."player_2"))))));



ALTER TABLE "games"."elo_calc_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "elo_calc_log_select_if_participant" ON "games"."elo_calc_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("games"."match" "m"
     JOIN "games"."teams" "ta" ON (("ta"."id" = "m"."team_a")))
     JOIN "games"."teams" "tb" ON (("tb"."id" = "m"."team_b")))
  WHERE (("m"."id" = "elo_calc_log"."match") AND ((("auth"."uid"())::"text" = "ta"."player_1") OR (("auth"."uid"())::"text" = "ta"."player_2") OR (("auth"."uid"())::"text" = "tb"."player_1") OR (("auth"."uid"())::"text" = "tb"."player_2"))))));



ALTER TABLE "games"."elo_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "games"."elo_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "games"."match" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_delete_participant_or_admin" ON "games"."match" FOR DELETE TO "authenticated" USING (("games"."is_member_of_teams"("team_a", "team_b") OR "public"."authorize"('games.admin'::"text")));



CREATE POLICY "match_insert_participant_or_admin" ON "games"."match" FOR INSERT TO "authenticated" WITH CHECK (("games"."is_member_of_teams"("team_a", "team_b") OR "public"."authorize"('games.admin'::"text")));



CREATE POLICY "match_select_if_participant" ON "games"."match" FOR SELECT TO "authenticated" USING ("games"."is_member_of_teams"("team_a", "team_b"));



CREATE POLICY "match_select_participant_or_admin" ON "games"."match" FOR SELECT TO "authenticated" USING (("games"."is_member_of_teams"("team_a", "team_b") OR "public"."authorize"('games.admin'::"text")));



CREATE POLICY "match_update_participant_or_admin" ON "games"."match" FOR UPDATE TO "authenticated" USING (("games"."is_member_of_teams"("team_a", "team_b") OR "public"."authorize"('games.admin'::"text"))) WITH CHECK (("games"."is_member_of_teams"("team_a", "team_b") OR "public"."authorize"('games.admin'::"text")));



CREATE POLICY "match_update_rated_by_creator" ON "games"."match" FOR UPDATE TO "authenticated" USING ((("auth"."uid"())::"text" = "created_by")) WITH CHECK ((("auth"."uid"())::"text" = "created_by"));



ALTER TABLE "games"."players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "players_self_select" ON "games"."players" FOR SELECT TO "authenticated" USING (("player" = ("auth"."uid"())::"text"));



CREATE POLICY "players_self_update" ON "games"."players" FOR UPDATE TO "authenticated" USING (("player" = ("auth"."uid"())::"text")) WITH CHECK (("player" = ("auth"."uid"())::"text"));



CREATE POLICY "players_update_self" ON "games"."players" FOR UPDATE TO "authenticated" USING ((("auth"."uid"())::"text" = "player")) WITH CHECK ((("auth"."uid"())::"text" = "player"));



ALTER TABLE "games"."sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sets_delete_if_participant_or_admin" ON "games"."sets" FOR DELETE TO "authenticated" USING (("games"."is_match_participant"("match") OR "public"."authorize"('games.admin'::"text")));



CREATE POLICY "sets_insert_if_participant_or_admin" ON "games"."sets" FOR INSERT TO "authenticated" WITH CHECK (("games"."is_match_participant"("match") OR "public"."authorize"('games.admin'::"text")));



CREATE POLICY "sets_select_if_participant_or_admin" ON "games"."sets" FOR SELECT TO "authenticated" USING (("games"."is_match_participant"("match") OR "public"."authorize"('games.admin'::"text")));



CREATE POLICY "sets_select_public_or_participant" ON "games"."sets" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "games"."match" "m"
  WHERE (("m"."id" = "sets"."match") AND ("m"."is_public" = true)))) OR (EXISTS ( SELECT 1
   FROM (("games"."match" "m"
     JOIN "games"."teams" "ta" ON (("ta"."id" = "m"."team_a")))
     JOIN "games"."teams" "tb" ON (("tb"."id" = "m"."team_b")))
  WHERE (("m"."id" = "sets"."match") AND ((("auth"."uid"())::"text" = "ta"."player_1") OR (("auth"."uid"())::"text" = "ta"."player_2") OR (("auth"."uid"())::"text" = "tb"."player_1") OR (("auth"."uid"())::"text" = "tb"."player_2")))))));



CREATE POLICY "sets_update_if_participant_or_admin" ON "games"."sets" FOR UPDATE TO "authenticated" USING (("games"."is_match_participant"("match") OR "public"."authorize"('games.admin'::"text"))) WITH CHECK (("games"."is_match_participant"("match") OR "public"."authorize"('games.admin'::"text")));



ALTER TABLE "games"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_insert_if_member" ON "games"."teams" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."uid"())::"text" = "player_1") OR (("auth"."uid"())::"text" = "player_2") OR "public"."authorize"('games.manage'::"text")));



CREATE POLICY "teams_select_admin" ON "games"."teams" FOR SELECT TO "authenticated" USING ("public"."authorize"('games.admin'::"text"));



CREATE POLICY "teams_select_if_in_user_match" ON "games"."teams" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "games"."match" "m"
  WHERE ((("m"."team_a" = "teams"."id") OR ("m"."team_b" = "teams"."id")) AND "games"."is_member_of_teams"("m"."team_a", "m"."team_b")))));



CREATE POLICY "teams_select_if_member" ON "games"."teams" FOR SELECT TO "authenticated" USING (((("auth"."uid"())::"text" = "player_1") OR (("auth"."uid"())::"text" = "player_2")));



CREATE POLICY "teams_update_if_member" ON "games"."teams" FOR UPDATE TO "authenticated" USING (((("auth"."uid"())::"text" = "player_1") OR (("auth"."uid"())::"text" = "player_2") OR "public"."authorize"('games.manage'::"text"))) WITH CHECK (((("auth"."uid"())::"text" = "player_1") OR (("auth"."uid"())::"text" = "player_2") OR "public"."authorize"('games.manage'::"text")));



CREATE POLICY "Access to all users" ON "public"."item_history" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow auth admin to read" ON "public"."group_features" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow auth admin to read" ON "public"."group_permissions" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow auth admin to read" ON "public"."group_user_mapping" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow delete when admin of group" ON "public"."challenge" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "challenge"."group") AND ("gum"."user" = ("auth"."uid"())::"text") AND ("gum"."role" = 'admin'::"public"."GroupRole")))));



CREATE POLICY "Allow delete when admin of group" ON "public"."event_group" FOR DELETE TO "authenticated" USING ((( SELECT "count"(*) AS "count"
   FROM "public"."group_user_mapping"
  WHERE (("group_user_mapping"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("group_user_mapping"."role" = 'admin'::"public"."GroupRole"))) > 0));



CREATE POLICY "Allow delete with drinks.edit permission" ON "public"."drink" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('drinks.edit'::"text") AS "authorize"));



CREATE POLICY "Allow delete with event.comment permission on own comment" ON "public"."event_comments" FOR DELETE USING ((( SELECT "public"."authorize"('event.comment'::"text") AS "authorize") AND (USER = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow everything if user is super admin" ON "public"."group_permissions" TO "authenticated" USING (( SELECT "public"."authorize"('supabase.admin'::"text") AS "authorize"));



CREATE POLICY "Allow insert access to public.user for authenticated users" ON "public"."user" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow insert for all" ON "public"."event_group" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow insert for own" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (("userId" = (( SELECT "auth"."uid"() AS "uid"))::"text"));



CREATE POLICY "Allow insert when admin of group" ON "public"."challenge" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "challenge"."group") AND ("gum"."user" = ("auth"."uid"())::"text") AND ("gum"."role" = 'admin'::"public"."GroupRole")))));



CREATE POLICY "Allow insert with drinks.edit permission" ON "public"."drink" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('drinks.edit'::"text") AS "authorize"));



CREATE POLICY "Allow insert with event.comment permission on own comment" ON "public"."event_comments" FOR INSERT WITH CHECK ((( SELECT "public"."authorize"('event.comment'::"text") AS "authorize") AND ("user" = ( SELECT ("auth"."uid"())::"text" AS "uid")) AND "public"."check_reply_to"("reply_to")));



CREATE POLICY "Allow insert with event.edit permission" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('event.edit'::"text") AS "authorize"));



CREATE POLICY "Allow no deletions" ON "public"."payments" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "Allow own payment or if drinks.confirm.payments permission is p" ON "public"."payments" FOR SELECT TO "authenticated" USING ((( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize") OR ("userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow select access to public.user for authenticated users" ON "public"."user" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for all" ON "public"."events" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select with drinks.select permission" ON "public"."drink" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('drinks.select'::"text") AS "authorize"));



CREATE POLICY "Allow select with event.comment permission" ON "public"."event_comments" FOR SELECT USING (( SELECT "public"."authorize"('event.comment'::"text") AS "authorize"));



CREATE POLICY "Allow update for admin in group" ON "public"."event_group" FOR UPDATE TO "authenticated" USING ((( SELECT "count"(*) AS "count"
   FROM "public"."group_user_mapping"
  WHERE (("group_user_mapping"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("group_user_mapping"."role" = 'admin'::"public"."GroupRole"))) > 0));



CREATE POLICY "Allow update when user is admin of challenge group" ON "public"."challenge" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "challenge"."group") AND ("gum"."user" = ("auth"."uid"())::"text") AND ("gum"."role" = 'admin'::"public"."GroupRole")))));



CREATE POLICY "Allow update with drinks.confirm.payments permission" ON "public"."payments" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



CREATE POLICY "Allow update with drinks.edit permission" ON "public"."drink" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('drinks.edit'::"text") AS "authorize"));



CREATE POLICY "Allow update with event.comment permission on own comment" ON "public"."event_comments" FOR UPDATE USING ((( SELECT "public"."authorize"('event.comment'::"text") AS "authorize") AND (USER = ("auth"."uid"())::"text"))) WITH CHECK (true);



CREATE POLICY "Allow update with event.edit permission" ON "public"."events" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('event.edit'::"text") AS "authorize"));



CREATE POLICY "Delete when admin or own user" ON "public"."group_user_mapping" FOR DELETE USING (("public"."is_user_admin_in_group"("group") OR ("user" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Delete with drinks.edit.payments permission" ON "public"."history" FOR DELETE USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



CREATE POLICY "Enable access for all users" ON "public"."payments" USING (true);



CREATE POLICY "Enable access for all users" ON "public"."user" TO "authenticated", "anon" USING (true);



CREATE POLICY "Enable access for all users" ON "public"."vouchers" USING (true);



CREATE POLICY "Enable everything if user is super admin" ON "public"."group_features" TO "authenticated" USING (( SELECT "public"."authorize"('supabase.admin'::"text") AS "authorize"));



CREATE POLICY "Enable read access for all users" ON "public"."features" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."group_features" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."group_permissions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."permissions" FOR SELECT USING (true);



CREATE POLICY "Insert as admin if no other user in group" ON "public"."group_user_mapping" FOR INSERT TO "authenticated" WITH CHECK ((("role" = 'admin'::"public"."GroupRole") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE ("gum"."group" = "group_user_mapping"."group"))))));



CREATE POLICY "Insert as user when group is public and needs no joni request" ON "public"."group_user_mapping" FOR INSERT TO "authenticated" WITH CHECK ((("role" = 'user'::"public"."GroupRole") AND (EXISTS ( SELECT 1
   FROM "public"."event_group"
  WHERE (("event_group"."id" = "group_user_mapping"."group") AND ("event_group"."need_request_to_join" = false) AND "event_group"."is_public"))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("gum"."group" = "group_user_mapping"."group")))))));



CREATE POLICY "Insert for own user" ON "public"."history" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Insert users when user is admin in group" ON "public"."group_user_mapping" FOR INSERT TO "authenticated" WITH CHECK ((("role" = 'user'::"public"."GroupRole") AND "public"."is_user_admin_in_group"("group")));



CREATE POLICY "Insert when user requests to join" ON "public"."group_user_mapping" FOR INSERT TO "authenticated" WITH CHECK (("role" = 'joinRequested'::"public"."GroupRole"));



CREATE POLICY "Select all with permission edit;payments" ON "public"."history" FOR SELECT USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



CREATE POLICY "Select challenges for user with group" ON "public"."challenge" FOR SELECT USING ((( SELECT "challenge"."group") IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text"))));



CREATE POLICY "Select drinks as user" ON "public"."drink" FOR SELECT USING (("active" = true));



CREATE POLICY "Select events for user in group" ON "public"."events" FOR SELECT TO "authenticated" USING ((( SELECT "events"."group") IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE (("group_user_mapping"."user" = ("auth"."uid"())::"text") AND (("group_user_mapping"."role" = 'user'::"public"."GroupRole") OR ("group_user_mapping"."role" = 'admin'::"public"."GroupRole"))))));



CREATE POLICY "Select for own user" ON "public"."history" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Select if user is member" ON "public"."event_group" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "event_group"."id") AND ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("gum"."role" = 'admin'::"public"."GroupRole") OR ("gum"."role" = 'user'::"public"."GroupRole"))))));



CREATE POLICY "Select mappings if user is in group" ON "public"."group_user_mapping" FOR SELECT TO "authenticated" USING ("public"."is_user_in_group"("group"));



CREATE POLICY "Select parent groups if visibile" ON "public"."event_group" FOR SELECT USING ((("parent_group" IS NULL) AND "visible"));



CREATE POLICY "Select subgroups only if user is member of parent group" ON "public"."event_group" FOR SELECT USING ((("is_public" = true) AND ("parent_group" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "event_group"."parent_group") AND ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("gum"."role" = 'admin'::"public"."GroupRole") OR ("gum"."role" = 'user'::"public"."GroupRole")))))));



CREATE POLICY "Update for own user" ON "public"."history" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Update group user mapping when admin of group" ON "public"."group_user_mapping" FOR UPDATE USING ((( SELECT "count"(*) AS "count"
   FROM "public"."group_user_mapping" "group_user_mapping_1"
  WHERE (("group_user_mapping_1"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("group_user_mapping_1"."role" = 'admin'::"public"."GroupRole"))) > 0));



CREATE POLICY "Update with drinks.confirm.payments permission" ON "public"."history" FOR UPDATE USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



CREATE POLICY "attendance_delete_self_or_manager" ON "public"."event_attendance_user_mapping" FOR DELETE TO "authenticated" USING (((("user" = ("auth"."uid"())::"text") OR "public"."authorize"('event.attendance.manage'::"text")) AND (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "e"."group")))
  WHERE (("e"."id" = "event_attendance_user_mapping"."event") AND ("gum"."user" = ("auth"."uid"())::"text"))))));



CREATE POLICY "attendance_insert_self_or_manager" ON "public"."event_attendance_user_mapping" FOR INSERT TO "authenticated" WITH CHECK (((("user" = ("auth"."uid"())::"text") OR "public"."authorize"('event.attendance.manage'::"text")) AND (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "e"."group")))
  WHERE (("e"."id" = "event_attendance_user_mapping"."event") AND ("gum"."user" = ("auth"."uid"())::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendance_user_mapping"."event") AND ("e"."startingDateTime" > "now"()) AND ("e"."isCancelled" = false))))));



CREATE POLICY "attendance_select_member" ON "public"."event_attendance_user_mapping" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "e"."group")))
  WHERE (("e"."id" = "event_attendance_user_mapping"."event") AND ("gum"."user" = ("auth"."uid"())::"text")))));



CREATE POLICY "attendance_update_self_or_manager" ON "public"."event_attendance_user_mapping" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "e"."group")))
  WHERE (("e"."id" = "event_attendance_user_mapping"."event") AND ("gum"."user" = ("auth"."uid"())::"text"))))) WITH CHECK (((("user" = ("auth"."uid"())::"text") OR "public"."authorize"('event.attendance.manage'::"text")) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "event_attendance_user_mapping"."event") AND ("e"."startingDateTime" > "now"()) AND ("e"."isCancelled" = false))))));



ALTER TABLE "public"."challenge" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "challenge_stats_delete" ON "public"."challenge_stats" FOR DELETE TO "authenticated" USING ((("user" = ("auth"."uid"())::"text") OR ("public"."authorize"('challenge.manage'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."challenge" "c"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "c"."group")))
  WHERE (("c"."id" = "challenge_stats"."challenge") AND ("gum"."user" = ("auth"."uid"())::"text")))))));



CREATE POLICY "challenge_stats_insert" ON "public"."challenge_stats" FOR INSERT TO "authenticated" WITH CHECK (((("user" = ("auth"."uid"())::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."challenge" "c"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "c"."group")))
  WHERE (("c"."id" = "challenge_stats"."challenge") AND ("gum"."user" = ("auth"."uid"())::"text"))))) OR "public"."authorize"('challenge.manage'::"text")));



CREATE POLICY "challenge_stats_select" ON "public"."challenge_stats" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."challenge" "c"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "c"."group")))
  WHERE (("c"."id" = "challenge_stats"."challenge") AND ("gum"."user" = ("auth"."uid"())::"text")))) OR "public"."authorize"('challenge.manage'::"text")));



CREATE POLICY "challenge_stats_update" ON "public"."challenge_stats" FOR UPDATE TO "authenticated" USING ((("user" = ("auth"."uid"())::"text") OR ("public"."authorize"('challenge.manage'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."challenge" "c"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "c"."group")))
  WHERE (("c"."id" = "challenge_stats"."challenge") AND ("gum"."user" = ("auth"."uid"())::"text"))))))) WITH CHECK ((("user" = ("auth"."uid"())::"text") OR ("public"."authorize"('challenge.manage'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."challenge" "c"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "c"."group")))
  WHERE (("c"."id" = "challenge_stats"."challenge") AND ("gum"."user" = ("auth"."uid"())::"text")))))));



ALTER TABLE "public"."drink" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ebp_delete_self_or_manager" ON "public"."event_bring_pledges" FOR DELETE TO "authenticated" USING (((("user_id" = ("auth"."uid"())::"text") OR "public"."authorize"('event.edit'::"text")) AND (EXISTS ( SELECT 1
   FROM (("public"."event_bring_items" "bi"
     JOIN "public"."events" "e" ON (("e"."id" = "bi"."event")))
     JOIN "public"."group_user_mapping" "g" ON (("g"."group" = "e"."group")))
  WHERE (("bi"."id" = "event_bring_pledges"."item") AND ("g"."user" = ("auth"."uid"())::"text"))))));



CREATE POLICY "ebp_insert_self" ON "public"."event_bring_pledges" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ("auth"."uid"())::"text") AND (EXISTS ( SELECT 1
   FROM (("public"."event_bring_items" "bi"
     JOIN "public"."events" "e" ON (("e"."id" = "bi"."event")))
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "e"."group")))
  WHERE (("bi"."id" = "event_bring_pledges"."item") AND ("gum"."user" = ("auth"."uid"())::"text") AND ("e"."items_enabled" IS TRUE))))));



CREATE POLICY "ebp_select_member" ON "public"."event_bring_pledges" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."event_bring_items" "bi"
     JOIN "public"."events" "e" ON (("e"."id" = "bi"."event")))
     JOIN "public"."group_user_mapping" "g" ON (("g"."group" = "e"."group")))
  WHERE (("bi"."id" = "event_bring_pledges"."item") AND ("g"."user" = ("auth"."uid"())::"text")))));



CREATE POLICY "ebp_update_self_or_manager" ON "public"."event_bring_pledges" FOR UPDATE TO "authenticated" USING (((("user_id" = ("auth"."uid"())::"text") OR "public"."authorize"('event.edit'::"text")) AND (EXISTS ( SELECT 1
   FROM (("public"."event_bring_items" "bi"
     JOIN "public"."events" "e" ON (("e"."id" = "bi"."event")))
     JOIN "public"."group_user_mapping" "g" ON (("g"."group" = "e"."group")))
  WHERE (("bi"."id" = "event_bring_pledges"."item") AND ("g"."user" = ("auth"."uid"())::"text")))))) WITH CHECK (((("user_id" = ("auth"."uid"())::"text") OR "public"."authorize"('event.edit'::"text")) AND (EXISTS ( SELECT 1
   FROM (("public"."event_bring_items" "bi"
     JOIN "public"."events" "e" ON (("e"."id" = "bi"."event")))
     JOIN "public"."group_user_mapping" "g" ON (("g"."group" = "e"."group")))
  WHERE (("bi"."id" = "event_bring_pledges"."item") AND ("g"."user" = ("auth"."uid"())::"text"))))));



ALTER TABLE "public"."event_attendance_user_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_bring_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_bring_pledges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_group" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_delete_with_perm" ON "public"."events" FOR DELETE TO "authenticated" USING (("public"."authorize"('event.delete'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "events"."group") AND ("gum"."user" = ("auth"."uid"())::"text"))))));



CREATE POLICY "events_insert_with_perm" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("public"."authorize"('event.create'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "events"."group") AND ("gum"."user" = ("auth"."uid"())::"text"))))));



CREATE POLICY "events_select_group_member" ON "public"."events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "events"."group") AND ("gum"."user" = ("auth"."uid"())::"text")))));



CREATE POLICY "events_update_with_perm" ON "public"."events" FOR UPDATE TO "authenticated" USING (("public"."authorize"('event.edit'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "events"."group") AND ("gum"."user" = ("auth"."uid"())::"text")))))) WITH CHECK (("public"."authorize"('event.edit'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "events"."group") AND ("gum"."user" = ("auth"."uid"())::"text"))))));



ALTER TABLE "public"."features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_user_mapping" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gum_insert_self_public_open" ON "public"."group_user_mapping" FOR INSERT TO "authenticated" WITH CHECK ((("user" = ("auth"."uid"())::"text") AND ("role" = 'user'::"public"."GroupRole") AND (EXISTS ( SELECT 1
   FROM "public"."event_group" "eg"
  WHERE (("eg"."id" = "group_user_mapping"."group") AND ("eg"."is_public" = true) AND ("eg"."need_request_to_join" = false))))));



CREATE POLICY "gum_select_self" ON "public"."group_user_mapping" FOR SELECT TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_history_insert_if_member" ON "public"."item_history" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "i"."group"
   FROM "public"."items" "i"
  WHERE ("i"."id" = "item_history"."key")) IN ( SELECT "gum"."group"
   FROM "public"."group_user_mapping" "gum"
  WHERE ("gum"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "item_history_select_if_member" ON "public"."item_history" FOR SELECT TO "authenticated" USING ((( SELECT "i"."group"
   FROM "public"."items" "i"
  WHERE ("i"."id" = "item_history"."key")) IN ( SELECT "gum"."group"
   FROM "public"."group_user_mapping" "gum"
  WHERE ("gum"."user" = ("auth"."uid"())::"text"))));



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "items_select_if_member" ON "public"."items" FOR SELECT TO "authenticated" USING (("group" IN ( SELECT "gum"."group"
   FROM "public"."group_user_mapping" "gum"
  WHERE ("gum"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "items_select_member" ON "public"."event_bring_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."group_user_mapping" "gum" ON (("gum"."group" = "e"."group")))
  WHERE (("e"."id" = "event_bring_items"."event") AND ("gum"."user" = ("auth"."uid"())::"text")))));



CREATE POLICY "items_update_holder_if_member" ON "public"."items" FOR UPDATE TO "authenticated" USING (("group" IN ( SELECT "gum"."group"
   FROM "public"."group_user_mapping" "gum"
  WHERE ("gum"."user" = ("auth"."uid"())::"text")))) WITH CHECK (("group" IN ( SELECT "gum"."group"
   FROM "public"."group_user_mapping" "gum"
  WHERE ("gum"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "items_update_manage" ON "public"."items" FOR UPDATE TO "authenticated" USING ("public"."authorize"('items.manage'::"text")) WITH CHECK ("public"."authorize"('items.manage'::"text"));



CREATE POLICY "items_write_edit_or_manage" ON "public"."event_bring_items" TO "authenticated" USING (("public"."authorize"('event.edit'::"text") OR "public"."authorize"('items.manage'::"text"))) WITH CHECK (("public"."authorize"('event.edit'::"text") OR "public"."authorize"('items.manage'::"text")));



ALTER TABLE "public"."notification_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_outbox_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_retention" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_retention_select_admin" ON "public"."notification_retention" FOR SELECT TO "authenticated" USING ("public"."authorize"('supabase.admin'::"text"));



CREATE POLICY "notification_retention_write_admin" ON "public"."notification_retention" TO "authenticated" USING ("public"."authorize"('supabase.admin'::"text")) WITH CHECK ("public"."authorize"('supabase.admin'::"text"));



ALTER TABLE "public"."notification_topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_topics_select_all" ON "public"."notification_topics" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user" = ("auth"."uid"())::"text")) WITH CHECK (("user" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."object_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "os_self" ON "public"."object_subscriptions" TO "authenticated" USING (("user" = ("auth"."uid"())::"text")) WITH CHECK (("user" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "udg_admin_write" ON "public"."user_direct_grants" TO "authenticated" USING ("public"."authorize"('supabase.admin'::"text")) WITH CHECK ("public"."authorize"('supabase.admin'::"text"));



CREATE POLICY "udg_self_read" ON "public"."user_direct_grants" FOR SELECT TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "unp_delete_own" ON "public"."user_notification_preferences" FOR DELETE TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "unp_insert_self" ON "public"."user_notification_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "unp_select_own" ON "public"."user_notification_preferences" FOR SELECT TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "unp_select_self" ON "public"."user_notification_preferences" FOR SELECT TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "unp_update_own" ON "public"."user_notification_preferences" FOR UPDATE TO "authenticated" USING (("user" = ("auth"."uid"())::"text")) WITH CHECK (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "unp_update_self" ON "public"."user_notification_preferences" FOR UPDATE TO "authenticated" USING (("user" = ("auth"."uid"())::"text")) WITH CHECK (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "unp_upsert_self" ON "public"."user_notification_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_direct_grants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_grants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_grants_self_read" ON "public"."user_grants" FOR SELECT TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."web_push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wps_delete_self" ON "public"."web_push_subscriptions" FOR DELETE TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "wps_insert_self" ON "public"."web_push_subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "wps_select_self" ON "public"."web_push_subscriptions" FOR SELECT TO "authenticated" USING (("user" = ("auth"."uid"())::"text"));



CREATE POLICY "wps_update_self" ON "public"."web_push_subscriptions" FOR UPDATE TO "authenticated" USING (("user" = ("auth"."uid"())::"text")) WITH CHECK (("user" = ("auth"."uid"())::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT USAGE ON SCHEMA "games" TO "service_role";
GRANT ALL ON SCHEMA "games" TO PUBLIC;
GRANT USAGE ON SCHEMA "games" TO "authenticated";






































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" bigint, "p_urgency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" bigint, "p_urgency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" bigint, "p_urgency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" "uuid", "p_urgency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" "uuid", "p_urgency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_enqueue_notification"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_id" "uuid", "p_urgency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_enqueue_notification_core"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_uuid" "uuid", "p_urgency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_enqueue_notification_core"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_uuid" "uuid", "p_urgency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_enqueue_notification_core"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_title" "text", "p_data" "jsonb", "p_source_type" "text", "p_source_uuid" "uuid", "p_urgency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_match_participants_uids"("p_match" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."_match_participants_uids"("p_match" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_match_participants_uids"("p_match" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_challenge_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_challenge_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_challenge_added"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_challenge_entry_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_challenge_entry_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_challenge_entry_added"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_drink_payment_fulfilled"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_drink_payment_fulfilled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_drink_payment_fulfilled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_event_canceled"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_event_canceled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_event_canceled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_event_comment_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_event_comment_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_event_comment_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_event_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_event_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_event_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_game_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_game_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_game_added"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_group_request_confirmed"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_group_request_confirmed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_group_request_confirmed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_notify_item_handover"() TO "anon";
GRANT ALL ON FUNCTION "public"."_notify_item_handover"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_notify_item_handover"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_sum_challenge_points_for_self"("uid" "text", "challenge_id" "uuid", "from_ts" timestamp with time zone, "to_ts" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_sum_challenge_points_for_self"("uid" "text", "challenge_id" "uuid", "from_ts" timestamp with time zone, "to_ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."_sum_challenge_points_for_self"("uid" "text", "challenge_id" "uuid", "from_ts" timestamp with time zone, "to_ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_sum_challenge_points_for_self"("uid" "text", "challenge_id" "uuid", "from_ts" timestamp with time zone, "to_ts" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."_trg_refresh_from_udg"() TO "anon";
GRANT ALL ON FUNCTION "public"."_trg_refresh_from_udg"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_trg_refresh_from_udg"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_trg_refresh_from_udg_stmt"() TO "anon";
GRANT ALL ON FUNCTION "public"."_trg_refresh_from_udg_stmt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_trg_refresh_from_udg_stmt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_drinks_history"("items" json) TO "anon";
GRANT ALL ON FUNCTION "public"."add_drinks_history"("items" json) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_drinks_history"("items" json) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_user_to_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_to_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_to_public"() TO "service_role";



GRANT ALL ON FUNCTION "public"."as_service"() TO "anon";
GRANT ALL ON FUNCTION "public"."as_service"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."as_service"() TO "service_role";



GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text", "p_tenant" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text", "p_tenant" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text", "p_tenant" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_parent_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_parent_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_parent_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_reply_to"("value" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_reply_to"("value" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_reply_to"("value" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_outbox_targets"("p_limit" integer, "p_lease_seconds" integer, "p_worker" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_outbox_targets"("p_limit" integer, "p_lease_seconds" integer, "p_worker" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_outbox_targets"("p_limit" integer, "p_lease_seconds" integer, "p_worker" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_all_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_all_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_all_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_outbox"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_outbox"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_outbox"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_revoked_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_revoked_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_revoked_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_target_failed"("p_target_id" bigint, "p_status" integer, "p_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_target_failed"("p_target_id" bigint, "p_status" integer, "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_target_failed"("p_target_id" bigint, "p_status" integer, "p_error" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_target_sent"("p_target_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."complete_target_sent"("p_target_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_target_sent"("p_target_id" bigint) TO "service_role";



GRANT MAINTAIN ON TABLE "public"."event_group" TO "anon";
GRANT ALL ON TABLE "public"."event_group" TO "authenticated";
GRANT ALL ON TABLE "public"."event_group" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_next_occurrences"("p_run_at" timestamp with time zone, "p_horizon" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."create_next_occurrences"("p_run_at" timestamp with time zone, "p_horizon" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_next_occurrences"("p_run_at" timestamp with time zone, "p_horizon" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."delete_user_from_subgroups"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_from_subgroups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_from_subgroups"() TO "service_role";



GRANT MAINTAIN ON TABLE "public"."items" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON FUNCTION "public"."edit_item"("p_id" bigint, "p_name" "text", "p_color" "text", "p_type" "public"."ItemType") TO "anon";
GRANT ALL ON FUNCTION "public"."edit_item"("p_id" bigint, "p_name" "text", "p_color" "text", "p_type" "public"."ItemType") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edit_item"("p_id" bigint, "p_name" "text", "p_color" "text", "p_type" "public"."ItemType") TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_notification"("p_user" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_urgency" "text", "p_ttl_seconds" integer, "p_tenant" "uuid", "p_dedupe_key" "text", "p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_notification"("p_user" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_urgency" "text", "p_ttl_seconds" integer, "p_tenant" "uuid", "p_dedupe_key" "text", "p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_notification"("p_user" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb", "p_urgency" "text", "p_ttl_seconds" integer, "p_tenant" "uuid", "p_dedupe_key" "text", "p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."eventcreation"() TO "anon";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enum_types"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_enum_types"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enum_types"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_table_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_table_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_table_names"() TO "service_role";



GRANT ALL ON FUNCTION "public"."getattendingusers"("event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."getattendingusers"("event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."getattendingusers"("event_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."gettingjsonarray"("items" json) TO "anon";
GRANT ALL ON FUNCTION "public"."gettingjsonarray"("items" json) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gettingjsonarray"("items" json) TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."grant_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."grant_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."inc_target_attempt"("p_outbox_id" bigint, "p_subscription_id" "uuid", "p_status" integer, "p_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."inc_target_attempt"("p_outbox_id" bigint, "p_subscription_id" "uuid", "p_status" integer, "p_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inc_target_attempt"("p_outbox_id" bigint, "p_subscription_id" "uuid", "p_status" integer, "p_error" "text") TO "service_role";



GRANT MAINTAIN ON TABLE "public"."challenge_stats" TO "anon";
GRANT ALL ON TABLE "public"."challenge_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_stats" TO "service_role";



GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("challenge_id" "uuid", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("challenge_id" "uuid", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("challenge_id" "uuid", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."invoke_edge_function"("p_function_name" "text", "p_body" "jsonb", "p_timeout_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."invoke_edge_function"("p_function_name" "text", "p_body" "jsonb", "p_timeout_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."invoke_edge_function"("p_function_name" "text", "p_body" "jsonb", "p_timeout_ms" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_topic_enabled_for_user"("p_user" "text", "p_tenant" "uuid", "p_topic" "text", "p_scope_type" "text", "p_scope_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_in_group"("group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_in_group"("group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_in_group"("group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."key_handover"("p_key_id" bigint, "p_new_holder" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."key_handover"("p_key_id" bigint, "p_new_holder" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."key_handover"("p_key_id" bigint, "p_new_holder" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_topic" "text", "p_source_type" "text", "p_source_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_user_grants"("p_user" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_user_grants"("p_user" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_user_grants"("p_user" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_web_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text", "p_platform" "text", "p_expiration" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."register_web_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text", "p_platform" "text", "p_expiration" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_web_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text", "p_platform" "text", "p_expiration" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_group_grants"("p_group" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_user_grants"("p_user" "text", "p_tenant" "uuid", "p_perms" "text"[], "p_feats" "text"[]) TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";



GRANT ALL ON FUNCTION "public"."set_notification_pref"("p_topic" "text", "p_enabled" boolean, "p_channel" "text", "p_scope_type" "text", "p_scope_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_notification_pref"("p_topic" "text", "p_enabled" boolean, "p_channel" "text", "p_scope_type" "text", "p_scope_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_notification_pref"("p_topic" "text", "p_enabled" boolean, "p_channel" "text", "p_scope_type" "text", "p_scope_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_login"("uid" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_login"("uid" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_login"("uid" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_seed_grant_feature"("p_group" "uuid", "p_feature" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_seed_grant_feature"("p_group" "uuid", "p_feature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_seed_grant_feature"("p_group" "uuid", "p_feature" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_seed_grant_permission"("p_group" "uuid", "p_perm" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_seed_grant_permission"("p_group" "uuid", "p_perm" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_seed_grant_permission"("p_group" "uuid", "p_perm" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_check_item_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_check_item_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_check_item_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_items_guard_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_items_guard_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_items_guard_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_items_handover_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_items_handover_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_items_handover_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_pledge_sanity"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_pledge_sanity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_pledge_sanity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_group_features"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_group_features"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_group_features"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_group_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_group_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_group_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_grants_on_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_sync_pledge_event_from_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_sync_pledge_event_from_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_sync_pledge_event_from_item"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unregister_web_push_subscription"("p_endpoint" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unregister_web_push_subscription"("p_endpoint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unregister_web_push_subscription"("p_endpoint" "text") TO "service_role";



GRANT MAINTAIN ON TABLE "public"."event_attendance_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_attendance"("p_event" "uuid", "p_user" "text", "p_state" "public"."EventAttendance") TO "anon";
GRANT ALL ON FUNCTION "public"."update_attendance"("p_event" "uuid", "p_user" "text", "p_state" "public"."EventAttendance") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_attendance"("p_event" "uuid", "p_user" "text", "p_state" "public"."EventAttendance") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_normalized_players"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_normalized_players"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_normalized_players"() TO "service_role";



GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "anon";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "service_role";



GRANT ALL ON FUNCTION "test_overrides"."now"() TO "anon";
GRANT ALL ON FUNCTION "test_overrides"."now"() TO "authenticated";
GRANT ALL ON FUNCTION "test_overrides"."now"() TO "service_role";



GRANT ALL ON FUNCTION "tests"."authenticate_as"("identifier" "text") TO "anon";
GRANT ALL ON FUNCTION "tests"."authenticate_as"("identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "tests"."authenticate_as"("identifier" "text") TO "service_role";



GRANT ALL ON FUNCTION "tests"."authenticate_as_service_role"() TO "anon";
GRANT ALL ON FUNCTION "tests"."authenticate_as_service_role"() TO "authenticated";
GRANT ALL ON FUNCTION "tests"."authenticate_as_service_role"() TO "service_role";



GRANT ALL ON FUNCTION "tests"."clear_authentication"() TO "anon";
GRANT ALL ON FUNCTION "tests"."clear_authentication"() TO "authenticated";
GRANT ALL ON FUNCTION "tests"."clear_authentication"() TO "service_role";



GRANT ALL ON FUNCTION "tests"."create_supabase_user"("identifier" "text", "email" "text", "phone" "text", "metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "tests"."create_supabase_user"("identifier" "text", "email" "text", "phone" "text", "metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "tests"."create_supabase_user"("identifier" "text", "email" "text", "phone" "text", "metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "tests"."freeze_time"("frozen_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "tests"."freeze_time"("frozen_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "tests"."freeze_time"("frozen_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "tests"."get_supabase_uid"("identifier" "text") TO "anon";
GRANT ALL ON FUNCTION "tests"."get_supabase_uid"("identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "tests"."get_supabase_uid"("identifier" "text") TO "service_role";



GRANT ALL ON FUNCTION "tests"."get_supabase_user"("identifier" "text") TO "anon";
GRANT ALL ON FUNCTION "tests"."get_supabase_user"("identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "tests"."get_supabase_user"("identifier" "text") TO "service_role";



GRANT ALL ON FUNCTION "tests"."rls_enabled"("testing_schema" "text") TO "anon";
GRANT ALL ON FUNCTION "tests"."rls_enabled"("testing_schema" "text") TO "authenticated";
GRANT ALL ON FUNCTION "tests"."rls_enabled"("testing_schema" "text") TO "service_role";



GRANT ALL ON FUNCTION "tests"."rls_enabled"("testing_schema" "text", "testing_table" "text") TO "anon";
GRANT ALL ON FUNCTION "tests"."rls_enabled"("testing_schema" "text", "testing_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "tests"."rls_enabled"("testing_schema" "text", "testing_table" "text") TO "service_role";



GRANT ALL ON FUNCTION "tests"."unfreeze_time"() TO "anon";
GRANT ALL ON FUNCTION "tests"."unfreeze_time"() TO "authenticated";
GRANT ALL ON FUNCTION "tests"."unfreeze_time"() TO "service_role";
























GRANT SELECT ON TABLE "games"."elo_calc_log" TO "authenticated";



GRANT SELECT ON TABLE "games"."elo_config" TO "authenticated";



GRANT SELECT ON TABLE "games"."elo_history" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."match" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."match" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."match" TO "dashboard_user";



GRANT ALL ON TABLE "games"."players" TO "service_role";
GRANT ALL ON TABLE "games"."players" TO PUBLIC;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."players" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."players" TO "dashboard_user";



GRANT SELECT ON TABLE "games"."players_public" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."sets" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."sets" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."sets" TO "dashboard_user";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."teams" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."teams" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."teams" TO "dashboard_user";



GRANT SELECT ON TABLE "games"."user_matches" TO "authenticated";



GRANT MAINTAIN ON TABLE "public"."challenge" TO "anon";
GRANT ALL ON TABLE "public"."challenge" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge" TO "service_role";



GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON TABLE "public"."challenge_user_points" TO "anon";
GRANT ALL ON TABLE "public"."challenge_user_points" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_user_points" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."current_distinct_event" TO "anon";
GRANT ALL ON TABLE "public"."current_distinct_event" TO "authenticated";
GRANT ALL ON TABLE "public"."current_distinct_event" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."drink" TO "anon";
GRANT ALL ON TABLE "public"."drink" TO "authenticated";
GRANT ALL ON TABLE "public"."drink" TO "service_role";



GRANT ALL ON TABLE "public"."distinct_drinks" TO "anon";
GRANT ALL ON TABLE "public"."distinct_drinks" TO "authenticated";
GRANT ALL ON TABLE "public"."distinct_drinks" TO "service_role";



GRANT ALL ON TABLE "public"."distinct_event" TO "anon";
GRANT ALL ON TABLE "public"."distinct_event" TO "authenticated";
GRANT ALL ON TABLE "public"."distinct_event" TO "service_role";



GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."event_bring_items" TO "anon";
GRANT ALL ON TABLE "public"."event_bring_items" TO "authenticated";
GRANT ALL ON TABLE "public"."event_bring_items" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."event_bring_pledges" TO "anon";
GRANT ALL ON TABLE "public"."event_bring_pledges" TO "authenticated";
GRANT ALL ON TABLE "public"."event_bring_pledges" TO "service_role";



GRANT ALL ON TABLE "public"."event_bring_item_status" TO "anon";
GRANT ALL ON TABLE "public"."event_bring_item_status" TO "authenticated";
GRANT ALL ON TABLE "public"."event_bring_item_status" TO "service_role";



GRANT ALL ON TABLE "public"."event_bring_overview" TO "anon";
GRANT ALL ON TABLE "public"."event_bring_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."event_bring_overview" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."event_comments" TO "anon";
GRANT ALL ON TABLE "public"."event_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_comments" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."group_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "service_role";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."event_groups_view" TO "anon";
GRANT ALL ON TABLE "public"."event_groups_view" TO "authenticated";
GRANT ALL ON TABLE "public"."event_groups_view" TO "service_role";



GRANT ALL ON TABLE "public"."events_user_view" TO "anon";
GRANT ALL ON TABLE "public"."events_user_view" TO "authenticated";
GRANT ALL ON TABLE "public"."events_user_view" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."features" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."features" TO "authenticated";
GRANT ALL ON TABLE "public"."features" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."group_features" TO "anon";
GRANT ALL ON TABLE "public"."group_features" TO "authenticated";
GRANT ALL ON TABLE "public"."group_features" TO "service_role";
GRANT ALL ON TABLE "public"."group_features" TO "supabase_auth_admin";



GRANT MAINTAIN ON TABLE "public"."group_permissions" TO "anon";
GRANT ALL ON TABLE "public"."group_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."group_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."group_permissions" TO "supabase_auth_admin";



GRANT MAINTAIN ON TABLE "public"."history" TO "anon";
GRANT ALL ON TABLE "public"."history" TO "authenticated";
GRANT ALL ON TABLE "public"."history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."item_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."item_history" TO "authenticated";
GRANT ALL ON TABLE "public"."item_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."key_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."key_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."key_history_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_outbox" TO "anon";
GRANT MAINTAIN ON TABLE "public"."notification_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_outbox" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_outbox_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_outbox_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_outbox_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_outbox_targets" TO "anon";
GRANT MAINTAIN ON TABLE "public"."notification_outbox_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_outbox_targets" TO "service_role";



GRANT ALL ON TABLE "public"."notification_retention" TO "anon";
GRANT ALL ON TABLE "public"."notification_retention" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_retention" TO "authenticated";



GRANT ALL ON TABLE "public"."notification_topics" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_topics" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."object_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."object_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."object_subscriptions" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."permissions" TO "anon";
GRANT SELECT,MAINTAIN ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_direct_grants" TO "anon";
GRANT ALL ON TABLE "public"."user_direct_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."user_direct_grants" TO "service_role";



GRANT ALL ON TABLE "public"."user_features" TO "anon";
GRANT ALL ON TABLE "public"."user_features" TO "authenticated";
GRANT ALL ON TABLE "public"."user_features" TO "service_role";



GRANT ALL ON TABLE "public"."user_grants" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."user_grants" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_vouchers" TO "anon";
GRANT ALL ON TABLE "public"."user_vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_vouchers" TO "service_role";



GRANT MAINTAIN ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";



GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "test_overrides" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "test_overrides" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "test_overrides" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "tests" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "tests" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "tests" GRANT ALL ON FUNCTIONS TO "service_role";



























\unrestrict jkrobjnfizxoUFgAV9zLY9FFzkxqqGh28qw8yJaRmgsCwZM9Z2RC39itC6io5uu

RESET ALL;
