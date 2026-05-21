set check_function_bodies = off;

-- Rewrite merge_guest_player so that target_user_id is treated as the auth
-- user ID (public.user.id / linked_user_id), not as games.players.player.
--
-- Since the guest_players migration (20260302115859) changed games.players.player
-- to gen_random_uuid(), the player UUID for a registered user is no longer the
-- same as their auth user ID.  The old code was passing auth_user_id into the
-- UPDATE statements directly, which failed the match FK because that UUID was
-- not in games.players.player.
--
-- Fix: resolve the real games.players.player UUID via linked_user_id before
-- running any checks or updates, and use that UUID throughout.
CREATE OR REPLACE FUNCTION games.merge_guest_player(target_user_id uuid, guest_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_display_name text;
    v_target_player_id uuid;
BEGIN
    -- 1. AUTH CHECK
    IF NOT public.authorize('games.admin.merge_accounts') THEN
        RAISE EXCEPTION 'Dir fehlt die Berechtigung, Accounts zu mergen!';
    END IF;

    -- 2. RESOLVE TARGET PLAYER UUID
    -- target_user_id is the auth/public.user ID (linked_user_id), not the
    -- games.players.player PK (which is a gen_random_uuid() since the
    -- guest_players migration).
    SELECT player INTO v_target_player_id
    FROM games.players
    WHERE linked_user_id = target_user_id;

    IF v_target_player_id IS NULL THEN
        -- User has no player row yet (registered before trg_user_to_player).
        -- Create one with auto-generated player UUID and linked_user_id set.
        SELECT "displayName" INTO v_display_name FROM public.user WHERE id = target_user_id;
        INSERT INTO games.players (linked_user_id, ka_index, display_name, matches_played, effective_rating_cached)
        VALUES (target_user_id, 1000, v_display_name, 0, games.calculate_effective_rating(1000, NULL, 0))
        RETURNING player INTO v_target_player_id;
    END IF;

    -- 3. PRE-CHECK: Identische IDs
    IF v_target_player_id = guest_player_id THEN
        RAISE EXCEPTION 'Diese Accounts sind bereits gemerged oder identisch!';
    END IF;

    -- 4. PRE-CHECK: Selbes Team in der Vergangenheit?
    IF EXISTS (
        SELECT 1 FROM games.match
        WHERE (a_player_1 = v_target_player_id AND a_player_2 = guest_player_id)
           OR (a_player_1 = guest_player_id AND a_player_2 = v_target_player_id)
           OR (b_player_1 = v_target_player_id AND b_player_2 = guest_player_id)
           OR (b_player_1 = guest_player_id AND b_player_2 = v_target_player_id)
    ) THEN
        RAISE EXCEPTION 'Merge abgebrochen: Der Gast-Account und der echte Account wurden bereits im selben Team eingesetzt. Bitte korrigiere erst das betroffene Match.';
    END IF;

    -- 5. PRE-CHECK: Gegner in der Vergangenheit?
    IF EXISTS (
        SELECT 1 FROM games.match
        WHERE ((a_player_1 = v_target_player_id OR a_player_2 = v_target_player_id) AND (b_player_1 = guest_player_id OR b_player_2 = guest_player_id))
           OR ((a_player_1 = guest_player_id OR a_player_2 = guest_player_id) AND (b_player_1 = v_target_player_id OR b_player_2 = v_target_player_id))
    ) THEN
        RAISE EXCEPTION 'Merge abgebrochen: Die Accounts haben in der Vergangenheit gegeneinander gespielt.';
    END IF;

    -- 6. UPDATES: Match-Tabelle aktualisieren
    UPDATE games.match SET a_player_1 = v_target_player_id WHERE a_player_1 = guest_player_id;
    UPDATE games.match SET a_player_2 = v_target_player_id WHERE a_player_2 = guest_player_id;
    UPDATE games.match SET b_player_1 = v_target_player_id WHERE b_player_1 = guest_player_id;
    UPDATE games.match SET b_player_2 = v_target_player_id WHERE b_player_2 = guest_player_id;

    -- 7. UPDATES: Elo-Log aktualisieren
    UPDATE games.elo_calc_log SET a1_user = v_target_player_id WHERE a1_user = guest_player_id;
    UPDATE games.elo_calc_log SET a2_user = v_target_player_id WHERE a2_user = guest_player_id;
    UPDATE games.elo_calc_log SET b1_user = v_target_player_id WHERE b1_user = guest_player_id;
    UPDATE games.elo_calc_log SET b2_user = v_target_player_id WHERE b2_user = guest_player_id;

    -- 8. UPDATES: Elo-History aktualisieren
    UPDATE games.elo_history SET "user" = v_target_player_id WHERE "user" = guest_player_id;

    -- 9. CLEANUP: Gast-Account löschen
    DELETE FROM games.players WHERE player = guest_player_id;
END;
$function$;

-- Fix get_player_short_name to resolve the public.user name correctly for
-- players registered after the guest_players migration (20260302), where
-- games.players.player is a gen_random_uuid() and the auth user ID is stored
-- in linked_user_id instead.
--
-- The old join (u.id = p.player) worked for users registered before 20260429
-- (when the trigger still set player = auth_user_id).  After that migration the
-- trigger uses linked_user_id, so we must prefer that column.
--
-- COALESCE(p.linked_user_id, p.player) handles both generations:
--   new users: linked_user_id = auth_uid  → joined correctly
--   old users: linked_user_id = NULL, player = auth_uid → joined correctly
--   guests:    linked_user_id = NULL, player = guest_uuid → no user match,
--              falls back to display_name as intended
CREATE OR REPLACE FUNCTION games.get_player_short_name(p_player_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_full_name TEXT;
    v_display_name TEXT;
    v_target_name TEXT;
BEGIN
    SELECT u.name, p.display_name
    INTO v_full_name, v_display_name
    FROM games.players p
    LEFT JOIN public.user u ON u.id = COALESCE(p.linked_user_id, p.player)
    WHERE p.player = p_player_id;

    v_target_name := trim(COALESCE(NULLIF(v_full_name, ''), NULLIF(v_display_name, ''), ''));

    IF v_target_name <> '' THEN
        RETURN (regexp_match(v_target_name, '([^ ]+)$'))[1];
    END IF;

    RETURN substring(p_player_id::text from 1 for 8);
END;
$function$;