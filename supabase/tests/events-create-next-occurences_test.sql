BEGIN;
\i 000_setup_tests_users.inc
SET LOCAL TIME ZONE 'UTC';
SELECT plan(3);

DELETE FROM public.events
WHERE recurrence IN ('Weekly','Fortnightly','Monthly');

-- Seed (0.2)
-- ... (Block 0.2) ...

-- Base-Event (Weekly)
DELETE FROM public.events WHERE "key"='series-quick';
INSERT INTO public.events(
  "key","title","description","recurrence",
  "startingDateTime","endDateTime","group"
) VALUES (
  'series-quick','Training','Wöchentlich','Weekly',
  '2025-02-03T18:00:00Z','2025-02-03T20:00:00Z','00000000-0000-0000-0000-000000000042'
);

-- 1. Lauf
SELECT tests.authenticate_as('user_1a');

-- Erwartete Anzahl bis Horizon = 30 Tage ab "nächstem" Start (nicht „neuester“) berechnen
WITH base AS (
  SELECT "startingDateTime" AS start FROM public.events WHERE "key"='series-quick'
),
next_start AS (
  -- Nächste Instanz >= '2025-02-04'
  SELECT CASE
           WHEN (SELECT start FROM base) >= '2025-02-04'::timestamptz
           THEN (SELECT start FROM base)
           ELSE (SELECT start FROM base) + ((FLOOR( (date '2025-02-04' - (SELECT (start)::date FROM base)) / 7.0 )::int)+1) * interval '7 days'
         END AS ns
),
horizon AS (
  SELECT (SELECT ns FROM next_start) + interval '30 days' AS hz
),
expected AS (
  SELECT COUNT(*)::int AS cnt
  FROM generate_series((SELECT ns FROM next_start), (SELECT hz FROM horizon), interval '7 days') s
  WHERE s >= (SELECT start FROM base)  -- nur „zukünftige“ neu zu erstellende
)
SELECT is(
  (SELECT public.create_next_occurrences('2025-02-04T00:00:00Z','30 days')),
  (SELECT cnt FROM expected),
  'genau erwartete Anzahl Occurrences bis Horizon'
);

-- 2. Lauf → 0 neue
SELECT is(
  (SELECT public.create_next_occurrences('2025-02-04T00:00:00Z','30 days')),
  0, 'zweiter Lauf erzeugt keine Duplikate'
);

-- Dopplungsprüfung
SELECT cmp_ok(
  (SELECT COUNT(*)::bigint FROM (
     SELECT "key","startingDateTime", COUNT(*) FROM public.events
     WHERE "key"='series-quick'
     GROUP BY 1,2 HAVING COUNT(*)>1
   ) d),
  '='::text, 0::bigint, 'keine Duplikate (Unique passt)'
);

SELECT * FROM finish();
ROLLBACK;
