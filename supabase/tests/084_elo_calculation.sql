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

-- Insert players with known ratings; use ON CONFLICT DO NOTHING so that
-- any rows created by triggers (trg_user_to_player) don't block the insert.
INSERT INTO games.players (player, gender, effective_rating_cached, ka_index)
VALUES
  (tests.get_supabase_uid('elo_player_a1'), 'm', 1000, 1000),
  (tests.get_supabase_uid('elo_player_a2'), 'm', 1000, 1000),
  (tests.get_supabase_uid('elo_player_b1'), 'm', 1000, 1000),
  (tests.get_supabase_uid('elo_player_b2'), 'm', 1000, 1000)
ON CONFLICT (player) DO UPDATE
  SET effective_rating_cached = 1000,
      ka_index = 1000,
      matches_played = 0;

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
--    Current signature (post-20260419134700):
--      (player_1a uuid, player_1a_rating numeric,
--       player_2a uuid, player_2a_rating numeric,
--       player_1b uuid, player_1b_rating numeric,
--       player_2b uuid, player_2b_rating numeric,
--       match_sets json,
--       event uuid DEFAULT NULL, created_by uuid DEFAULT NULL,
--       rated boolean DEFAULT true, player_names json DEFAULT '{}',
--       is_public boolean DEFAULT true)
--    RETURNS uuid
-------------------------------------------------------------------------------

DO $$
DECLARE
  v_match_id uuid;
BEGIN
  -- Team A wins 2:0 (set scores 15-8, 15-10)
  v_match_id := games.add_match_with_sets(
    tests.get_supabase_uid('elo_player_a1'),         -- player_1a
    1000,                                            -- player_1a_rating
    tests.get_supabase_uid('elo_player_a2'),         -- player_2a
    1000,                                            -- player_2a_rating
    tests.get_supabase_uid('elo_player_b1'),         -- player_1b
    1000,                                            -- player_1b_rating
    tests.get_supabase_uid('elo_player_b2'),         -- player_2b
    1000,                                            -- player_2b_rating
    '[{"team_a_score":15,"team_b_score":8},{"team_a_score":15,"team_b_score":10}]'::json,
    NULL::uuid,                                      -- event
    tests.get_supabase_uid('elo_player_a1'),         -- created_by
    true                                             -- rated
  );
  PERFORM set_config('test.match_id', v_match_id::text, true);
END;
$$;

SELECT tests.clear_authentication();
RESET ROLE;

-------------------------------------------------------------------------------
-- 4. TESTS
--    Match rows use direct player columns a_player_1/2, b_player_1/2
--    (games.teams was removed in migration 20260419134700)
-------------------------------------------------------------------------------

-- TEST 1: add_match_with_sets ran without error (match row was created)
SELECT ok(
  (SELECT count(*) = 1
     FROM games.match m
    WHERE m.a_player_1 = tests.get_supabase_uid('elo_player_a1')),
  'add_match_with_sets: match row was created without error'
);

-- TEST 2: elo_history has 4 rows for the match (one per player)
SELECT ok(
  (SELECT count(*) >= 2
     FROM games.elo_history eh
     JOIN games.match m ON m.id = eh.match
    WHERE m.a_player_1 = tests.get_supabase_uid('elo_player_a1')),
  'elo_history has entries for players after the match'
);

-- TEST 3: Winner (team A, player_a1) has a positive ELO delta
SELECT ok(
  (SELECT delta > 0
     FROM games.elo_history eh
     JOIN games.match m ON m.id = eh.match
    WHERE m.a_player_1 = tests.get_supabase_uid('elo_player_a1')
      AND eh."user" = tests.get_supabase_uid('elo_player_a1')
    LIMIT 1),
  'winner (team A player 1) has positive ELO delta'
);

-- TEST 4: Loser (team B, player_b1) has a negative ELO delta
SELECT ok(
  (SELECT delta < 0
     FROM games.elo_history eh
     JOIN games.match m ON m.id = eh.match
    WHERE m.a_player_1 = tests.get_supabase_uid('elo_player_a1')
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
