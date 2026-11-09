-- Player id ≠ user id, part 2.
-- Since 20260302115859 new accounts get a random games.players.player id and link to their account
-- via linked_user_id (merge_guest_player was already adapted in 20260520100003). Three functions
-- still treated the user id as the player id, so for those accounts:
--  * add_match_with_sets rejected their real player id ("Benutzer muss selbst im Match vorkommen"),
--    and the app's workaround of passing the user id made it invent a ghost guest player;
--  * is_match_participant (RLS on sets etc.) never recognised them as participants;
--  * notify_game_added passed player ids to notify_emit as user ids (FK violation on
--    notifications.user, aborting the whole match insert).
-- Accept/resolve the caller's linked player in all three. Legacy rows (player = user id) keep
-- working unchanged.

CREATE OR REPLACE FUNCTION games.add_match_with_sets(player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid DEFAULT NULL::uuid, created_by uuid DEFAULT NULL::uuid, rated boolean DEFAULT true, player_names json DEFAULT '{}'::json, is_public boolean DEFAULT true, spezi_set json DEFAULT NULL::json)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_match_id uuid;
  v_set_count int := 1;
  v_set_record json;
BEGIN
  -- Auth Check
  IF (NOT (SELECT public.authorize('event.create.constellations'))) THEN
    IF auth.uid() NOT IN (player_1a, player_2a, player_1b, player_2b)
       AND NOT EXISTS (
         SELECT 1 FROM games.players p
         WHERE p.linked_user_id = auth.uid()
           AND p.player IN (player_1a, player_2a, player_1b, player_2b)
       ) THEN
      RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen oder autorisiert sein';
    END IF;
  END IF;

  -- Player 1A
  IF player_1a IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1a) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_1a, player_1a_rating, NULLIF(player_names->>player_1a::text, ''), 0, games.calculate_effective_rating(player_1a_rating, NULL, 0));
  END IF;
  -- Player 2A
  IF player_2a IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2a) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_2a, player_2a_rating, NULLIF(player_names->>player_2a::text, ''), 0, games.calculate_effective_rating(player_2a_rating, NULL, 0));
  END IF;
  -- Player 1B
  IF player_1b IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1b) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_1b, player_1b_rating, NULLIF(player_names->>player_1b::text, ''), 0, games.calculate_effective_rating(player_1b_rating, NULL, 0));
  END IF;
  -- Player 2B
  IF player_2b IS NOT NULL AND NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2b) THEN
    INSERT INTO games.players (player, ka_index, display_name, matches_played, effective_rating_cached)
    VALUES (player_2b, player_2b_rating, NULLIF(player_names->>player_2b::text, ''), 0, games.calculate_effective_rating(player_2b_rating, NULL, 0));
  END IF;

  -- Match Creation
  INSERT INTO games.match (a_player_1, a_player_2, b_player_1, b_player_2, event, created_by, rated, is_public)
  VALUES (player_1a, player_2a, player_1b, player_2b, event, COALESCE(created_by, auth.uid()), rated, is_public)
  RETURNING id INTO v_match_id;

  -- Normal Sets Insertion
  FOR v_set_record IN SELECT * FROM json_array_elements(match_sets) LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score)
    VALUES (v_match_id, v_set_count, (v_set_record->>'team_a_score')::numeric, (v_set_record->>'team_b_score')::numeric);
    v_set_count := v_set_count + 1;
  END LOOP;

  -- Spezi Set Insertion (optional)
  IF spezi_set IS NOT NULL THEN
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score, type, set_awarded)
    VALUES (
      v_match_id,
      v_set_count,
      (spezi_set->>'team_a_score')::numeric,
      (spezi_set->>'team_b_score')::numeric,
      'spezi',
      (spezi_set->>'set_awarded')::boolean
    );
  END IF;

  RETURN v_match_id;
END;$function$;

CREATE OR REPLACE FUNCTION games.is_match_participant(p_match uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'games', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM games."match" m
    WHERE m.id = p_match
      AND (
        (select auth.uid() as uid) IN (m.a_player_1, m.a_player_2, m.b_player_1, m.b_player_2)
        OR EXISTS (
          SELECT 1 FROM games.players p
          WHERE p.linked_user_id = (select auth.uid() as uid)
            AND p.player IN (m.a_player_1, m.a_player_2, m.b_player_1, m.b_player_2)
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION notifications.notify_game_added(p_match uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_topic  text := 'game.added';
  v_url    text := '/matches/' || p_match::text;
  v_body   text := '🤾 Es wurde ein neues Spiel mit dir hinzugefügt 🤾';
  v_title  text;
  v_team_a_name text;
  v_team_b_name text;
  v_recipients uuid[];
begin

  select "team_a_name", "team_b_name" into v_team_a_name, v_team_b_name from "games"."match" where id = p_match;

  v_title := v_team_a_name || ' vs. ' || v_team_b_name;

  v_recipients := array(
    with match_players as (
      select unnest(array[a_player_1, a_player_2, b_player_1, b_player_2]) as uid
      from games."match" where id = p_match
    ),
    rec as (
      select distinct uid from match_players
      where uid is not null and uid::text <> coalesce(p_actor::text,'')
    )
    -- Recipients are users: the player's linked account (player ids no longer equal user ids).
    select distinct p.linked_user_id
      from rec ap
      join games.players p on p.player = ap.uid
      where p.linked_user_id IS NOT NULL
        AND (p_actor is null or p.linked_user_id <> p_actor)
  );

  IF array_length(v_recipients, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object('match', p_match, 'url', v_url),
    'game',
    p_match,
    'normal',
    'game',
    p_match
  );
end;$function$;
