\i 00_test_helpers.inc
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(3);

-- Grants (falls noch nicht global gesetzt)
GRANT USAGE ON SCHEMA games TO authenticated;
GRANT SELECT ON games.user_matches TO authenticated;

-- Helper nur für Tests: Match + Teams + Set anlegen (bypasst RLS)
CREATE OR REPLACE FUNCTION _test_seed_match(p_a1 text, p_a2 text, p_b1 text, p_b2 text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','games','pg_temp' AS $$
DECLARE
  tA uuid; tB uuid; m uuid;
BEGIN

  INSERT INTO games.teams(name, player_1, player_2) VALUES ('A', p_a1, p_a2) RETURNING id INTO tA;
  INSERT INTO games.teams(name, player_1, player_2) VALUES ('B', p_b1, p_b2) RETURNING id INTO tB;

  INSERT INTO games."match"(team_a, team_b, created_at, rated) VALUES (tA, tB, now(), true) RETURNING id INTO m;
  INSERT INTO games.sets(match, set_number, team_a_score, team_b_score) VALUES (m, 1, 21, 18);
  RETURN m;
END $$;

-- Seed: ein Match gehört u1 (als Spieler), anderes nur u2
SELECT _test_seed_match('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2',
                        '00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2'); -- Match_1: u1 beteiligt
SELECT _test_seed_match('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b1',
                        '00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000c1'); -- Match_2: u2 beteiligt

-- u1 sieht nur sein(e)
SELECT test_login('00000000-0000-0000-0000-0000000000a1');
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM games.user_matches),
  '='::text, 1::bigint,
  'u1 sieht nur eigene Matches'
);

-- u2 sieht nur sein(e)
SELECT test_login('00000000-0000-0000-0000-0000000000c1');
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM games.user_matches),
  '='::text, 1::bigint,
  'u2 sieht nur eigene Matches'
);

-- u2 sieht Details seines Matches nicht die von u1
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM games.user_matches
    WHERE team_a_player_1 = '00000000-0000-0000-0000-0000000000c1'
  ),
  'u2 sieht keine fremden Matches'
);

SELECT * FROM finish();
ROLLBACK;
