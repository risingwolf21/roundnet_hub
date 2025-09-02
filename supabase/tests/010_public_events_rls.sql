\i 00_test_helpers.inc
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(4);

-- Seed (siehe 0.2)
-- ... (Block aus 0.2 hier einfügen) ...

-- 1) u1 darf Event anlegen (hat event.edit via Gruppe)
SELECT test_login('00000000-0000-0000-0000-0000000000a1');
DELETE FROM public.events WHERE "key"='rls-events-1';

INSERT INTO public.events("key","title","description","recurrence",
                             "startingDateTime","endDateTime","group")
   VALUES ('rls-events-1','T','D','None', now(), now()+interval '3h',
           '00000000-0000-0000-0000-000000000042');

SELECT ok(true,
  'u1 kann Event insert (event.edit)'
);

-- 2) u2 darf NICHT insert (keine Permission, kein Mitglied)
SELECT test_login('00000000-0000-0000-0000-0000000000b2');
SELECT throws_like(
  $$ INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","group")
     VALUES ('rls-events-2','T','D','None', now()+interval '2d', now()+interval '4h',
             '00000000-0000-0000-0000-000000000042') $$,
  '%check constraint%',
  'u2 Insert geblockt (RLS/Permission)'
);

-- 3) u1 sieht sein Event, u2 sieht es nicht
SELECT test_login('00000000-0000-0000-0000-0000000000a1');
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.events WHERE "key"='rls-events-1'),
  '='::text, 1::bigint, 'u1 sieht Event'
);

SELECT test_login('00000000-0000-0000-0000-0000000000c1');
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.events WHERE "key"='rls-events-1'),
  '='::text, 0::bigint, 'u2 sieht Event nicht'
);

SELECT * FROM finish();
ROLLBACK;
