-- 02_games_elo_core.sql
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(9);

INSERT INTO games.elo_config(id) values(1) on conflict do nothing;

-- Arrange: 4 Users → via Trigger entstehen 4 Players
INSERT INTO public."user"("userId","displayName","email","name") VALUES
 ('00000000-0000-0000-0000-0000000000a1','A1','a1@example.com','A One'),
 ('00000000-0000-0000-0000-0000000000a2','A2','a2@example.com','A Two'),
 ('00000000-0000-0000-0000-0000000000a3','B1','b1@example.com','B One'),
 ('00000000-0000-0000-0000-0000000000a4','B2','b2@example.com','B Two')
ON CONFLICT ("userId") DO NOTHING;

-- Teams
INSERT INTO games.teams (player_1, player_2, name, normalized_players)
VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','A1/A2','')  -- normalized wird via Trigger gesetzt
     , ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a4','B1/B2','');
-- Normalized Player Trigger sollte die Spalte setzen
SELECT ok((SELECT normalized_players <> '' FROM games.teams WHERE name='A1/A2'), 'normalized_players set for Team A');
SELECT ok((SELECT normalized_players <> '' FROM games.teams WHERE name='B1/B2'), 'normalized_players set for Team B');

-- Match + Sets (Team A gewinnt 2:0)
DO $$
DECLARE
  m uuid;
BEGIN
  INSERT INTO games."match"(team_a, team_b, is_public, rated)
  SELECT ta.id, tb.id, true, true
  FROM games.teams ta, games.teams tb
  WHERE ta.name='A1/A2' AND tb.name='B1/B2'
  RETURNING id INTO m;

  INSERT INTO games.sets(match, set_number, team_a_score, team_b_score) VALUES
    (m,1,15,8),(m,2,15,12);

  -- Act
  PERFORM games.apply_elo_for_match(m);
END$$;

-- Assert: 4 History-Einträge (2 Gewinner + 2 Verlierer)
SELECT is(
  (SELECT count(*) FROM games.elo_history eh
   JOIN games."match" m ON m.id = eh.match
   JOIN games.teams ta ON ta.id = m.team_a
   WHERE ta.name='A1/A2'),
  4::bigint,
  'elo_history has 4 rows for the match'
);

-- Calc Log existiert + expected_a im (0,1)
SELECT ok( (SELECT count(*)=1 FROM games.elo_calc_log l
            JOIN games.match m ON m.id=l.match
            JOIN games.teams ta ON ta.id=m.team_a
            WHERE ta.name='A1/A2'), 'elo_calc_log has row');

SELECT ok( (SELECT expected_a>0 AND expected_a<1 FROM games.elo_calc_log l
            JOIN games.match m ON m.id=l.match
            JOIN games.teams ta ON ta.id=m.team_a
            WHERE ta.name='A1/A2'), 'expected_a in (0,1)');

-- Gewinner sollten Delta > 0 bekommen haben
SELECT ok( (SELECT min(delta)>0 FROM games.elo_history eh
            JOIN games.match m ON m.id=eh.match
            JOIN games.teams ta ON ta.id=m.team_a
            WHERE ta.name='A1/A2' AND eh."user" IN ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2')),
           'winners got positive delta');

-- Verlierer Delta < 0
SELECT ok( (SELECT max(delta)<0 FROM games.elo_history eh
            JOIN games.match m ON m.id=eh.match
            JOIN games.teams tb ON tb.id=m.team_b
            WHERE tb.name='B1/B2' AND eh."user" IN ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a4')),
           'losers got negative delta');

-- recompute_all setzt zurück und rechnet deterministisch neu
SELECT lives_ok($$ SELECT games.recompute_all_elo_from_scratch() $$, 'recompute_all_elo_from_scratch runs');

-- Nach Recompute wieder 4 History-Zeilen für dieses Match
SELECT is(
  (SELECT count(*) FROM games.elo_history eh
   JOIN games."match" m ON m.id = eh.match
   JOIN games.teams ta ON ta.id = m.team_a
   WHERE ta.name='A1/A2'),
  4::bigint,
  'elo_history still has 4 rows after recompute'
);

SELECT * FROM finish();
ROLLBACK;
