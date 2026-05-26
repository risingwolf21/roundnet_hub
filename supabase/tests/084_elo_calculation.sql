BEGIN;

-- 5 tests covering games.add_match_with_sets and games.apply_elo_for_match
SELECT plan(5);

-------------------------------------------------------------------------------
-- 1. SETUP: ELO CONFIG, USERS, AND PLAYERS
-------------------------------------------------------------------------------

INSERT INTO games.elo_config(id) VALUES (1) ON CONFLICT DO NOTHING;

SELECT tests.create_supabase_user('elo_player_a1');
SELECT tests.create_supabase_user('elo_player_a2');
SELECT tests.create_supabase_user('elo_player_b1');
SELECT tests.create_supabase_user('elo_player_b2');

INSERT INTO public.user ("id") VALUES
  (tests.get_supabase_uid('elo_player_a1')),
  (tests.get_supabase_uid('elo_player_a2')),
  (tests.get_supabase_uid('elo_player_b1')),
  (tests.get_supabase_uid('elo_player_b2'))
ON CONFLICT DO NOTHING;

-- Remove trigger-created player rows (trg_user_to_player fires on INSERT above).
-- We re-insert with known UUIDs and known ratings.
DELETE FROM games.players WHERE linked_user_id IN (
  tests.get_supabase_uid('elo_player_a1'),
  tests.get_supabase_uid('elo_player_a2'),
  tests.get_supabase_uid('elo_player_b1'),
  tests.get_supabase_uid('elo_player_b2')
);

INSERT INTO games.players (player, linked_user_id, gender, ka_index, effective_rating_cached, matches_played) VALUES
  (tests.get_supabase_uid('elo_player_a1'), tests.get_supabase_uid('elo_player_a1'), 'm', 1000, 1000, 0),
  (tests.get_supabase_uid('elo_player_a2'), tests.get_supabase_uid('elo_player_a2'), 'm', 1000, 1000, 0),
  (tests.get_supabase_uid('elo_player_b1'), tests.get_supabase_uid('elo_player_b1'), 'm', 1000, 1000, 0),
  (tests.get_supabase_uid('elo_player_b2'), tests.get_supabase_uid('elo_player_b2'), 'm', 1000, 1000, 0);

-------------------------------------------------------------------------------
-- 2. MOCKING: bypass authorization check
--    add_match_with_sets checks public.authorize('event.create.constellations').
--    We mock it to return TRUE so the caller is always authorized in tests.
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.authorize(requested_permission text) RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT tests.authenticate_as('elo_player_a1');

-------------------------------------------------------------------------------
-- 3. CALL add_match_with_sets AND CAPTURE THE MATCH ID
-------------------------------------------------------------------------------

DO $$
DECLARE
  v_match_id uuid;
BEGIN
  -- Team A wins 2:0 (set scores 15-8, 15-10)
  v_match_id := games.add_match_with_sets(
    'Team A',                                        -- team_a
    tests.get_supabase_uid('elo_player_a1'),         -- player_1a
    1000,                                            -- player_1a_rating
    tests.get_supabase_uid('elo_player_a2'),         -- player_2a
    1000,                                            -- player_2a_rating
    'Team B',                                        -- team_b
    tests.get_supabase_uid('elo_player_b1'),         -- player_1b
    1000,                                            -- player_1b_rating
    tests.get_supabase_uid('elo_player_b2'),         -- player_2b
    1000,                                            -- player_2b_rating
    '[{"team_a_score":15,"team_b_score":8},{"team_a_score":15,"team_b_score":10}]'::json,
    NULL,                                            -- event
    tests.get_supabase_uid('elo_player_a1'),         -- created_by
    true                                             -- rated
  );
  -- Store for later assertions
  PERFORM set_config('test.match_id', v_match_id::text, true);
END;
$$;

SELECT tests.clear_authentication();
RESET ROLE;

-------------------------------------------------------------------------------
-- 4. TESTS
-------------------------------------------------------------------------------

-- TEST 1: add_match_with_sets ran without error
-- (The DO block above would have raised if the function threw; we verify a match
-- row actually exists to confirm a non-NULL return value was stored.)
SELECT ok(
  (SELECT count(*) = 1
     FROM games.match m
     JOIN games.teams ta ON m.team_a = ta.id
    WHERE ta.player_1 = tests.get_supabase_uid('elo_player_a1')
       OR ta.player_2 = tests.get_supabase_uid('elo_player_a1')),
  'add_match_with_sets: match row was created without error'
);

-- TEST 2: elo_history has at least 2 rows for the match
SELECT ok(
  (SELECT count(*) >= 2
     FROM games.elo_history eh
     JOIN games.match m ON m.id = eh.match
     JOIN games.teams ta ON m.team_a = ta.id
    WHERE ta.player_1 = tests.get_supabase_uid('elo_player_a1')
       OR ta.player_2 = tests.get_supabase_uid('elo_player_a1')),
  'elo_history has entries for both players after the match'
);

-- TEST 3: Winner (team A, player_a1) has a positive ELO delta
SELECT ok(
  (SELECT delta > 0
     FROM games.elo_history eh
     JOIN games.match m ON m.id = eh.match
     JOIN games.teams ta ON m.team_a = ta.id
    WHERE ta.player_1 = tests.get_supabase_uid('elo_player_a1')
      AND eh."user" = tests.get_supabase_uid('elo_player_a1')
    LIMIT 1),
  'winner (team A player 1) has positive ELO delta'
);

-- TEST 4: Loser (team B, player_b1) has a negative ELO delta
SELECT ok(
  (SELECT delta < 0
     FROM games.elo_history eh
     JOIN games.match m ON m.id = eh.match
     JOIN games.teams tb ON m.team_b = tb.id
    WHERE tb.player_1 = tests.get_supabase_uid('elo_player_b1')
      AND eh."user" = tests.get_supabase_uid('elo_player_b1')
    LIMIT 1),
  'loser (team B player 1) has negative ELO delta'
);

-- TEST 5: Player ka_index changed from the initial 1000 after the match
SELECT ok(
  (SELECT ka_index <> 1000
     FROM games.players
    WHERE player = tests.get_supabase_uid('elo_player_a1')),
  'player ka_index in games.players was updated after the match'
);

-------------------------------------------------------------------------------
-- 5. FINISH
-------------------------------------------------------------------------------
SELECT * FROM finish();
ROLLBACK;
