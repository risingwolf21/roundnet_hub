set check_function_bodies = off;

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
