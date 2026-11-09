CREATE INDEX idx_challenge_stats_user_chal_created ON public.challenge_stats USING btree ("user", challenge, created_at);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.increase_challenge_stats_count(challenge_id uuid, amount numeric, to_create_at timestamp with time zone, image_url text DEFAULT NULL::text)
 RETURNS challenge_stats
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  c          public.challenge;
  new_stat   public.challenge_stats;
  uid        text := auth.uid()::text;
  week_start timestamptz;
  week_end   timestamptz;
  day_start  timestamptz;
  day_end    timestamptz;
  week_sum   numeric;
  day_sum    numeric;
BEGIN
  -- Basic inputs
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  SELECT * INTO c FROM public.challenge WHERE id = challenge_id;
  IF c IS NULL THEN
    RAISE EXCEPTION 'Could not select given challenge';
  END IF;

  IF c.automated THEN
    RAISE EXCEPTION 'This challenge is automated. You can not add any points manually';
  END IF;

  -- Membership check (clear error instead of vague RLS failure)
  IF NOT EXISTS (
    SELECT 1 FROM public.group_user_mapping gum
     WHERE gum."group" = c."group"
       AND gum."user"  = uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of the challenge''s group' USING ERRCODE = '42501';
  END IF;

  -- Reject single-call overflow irrespective of prior rows
  IF amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;
  IF amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  -- Windows anchored on the attempted timestamp
  week_start := date_trunc('week', to_create_at);
  week_end   := week_start + interval '7 days';
  day_start  := date_trunc('day', to_create_at);
  day_end    := day_start + interval '1 day';

  -- RLS-immune sums (only for the caller's own uid)
  week_sum := public._sum_challenge_points_for_self(uid, challenge_id, week_start, week_end);
  day_sum  := public._sum_challenge_points_for_self(uid, challenge_id, day_start, day_end);

  -- Cumulative caps
  IF week_sum + amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  IF day_sum + amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;

  -- Insert for the actor (RLS still applies to the INSERT)
  INSERT INTO public.challenge_stats ("user","challenge","count","created_at","image_url")
  VALUES (uid, challenge_id, amount, to_create_at, image_url)
  RETURNING * INTO new_stat;

  RETURN new_stat;
END;
$function$
;


BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname  AS schema_name,
      p.proname  AS routine_name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.prokind  AS kind,
      -- roher Eintrag
      (
        SELECT c
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) c
        WHERE lower(split_part(c,'=',1)) = 'search_path'
        LIMIT 1
      ) AS sp_raw
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public','games')
      AND p.prokind IN ('f','p')
  LOOP
    -- normalize: Wert rechts vom '=' ohne Außen-Quotes
    PERFORM 1
    FROM (VALUES (
      CASE
        WHEN r.sp_raw IS NULL THEN NULL
        ELSE regexp_replace(
               regexp_replace(split_part(r.sp_raw,'=',2),
                              E'^\\s*["'']?', '', 'g'),
               E'["'']?\\s*$', '', 'g')
      END
    )) AS v(sp_norm)
    WHERE sp_norm = '';

    IF NOT FOUND THEN
      -- nur pinnen, wenn NICHT leer
      IF r.kind = 'p' THEN
        EXECUTE format(
          'ALTER PROCEDURE %I.%I(%s) SET search_path TO '''';',
          r.schema_name, r.routine_name, r.args
        );
      ELSE
        EXECUTE format(
          'ALTER FUNCTION %I.%I(%s) SET search_path TO '''';',
          r.schema_name, r.routine_name, r.args
        );
      END IF;
    END IF;
  END LOOP;
END $$;

COMMIT;


