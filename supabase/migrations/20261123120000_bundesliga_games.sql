-- The single games (Open 1, Women, Mixed 2 …) of each played Bundesliga encounter, with the
-- players of both pairs, so a player sees how every game ended and which ones they played.
--
-- A played encounter's games are fetched once (fetch-bundesliga, action "refreshGames"), so they
-- stay when bundesliga_replace_league replaces the encounters: no foreign key to
-- bundesliga_encounters; the function removes the games of encounters that are gone instead.

CREATE TABLE public.bundesliga_games (
  league_id       bigint NOT NULL REFERENCES public.bundesliga_leagues (id) ON DELETE CASCADE,
  pz_game_id      text NOT NULL,
  pz_encounter_id text NOT NULL,                -- bundesliga_encounters.pz_game_id
  sort            smallint NOT NULL,            -- order within the encounter
  discipline      text,                         -- "Open 1", "Women", "Mixed 2" …
  pair1_name      text,                         -- side 1's pair: "Wimmer/Wolf"
  pair2_name      text,
  pair1_players   text[] NOT NULL DEFAULT '{}', -- bundesliga_team_players.pz_player_id of the pair
  pair2_players   text[] NOT NULL DEFAULT '{}',
  sets            jsonb NOT NULL DEFAULT '[]',  -- points per set from side 1's view: [[17,13],[17,15]]
  winner          smallint CHECK (winner IN (1, 2)),
  PRIMARY KEY (league_id, pz_game_id)
);
CREATE INDEX bundesliga_games_encounter_idx ON public.bundesliga_games (league_id, pz_encounter_id);


-- Read for signed-in users, no writes, guests see nothing (as the other bundesliga_* tables).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bundesliga_games']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || ' read', t);
    EXECUTE format('CREATE POLICY guests_blocked ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
                   'USING (NOT (SELECT public.is_guest())) WITH CHECK (NOT (SELECT public.is_guest()))', t);
  END LOOP;
END $$;

-- As in 20261122120000_bundesliga_tables, plus: the games of encounters that are gone (or no
-- longer played) are removed.
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


  DELETE FROM public.bundesliga_games g
  WHERE g.league_id = p_league_id
    AND NOT EXISTS (SELECT 1 FROM public.bundesliga_encounters e
                    WHERE e.league_id = p_league_id AND e.pz_game_id = g.pz_encounter_id AND e.boards1 IS NOT NULL);


  UPDATE public.bundesliga_leagues SET refreshed_at = now(), refresh_error = NULL WHERE id = p_league_id;
END;
$$;

-- Upserts games of one league (rows as fetch-bundesliga's GameRow).
CREATE OR REPLACE FUNCTION public.bundesliga_store_games(p_league_id bigint, p_games jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.bundesliga_games (league_id, pz_game_id, pz_encounter_id, sort, discipline,
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

REVOKE ALL ON FUNCTION public.bundesliga_store_games(bigint, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bundesliga_store_games(bigint, jsonb) TO service_role;
