-- Cache for the scraped Roundnet-Germany playerzone data behind the Bundesliga planner.
-- Goal: read from here instead of hitting the edge function / playerzone on every view.
-- A row is "fresh" while it was fetched after the most recent 02:00 Europe/Berlin; past
-- that boundary it is considered invalid and the next load re-scrapes it. A nightly job
-- purges stale rows, and an admin (permission `bundesliga.admin`) can force a hard reload.

-- 1) Cache table: one JSONB blob per key ('league:<leagueId>' | 'roster:<teamVersionId>').
CREATE TABLE IF NOT EXISTS public.bundesliga_cache (
  cache_key  text        PRIMARY KEY,
  payload    jsonb       NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bundesliga_cache ENABLE ROW LEVEL SECURITY;

-- Any signed-in user may read the cache (the data is public sports info; the feature gate
-- lives in the app). Writes happen only through the edge function's service-role client,
-- which bypasses RLS, so there is deliberately no insert/update/delete policy.
DROP POLICY IF EXISTS "bundesliga_cache read" ON public.bundesliga_cache;
CREATE POLICY "bundesliga_cache read"
  ON public.bundesliga_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) Freshness boundary: the most recent 02:00 Europe/Berlin, as an instant.
CREATE OR REPLACE FUNCTION public.bundesliga_cache_boundary()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (
    CASE
      WHEN (now() AT TIME ZONE 'Europe/Berlin')
           < (date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') + interval '2 hour')
      THEN  date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') + interval '2 hour' - interval '1 day'
      ELSE  date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') + interval '2 hour'
    END
  ) AT TIME ZONE 'Europe/Berlin';
$$;

-- 3) Read helper used by both the frontend and the edge function: returns the cached rows
--    for the given keys and whether each is still fresh.
CREATE OR REPLACE FUNCTION public.get_bundesliga_cache(p_keys text[])
RETURNS TABLE (cache_key text, payload jsonb, fetched_at timestamptz, is_fresh boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT c.cache_key,
         c.payload,
         c.fetched_at,
         c.fetched_at >= public.bundesliga_cache_boundary() AS is_fresh
  FROM public.bundesliga_cache c
  WHERE c.cache_key = ANY (p_keys);
$$;

GRANT EXECUTE ON FUNCTION public.bundesliga_cache_boundary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_bundesliga_cache(text[]) TO authenticated, service_role;

-- 4) Permission that unlocks the admin "hard reload" button.
INSERT INTO public.permissions (name, description)
VALUES ('bundesliga.admin', 'Erlaubt das harte Neuladen (Re-Scraping) der Bundesliga-Daten.')
ON CONFLICT (name) DO NOTHING;

-- 5) Nightly purge of invalidated rows (hygiene; correctness already comes from is_fresh).
CREATE OR REPLACE FUNCTION public.purge_bundesliga_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.bundesliga_cache
  WHERE fetched_at < public.bundesliga_cache_boundary();
$$;

REVOKE ALL ON FUNCTION public.purge_bundesliga_cache() FROM public, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('purge_bundesliga_cache');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- not scheduled yet
END $$;

-- Runs at 01:00 UTC (≈ just after 02:00 Berlin in winter); exact timing only affects
-- cleanup, since reads invalidate via the Europe/Berlin boundary regardless.
SELECT cron.schedule(
  'purge_bundesliga_cache',
  '0 1 * * *',
  $$ SELECT public.purge_bundesliga_cache(); $$
);
