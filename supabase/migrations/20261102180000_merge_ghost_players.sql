-- Merge the "ghost" guest players created by the player-id ≠ user-id bug (fixed in
-- 20261102170000_player_id_is_not_user_id.sql) into the real player of the same account.
--
-- How ghosts came about: for accounts whose games.players.player differs from their user id
-- (linked via linked_user_id), the app passed the *user id* as player id; add_match_with_sets
-- did not find a player with that id and inserted a guest row (player = user id,
-- linked_user_id NULL). Matches, Elo log and Elo history were then booked on that ghost.
--
-- A ghost is therefore a player row g with g.linked_user_id IS NULL whose id is the user id of
-- an account that has its own, different, linked player row p (p.linked_user_id = g.player).
-- Legacy accounts (player = user id, no second linked row) and real guests are not matched.
--
-- Same steps as games.merge_guest_player (which cannot be called here: it checks the
-- caller's games.admin.merge_accounts permission and a migration has no caller). A pair where
-- ghost and real player appear in the same match is skipped with a NOTICE instead of aborting
-- the migration; such matches need a manual look.
DO $$
DECLARE
  r record;
  v_merged int := 0;
  v_skipped int := 0;
BEGIN
  FOR r IN
    SELECT g.player AS ghost, p.player AS real_player
    FROM games.players g
    JOIN games.players p ON p.linked_user_id = g.player AND p.player <> g.player
    WHERE g.linked_user_id IS NULL
  LOOP
    IF EXISTS (
      SELECT 1 FROM games.match m
      WHERE r.ghost IN (m.a_player_1, m.a_player_2, m.b_player_1, m.b_player_2)
        AND r.real_player IN (m.a_player_1, m.a_player_2, m.b_player_1, m.b_player_2)
    ) THEN
      RAISE NOTICE 'merge_ghost_players: skipped ghost % (shares a match with real player %)', r.ghost, r.real_player;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    UPDATE games.match SET a_player_1 = r.real_player WHERE a_player_1 = r.ghost;
    UPDATE games.match SET a_player_2 = r.real_player WHERE a_player_2 = r.ghost;
    UPDATE games.match SET b_player_1 = r.real_player WHERE b_player_1 = r.ghost;
    UPDATE games.match SET b_player_2 = r.real_player WHERE b_player_2 = r.ghost;

    UPDATE games.elo_calc_log SET a1_user = r.real_player WHERE a1_user = r.ghost;
    UPDATE games.elo_calc_log SET a2_user = r.real_player WHERE a2_user = r.ghost;
    UPDATE games.elo_calc_log SET b1_user = r.real_player WHERE b1_user = r.ghost;
    UPDATE games.elo_calc_log SET b2_user = r.real_player WHERE b2_user = r.ghost;

    UPDATE games.elo_history SET "user" = r.real_player WHERE "user" = r.ghost;

    DELETE FROM games.players WHERE player = r.ghost;
    v_merged := v_merged + 1;
  END LOOP;

  RAISE NOTICE 'merge_ghost_players: merged %, skipped %', v_merged, v_skipped;

  -- The moved matches now count for the real players: replay all ratings in order (the same
  -- deterministic recompute the earlier Elo migrations use). Only when something changed.
  IF v_merged > 0 THEN
    PERFORM games.recompute_all_elo_from_scratch();
  END IF;
END;
$$;
