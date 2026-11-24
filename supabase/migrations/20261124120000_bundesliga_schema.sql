-- Moves the Bundesliga tables and functions from public into their own schema "bundesliga" and
-- drops the bundesliga_ prefix (public.bundesliga_teams → bundesliga.teams).
--
-- SET SCHEMA / RENAME keep each table's data, keys, indexes, RLS policies and grants. The three
-- write functions are recreated, because their bodies name the old tables.
--
-- Before deploying: add "bundesliga" to the exposed schemas (Project Settings → API → Data API)
-- of both projects, or the app and fetch-bundesliga cannot reach the tables.
-- The `bundesliga` feature and the `bundesliga.admin` permission stay in public.

CREATE SCHEMA IF NOT EXISTS bundesliga;
GRANT USAGE ON SCHEMA bundesliga TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['seasons', 'leagues', 'teams', 'team_players', 'matchdays', 'md_groups',
                           'encounters', 'standings', 'games']
  LOOP
    EXECUTE format('ALTER TABLE public.%I SET SCHEMA bundesliga', 'bundesliga_' || t);
    EXECUTE format('ALTER TABLE bundesliga.%I RENAME TO %I', 'bundesliga_' || t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Write functions for the edge function (service role)
-- ---------------------------------------------------------------------------
DROP FUNCTION public.bundesliga_activate_season(text, text, jsonb);
DROP FUNCTION public.bundesliga_replace_league(bigint, jsonb);
DROP FUNCTION public.bundesliga_store_games(bigint, jsonb);

-- Makes the season active (the only active one) and stores its leagues; returns the season id.
-- p_leagues: [{ "name", "sort", "teams_page_id", "schedule_slug" }]
CREATE FUNCTION bundesliga.activate_season(p_slug text, p_name text, p_leagues jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_season bigint;
BEGIN
  UPDATE bundesliga.seasons SET active = false WHERE active AND tournament_slug <> p_slug;

  INSERT INTO bundesliga.seasons (tournament_slug, name, active)
  VALUES (p_slug, p_name, true)
  ON CONFLICT (tournament_slug) DO UPDATE SET active = true, name = coalesce(excluded.name, bundesliga.seasons.name)
  RETURNING id INTO v_season;

  INSERT INTO bundesliga.leagues (season_id, name, sort, teams_page_id, schedule_slug)
  SELECT v_season, l.name, l.sort, l.teams_page_id, l.schedule_slug
  FROM jsonb_to_recordset(p_leagues) AS l(name text, sort smallint, teams_page_id text, schedule_slug text)
  ON CONFLICT (season_id, teams_page_id) DO UPDATE
    SET name = excluded.name, sort = excluded.sort, schedule_slug = excluded.schedule_slug;

  RETURN v_season;
END;
$$;

-- Replaces one league's data in a single transaction. Teams are upserted (so a vanished team is
-- removed with everything that references it); match days, groups, encounters and standings are
-- replaced; players only when p_data has "players" (the nightly run skips the rosters). The games
-- of encounters that are gone (or no longer played) are removed.
CREATE FUNCTION bundesliga.replace_league(p_league_id bigint, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO bundesliga.teams (league_id, pz_team_id, pz_team_version_id, name, logo_url, rgx_total)
  SELECT p_league_id, t.team_id, t.team_version_id, t.name, t.logo_url, t.rgx_total
  FROM jsonb_to_recordset(p_data -> 'teams')
    AS t(team_id text, team_version_id text, name text, logo_url text, rgx_total integer)
  ON CONFLICT (league_id, pz_team_id) DO UPDATE
    SET pz_team_version_id = excluded.pz_team_version_id,
        name = excluded.name,
        logo_url = excluded.logo_url,
        rgx_total = excluded.rgx_total;

  DELETE FROM bundesliga.teams b
  WHERE b.league_id = p_league_id
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_data -> 'teams') x WHERE x ->> 'team_id' = b.pz_team_id);

  IF p_data ? 'players' THEN
    DELETE FROM bundesliga.team_players WHERE league_id = p_league_id;
    INSERT INTO bundesliga.team_players (league_id, pz_team_id, pz_player_id, name, gender, rg_index, avatar_url, pro)
    SELECT p_league_id, p.team_id, p.player_id, p.name, p.gender, p.rg_index, p.avatar_url, coalesce(p.pro, false)
    FROM jsonb_to_recordset(p_data -> 'players')
      AS p(team_id text, player_id text, name text, gender text, rg_index integer, avatar_url text, pro boolean)
    ON CONFLICT DO NOTHING;
  END IF;

  DELETE FROM bundesliga.matchdays WHERE league_id = p_league_id; -- cascades groups and encounters
  DELETE FROM bundesliga.standings WHERE league_id = p_league_id;

  INSERT INTO bundesliga.matchdays (league_id, pz_matchday_id, number)
  SELECT p_league_id, m.matchday_id, m.number
  FROM jsonb_to_recordset(p_data -> 'matchdays') AS m(matchday_id text, number smallint)
  ON CONFLICT DO NOTHING;

  INSERT INTO bundesliga.md_groups (league_id, pz_group_id, pz_matchday_id, name, play_date, city)
  SELECT p_league_id, g.group_id, g.matchday_id, g.name, g.play_date, g.city
  FROM jsonb_to_recordset(p_data -> 'groups')
    AS g(group_id text, matchday_id text, name text, play_date date, city text)
  ON CONFLICT DO NOTHING;

  INSERT INTO bundesliga.encounters (league_id, pz_game_id, pz_group_id, team1_id, team2_id, boards1, boards2, sets1, sets2, winner)
  SELECT p_league_id, e.game_id, e.group_id, e.team1_id, e.team2_id, e.boards1, e.boards2, e.sets1, e.sets2, e.winner
  FROM jsonb_to_recordset(p_data -> 'encounters')
    AS e(game_id text, group_id text, team1_id text, team2_id text,
         boards1 smallint, boards2 smallint, sets1 smallint, sets2 smallint, winner smallint)
  ON CONFLICT DO NOTHING;

  INSERT INTO bundesliga.standings (league_id, pz_team_id, position, wins, draws, losses, sets_for, sets_against, points_for, points_against)
  SELECT p_league_id, s.team_id, s.position, s.wins, s.draws, s.losses, s.sets_for, s.sets_against, s.points_for, s.points_against
  FROM jsonb_to_recordset(p_data -> 'standings')
    AS s(team_id text, position smallint, wins smallint, draws smallint, losses smallint,
         sets_for integer, sets_against integer, points_for integer, points_against integer)
  ON CONFLICT DO NOTHING;

  DELETE FROM bundesliga.games g
  WHERE g.league_id = p_league_id
    AND NOT EXISTS (SELECT 1 FROM bundesliga.encounters e
                    WHERE e.league_id = p_league_id AND e.pz_game_id = g.pz_encounter_id AND e.boards1 IS NOT NULL);

  UPDATE bundesliga.leagues SET refreshed_at = now(), refresh_error = NULL WHERE id = p_league_id;
END;
$$;

-- Upserts games of one league (rows as fetch-bundesliga's GameRow).
CREATE FUNCTION bundesliga.store_games(p_league_id bigint, p_games jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO bundesliga.games (league_id, pz_game_id, pz_encounter_id, sort, discipline,
                                pair1_name, pair2_name, pair1_players, pair2_players, sets, winner)
  SELECT p_league_id, g.game_id, g.encounter_id, g.sort, g.discipline, g.pair1_name, g.pair2_name,
         coalesce(g.pair1_players, '{}'), coalesce(g.pair2_players, '{}'), coalesce(g.sets, '[]'), g.winner
  FROM jsonb_to_recordset(p_games)
    AS g(game_id text, encounter_id text, sort smallint, discipline text, pair1_name text, pair2_name text,
         pair1_players text[], pair2_players text[], sets jsonb, winner smallint)
  ON CONFLICT (league_id, pz_game_id) DO UPDATE
    SET pz_encounter_id = excluded.pz_encounter_id,
        sort = excluded.sort,
        discipline = excluded.discipline,
        pair1_name = excluded.pair1_name,
        pair2_name = excluded.pair2_name,
        pair1_players = excluded.pair1_players,
        pair2_players = excluded.pair2_players,
        sets = excluded.sets,
        winner = excluded.winner;
$$;

REVOKE ALL ON FUNCTION bundesliga.activate_season(text, text, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION bundesliga.replace_league(bigint, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION bundesliga.store_games(bigint, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION bundesliga.activate_season(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION bundesliga.replace_league(bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION bundesliga.store_games(bigint, jsonb) TO service_role;
