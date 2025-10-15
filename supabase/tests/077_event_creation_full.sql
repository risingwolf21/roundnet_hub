BEGIN;
SET LOCAL TIME ZONE 'UTC';

-- Anzahl der Assertions unten mitzählen!
SELECT plan(16);

-- Test-Infra (stellt u. a. tests.authenticate_as bereit)
\i 000_setup_tests_users.inc

SELECT tests.authenticate_as('user_1a');

---------------------------
-- Cleanup Testdaten
---------------------------
DELETE FROM public.event_bring_items
WHERE event IN (SELECT id FROM public.events WHERE "key" IN ('series-quick','series-end'));

DELETE FROM public.events
WHERE "key" IN ('series-quick','series-end');

---------------------------
-- Seed: Basis-Serie 'series-quick' (Weekly)
-- Basis: 2025-02-03 18:00Z, Dauer 2h, Deadline = Start - 2h
---------------------------
INSERT INTO public.events(
  "key","title","description","recurrence",
  "startingDateTime","endDateTime","answerDeadline",
  "group", place, items_enabled
) VALUES (
  'series-quick','Training','Wöchentlich','Weekly',
  '2025-02-03T18:00:00Z','2025-02-03T20:00:00Z','2025-02-03T16:00:00Z',
  '00000000-0000-0000-0000-000000000042','Halle 1', true
);

-- Basis-Items (2 Stück)
INSERT INTO public.event_bring_items(event, name, unit, required_qty, notes, sort_order, created_by)
SELECT id, x.name, x.unit, x.qty, x.notes, x.sort_order, auth.uid()
FROM public.events e
CROSS JOIN (VALUES
  ('Bälle','Stk', 10, NULL, 10),
  ('Leibchen','Stk', 15, NULL, 20)
) AS x(name,unit,qty,notes,sort_order)
WHERE e."key"='series-quick' AND e."startingDateTime"='2025-02-03T18:00:00Z';

-- Authentifiziere User (auth.uid() in Funktion wird diese ID nutzen)
SELECT tests.authenticate_as('user_1a');

---------------------------
-- 1) Erste Generierung (30 Tage ab 2025-02-04)
---------------------------
-- Erwartet: 4 neue Termine (10., 17., 24.02., 03.03.)
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM (SELECT public.create_next_occurrences('2025-02-04T00:00:00Z','30 days')) q),
  '='::text, 4::bigint,
  '1) erzeugt 4 neue Occurrences (Horizon = run_at + 30d)'
);

-- 2) Keine Duplikate (Unique ("key","startingDateTime"))
SELECT is(
  (SELECT COALESCE(SUM(CASE WHEN c>1 THEN 1 ELSE 0 END),0)::text
   FROM (
     SELECT "key","startingDateTime", COUNT(*) c
     FROM public.events WHERE "key"='series-quick'
     GROUP BY 1,2
   ) t),
  '0',
  '2) keine Event-Duplikate nach erstem Lauf'
);

-- 3) Endzeit = Start + 2h für alle neuen (ohne Basis)
SELECT ok(NOT EXISTS (
  SELECT 1
  FROM public.events
  WHERE "key"='series-quick'
    AND "startingDateTime" <> '2025-02-03T18:00:00Z'
    AND "endDateTime" <> "startingDateTime" + interval '2 hours'
), '3) Endzeit = Start + 2h');

-- 4) answerDeadline = Start - 2h
SELECT ok(NOT EXISTS (
  SELECT 1
  FROM public.events
  WHERE "key"='series-quick'
    AND "startingDateTime" <> '2025-02-03T18:00:00Z'
    AND "answerDeadline" <> "startingDateTime" - interval '2 hours'
), '4) answerDeadline stets 2h vor Start (relativ verschoben)');

-- 5) Gruppe & Recurrence aus Vorlage übernommen
SELECT ok(NOT EXISTS (
  SELECT 1
  FROM public.events e
  WHERE e."key"='series-quick'
    AND e."startingDateTime" <> '2025-02-03T18:00:00Z'
    AND (e."group" <> '00000000-0000-0000-0000-000000000042'::uuid
         OR e.recurrence <> 'Weekly'::public."EventRecurrence")
), '5) Gruppe & Recurrence aus Vorlage');

-- 6) Items geklont (Anzahl = 2) & created_by = auth.uid()
SELECT ok(NOT EXISTS (
  SELECT 1
  FROM public.events ev
  WHERE ev."key"='series-quick'
    AND ev."startingDateTime" <> '2025-02-03T18:00:00Z'
    AND (
      (SELECT COUNT(*) FROM public.event_bring_items bi WHERE bi.event = ev.id) <> 2
      OR (SELECT COUNT(*) FROM public.event_bring_items bi WHERE bi.event = ev.id AND bi.created_by = tests.get_supabase_uid('user_1a')::text) <> 2
    )
), '6) Items geklont (2) und created_by = auth.uid()');

-- 7) Idempotenz: gleicher Run nochmal → 0 neue
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM (SELECT public.create_next_occurrences('2025-02-04T00:00:00Z','30 days')) q),
  '='::text, 0::bigint,
  '7) idempotent: zweiter Lauf erzeugt 0 neue'
);

-- 8) UNIQUE("key","startingDateTime")
SELECT throws_ok(
  $$
  INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","group")
  SELECT 'series-quick','X','X','Weekly','2025-02-10T18:00:00Z','2025-02-10T20:00:00Z','00000000-0000-0000-0000-000000000042'
  $$,
  '23505',
  '8) UNIQUE("key","startingDateTime") verhindert manuelles Duplikat'
);

-- 9) UNIQUE(event,name)
SELECT throws_ok(
  $$
  INSERT INTO public.event_bring_items(event,name,unit,required_qty,sort_order,created_by)
  SELECT ev.id, 'Bälle','Stk', 10, 10, auth.uid()
  FROM public.events ev
  WHERE ev."key"='series-quick' AND ev."startingDateTime"='2025-02-10T18:00:00Z'
  UNION ALL
  SELECT ev.id, 'Bälle','Stk', 12, 11, auth.uid()
  FROM public.events ev
  WHERE ev."key"='series-quick' AND ev."startingDateTime"='2025-02-10T18:00:00Z'
  $$,
  '23505',
  '9) UNIQUE(event,name) verhindert Item-Duplikate'
);

---------------------------
-- 10) Vorlage ändern (jüngste Instanz), danach nächste Generierung
---------------------------
-- jüngstes existierendes Event der Serie (03.03.) ändern
WITH latest AS (
  SELECT id FROM public.events
  WHERE "key"='series-quick'
  ORDER BY "startingDateTime" DESC LIMIT 1
)
UPDATE public.events
SET title='Training (neu)', place='Halle 2'
WHERE id = (SELECT id FROM latest);

-- Items der jüngsten Vorlage ersetzen
WITH latest AS (
  SELECT id FROM public.events
  WHERE "key"='series-quick'
  ORDER BY "startingDateTime" DESC LIMIT 1
)
DELETE FROM public.event_bring_items WHERE event=(SELECT id FROM latest);

WITH latest AS (
  SELECT id FROM public.events
  WHERE "key"='series-quick'
  ORDER BY "startingDateTime" DESC LIMIT 1
)
INSERT INTO public.event_bring_items(event,name,unit,required_qty,notes,sort_order,created_by)
VALUES
 ((SELECT id FROM latest),'Wasser','Fl',20,NULL,5,tests.get_supabase_uid('user_1a')),
 ((SELECT id FROM latest),'Pylonen','Stk',8,NULL,15,tests.get_supabase_uid('user_1a'));

-- Nächster Lauf ab 2025-03-06 für 30 Tage → 4 weitere Termine (10.,17.,24.,31.03.)
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM (SELECT public.create_next_occurrences('2025-03-06T00:00:00Z','30 days')) q),
  '='::text, 4::bigint,
  '10) zweiter Zeitraum erzeugt 4 neue nach Vorlagen-Update'
);

-- 11) Neue Events übernehmen Title/Place des direkten Vorgängers
SELECT ok(NOT EXISTS (
  SELECT 1
  FROM public.events n
  WHERE n."key"='series-quick'
    AND n."startingDateTime" >= '2025-03-10T00:00:00Z'::timestamptz
    AND EXISTS (
      SELECT 1
      FROM LATERAL (
        SELECT p.title, p.place
        FROM public.events p
        WHERE p."key" = n."key"
          AND p."startingDateTime" < n."startingDateTime"
        ORDER BY p."startingDateTime" DESC
        LIMIT 1
      ) prev
      WHERE n.title <> prev.title OR n.place <> prev.place
    )
), '11) Meta (Title/Place) vom direkten Vorgänger');


-- 12) Neue Events übernehmen Items des direkten Vorgängers 1:1 & created_by korrekt
WITH e_new AS (
  SELECT id, "startingDateTime" AS start_at, "key"
  FROM public.events
  WHERE "key"='series-quick'
    AND "startingDateTime" >= '2025-03-10T00:00:00Z'::timestamptz
),
prev_with_items AS (
  SELECT n.id AS new_event_id,
         (
           SELECT p.id
           FROM public.events p
           WHERE p."key" = n."key"
             AND p."startingDateTime" < n.start_at
             AND EXISTS (SELECT 1 FROM public.event_bring_items x WHERE x.event = p.id)
           ORDER BY p."startingDateTime" DESC
           LIMIT 1
         ) AS src_event_id
  FROM e_new n
),
diff AS (
  SELECT p.new_event_id
  FROM prev_with_items p
  WHERE EXISTS (
    SELECT 1
    FROM public.event_bring_items a
    WHERE a.event = p.new_event_id
      AND NOT EXISTS (
        SELECT 1 FROM public.event_bring_items b
        WHERE b.event = p.src_event_id
          AND b.name=a.name AND b.unit=a.unit AND b.required_qty=a.required_qty
          AND COALESCE(b.notes,'')=COALESCE(a.notes,'') AND b.sort_order=a.sort_order
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.event_bring_items b
    WHERE b.event = p.src_event_id
      AND NOT EXISTS (
        SELECT 1 FROM public.event_bring_items a
        WHERE a.event = p.new_event_id
          AND a.name=b.name AND a.unit=b.unit AND a.required_qty=b.required_qty
          AND COALESCE(a.notes,'')=COALESCE(b.notes,'') AND a.sort_order=b.sort_order
      )
  )
)
SELECT ok( (SELECT COUNT(*) FROM diff)=0, '12a) Items identisch zur letzten vorherigen Instanz MIT Items');


---------------------------
-- 13) Idempotenz erneut verifizieren
---------------------------
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM (SELECT public.create_next_occurrences('2025-03-06T00:00:00Z','30 days')) q),
  '='::text, 0::bigint,
  '13) idempotent im zweiten Zeitraum'
);

-- 14) Keine Event-Duplikate insgesamt
SELECT is(
  (SELECT COALESCE(SUM(CASE WHEN c>1 THEN 1 ELSE 0 END),0)::text
   FROM (
     SELECT "key","startingDateTime", COUNT(*) c
     FROM public.events WHERE "key"='series-quick'
     GROUP BY 1,2
   ) t),
  '0',
  '14) global keine Event-Duplikate'
);

---------------------------
-- 15) Serie mit recurrenceEnd: keine Events hinter Endgrenze
---------------------------
-- Neue Serie: endet nach 2 Wochen
INSERT INTO public.events(
  "key","title","description","recurrence",
  "startingDateTime","endDateTime","answerDeadline",
  "group","recurrenceEnd"
) VALUES (
  'series-end','Kurzserie','Test','Weekly',
  '2025-04-01T18:00:00Z','2025-04-01T19:00:00Z','2025-04-01T17:00:00Z',
  '00000000-0000-0000-0000-000000000042',
  '2025-04-15T00:00:00Z'  -- Endgrenze
);

SELECT cmp_ok(
  (SELECT count(*)::bigint FROM (SELECT public.create_next_occurrences('2025-04-01T00:00:00Z','60 days')) q),
  '='::text, 2::bigint,   -- 01.04. (Basis existiert) → 08.04., 15.04. (<=Ende); 22.04. > Ende → nicht erzeugen
  '15) recurrenceEnd wird respektiert'
);

-- 16) Auch hier keine Duplikate
SELECT cmp_ok(
  (
    SELECT COUNT(*)::bigint
    FROM (SELECT public.create_next_occurrences('2025-04-01T00:00:00Z','60 days')) q
    WHERE q."key" = 'series-end'
  ),
  '='::text, 2::bigint,
  '15) recurrenceEnd wird respektiert (nur series-end gezählt)'
);


SELECT * FROM finish();
ROLLBACK;
