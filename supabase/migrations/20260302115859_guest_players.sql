drop policy "Enable access for all users" on "public"."payments";

drop policy "challenge_stats_meta_insert" on "public"."challenge_stats_meta";

drop policy "challenge_stats_meta_select" on "public"."challenge_stats_meta";

drop policy "Allow update with event.comment permission on own comment" on "public"."event_comments";

alter table "games"."players" drop constraint "players_player_fkey";

drop function if exists "games"."add_match_with_sets"(team_a text, player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, team_b text, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid, created_by uuid, rated boolean);

alter table "games"."players" add column "display_name" text;

alter table "games"."players" add column "linked_user_id" uuid;

alter table "games"."players" alter column "player" set default gen_random_uuid();

alter table "games"."players" add constraint "players_linked_user_id_fkey" FOREIGN KEY (linked_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "games"."players" validate constraint "players_linked_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(team_a text, player_1a uuid, player_1a_rating numeric, player_2a uuid, player_2a_rating numeric, team_b text, player_1b uuid, player_1b_rating numeric, player_2b uuid, player_2b_rating numeric, match_sets json, event uuid DEFAULT NULL::uuid, created_by uuid DEFAULT NULL::uuid, rated boolean DEFAULT true, player_names json DEFAULT '{}'::json)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  team_a_id uuid;
  team_b_id uuid;
  match_id uuid;
  set_count int := 1;
  set_record json;
  team_a_norm text;
  team_b_norm text;
BEGIN
  IF jsonb_typeof(match_sets::jsonb) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', match_sets;
  END IF;

  -- 1. AUTH CHECK
  -- Wir erlauben das Erstellen, wenn der User autorisiert ist ODER selbst mitspielt.
  -- Hinweis: Wenn player_1a ein neuer Gast ist (UUID generiert im Frontend), 
  -- wird auth.uid() != player_1a sein. Das ist okay, solange der Ersteller einer der anderen ist.
  IF (NOT (Select public.authorize('event.create.constellations'))) THEN
    IF auth.uid() NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
      RAISE EXCEPTION 'Benutzer muss selbst im Match vorkommen oder autorisiert sein';
    END IF;
  END IF;

  -- 2. PLAYER INITIALIZATION (Inklusive Gast-Namen)
  -- Wir nutzen eine Hilfsschleife oder machen es explizit für alle 4:
  
  -- Player 1A
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1a) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_1a::text, '');
    BEGIN
        INSERT INTO games.players (player, ka_index, display_name)
        VALUES (
            player_1a, 
            player_1a_rating, 
            v_name
        );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_1a;
    END;
  END IF;

  -- Player 2A
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2a) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_2a::text, '');
    BEGIN
        INSERT INTO games.players (player, ka_index, display_name)
        VALUES (
            player_2a, 
            player_2a_rating, 
            v_name
        );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_2a;
    END;
  END IF;

  -- Player 1B
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_1b) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_1b::text, '');
    BEGIN
        INSERT INTO games.players (player, ka_index, display_name)
        VALUES (
            player_1b, 
            player_1b_rating, 
            v_name
        );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_1b;
    END;
  END IF;

  -- Player 2B
  IF NOT EXISTS(SELECT 1 FROM games.players WHERE "player" = player_2b) THEN
    DECLARE
        v_name text := NULLIF(player_names->>player_2b::text, '');
    BEGIN
        INSERT INTO games.players (player, ka_index, display_name)
        VALUES (
            player_2b, 
            player_2b_rating, 
            v_name
        );
    EXCEPTION WHEN check_violation THEN
        RAISE EXCEPTION 'Constraint verletzt für Spieler %: Name darf nicht leer sein, wenn kein User-Account existiert.', player_2b;
    END;
  END IF;

  -- 3. TEAM HANDLING (Normalisierung zur Vermeidung von Dubletten)
  team_a_norm := CASE WHEN player_1a < player_2a THEN player_1a||','||player_2a ELSE player_2a||','||player_1a END;
  INSERT INTO games.teams (player_1, player_2, name, normalized_players)
  VALUES (player_1a, player_2a, team_a, team_a_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_a_id FROM games.teams WHERE normalized_players = team_a_norm;

  team_b_norm := CASE WHEN player_1b < player_2b THEN player_1b||','||player_2b ELSE player_2b||','||player_1b END;
  INSERT INTO games.teams (player_1, player_2, name, normalized_players)
  VALUES (player_1b, player_2b, team_b, team_b_norm)
  ON CONFLICT (normalized_players) DO NOTHING;
  SELECT id INTO team_b_id FROM games.teams WHERE normalized_players = team_b_norm;

  -- 4. MATCH CREATION
  INSERT INTO games.match (team_a, team_b, event, created_by, rated)
  VALUES (team_a_id, team_b_id, event, COALESCE(created_by, auth.uid()), rated)
  RETURNING id INTO match_id;

  -- 5. SETS HANDLING
  FOR set_record IN SELECT * FROM json_array_elements(match_sets)
  LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score)
    VALUES (
      match_id,
      set_count,
      (set_record->>'team_a_score')::numeric,
      (set_record->>'team_b_score')::numeric
    );
    set_count := set_count + 1;
  END LOOP;

  RETURN match_id;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Fehler beim Hinzufügen von Match: %', SQLERRM;
END;$function$
;

create or replace view "games"."unified_player_profiles" as  SELECT p.player AS player_id,
    p.gender,
    p.effective_rating_cached,
    p.pro_status,
    COALESCE(u."displayName", p.display_name, 'Unbekannter Spieler'::text) AS full_name,
    p.linked_user_id
   FROM (games.players p
     LEFT JOIN public."user" u ON ((p.linked_user_id = u.id)));


CREATE OR REPLACE FUNCTION notifications.notify_game_added(p_match uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_topic  text := 'game.added';
  v_url    text := '/matches/' || p_match::text;
  v_title  text := '';
  v_body   text := '🤾 Es wurde ein neues Spiel mit dir hinzugefügt 🤾';
  v_team_a_name text;
  v_team_b_name text;
  v_recipients uuid[];
begin
  select t."name"
    into v_team_a_name
    from games."teams" t
   where t.id = (select m.team_a from games."match" m where m.id = p_match);

  select t."name"
    into v_team_b_name
    from games."teams" t
   where t.id = (select m.team_b from games."match" m where m.id = p_match);

  v_title := v_team_a_name || ' vs. ' || v_team_b_name;

  v_recipients := array(
    with mt as (
      select m.team_a, m.team_b
        from games."match" m
       where m.id = p_match
    ),
    all_players as (
        select t1.player_1 as pid from mt join games."teams" t1 on t1.id = mt.team_a
        union all
        select t1.player_2        from mt join games."teams" t1 on t1.id = mt.team_a
        union all
        select t2.player_1        from mt join games."teams" t2 on t2.id = mt.team_b
        union all
        select t2.player_2        from mt join games."teams" t2 on t2.id = mt.team_b
    )
    select distinct p.player -- Wir nehmen die Player-UUID
      from all_players ap
      join games.players p on p.player = ap.pid
      where p.player is not null 
        AND p.linked_user_id IS NOT NULL
        AND (p_actor is null or p.player <> p_actor)
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.admin_analytics_attendance_ranking(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(user_name text, attendance_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u."name" as user_name,
    COUNT(*) as attendance_count
  FROM public.event_attendance_user_mapping ea
  JOIN public.events e ON e.id = ea.event
  JOIN public."user" u ON u.id = ea."user"
  WHERE 
    e."startingDateTime" BETWEEN p_start AND p_end
    AND ea.state IN ('Attending', 'AttendingAsTrainer')
    AND e."isCancelled" IS FALSE
  GROUP BY u.id, u.name
  ORDER BY attendance_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_analytics_drinks_ranking(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(user_name text, drinks_count bigint, total_spend numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.name as user_name,
    COUNT(*) as drinks_count,
    SUM(pt.amount) as total_spend -- Falls 'amount' der Preis ist
  FROM public.history pt -- BITTE PRÜFEN: Name deiner Transaktions-Tabelle
  JOIN public."user" u ON u.id = pt."user"
  WHERE 
    pt.created_at BETWEEN p_start AND p_end
  GROUP BY u.name
  ORDER BY drinks_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_challenge_zero_points_candidates(p_challenge_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(user_name text, attendance_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id uuid;
BEGIN
  -- 1. Gruppe der Challenge ermitteln
  SELECT "group" INTO v_group_id
  FROM public.challenge
  WHERE id = p_challenge_id;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  RETURN QUERY
  WITH group_members AS (
    -- Alle Mitglieder der Gruppe holen
    SELECT gum."user"
    FROM public.group_user_mapping gum
    WHERE gum."group" = v_group_id
  ),
  user_points AS (
    -- Punkte pro User in dieser Challenge berechnen
    SELECT 
      cs."user", 
      SUM(cs.count) as total_points
    FROM public.challenge_stats cs
    WHERE cs.challenge = p_challenge_id
    GROUP BY cs."user"
  ),
  zero_point_users AS (
    -- Nur User behalten, die NULL (keine Einträge) oder 0 Punkte haben
    SELECT gm."user"
    FROM group_members gm
    LEFT JOIN user_points up ON gm."user" = up."user"
    WHERE COALESCE(up.total_points, 0) = 0
  )
  -- Ergebnis zusammenbauen mit Attendance Count
  SELECT 
    u.name as user_name,
    (
      -- Subquery für die Anzahl der Trainings
      SELECT COUNT(*)
      FROM public.event_attendance_user_mapping ea
      JOIN public.events e ON e.id = ea.event
      WHERE ea."user" = zp."user"
        -- Nur relevante Status zählen (Anwesend oder Trainer)
        AND ea.state IN ('Attending', 'AttendingAsTrainer')
        -- Zeitraum prüfen
        AND e."startingDateTime" >= p_start
        AND e."startingDateTime" <= p_end
        -- Nur wenn Event nicht abgesagt ist
        AND e."isCancelled" IS FALSE
    ) as attendance_count
  FROM zero_point_users zp
  JOIN public."user" u ON u.id = zp."user"
  ORDER BY attendance_count DESC, user_name ASC;

END;
$function$
;

grant select on table "games"."elo_calc_log" to "anon";

grant insert on table "games"."elo_calc_log" to "authenticated";

grant update on table "games"."elo_calc_log" to "authenticated";

grant select on table "games"."elo_config" to "anon";

grant insert on table "games"."elo_config" to "authenticated";

grant update on table "games"."elo_config" to "authenticated";

grant select on table "games"."elo_history" to "anon";

grant insert on table "games"."elo_history" to "authenticated";

grant update on table "games"."elo_history" to "authenticated";

grant select on table "games"."match" to "anon";

grant select on table "games"."players" to "anon";

grant select on table "games"."sets" to "anon";

grant select on table "games"."teams" to "anon";


  create policy "challenge_stats_meta_insert"
  on "public"."challenge_stats_meta"
  as permissive
  for insert
  to authenticated
with check ((((( SELECT challenge_stats."user"
   FROM public.challenge_stats
  WHERE (challenge_stats.id = challenge_stats_meta.challenge_stat)) = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = ( SELECT challenge_stats.challenge
           FROM public.challenge_stats
          WHERE (challenge_stats.id = challenge_stats_meta.challenge_stat))) AND (gum."user" = ( SELECT auth.uid() AS uid)))))) OR public.authorize('challenge.manage'::text)));



  create policy "challenge_stats_meta_select"
  on "public"."challenge_stats_meta"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM (public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
  WHERE ((c.id = ( SELECT challenge_stats.challenge
           FROM public.challenge_stats
          WHERE (challenge_stats.id = challenge_stats_meta.challenge_stat))) AND (gum."user" = ( SELECT auth.uid() AS uid))))) OR public.authorize('challenge.manage'::text)));



  create policy "Allow update with event.comment permission on own comment"
  on "public"."event_comments"
  as permissive
  for update
  to public
using ((( SELECT public.authorize('event.comment'::text) AS authorize) AND ("user" = ( SELECT auth.uid() AS uid))))
with check ((auth.uid() = "user"));



