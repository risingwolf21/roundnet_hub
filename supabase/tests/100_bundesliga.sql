-- Tests for the Bundesliga tables (20261122120000_bundesliga_tables, 20261123120000_bundesliga_games,
-- moved to the bundesliga schema by 20261124120000_bundesliga_schema).
--
-- Signed-in users may read every bundesliga.* table but never write it; only the service role
-- (the fetch-bundesliga edge function) writes, through bundesliga.activate_season and
-- bundesliga.replace_league. A league is replaced as a whole, players only when the data has them.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(14);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

-- Seed as table owner: a test season with one league, and one full replace.
SELECT bundesliga.activate_season('1-test-liga', 'Test Liga',
  '[{"name":"1. Bundesliga","sort":1,"teams_page_id":"9613","schedule_slug":"mixed-1-gruppenphase"}]'::jsonb);

CREATE FUNCTION pg_temp.league() RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT l.id FROM bundesliga.leagues l JOIN bundesliga.seasons s ON s.id = l.season_id
  WHERE s.tournament_slug = '1-test-liga' AND l.teams_page_id = '9613' $$;

SELECT bundesliga.replace_league(pg_temp.league(), '{
  "teams": [
    {"team_id":"1","team_version_id":"11","name":"KA-Boom","logo_url":null,"rgx_total":11640},
    {"team_id":"2","team_version_id":"22","name":"Heidelberg","logo_url":null,"rgx_total":10000}],
  "players": [
    {"team_id":"1","player_id":"221","name":"Sarah","gender":"female","rg_index":1615,"avatar_url":null,"pro":true}],
  "matchdays": [{"matchday_id":"110","number":1}],
  "groups": [{"group_id":"656","matchday_id":"110","name":"Gruppe A","play_date":"2026-10-17","city":"Karlsruhe"}],
  "encounters": [{"game_id":"419767","group_id":"656","team1_id":"2","team2_id":"1","boards1":0,"boards2":5,"sets1":0,"sets2":10,"winner":2}],
  "standings": [{"team_id":"1","position":1,"wins":1,"draws":0,"losses":0,"sets_for":10,"sets_against":0,"points_for":210,"points_against":120}]
}'::jsonb);

-- The games of the played encounter (fetched separately).
SELECT bundesliga.store_games(pg_temp.league(), '[
  {"game_id":"419768","encounter_id":"419767","sort":1,"discipline":"Open 1","pair1_name":"Huber/Graf","pair2_name":"Senger/Wolf",
   "pair1_players":["5","6"],"pair2_players":["221","7"],"sets":[[13,17],[15,17]],"winner":2}]'::jsonb);

SELECT is(
  (SELECT count(*)::int FROM bundesliga.seasons WHERE active),
  1, 'exactly one season is active');
SELECT is(
  (SELECT ARRAY[(SELECT count(*) FROM bundesliga.teams WHERE league_id = pg_temp.league()),
                (SELECT count(*) FROM bundesliga.team_players WHERE league_id = pg_temp.league()),
                (SELECT count(*) FROM bundesliga.encounters WHERE league_id = pg_temp.league()),
                (SELECT count(*) FROM bundesliga.standings WHERE league_id = pg_temp.league())]::int[]),
  ARRAY[2, 1, 1, 1], 'replace_league stores teams, players, encounters and standings');
SELECT isnt(
  (SELECT refreshed_at FROM bundesliga.leagues WHERE id = pg_temp.league()),
  NULL, 'replace_league marks the league as refreshed');

-- RLS: a signed-in user reads everything, writes nothing.
SELECT tests.authenticate_as('user_1a');
SELECT is(
  (SELECT count(*)::int FROM bundesliga.encounters e
     JOIN bundesliga.teams t ON t.league_id = e.league_id AND t.pz_team_id = e.team2_id
    WHERE e.league_id = pg_temp.league() AND t.name = 'KA-Boom' AND e.boards2 = 5),
  1, 'authenticated users can read results with their teams');
SELECT throws_ok(
  $$ INSERT INTO bundesliga.teams(league_id, pz_team_id, pz_team_version_id, name) VALUES (pg_temp.league(), '9', '99', 'Hack') $$,
  '42501', NULL, 'authenticated users cannot write teams');
SELECT throws_ok(
  $$ UPDATE bundesliga.standings SET position = 99 $$,
  '42501', NULL, 'authenticated users cannot change the table');
SELECT throws_ok(
  $$ SELECT bundesliga.replace_league(pg_temp.league(), '{}'::jsonb) $$,
  '42501', NULL, 'authenticated users cannot call replace_league');
SELECT is(
  (SELECT sets FROM bundesliga.games WHERE league_id = pg_temp.league() AND '221' = ANY (pair2_players)),
  '[[13, 17], [15, 17]]'::jsonb, 'authenticated users can read the games with their players');
SELECT throws_ok(
  $$ SELECT bundesliga.store_games(pg_temp.league(), '[]'::jsonb) $$,
  '42501', NULL, 'authenticated users cannot call store_games');
RESET ROLE;

-- Replacing the league again keeps the games of encounters that are still played.
SELECT bundesliga.replace_league(pg_temp.league(), '{
  "teams": [
    {"team_id":"1","team_version_id":"11","name":"KA-Boom","logo_url":null,"rgx_total":11640},
    {"team_id":"2","team_version_id":"22","name":"Heidelberg","logo_url":null,"rgx_total":10000}],
  "matchdays": [{"matchday_id":"110","number":1}],
  "groups": [{"group_id":"656","matchday_id":"110","name":"Gruppe A","play_date":"2026-10-17","city":"Karlsruhe"}],
  "encounters": [{"game_id":"419767","group_id":"656","team1_id":"2","team2_id":"1","boards1":0,"boards2":5,"sets1":0,"sets2":10,"winner":2}],
  "standings": []
}'::jsonb);
SELECT is(
  (SELECT count(*)::int FROM bundesliga.games WHERE league_id = pg_temp.league()),
  1, 'replace_league keeps the games of encounters that are still there');

-- The nightly run sends no "players": rosters stay; a team that is gone is removed.
SELECT bundesliga.replace_league(pg_temp.league(), '{
  "teams": [{"team_id":"1","team_version_id":"11","name":"KA-Boom","logo_url":null,"rgx_total":11700}],
  "matchdays": [{"matchday_id":"110","number":1},{"matchday_id":"111","number":2}],
  "groups": [], "encounters": [], "standings": []
}'::jsonb);
SELECT is(
  (SELECT ARRAY[(SELECT count(*) FROM bundesliga.teams WHERE league_id = pg_temp.league()),
                (SELECT count(*) FROM bundesliga.team_players WHERE league_id = pg_temp.league()),
                (SELECT count(*) FROM bundesliga.matchdays WHERE league_id = pg_temp.league()),
                (SELECT count(*) FROM bundesliga.encounters WHERE league_id = pg_temp.league())]::int[]),
  ARRAY[1, 1, 2, 0], 'without "players" the rosters stay; vanished teams and old results go');
SELECT is(
  (SELECT count(*)::int FROM bundesliga.games WHERE league_id = pg_temp.league()),
  0, 'the games of an encounter that is gone go with it');

-- A new season becomes the only active one.
SELECT bundesliga.activate_season('2-test-liga', 'Nächste Saison', '[]'::jsonb);
SELECT is(
  (SELECT string_agg(tournament_slug, ',') FROM bundesliga.seasons WHERE active),
  '2-test-liga', 'activating a season deactivates the others');

SELECT is(
  (SELECT count(*)::int FROM cron.job WHERE jobname = 'bundesliga_nightly_refresh'),
  1, 'the nightly refresh is scheduled');

SELECT * FROM finish();
ROLLBACK;
