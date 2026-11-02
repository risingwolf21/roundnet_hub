-- Tests for the Bundesliga scrape cache (20261030140000_bundesliga_cache).
--
-- A row is fresh while fetched after the most recent 02:00 Europe/Berlin; get_bundesliga_cache
-- reports that, the nightly purge drops stale rows, and RLS lets any signed-in user READ the
-- cache but never write it (writes go through the service-role edge function only).

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(6);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

-- Seed as table owner (bypasses RLS): one fresh row, one stale (just before the boundary).
INSERT INTO public.bundesliga_cache(cache_key, payload, fetched_at) VALUES
  ('league:test-fresh', '{"x":1}'::jsonb, now()),
  ('roster:test-stale', '{"y":2}'::jsonb, public.bundesliga_cache_boundary() - interval '1 hour');

SELECT is(
  (SELECT is_fresh FROM public.get_bundesliga_cache(ARRAY['league:test-fresh'])),
  true, 'a row fetched now() is fresh');
SELECT is(
  (SELECT is_fresh FROM public.get_bundesliga_cache(ARRAY['roster:test-stale'])),
  false, 'a row fetched before the most recent 02:00 Europe/Berlin is stale');
SELECT is(
  (SELECT count(*)::int FROM public.get_bundesliga_cache(ARRAY['league:test-fresh'])),
  1, 'get_bundesliga_cache returns only the requested keys');

-- RLS: a signed-in user may read, but not write.
SELECT tests.authenticate_as('user_1a');
SELECT is(
  (SELECT count(*)::int FROM public.bundesliga_cache WHERE cache_key = 'league:test-fresh'),
  1, 'authenticated users may read the cache');
SELECT throws_ok(
  $$ INSERT INTO public.bundesliga_cache(cache_key, payload) VALUES ('league:hack', '{}'::jsonb) $$,
  '42501', NULL, 'authenticated users cannot write the cache (service-role only)');
RESET ROLE;

-- The nightly purge drops the stale row and keeps the fresh one.
SELECT public.purge_bundesliga_cache();
SELECT is(
  (SELECT string_agg(cache_key, ',' ORDER BY cache_key)
     FROM public.bundesliga_cache WHERE cache_key IN ('league:test-fresh','roster:test-stale')),
  'league:test-fresh', 'purge_bundesliga_cache removes stale rows and keeps fresh ones');

SELECT * FROM finish();
ROLLBACK;
