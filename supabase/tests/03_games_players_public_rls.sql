BEGIN;
\i 000_setup_tests_users.inc
SET LOCAL TIME ZONE 'UTC';
SELECT plan(4);

SELECT tests.authenticate_as('user_1a');

SELECT throws_like(
  $$
  INSERT INTO games.teams(name, player_1, player_2)
  VALUES (
    'Fremdes Team',
    tests.get_supabase_uid('user_1b')::text,
    tests.get_supabase_uid('user_2b')::text
  );
  $$,
  '%row-level security%',
  'cannot insert team when not a member'
);

SELECT lives_ok(
  $$
  SELECT games.add_match_with_sets(
    'Team A',
    tests.get_supabase_uid('user_1a')::text,
    tests.get_supabase_uid('user_1b')::text,
    'Team B',
    tests.get_supabase_uid('user_2b')::text,
    tests.get_supabase_uid('user_1c')::text,
    '[{"team_a_score":15,"team_b_score":10}]'::json,
    NULL,
    tests.get_supabase_uid('user_1a')::text,
    true
  );
  $$,
  'add_match_with_sets works for participant creating vs opponent'
);

SELECT throws_like(
  $$
  SELECT games.add_match_with_sets(
    'Team A',
    tests.get_supabase_uid('user_2a')::text,
    tests.get_supabase_uid('user_1b')::text,
    'Team B',
    tests.get_supabase_uid('user_2b')::text,
    tests.get_supabase_uid('user_1c')::text,
    '[{"team_a_score":15,"team_b_score":10}]'::json,
    NULL,
    tests.get_supabase_uid('user_1a')::text,
    true
  );
  $$,
  '%Benutzer muss selbst im Match vorkommen%',
  'function blocks when caller is not a participant'
);


SELECT cmp_ok(
 (SELECT count(*)::bigint FROM games.teams WHERE player_1 = tests.get_supabase_uid('user_2b')::text 
  or player_2 = tests.get_supabase_uid('user_2b')::text),
 '='::text, 1::bigint, 'spieler sieht anderes team'
);

SELECT * FROM finish();
ROLLBACK;
