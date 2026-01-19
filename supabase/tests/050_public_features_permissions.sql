BEGIN;
\i 000_setup_tests_users.sql
SET LOCAL TIME ZONE 'UTC';
SELECT plan(4);

-- Seed (0.2)
-- ... (Block aus 0.2 hier einfügen) ...

-- u1 eingeloggt
SELECT tests.authenticate_as('user_1a');

-- user_features enthält "items"
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_grants_view WHERE kind='feat' and "key"='items'),
  '='::text, 1::bigint,
  'user_features enthält items'
);

-- user_permissions enthält events.edit
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_grants_view WHERE kind='perm' and "key"='event.edit'),
  '='::text, 1::bigint,
  'user_permissions enthält event.edit'
);

-- Negativ: u2 hat diese nicht
SELECT tests.authenticate_as('user_1c');
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_grants_view WHERE kind='feat' and "key"='items'),
  '='::text, 0::bigint, 'c1 hat kein items'
);
SELECT cmp_ok(
  (SELECT count(*)::bigint FROM public.user_grants_view WHERE kind='perm' and "key"='events.edit'),
  '='::text, 0::bigint, 'c1 hat kein events.edit'
);

SELECT * FROM finish();
ROLLBACK;
