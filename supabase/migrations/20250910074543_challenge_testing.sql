BEGIN;

DO $$
BEGIN
  IF to_regclass('public.permissions') IS NOT NULL THEN
    INSERT INTO public.permissions(name,description)
    VALUES ('challenge.manage','Verwaltung von Challenges')
    ON CONFLICT (name) DO NOTHING;
  ELSE
    RAISE NOTICE 'Table public.permissions fehlt – Permission-Seed wird übersprungen.';
  END IF;
END $$;

-- 0) Extensions nur bei Verfügbarkeit anlegen/verschieben und NICHT im public-Schema
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  -- supabase-dbdev
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'supabase-dbdev') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase-dbdev') THEN
      EXECUTE 'CREATE EXTENSION "supabase-dbdev" WITH SCHEMA extensions';
    ELSE
      EXECUTE 'ALTER EXTENSION "supabase-dbdev" SET SCHEMA extensions';
    END IF;
  END IF;

  -- basejump-supabase_test_helpers (nur in Testumgebungen verfügbar)
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'basejump-supabase_test_helpers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'basejump-supabase_test_helpers') THEN
      EXECUTE 'CREATE EXTENSION "basejump-supabase_test_helpers" WITH SCHEMA extensions';
    ELSE
      EXECUTE 'ALTER EXTENSION "basejump-supabase_test_helpers" SET SCHEMA extensions';
    END IF;
  END IF;
END $$;

-- 1) Alte Artefakte defensiv entfernen
DROP TRIGGER IF EXISTS challenge_stats_insert_trigger ON public.challenge_stats;

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.challenge_stats;
DROP POLICY IF EXISTS "Enable insert for users based on user_id"  ON public.challenge_stats;
DROP POLICY IF EXISTS "Enable update for users based on user_id"  ON public.challenge_stats;
DROP POLICY IF EXISTS "Select challenge stats only if user is in group of challenge" ON public.challenge_stats;

-- Legacy-Signatur der Funktion (falls sie existiert)
DROP FUNCTION IF EXISTS public.increase_challenge_stats_count(user_id text, challenge_id text, amount numeric, to_create_at timestamptz, image_url text);

-- 2) Spalte + Constraint (idempotent)
ALTER TABLE public.challenge
  ADD COLUMN IF NOT EXISTS max_points_per_day integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'challenge_max_points_per_day_check'
      AND conrelid = 'public.challenge'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.challenge ADD CONSTRAINT challenge_max_points_per_day_check CHECK (max_points_per_day >= 0) NOT VALID';
    EXECUTE 'ALTER TABLE public.challenge VALIDATE CONSTRAINT challenge_max_points_per_day_check';
  END IF;
END $$;

-- 3) Index (nur einen, idempotent)
DROP INDEX IF EXISTS public.idx_challenge_stats_user_chal_created;
CREATE INDEX IF NOT EXISTS idx_challenge_stats_user_challenge_created
  ON public.challenge_stats ("user","challenge", created_at);

-- 4) Funktionen (mit festem search_path); Helper ist SECURITY DEFINER, Gate ist INVOKER
SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._sum_challenge_points_for_self(
  uid text,
  challenge_id uuid,
  from_ts timestamptz,
  to_ts   timestamptz
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE s numeric;
BEGIN
  IF uid IS NULL OR challenge_id IS NULL OR from_ts IS NULL OR to_ts IS NULL THEN
    RAISE EXCEPTION 'invalid args';
  END IF;

  IF uid <> auth.uid()::text THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(cs."count"), 0)
    INTO s
    FROM public.challenge_stats cs
   WHERE cs."user" = uid
     AND cs."challenge" = challenge_id
     AND cs.created_at >= from_ts
     AND cs.created_at <  to_ts;

  RETURN s;
END;
$$;

REVOKE ALL ON FUNCTION public._sum_challenge_points_for_self(text, uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._sum_challenge_points_for_self(text, uuid, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.increase_challenge_stats_count(
  challenge_id uuid,
  amount       numeric,
  to_create_at timestamptz,
  image_url    text DEFAULT NULL
) RETURNS public.challenge_stats
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $$
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_user_mapping gum
    WHERE gum."group" = c."group"
      AND gum."user"  = uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of the challenge''s group' USING ERRCODE = '42501';
  END IF;

  -- Single-call Overflows sofort blocken
  IF amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;
  IF amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  -- Fenster relativ zu to_create_at
  week_start := date_trunc('week', to_create_at);
  week_end   := week_start + interval '7 days';
  day_start  := date_trunc('day',  to_create_at);
  day_end    := day_start  + interval '1 day';

  -- RLS-sichere Summen
  week_sum := public._sum_challenge_points_for_self(uid, challenge_id, week_start, week_end);
  day_sum  := public._sum_challenge_points_for_self(uid, challenge_id, day_start,  day_end);

  IF week_sum + amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  IF day_sum + amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;

  INSERT INTO public.challenge_stats ("user","challenge","count","created_at","image_url")
  VALUES (uid, challenge_id, amount, to_create_at, image_url)
  RETURNING * INTO new_stat;

  RETURN new_stat;
END;
$$;

-- 5) Policies neu/anpassbar (erst droppen, dann anlegen)
DROP POLICY IF EXISTS challenge_stats_delete  ON public.challenge_stats;
DROP POLICY IF EXISTS challenge_stats_insert  ON public.challenge_stats;
DROP POLICY IF EXISTS challenge_stats_select  ON public.challenge_stats;
DROP POLICY IF EXISTS challenge_stats_update  ON public.challenge_stats;

-- DELETE: own ODER (manager + membership)
CREATE POLICY challenge_stats_delete
ON public.challenge_stats
FOR DELETE TO authenticated
USING (
  "user" = auth.uid()::text
  OR (
    authorize('challenge.manage')
    AND EXISTS (
      SELECT 1
      FROM public.challenge c
      JOIN public.group_user_mapping gum ON gum."group" = c."group"
      WHERE c.id = challenge_stats."challenge"
        AND gum."user" = auth.uid()::text
    )
  )
);

-- INSERT: (self + membership) ODER manager
CREATE POLICY challenge_stats_insert
ON public.challenge_stats
FOR INSERT TO authenticated
WITH CHECK (
  (
    "user" = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.challenge c
      JOIN public.group_user_mapping gum ON gum."group" = c."group"
      WHERE c.id = challenge_stats."challenge"
        AND gum."user" = auth.uid()::text
    )
  )
  OR authorize('challenge.manage')
);

-- SELECT: member ODER manager (ODER own ist durch "member" de facto abgedeckt)
CREATE POLICY challenge_stats_select
ON public.challenge_stats
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.challenge c
    JOIN public.group_user_mapping gum ON gum."group" = c."group"
    WHERE c.id = challenge_stats."challenge"
      AND gum."user" = auth.uid()::text
  )
  OR authorize('challenge.manage')
);

-- UPDATE: own ODER (manager + membership)
CREATE POLICY challenge_stats_update
ON public.challenge_stats
FOR UPDATE TO authenticated
USING (
  "user" = auth.uid()::text
  OR (
    authorize('challenge.manage')
    AND EXISTS (
      SELECT 1
      FROM public.challenge c
      JOIN public.group_user_mapping gum ON gum."group" = c."group"
      WHERE c.id = challenge_stats."challenge"
        AND gum."user" = auth.uid()::text
    )
  )
)
WITH CHECK (
  "user" = auth.uid()::text
  OR (
    authorize('challenge.manage')
    AND EXISTS (
      SELECT 1
      FROM public.challenge c
      JOIN public.group_user_mapping gum ON gum."group" = c."group"
      WHERE c.id = challenge_stats."challenge"
        AND gum."user" = auth.uid()::text
    )
  )
);

-- 6) Trigger nur erzeugen, wenn die Ziel-Funktion vorhanden ist; danach deaktivieren
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'notify_users_of_challenge_stat'
      AND pg_function_is_visible(oid)
  ) THEN
    EXECUTE 'CREATE TRIGGER challenge_stats_insert_trigger
             AFTER INSERT ON public.challenge_stats
             FOR EACH ROW EXECUTE FUNCTION notify_users_of_challenge_stat()';
    EXECUTE 'ALTER TABLE public.challenge_stats DISABLE TRIGGER challenge_stats_insert_trigger';
  END IF;
END $$;

COMMIT;
