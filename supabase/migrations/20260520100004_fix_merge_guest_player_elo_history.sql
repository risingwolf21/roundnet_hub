set check_function_bodies = off;

-- Recreate merge_guest_player to also re-point elo_history rows before
-- deleting the guest player. Without this the DELETE fails with a 23503
-- FK violation because elo_history.user still references the guest player.
CREATE OR REPLACE FUNCTION games.merge_guest_player(target_user_id uuid, guest_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_display_name text;
BEGIN
    -- 1. AUTH CHECK
    IF NOT public.authorize('games.admin.merge_accounts') THEN
        RAISE EXCEPTION 'Dir fehlt die Berechtigung, Accounts zu mergen!';
    END IF;

    -- 2. PRE-CHECK: Identische IDs
    IF target_user_id = guest_player_id THEN
        RAISE EXCEPTION 'Diese Accounts sind bereits gemerged oder identisch!';
    END IF;

    -- 3. PRE-CHECK: Selbes Team in der Vergangenheit?
    IF EXISTS (
        SELECT 1 FROM games.match
        WHERE (a_player_1 = target_user_id AND a_player_2 = guest_player_id)
           OR (a_player_1 = guest_player_id AND a_player_2 = target_user_id)
           OR (b_player_1 = target_user_id AND b_player_2 = guest_player_id)
           OR (b_player_1 = guest_player_id AND b_player_2 = target_user_id)
    ) THEN
        RAISE EXCEPTION 'Merge abgebrochen: Der Gast-Account und der echte Account wurden bereits im selben Team eingesetzt. Bitte korrigiere erst das betroffene Match.';
    END IF;

    -- 4. PRE-CHECK: Gegner in der Vergangenheit?
    IF EXISTS (
        SELECT 1 FROM games.match
        WHERE ((a_player_1 = target_user_id OR a_player_2 = target_user_id) AND (b_player_1 = guest_player_id OR b_player_2 = guest_player_id))
           OR ((a_player_1 = guest_player_id OR a_player_2 = guest_player_id) AND (b_player_1 = target_user_id OR b_player_2 = target_user_id))
    ) THEN
        RAISE EXCEPTION 'Merge abgebrochen: Die Accounts haben in der Vergangenheit gegeneinander gespielt.';
    END IF;

    -- 5. ENSURE TARGET HAS A PLAYER ROW
    SELECT "displayName" INTO v_display_name FROM public.user WHERE id = target_user_id;
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (target_user_id, 1000, v_display_name, 0, games.calculate_effective_rating(1000, NULL, 0))
    ON CONFLICT (player) DO NOTHING;

    -- 6. UPDATES: Match-Tabelle aktualisieren
    UPDATE games.match SET a_player_1 = target_user_id WHERE a_player_1 = guest_player_id;
    UPDATE games.match SET a_player_2 = target_user_id WHERE a_player_2 = guest_player_id;
    UPDATE games.match SET b_player_1 = target_user_id WHERE b_player_1 = guest_player_id;
    UPDATE games.match SET b_player_2 = target_user_id WHERE b_player_2 = guest_player_id;

    -- 7. UPDATES: Elo-Log aktualisieren
    UPDATE games.elo_calc_log SET a1_user = target_user_id WHERE a1_user = guest_player_id;
    UPDATE games.elo_calc_log SET a2_user = target_user_id WHERE a2_user = guest_player_id;
    UPDATE games.elo_calc_log SET b1_user = target_user_id WHERE b1_user = guest_player_id;
    UPDATE games.elo_calc_log SET b2_user = target_user_id WHERE b2_user = guest_player_id;

    -- 8. UPDATES: Elo-History aktualisieren
    UPDATE games.elo_history SET "user" = target_user_id WHERE "user" = guest_player_id;

    -- 9. CLEANUP: Gast-Account löschen
    DELETE FROM games.players WHERE player = guest_player_id;
END;
$function$;
