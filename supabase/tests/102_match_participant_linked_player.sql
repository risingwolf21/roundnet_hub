-- 102_match_participant_linked_player.sql
-- Accounts whose games.players.player differs from their user id (linked via linked_user_id):
--  * is_match_participant recognises them (20261102170000),
--  * they may insert/correct sets of their own match (20261102190000), others may not.
BEGIN;
SELECT plan(4);

SELECT tests.authenticate_as_service_role();

CREATE TEMP TABLE _p (k text, uid uuid, player uuid) ON COMMIT DROP;
GRANT SELECT ON _p TO PUBLIC;

-- Make sure each test user has a linked player row with an id different from the user id.
INSERT INTO games.players (linked_user_id, ka_index, display_name, matches_played, effective_rating_cached)
SELECT tests.get_supabase_uid(k), 1000, k, 0, 1000
FROM unnest(array['user_1a', 'user_1b', 'user_1c', 'user_group_empty']) AS k
WHERE NOT EXISTS (SELECT 1 FROM games.players p WHERE p.linked_user_id = tests.get_supabase_uid(k));

INSERT INTO _p
SELECT k, tests.get_supabase_uid(k), (SELECT p.player FROM games.players p WHERE p.linked_user_id = tests.get_supabase_uid(k) LIMIT 1)
FROM unnest(array['user_1a', 'user_1b', 'user_1c', 'user_group_empty', 'user_2a']) AS k;

CREATE TEMP TABLE _m (id uuid) ON COMMIT DROP;
GRANT SELECT ON _m TO PUBLIC;
INSERT INTO _m
SELECT games.add_match_with_sets(
  (SELECT player FROM _p WHERE k = 'user_1a'), 1000,
  (SELECT player FROM _p WHERE k = 'user_1b'), 1000,
  (SELECT player FROM _p WHERE k = 'user_1c'), 1000,
  (SELECT player FROM _p WHERE k = 'user_group_empty'), 1000,
  '[{"team_a_score": 21, "team_b_score": 17}]'::json
);

SELECT tests.authenticate_as('user_1a');
SELECT ok(games.is_match_participant((SELECT id FROM _m)),
  'a player linked via linked_user_id is a participant of their match');

SELECT lives_ok(
  $$ INSERT INTO games.sets (match, set_number, team_a_score, team_b_score) VALUES ((SELECT id FROM _m), 2, 15, 21) $$,
  'a participant can add a set to their match');

SELECT tests.authenticate_as('user_2a');
SELECT ok(NOT games.is_match_participant((SELECT id FROM _m)),
  'someone who did not play is no participant');

SELECT throws_ok(
  $$ INSERT INTO games.sets (match, set_number, team_a_score, team_b_score) VALUES ((SELECT id FROM _m), 3, 21, 10) $$,
  '42501', NULL,
  'a non-participant cannot add sets');

SELECT * FROM finish();
ROLLBACK;
