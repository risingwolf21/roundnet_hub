-- Bundesliga: the season's leagues, teams, rosters, match days, results and standings, scraped
-- from the Roundnet Germany playerzone by the fetch-bundesliga edge function and stored here.
-- Replaces public.bundesliga_cache (one JSON blob per page with a daily expiry).
--
-- Keys are playerzone's own ids (text) inside a league, so a refresh can replace a league's
-- data without the app's references (e.g. the planner's chosen team) changing.
-- Any signed-in user may read (public sports data; the `bundesliga` feature gate lives in the
-- app, as before). Only the edge function's service-role client writes, through the two
-- functions below, so a league is always replaced in one transaction.

-- ---------------------------------------------------------------------------
-- 0) Drop the cache
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('purge_bundesliga_cache');
EXCEPTION WHEN OTHERS THEN
  NULL; -- not scheduled
END $$;

DROP FUNCTION IF EXISTS public.purge_bundesliga_cache();
DROP FUNCTION IF EXISTS public.get_bundesliga_cache(text[]);
DROP FUNCTION IF EXISTS public.bundesliga_cache_boundary();
DROP TABLE IF EXISTS public.bundesliga_cache;

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.bundesliga_seasons (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- the playerzone tournament, e.g. '793-2027-04-11-deutsche-roundnet-liga-2026-2027'
  tournament_slug text NOT NULL UNIQUE CHECK (tournament_slug ~ '^[0-9]+-[a-z0-9-]+$'),
  name            text,
  active          boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bundesliga_seasons_one_active ON public.bundesliga_seasons (active) WHERE active;

CREATE TABLE public.bundesliga_leagues (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season_id     bigint NOT NULL REFERENCES public.bundesliga_seasons (id) ON DELETE CASCADE,
  name          text NOT NULL,                -- '1. Bundesliga'
  sort          smallint NOT NULL,
  teams_page_id text NOT NULL,                -- /tournaments/<slug>/teams/<id>
  schedule_slug text,                         -- /tournaments/<slug>/schedule/<slug>
  refreshed_at  timestamptz,
  refresh_error text,
  UNIQUE (season_id, teams_page_id)
);

CREATE TABLE public.bundesliga_teams (
  league_id          bigint NOT NULL REFERENCES public.bundesliga_leagues (id) ON DELETE CASCADE,
  pz_team_id         text NOT NULL,
  pz_team_version_id text NOT NULL,
  name               text NOT NULL,
  logo_url           text,
  rgx_total          integer,
  PRIMARY KEY (league_id, pz_team_id)
);

CREATE TABLE public.bundesliga_team_players (
  league_id    bigint NOT NULL,
  pz_team_id   text NOT NULL,
  pz_player_id text NOT NULL,                 -- the number of the player's RG ID (SAR221 → 221)
  name         text NOT NULL,
  gender       text NOT NULL CHECK (gender IN ('male', 'female', 'unknown')),
  rg_index     integer,
  avatar_url   text,
  pro          boolean NOT NULL DEFAULT false,
  PRIMARY KEY (league_id, pz_team_id, pz_player_id),
  FOREIGN KEY (league_id, pz_team_id) REFERENCES public.bundesliga_teams (league_id, pz_team_id) ON DELETE CASCADE
);
CREATE INDEX bundesliga_team_players_player ON public.bundesliga_team_players (pz_player_id);

CREATE TABLE public.bundesliga_matchdays (
  league_id      bigint NOT NULL REFERENCES public.bundesliga_leagues (id) ON DELETE CASCADE,
  pz_matchday_id text NOT NULL,
  number         smallint NOT NULL,
  PRIMARY KEY (league_id, pz_matchday_id)
);

CREATE TABLE public.bundesliga_md_groups (
  league_id      bigint NOT NULL,
  pz_group_id    text NOT NULL,
  pz_matchday_id text NOT NULL,
  name           text,                        -- 'Gruppe A'
  play_date      date,
  city           text,
  PRIMARY KEY (league_id, pz_group_id),
  FOREIGN KEY (league_id, pz_matchday_id) REFERENCES public.bundesliga_matchdays (league_id, pz_matchday_id) ON DELETE CASCADE
);

CREATE TABLE public.bundesliga_encounters (
  league_id   bigint NOT NULL,
  pz_game_id  text NOT NULL,
  pz_group_id text NOT NULL,
  team1_id    text NOT NULL,
  team2_id    text NOT NULL,
  boards1     smallint,                       -- boards won (e.g. 4:1); null while not played
  boards2     smallint,
  sets1       smallint,                       -- sets won over all boards (e.g. 8:3)
  sets2       smallint,
  winner      smallint CHECK (winner IN (1, 2)),
  PRIMARY KEY (league_id, pz_game_id),
  FOREIGN KEY (league_id, pz_group_id) REFERENCES public.bundesliga_md_groups (league_id, pz_group_id) ON DELETE CASCADE,
  FOREIGN KEY (league_id, team1_id) REFERENCES public.bundesliga_teams (league_id, pz_team_id) ON DELETE CASCADE,
  FOREIGN KEY (league_id, team2_id) REFERENCES public.bundesliga_teams (league_id, pz_team_id) ON DELETE CASCADE
);

CREATE TABLE public.bundesliga_standings (
  league_id      bigint NOT NULL,
  pz_team_id     text NOT NULL,
  position       smallint NOT NULL,
  wins           smallint NOT NULL,
  draws          smallint NOT NULL,
  losses         smallint NOT NULL,
  sets_for       integer NOT NULL,
  sets_against   integer NOT NULL,
  points_for     integer NOT NULL,
  points_against integer NOT NULL,
  PRIMARY KEY (league_id, pz_team_id),
  FOREIGN KEY (league_id, pz_team_id) REFERENCES public.bundesliga_teams (league_id, pz_team_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 2) Read for signed-in users, no writes (service role only)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bundesliga_seasons', 'bundesliga_leagues', 'bundesliga_teams', 'bundesliga_team_players',
                           'bundesliga_matchdays', 'bundesliga_md_groups', 'bundesliga_encounters', 'bundesliga_standings']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || ' read', t);
    -- Guest accounts (trial links) see nothing of it, like every other table (see 20261109150000_guest_trials).
    EXECUTE format('CREATE POLICY guests_blocked ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
                   'USING (NOT (SELECT public.is_guest())) WITH CHECK (NOT (SELECT public.is_guest()))', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Write functions for the edge function (service role)
-- ---------------------------------------------------------------------------

-- Makes the season active (the only active one) and stores its leagues; returns the season id.
-- p_leagues: [{ "name", "sort", "teams_page_id", "schedule_slug" }]
CREATE OR REPLACE FUNCTION public.bundesliga_activate_season(p_slug text, p_name text, p_leagues jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_season bigint;
BEGIN
  UPDATE public.bundesliga_seasons SET active = false WHERE active AND tournament_slug <> p_slug;

  INSERT INTO public.bundesliga_seasons (tournament_slug, name, active)
  VALUES (p_slug, p_name, true)
  ON CONFLICT (tournament_slug) DO UPDATE SET active = true, name = coalesce(excluded.name, public.bundesliga_seasons.name)
  RETURNING id INTO v_season;

  INSERT INTO public.bundesliga_leagues (season_id, name, sort, teams_page_id, schedule_slug)
  SELECT v_season, l.name, l.sort, l.teams_page_id, l.schedule_slug
  FROM jsonb_to_recordset(p_leagues) AS l(name text, sort smallint, teams_page_id text, schedule_slug text)
  ON CONFLICT (season_id, teams_page_id) DO UPDATE
    SET name = excluded.name, sort = excluded.sort, schedule_slug = excluded.schedule_slug;

  RETURN v_season;
END;
$$;

-- Replaces one league's data in a single transaction. Teams are upserted (so a vanished team is
-- removed with everything that references it); match days, groups, encounters and standings are
-- replaced; players only when p_data has "players" (the nightly run skips the rosters).
CREATE OR REPLACE FUNCTION public.bundesliga_replace_league(p_league_id bigint, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.bundesliga_teams (league_id, pz_team_id, pz_team_version_id, name, logo_url, rgx_total)
  SELECT p_league_id, t.team_id, t.team_version_id, t.name, t.logo_url, t.rgx_total
  FROM jsonb_to_recordset(p_data -> 'teams')
    AS t(team_id text, team_version_id text, name text, logo_url text, rgx_total integer)
  ON CONFLICT (league_id, pz_team_id) DO UPDATE
    SET pz_team_version_id = excluded.pz_team_version_id,
        name = excluded.name,
        logo_url = excluded.logo_url,
        rgx_total = excluded.rgx_total;

  DELETE FROM public.bundesliga_teams b
  WHERE b.league_id = p_league_id
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_data -> 'teams') x WHERE x ->> 'team_id' = b.pz_team_id);

  IF p_data ? 'players' THEN
    DELETE FROM public.bundesliga_team_players WHERE league_id = p_league_id;
    INSERT INTO public.bundesliga_team_players (league_id, pz_team_id, pz_player_id, name, gender, rg_index, avatar_url, pro)
    SELECT p_league_id, p.team_id, p.player_id, p.name, p.gender, p.rg_index, p.avatar_url, coalesce(p.pro, false)
    FROM jsonb_to_recordset(p_data -> 'players')
      AS p(team_id text, player_id text, name text, gender text, rg_index integer, avatar_url text, pro boolean)
    ON CONFLICT DO NOTHING;
  END IF;

  DELETE FROM public.bundesliga_matchdays WHERE league_id = p_league_id; -- cascades groups and encounters
  DELETE FROM public.bundesliga_standings WHERE league_id = p_league_id;

  INSERT INTO public.bundesliga_matchdays (league_id, pz_matchday_id, number)
  SELECT p_league_id, m.matchday_id, m.number
  FROM jsonb_to_recordset(p_data -> 'matchdays') AS m(matchday_id text, number smallint)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.bundesliga_md_groups (league_id, pz_group_id, pz_matchday_id, name, play_date, city)
  SELECT p_league_id, g.group_id, g.matchday_id, g.name, g.play_date, g.city
  FROM jsonb_to_recordset(p_data -> 'groups')
    AS g(group_id text, matchday_id text, name text, play_date date, city text)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.bundesliga_encounters (league_id, pz_game_id, pz_group_id, team1_id, team2_id, boards1, boards2, sets1, sets2, winner)
  SELECT p_league_id, e.game_id, e.group_id, e.team1_id, e.team2_id, e.boards1, e.boards2, e.sets1, e.sets2, e.winner
  FROM jsonb_to_recordset(p_data -> 'encounters')
    AS e(game_id text, group_id text, team1_id text, team2_id text,
         boards1 smallint, boards2 smallint, sets1 smallint, sets2 smallint, winner smallint)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.bundesliga_standings (league_id, pz_team_id, position, wins, draws, losses, sets_for, sets_against, points_for, points_against)
  SELECT p_league_id, s.team_id, s.position, s.wins, s.draws, s.losses, s.sets_for, s.sets_against, s.points_for, s.points_against
  FROM jsonb_to_recordset(p_data -> 'standings')
    AS s(team_id text, position smallint, wins smallint, draws smallint, losses smallint,
         sets_for integer, sets_against integer, points_for integer, points_against integer)
  ON CONFLICT DO NOTHING;

  UPDATE public.bundesliga_leagues SET refreshed_at = now(), refresh_error = NULL WHERE id = p_league_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bundesliga_activate_season(text, text, jsonb) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.bundesliga_replace_league(bigint, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bundesliga_activate_season(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bundesliga_replace_league(bigint, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Current season; its leagues are found by the first refresh
-- ---------------------------------------------------------------------------
INSERT INTO public.bundesliga_seasons (tournament_slug, name, active)
VALUES ('793-2027-04-11-deutsche-roundnet-liga-2026-2027', 'Deutsche Roundnet Liga 2026/2027', true)
ON CONFLICT (tournament_slug) DO NOTHING;

UPDATE public.permissions
SET description = 'Erlaubt, die Bundesliga-Saison festzulegen und ihre Daten von Playerzone neu zu laden.'
WHERE name = 'bundesliga.admin';

-- ---------------------------------------------------------------------------
-- 5) Nightly refresh of schedules, results and standings (rosters stay)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('bundesliga_nightly_refresh');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 01:45 UTC = 02:45 / 03:45 Berlin; the function answers at once and works in the background.
SELECT cron.schedule(
  'bundesliga_nightly_refresh',
  '45 1 * * *',
  $$ SELECT public.invoke_edge_function('fetch-bundesliga', '{"action":"nightly"}'::jsonb, 5000); $$
);
