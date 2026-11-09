-- 02_games_elo_core.sql
BEGIN;

SET LOCAL TIME ZONE 'UTC';

-- Wir haben die 2 Team-Trigger-Tests entfernt, also bleiben 7 Tests.
SELECT plan(7);

-- 1. SETUP
INSERT INTO games.elo_config(id) values(1) on conflict do nothing;

-- Zur Sicherheit: Wir stellen sicher, dass die Test-User existieren, 
-- damit Foreign Keys in games.match und Elo-Berechnungen nicht ins Leere laufen.
SELECT tests.create_supabase_user('user_1a');
SELECT tests.create_supabase_user('user_2a');
SELECT tests.create_supabase_user('user_1b');
SELECT tests.create_supabase_user('user_2b');

INSERT INTO public.user ("id") VALUES 
  (tests.get_supabase_uid('user_1a')), (tests.get_supabase_uid('user_2a')),
  (tests.get_supabase_uid('user_1b')), (tests.get_supabase_uid('user_2b'))
ON CONFLICT DO NOTHING;

INSERT INTO games.players (player, gender, effective_rating_cached, ka_index) VALUES 
  (tests.get_supabase_uid('user_1a'), 'm', 1000, 1000),
  (tests.get_supabase_uid('user_2a'), 'm', 1000, 1000),
  (tests.get_supabase_uid('user_1b'), 'm', 1000, 1000),
  (tests.get_supabase_uid('user_2b'), 'm', 1000, 1000)
ON CONFLICT DO NOTHING;

-- 2. MATCH & SETS ERSTELLEN (Team A gewinnt 2:0)
DO $$
DECLARE
  m uuid;
BEGIN
  -- Wir schreiben die Spieler jetzt DIREKT in die match Tabelle!
  INSERT INTO games."match"(a_player_1, a_player_2, b_player_1, b_player_2, is_public, rated)
  VALUES (
    tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_2a'),
    tests.get_supabase_uid('user_1b'), tests.get_supabase_uid('user_2b'),
    true, true
  )
  RETURNING id INTO m;

  INSERT INTO games.sets(match, set_number, team_a_score, team_b_score) VALUES
    (m,1,15,8),(m,2,15,12);

  -- Act
  PERFORM games.apply_elo_for_match(m);
END$$;


-- 3. ASSERTS / TESTS

-- Assert 1: 4 History-Einträge (2 Gewinner + 2 Verlierer)
SELECT is(
  (SELECT count(*) FROM games.elo_history eh
   JOIN games."match" m ON m.id = eh.match
   WHERE m.a_player_1 = tests.get_supabase_uid('user_1a')),
  4::bigint,
  'elo_history has 4 rows for the match'
);

-- Assert 2: Calc Log existiert
SELECT ok( 
  (SELECT count(*)=1 FROM games.elo_calc_log l
   JOIN games.match m ON m.id=l.match
   WHERE m.a_player_1 = tests.get_supabase_uid('user_1a')), 
  'elo_calc_log has row'
);

-- Assert 3: expected_a liegt im validen Bereich (0,1)
SELECT ok( 
  (SELECT expected_a>0 AND expected_a<1 FROM games.elo_calc_log l
   JOIN games.match m ON m.id=l.match
   WHERE m.a_player_1 = tests.get_supabase_uid('user_1a')), 
  'expected_a in (0,1)'
);

-- Assert 4: Gewinner (Team A) sollten Delta > 0 bekommen haben
SELECT ok( 
  (SELECT min(delta)>0 FROM games.elo_history eh
   JOIN games.match m ON m.id=eh.match
   WHERE eh."user" IN (tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_2a'))
     AND m.a_player_1 = tests.get_supabase_uid('user_1a')),
  'winners got positive delta'
);

-- Assert 5: Verlierer (Team B) sollten Delta < 0 bekommen haben
SELECT ok( 
  (SELECT max(delta)<0 FROM games.elo_history eh
   JOIN games.match m ON m.id=eh.match
   WHERE eh."user" IN (tests.get_supabase_uid('user_1b'), tests.get_supabase_uid('user_2b'))
     AND m.a_player_1 = tests.get_supabase_uid('user_1a')),
  'losers got negative delta'
);

-- Assert 6: Recompute-Skript läuft fehlerfrei durch
SELECT lives_ok(
  $$ SELECT games.recompute_all_elo_from_scratch() $$, 
  'recompute_all_elo_from_scratch runs'
);

-- Assert 7: Nach Recompute gibt es noch immer 4 History-Zeilen für dieses Match
SELECT is(
  (SELECT count(*) FROM games.elo_history eh
   JOIN games."match" m ON m.id = eh.match
   WHERE m.a_player_1 = tests.get_supabase_uid('user_1a')),
  4::bigint,
  'elo_history still has 4 rows after recompute'
);

SELECT * FROM finish();
ROLLBACK;