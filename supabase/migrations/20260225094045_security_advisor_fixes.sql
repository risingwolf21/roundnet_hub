create extension if not exists "pgtap" with schema "extensions";

create extension if not exists "basejump-supabase_test_helpers" with schema "public";

create extension if not exists "supabase-dbdev" with schema "public";

set check_function_bodies = off;

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


