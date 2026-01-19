-- 030_public_bring_items_and_pledges.sql (angepasst)
BEGIN;
\i 000_setup_tests_users.sql
SET LOCAL TIME ZONE 'UTC';
SELECT plan(7);

-- u1 login & Basisdaten (wie bei dir)
SELECT tests.authenticate_as('user_1a');

-- Event (Items aktiviert)
DELETE FROM public.events WHERE "key"='items-test-1';
INSERT INTO public.events(
  "key","title","description","recurrence",
  "startingDateTime","endDateTime","group",
  items_enabled
) VALUES (
  'items-test-1','Training','mit Items','None',
  now(), now()+interval '3h',
  '00000000-0000-0000-0000-000000000042',
  true
);

-- Item definieren: benötigt 5
INSERT INTO public.event_bring_items(event, name, unit, required_qty, notes)
SELECT e.id, 'Bälle', 'Stück', 5, 'Bitte mitbringen'
FROM public.events e WHERE e."key"='items-test-1';

SELECT ok(true, 'Itemdefinition insert ok');

-- pledges u1=3
WITH e AS (
  SELECT id AS event_id FROM public.events WHERE "key"='items-test-1'
), i AS (
  SELECT id AS item_id FROM public.event_bring_items WHERE event = (SELECT event_id FROM e)
)
INSERT INTO public.event_bring_pledges(item, "user", qty)
SELECT (SELECT item_id FROM i), tests.get_supabase_uid('user_1a'), 3;

SELECT ok(true, 'u1 pledged 3');

-- u2 login & pledge 2 -> Summe=5
SELECT tests.authenticate_as('user_2a');

WITH i AS (
  SELECT id AS item_id FROM public.event_bring_items
  WHERE event = (SELECT id FROM public.events WHERE "key"='items-test-1')
)
INSERT INTO public.event_bring_pledges(item, "user", qty)
SELECT (SELECT item_id FROM i), tests.get_supabase_uid('user_2a'), 2;

SELECT ok(true, 'u2 pledged 2');

-- Überschuss erlauben: u2 erhöht von 2 auf 3 -> Summe = 6 (kein Fehler!)
WITH i AS (
  SELECT id AS item_id FROM public.event_bring_items
  WHERE event = (SELECT id FROM public.events WHERE "key"='items-test-1')
)
UPDATE public.event_bring_pledges p
SET qty = 3
WHERE p.item = (SELECT item_id FROM i)
  AND p."user" = tests.get_supabase_uid('user_2a');

SELECT ok(true, 'u2 erhöht auf 3 (Überschuss erlaubt)');

-- Kontrolle: Summe == 6
SELECT cmp_ok(
  (SELECT SUM(p.qty)::bigint
   FROM public.event_bring_pledges p
   JOIN public.event_bring_items bi ON bi.id = p.item
   JOIN public.events e ON e.id = bi.event
   WHERE e."key"='items-test-1'),
  '='::text, 6::bigint,
  'Summe pledges == 6 (Überschuss)'
);

-- Status-View prüfen: fulfilled=true, surplus=1
SELECT is(
  (SELECT fulfilled::text
   FROM public.event_bring_item_status s
   JOIN public.event_bring_items bi ON bi.id = s.item_id
   JOIN public.events e ON e.id = bi.event
   WHERE e."key"='items-test-1'),
  'true',
  'fulfilled == true'
);

SELECT cmp_ok(
  (SELECT surplus::bigint
   FROM public.event_bring_item_status s
   JOIN public.event_bring_items bi ON bi.id = s.item_id
   JOIN public.events e ON e.id = bi.event
   WHERE e."key"='items-test-1'),
  '='::text, 1::bigint,
  'surplus == 1'
);

SELECT * FROM finish();
ROLLBACK;
