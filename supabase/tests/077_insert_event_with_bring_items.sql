-- pg_prove -d "$DATABASE_URL" test/insert_event_with_bring_items.sql
BEGIN;
\i 000_setup_tests_users.inc
-- Simulierter Auth-Context, damit auth.uid() in der Funktion nicht NULL ist
-- und "created_by" (NOT NULL) erfüllt wird.
SELECT tests.authenticate_as('user_1a');

-- pgTAP initialisieren
SELECT plan(13);

-- 1) Frische Gruppe
WITH g AS (
  INSERT INTO public.event_group (name, description, color, is_public, need_request_to_join)
  VALUES ('__test_group__', 'tmp', '#000000', true, false)
  RETURNING id
)
SELECT ok((SELECT id IS NOT NULL FROM g), 'Setup: event_group erstellt');

INSERT INTO public.group_user_mapping("user", "group", "role") VALUES(tests.get_supabase_uid('user_1a'), (SELECT id FROM public.event_group WHERE name='__test_group__' LIMIT 1), 'admin');

-- 2) Args bauen (Happy Path)
WITH grp AS (SELECT id FROM public.event_group WHERE name='__test_group__' LIMIT 1),
args AS (
  SELECT
    jsonb_build_object(
      'title','Testevent',
      'description','Desc',                                -- << wichtig: NOT NULL
      'startingDateTime', (now() + interval '2 hours')::text,
      'endDateTime',      (now() + interval '3 hours')::text,
      'group',            (SELECT id::text FROM grp),
      'key',              gen_random_uuid()::text,
      'items_enabled',    true
    )                      AS p_event,
    jsonb_build_array(
      jsonb_build_object('name','Bälle','unit','Stk','required_qty',5,'sort_order',1),
      jsonb_build_object('name','Netz','notes','Reserve')  -- unit defaults to 'Stk', qty=0, sort_order=0
    )                      AS p_items
)
SELECT ok(true, 'Args gebaut')
FROM args;

-- 3) Funktion ausführen (Happy Path)
WITH grp AS (SELECT id FROM public.event_group WHERE name='__test_group__' LIMIT 1),
args AS (
  SELECT
    jsonb_build_object(
      'title','Testevent',
      'description','Desc',                                -- << wichtig
      'startingDateTime', (now() + interval '2 hours')::text,
      'endDateTime',      (now() + interval '3 hours')::text,
      'group',            (SELECT id::text FROM grp),
      'key',              gen_random_uuid()::text,
      'items_enabled',    true
    ) AS p_event,
    jsonb_build_array(
      jsonb_build_object('name','Bälle','unit','Stk','required_qty',5,'sort_order',1),
      jsonb_build_object('name','Netz','notes','Reserve')
    ) AS p_items
),
ins AS (
  SELECT * FROM public.insert_event_with_bring_items(
    (SELECT p_event FROM args),
    (SELECT p_items FROM args)
  )
)
SELECT ok((SELECT event_id IS NOT NULL FROM ins), 'Happy-Path: Event-ID wird zurückgegeben');

-- 4) Exakt 1 Event geschrieben
SELECT is(
  (SELECT count(*)::bigint FROM public.events e WHERE e.title = 'Testevent'),
  1::bigint,
  'Genau 1 Event angelegt'
);

-- 5) 2 Items angelegt
SELECT is(
  (SELECT count(*)::bigint
     FROM public.event_bring_items i
     JOIN public.events e ON e.id = i.event
    WHERE e.title = 'Testevent'),
  2::bigint,
  'Genau 2 Items zum Event angelegt'
);

-- 6) Default-Werte greifen
SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.event_bring_items i
      JOIN public.events e ON e.id = i.event
     WHERE e.title='Testevent'
       AND i.name='Netz'
       AND i.unit='Stk'
       AND i.required_qty=0
       AND i.sort_order=0
  ),
  'Item-Defaults greifen (unit, required_qty, sort_order)'
);

-- 7) created_by gesetzt
SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.event_bring_items i
      JOIN public.events e ON e.id = i.event
     WHERE e.title='Testevent'
       AND i.created_by IS NOT NULL
  ),
  'Item.created_by ist nicht NULL'
);

-- 8) Rückgabe enthält reale Item-IDs (aktueller Stand: wird FAIL, bis Funktion gefixt ist)
WITH call AS (
  SELECT * FROM public.insert_event_with_bring_items(
    jsonb_build_object(
      'title','Testevent 2',
      'description','Desc2',                               -- << wichtig
      'startingDateTime', (now() + interval '4 hours')::text,
      'endDateTime',      (now() + interval '5 hours')::text,
      'group',            (SELECT id::text FROM public.event_group WHERE name='__test_group__' LIMIT 1),
      'key',              gen_random_uuid()::text,
      'items_enabled',    true
    ),
    jsonb_build_array(
      jsonb_build_object('name','Klebeband')
    )
  )
)
SELECT isnt(
  (SELECT inserted_item_ids FROM call),
  ARRAY[NULL::uuid],
  'Rückgabe enthält reale Item-IDs (nicht nur NULL) – erwartet grün nach Function-Fix'
);

-- 9) Validierung: Unbekanntes Feld im Event
SELECT throws_ok(
  $$ SELECT * FROM public.insert_event_with_bring_items(
        jsonb_build_object(
          'title','X',
          'description','-',                               -- << wichtig
          'startingDateTime',(now()+interval '1 day')::text,
          'endDateTime',     (now()+interval '1 day 1 hour')::text,
          'group',           (SELECT id::text FROM public.event_group WHERE name='__test_group__' LIMIT 1),
          'totallyUnknown','nope'
        ),
        NULL
     ); $$,
  'Unknown event field: totallyUnknown',
  'Validierung: unbekanntes Event-Feld wird abgelehnt'
);

-- 10) Validierung: Falscher Typ bei item.required_qty -> Exception, keine Inserts
SELECT throws_ok(
  $$ WITH grp AS (
       SELECT id::text AS gid FROM public.event_group WHERE name='__test_group__' LIMIT 1
     )
     SELECT * FROM public.insert_event_with_bring_items(
       jsonb_build_object(
         'title','BadQty',
         'description','-',                               -- << wichtig
         'startingDateTime',(now()+interval '1 day')::text,
         'endDateTime',     (now()+interval '1 day 1 hour')::text,
         'group',           (SELECT gid FROM grp)
       ),
       jsonb_build_array(
         jsonb_build_object('name','Fehlerhaft','required_qty','abc') -- invalid
       )
     ); $$,
  'invalid input syntax for type numeric: "abc"',
  'Validierung: required_qty falscher Typ'
);

SELECT is(
  (SELECT count(*)::bigint FROM public.events WHERE title='BadQty'),
  0::bigint,
  'Bei Fehler wurde kein Event persistiert'
);

-- 11) Duplikate verhindern via Unique("key","startingDateTime")
DO $$
DECLARE g uuid := (SELECT id FROM public.event_group WHERE name='__test_group__' LIMIT 1);
DECLARE k text := gen_random_uuid()::text;
DECLARE s text := (now() + interval '6 hours')::text;
BEGIN
  PERFORM * FROM public.insert_event_with_bring_items(
    jsonb_build_object(
      'title','UniqueTest',
      'description','-',
      'startingDateTime',s,
      'endDateTime',(now()+interval '7 hours')::text,
      'group',g::text,
      'key',k
    ),
    NULL
  );
  BEGIN
    PERFORM * FROM public.insert_event_with_bring_items(
      jsonb_build_object(
        'title','UniqueTest2',
        'description','-',
        'startingDateTime',s,
        'endDateTime',(now()+interval '8 hours')::text,
        'group',g::text,
        'key',k
      ),
      NULL
    );
    RAISE EXCEPTION 'should_have_failed';
  EXCEPTION WHEN unique_violation THEN
    PERFORM set_config('note.unique', 'ok', true);
  END;
END $$;

SELECT ok(current_setting('note.unique', true) = 'ok', 'Unique-Index ("key","startingDateTime") verhindert Doppelanlage');

-- 12) items muss Array sein
SELECT throws_ok(
  $$ SELECT * FROM public.insert_event_with_bring_items(
       jsonb_build_object(
         'title','X',
         'description','-',
         'startingDateTime',(now()+interval '9 hours')::text,
         'endDateTime',(now()+interval '10 hours')::text,
         'group',(SELECT id::text FROM public.event_group WHERE name='__test_group__' LIMIT 1)
       ),
       '{"name":"kein array"}'::jsonb
     ); $$,
  'p_items must be a JSON array or null',
  'Validierung: p_items als Array'
);

SELECT * FROM finish();

ROLLBACK;
