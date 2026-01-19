BEGIN;
\i 000_setup_tests_users.sql
SET LOCAL TIME ZONE 'UTC';
SELECT plan(3);

-- Seed (0.2)
-- ... Block 0.2 ...

-- u1 login, Event mit Items

INSERT INTO public.permissions(name) VALUES ('event.edit') ON CONFLICT DO NOTHING;
INSERT INTO public.group_permissions("group","permission")
VALUES ('00000000-0000-0000-0000-000000000042','event.edit')
ON CONFLICT DO NOTHING;

DELETE FROM public.events WHERE "key"='items-cap-1';
INSERT INTO public.events("key","title","description","recurrence",
  "startingDateTime","endDateTime","group",items_enabled)
VALUES ('items-cap-1','C','D','None', now(), now()+interval '3h',
        '00000000-0000-0000-0000-000000000042', true);

SELECT tests.authenticate_as('user_1a');

-- Item require 4
INSERT INTO public.event_bring_items(event, name, unit, required_qty)
SELECT id, 'Ball', 'Stück', 4
FROM public.events WHERE "key"='items-cap-1';

-- u1 pledge 3
WITH i AS (
  SELECT id AS item_id FROM public.event_bring_items
  WHERE event = (SELECT id FROM public.events WHERE "key"='items-cap-1')
)
INSERT INTO public.event_bring_pledges(item,"user",qty)
SELECT (SELECT item_id FROM i), tests.get_supabase_uid('user_1a'), 3;

SELECT ok(true,'u1 pledged 3');

SELECT tests.authenticate_as('user_2a');

-- u2 pledge 1 (Summe 4 erreicht, ok)
WITH i AS (
  SELECT id AS item_id FROM public.event_bring_items
  WHERE event = (SELECT id FROM public.events WHERE "key"='items-cap-1')
)
INSERT INTO public.event_bring_pledges(item,"user",qty)
SELECT (SELECT item_id FROM i), tests.get_supabase_uid('user_2a'), 1;

SELECT ok(true,'u2 pledge 1 ok');

-- Kontrollsumme
SELECT cmp_ok(
 (SELECT SUM(qty)::bigint
  FROM public.event_bring_pledges p
  JOIN public.event_bring_items bi ON bi.id=p.item
  JOIN public.events e ON e.id=bi.event
  WHERE e."key"='items-cap-1'),
 '='::text, 4::bigint,
 'Summe == required_qty'
);

SELECT * FROM finish();
ROLLBACK;
