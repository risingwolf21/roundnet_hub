BEGIN;
\i 000_setup_tests_users.sql
SET LOCAL TIME ZONE 'UTC';
SELECT plan(2);

-- Seed (0.2) + View-Grants falls nötig
-- ... (Block aus 0.2 hier einfügen) ...
GRANT SELECT ON public.events_user_view TO authenticated; -- falls es diese View gibt

DELETE FROM public.events WHERE "key"='vis-evt';

SELECT tests.authenticate_as('user_1a');
INSERT INTO public.events("key","title","description","recurrence",
  "startingDateTime","endDateTime","group")
VALUES ('vis-evt','V','D','None', now(), now()+interval '3h','00000000-0000-0000-0000-000000000042');

-- u1 (member) sieht Event
SELECT cmp_ok(
 (SELECT count(*)::bigint FROM public.events_user_view WHERE "key"='vis-evt'),
 '='::text, 1::bigint, 'member sieht Event in View'
);

-- u2 nicht
SELECT tests.authenticate_as('user_1c');

SELECT cmp_ok(
 (SELECT count(*)::bigint FROM public.events_user_view WHERE "key"='vis-evt'),
 '='::text, 0::bigint, 'kein Fremdzugriff'
);

SELECT * FROM finish();
ROLLBACK;
