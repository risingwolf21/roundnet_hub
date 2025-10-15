BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(12);
\i 000_setup_tests_users.inc

CREATE TEMP TABLE _vars (base_event uuid);

-- Aufräumen
DELETE FROM public.event_bring_items WHERE event IN (SELECT id FROM public.events WHERE "key" IN ('series-quick'));
DELETE FROM public.events WHERE "key" IN ('series-quick');

-- Seed: Basis-Event (Weekly), 2h Dauer, Deadline 2h vor Start, mit Items
-- Basis-Start: 2025-02-03 18:00:00Z (Berlin lokal 19:00, Winterzeit)
WITH ins AS (
  INSERT INTO public.events(
    "key","title","description","recurrence",
    "startingDateTime","endDateTime","answerDeadline",
    "group", place, items_enabled
  ) VALUES (
    'series-quick','Training','Wöchentlich','Weekly',
    '2025-02-03T18:00:00Z','2025-02-03T20:00:00Z','2025-02-03T16:00:00Z',
    '00000000-0000-0000-0000-000000000042','Halle 1', true
  )
  RETURNING id
)
INSERT INTO _vars(base_event) SELECT id FROM ins;

-- Basis-Items
INSERT INTO public.event_bring_items(event, name, unit, required_qty, notes, sort_order, created_by) VALUES
  ((SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1), 'Bälle',   'Stk', 10, null, 10, tests.get_supabase_uid('user_1a')),
  ((SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1), 'Leibchen','Stk', 15, null, 20, tests.get_supabase_uid('user_1a'));

-- Auth
SELECT tests.authenticate_as('user_1a');

-- 1) Generierung für 30 Tage ab 2025-02-04
-- Erwartet: 4 neue Termine (Mo 10., 17., 24. Feb, 3. Mär – letzter liegt noch < 2025-03-06 00:00Z)
SELECT is(
  (SELECT count(*)::text FROM (SELECT public.create_next_occurrences('2025-02-04T00:00:00Z','30 days')) q),
  '4',
  'liefert 4 neue Occurrences (Horizon = run_at + 30d)'
);

-- Hole die erzeugten Events in zeitlicher Reihenfolge
WITH e AS (
  SELECT id, "startingDateTime" AS start_at, "endDateTime" AS end_at,
         "answerDeadline" AS deadline, title, place, "group"
  FROM public.events
  WHERE "key"='series-quick' AND id <> (SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1)
  ORDER BY "startingDateTime"
)
SELECT ok(count(*)=4, 'vier neue Events vorhanden') FROM e;

-- 2) Start/End/Dauer korrekt (2h)
WITH e AS (
  SELECT "startingDateTime" AS start_at, "endDateTime" AS end_at
  FROM public.events
  WHERE "key"='series-quick' AND id <> (SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1)
)
SELECT ok( NOT EXISTS (
  SELECT 1 FROM e WHERE end_at <> start_at + interval '2 hours'
), 'Endzeit = Start + 2h (Dauer aus Vorlage)');

-- 3) answerDeadline relativ verschoben (immer 2h vor Start)
SELECT ok( NOT EXISTS (
  SELECT 1
  FROM public.events
  WHERE "key"='series-quick' AND id <> (SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1)
    AND ("answerDeadline" <> "startingDateTime" - interval '2 hours')
), 'answerDeadline stets 2h vor Start');

-- 4) Items wurden für alle neuen Events aus dem aktuellsten Vorgänger kopiert
--    -> Für das erste neue Event = Basis-Items; für die nächsten ebenfalls (noch keine Änderungen)
WITH new_events AS (
  SELECT id
  FROM public.events
  WHERE "key"='series-quick' AND id <> (SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1)
),
baseline AS (
  SELECT name, unit, required_qty, notes, sort_order
  FROM public.event_bring_items
  WHERE event = (SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1)
  ORDER BY name
),
per_event AS (
  SELECT e.id AS event_id, bi.name, bi.unit, bi.required_qty, bi.notes, bi.sort_order
  FROM new_events e
  JOIN public.event_bring_items bi ON bi.event = e.id
)
SELECT ok( NOT EXISTS (
  SELECT 1
  FROM (
    SELECT event_id
    FROM per_event
    EXCEPT
    SELECT e.id
    FROM public.events e
    JOIN baseline b ON true
    LEFT JOIN public.event_bring_items bi ON bi.event = e.id AND
      bi.name=b.name AND bi.unit=b.unit AND bi.required_qty=b.required_qty AND
      COALESCE(bi.notes,'') = COALESCE(b.notes,'') AND bi.sort_order=b.sort_order
    WHERE e."key"='series-quick' AND e.id <> (SELECT id FROM public.events WHERE "key"='series-quick' AND "startingDateTime"='2025-02-03T18:00:00Z' LIMIT 1)
    GROUP BY e.id
    HAVING COUNT(*) = (SELECT COUNT(*) FROM baseline)
  ) x
), 'alle neuen Events besitzen exakt die Basis-Items');

-- 5) Idempotenz – erneuter Lauf erzeugt keine neuen Events/Items
SELECT is(
  (SELECT count(*)::text FROM (SELECT public.create_next_occurrences('2025-02-04T00:00:00Z','30 days')) q),
  '0',
  'zweiter Lauf: 0 neue Events'
);
SELECT is(
  (SELECT COUNT(*)::text FROM (
     SELECT "key","startingDateTime", COUNT(*) c
     FROM public.events
     WHERE "key"='series-quick'
     GROUP BY 1,2 HAVING COUNT(*)>1
  ) d),
  '0',
  'keine Duplikate bei Events'
);

-- 6) Änderung an der neuesten Instanz – wird in künftiger Generierung fortgeschrieben
--    Wir bearbeiten das jüngste existierende Event (03.03.) und ändern Items + Metadaten
WITH latest AS (
  SELECT id FROM public.events
  WHERE "key"='series-quick' ORDER BY "startingDateTime" DESC LIMIT 1
)
UPDATE public.events
SET title='Training (neu)', place='Halle 2'
WHERE id = (SELECT id FROM latest);

WITH latest AS (
  SELECT id FROM public.events
  WHERE "key"='series-quick' ORDER BY "startingDateTime" DESC LIMIT 1
)
DELETE FROM public.event_bring_items WHERE event = (SELECT id FROM latest);
WITH latest AS (
  SELECT id FROM public.events
  WHERE "key"='series-quick' ORDER BY "startingDateTime" DESC LIMIT 1
)
INSERT INTO public.event_bring_items(event, name, unit, required_qty, notes, sort_order, created_by) VALUES
  ((SELECT id FROM latest), 'Wasser', 'Fl', 20, null, 5, tests.get_supabase_uid('user_1a')),
  ((SELECT id FROM latest), 'Pylonen','Stk', 8, null, 15, tests.get_supabase_uid('user_1a'));

-- 7) Nächste Generierung (neues Fenster) – sollte 4 weitere Wochen erzeugen,
--    und diese müssen Items & Meta vom geänderten jüngsten Vorgänger übernehmen
SELECT is(
  (SELECT count(*)::text FROM (SELECT public.create_next_occurrences('2025-03-06T00:00:00Z','30 days')) q),
  '4',
  'nach Update der Vorlage: 4 weitere Events erzeugt'
);

WITH e_new AS (
  SELECT id, "startingDateTime" AS start_at, "key", title, place
  FROM public.events
  WHERE "key"='series-quick'
    AND "startingDateTime" >= '2025-03-10T00:00:00Z'::timestamptz
),
mismatch AS (
  SELECT 1
  FROM e_new n
  JOIN LATERAL (
    SELECT p.title, p.place
    FROM public.events p
    WHERE p."key"=n."key" AND p."startingDateTime"<n.start_at
    ORDER BY p."startingDateTime" DESC LIMIT 1
  ) prev ON TRUE
  WHERE n.title <> prev.title OR n.place <> prev.place
)
SELECT ok(NOT EXISTS(SELECT 1 FROM mismatch), 'Title/Place kommen vom direkten Vorgänger');

SELECT ok( NOT EXISTS (
  SELECT 1
  FROM public.events
  WHERE "key"='series-quick'
    AND "startingDateTime" >= '2025-03-10T00:00:00Z'::timestamptz
    AND "answerDeadline" <> "startingDateTime" - interval '2 hours'
), 'answerDeadline bleibt relativ (2h vor Start) auch nach Vorlagen-Update');


-- Meta (Title/Place) übernommen?
SELECT ok( NOT EXISTS (
  SELECT 1
  FROM public.events
  WHERE "key"='series-quick'
    AND "startingDateTime" >= '2025-03-10T00:00:00Z'::timestamptz
    AND (title <> 'Training (neu)' OR place <> 'Halle 2')
), 'neue Events übernehmen Title/Place vom neuesten Vorgänger');

-- Deadline weiterhin 2h vorher?
SELECT ok( NOT EXISTS (
  SELECT 1
  FROM public.events
  WHERE "key"='series-quick'
    AND "startingDateTime" >= '2025-03-10T00:00:00Z'::timestamptz
    AND "answerDeadline" <> "startingDateTime" - interval '2 hours'
), 'answerDeadline bleibt relativ (2h vorher) bei neuen Terminen');

SELECT * FROM finish();
ROLLBACK;
