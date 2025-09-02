\i 00_test_helpers.inc
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(4);

-- Seed (0.2)
-- ... (Block aus 0.2 hier einfügen) ...

-- u1 eingeloggt
SELECT test_login('00000000-0000-0000-0000-0000000000a1');

-- user_features enthält "items"
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_features WHERE feature='items'),
  '='::text, 1::bigint,
  'user_features enthält items'
);

-- user_permissions enthält events.edit
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_permissions WHERE permission='event.edit'),
  '='::text, 1::bigint,
  'user_permissions enthält event.edit'
);

-- Negativ: u2 hat diese nicht
SELECT test_login('00000000-0000-0000-0000-0000000000c1');
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_features WHERE feature='items'),
  '='::text, 0::bigint, 'c1 hat kein items'
);
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_permissions WHERE permission='events.edit'),
  '='::text, 0::bigint, 'c1 hat kein events.edit'
);

SELECT * FROM finish();
ROLLBACK;
