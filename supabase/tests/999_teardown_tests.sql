-- supabase/tests/999_teardown_tests.sql
SELECT
  plan (0);

-- Löscht pgTAP aus dem extensions-Schema
DROP EXTENSION IF EXISTS "pgtap" CASCADE;

-- Räumt das inline tests-Schema auf (ersetzt basejump-supabase_test_helpers)
DROP SCHEMA IF EXISTS tests CASCADE;

-- -----------------------------
-- Gruppen & Relationen
-- -----------------------------
DELETE FROM public.group_features
WHERE
  "group" IN (
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000044'
  );

DELETE FROM public.group_permissions
WHERE
  "group" IN (
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000044'
  );

DELETE FROM public.group_user_mapping
WHERE
  "group" IN (
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000044'
  );

-- -----------------------------
-- Gruppen selbst
-- -----------------------------
DELETE FROM public.event_group
WHERE
  id IN (
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000044'
  );

-- -----------------------------
-- Permissions & Features
-- (nur wenn sie testspezifisch sind)
-- -----------------------------
DELETE FROM public.group_permissions
WHERE
  permission IN ('items.manage', 'challenge.manage', 'event.edit');

DELETE FROM public.group_features
WHERE
  feature = 'items';

-- Optional:
-- Nur löschen, wenn du sicher bist, dass sie NICHT global gebraucht werden
-- DELETE FROM public.permissions WHERE name IN ('items.manage', 'challenge.manage', 'event.edit');
-- DELETE FROM public.features WHERE name = 'items';
-- -----------------------------
-- Supabase Test-User
-- -----------------------------
-- Achtung: Reihenfolge wichtig!
-- erst abhängige Tabellen, dann auth.users
DELETE FROM games.players
WHERE
  "player" IN (
    SELECT
      id
    FROM
      auth.users
    WHERE
      email LIKE '%@test.com'
  );

DELETE FROM public.user
WHERE
  email LIKE '%@test.com';

DELETE FROM auth.identities
WHERE
  user_id IN (
    SELECT
      id
    FROM
      auth.users
    WHERE
      email LIKE '%@test.com'
  );

DELETE FROM auth.users
WHERE
  email LIKE '%@test.com';