-- 074_user_grant_and_direct_grants.sql

BEGIN;
SET LOCAL TIME ZONE 'UTC';

-- Helper + Aliase/Logins
\i 000_setup_tests_users.inc

-- Plan dynamisch: +2 wenn group_features existiert
WITH hasf AS (SELECT to_regclass('public.group_features') IS NOT NULL AS has)
SELECT plan(19 + CASE WHEN has THEN 3 ELSE 0 END) FROM hasf;

SELECT tests.authenticate_as_service_role();

-- ---------------------------------------------------------------------------
-- Variablen ohne DO/DECLARE: 1-Zeilen Temp-Tabelle
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _v (
  permA     text,
  permB     text,
  feat1     text,
  adminPerm text,
  gname     text,
  tenant    uuid,
  uidA      uuid,
  uidB      uuid,
  gid       uuid
) ON COMMIT DROP;

GRANT SELECT, INSERT, UPDATE, DELETE ON _v TO PUBLIC;

INSERT INTO _v
SELECT
  'perm.test.alpha.'   || md5(random()::text || clock_timestamp()::text),
  'perm.test.beta.'    || md5(random()::text || clock_timestamp()::text),
  'feat.test.nightly.' || md5(random()::text || clock_timestamp()::text),
  'supabase.admin',
  '__test_user_grants_all__' || substr(md5(random()::text),1,8),
  '00000000-0000-0000-0000-000000000000'::uuid,
  tests.get_supabase_uid('user_1a'),
  tests.get_supabase_uid('user_1b'),
  NULL::uuid;

-- Sanity
SELECT ok((SELECT uidA IS NOT NULL FROM _v), 'uidA ermittelt');
SELECT ok((SELECT uidB IS NOT NULL FROM _v), 'uidB ermittelt');

-- ---------------------------------------------------------------------------
-- Stammsätze als service_role (RLS umgehen)
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();

INSERT INTO public.permissions(name) SELECT permA FROM _v ON CONFLICT DO NOTHING;
INSERT INTO public.permissions(name) SELECT permB FROM _v ON CONFLICT DO NOTHING;
INSERT INTO public.permissions(name) SELECT adminPerm FROM _v ON CONFLICT DO NOTHING;
INSERT INTO public.features(name)    SELECT feat1  FROM _v ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Gruppe anlegen (als user_1a, Rolle 'admin'), gid in _v speichern
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as('user_1a');

WITH g AS (
  SELECT public.create_group_with_user(
    (SELECT gname FROM _v),
    'Testgruppe user_grants/all',
    '#000000',
    TRUE, FALSE,
    (SELECT uidA FROM _v),
    'admin',            -- << casing fix
    NULL
  ) AS grp
)
UPDATE _v SET gid = (SELECT (g.grp).id FROM g);

SELECT ok((SELECT gid IS NOT NULL FROM _v), 'Gruppe erstellt (gid ermittelt)');

-- Mitgliedschaftsrolle prüfen (casing 'admin')
SELECT ok(EXISTS (
  SELECT 1 FROM public.group_user_mapping gum
  WHERE gum."group" = (SELECT gid  FROM _v)
    AND gum."user"  = (SELECT uidA FROM _v)
    AND gum."role"  = 'admin'      -- << casing fix
), 'uA ist admin der Testgruppe');

-- ---------------------------------------------------------------------------
-- Writes in group_permissions / group_user_mapping als service_role
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();

-- uA via Gruppe zum Super-Admin (Policy erlaubt danach Direct-Grants)
INSERT INTO public.group_permissions("group","permission")
SELECT gid, adminPerm FROM _v
ON CONFLICT DO NOTHING;

-- Initial-Check: beide haben KEINE unserer dynamischen Test-Perms
SELECT tests.authenticate_as('user_1a');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user" = (SELECT uidA FROM _v)
    AND kind='perm'
    AND key IN ((SELECT permA FROM _v),(SELECT permB FROM _v))
), 0::bigint, 'uA initial ohne Test-Permissions');

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user" = (SELECT uidB FROM _v)
    AND kind='perm'
    AND key IN ((SELECT permA FROM _v),(SELECT permB FROM _v))
), 0::bigint, 'uB initial ohne Test-Permissions');

-- ---------------------------------------------------------------------------
-- permA der Gruppe geben (service_role), dann Sichtprüfungen
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();
INSERT INTO public.group_permissions("group","permission")
SELECT gid, permA FROM _v
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1a');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidA FROM _v)
    AND kind='perm' AND key=(SELECT permA FROM _v)
    AND granted_by='group'
    AND tenant=(SELECT tenant FROM _v)
), 1::bigint, 'uA hat permA via group');

-- uB in die Gruppe aufnehmen (Rolle 'user')
SELECT tests.authenticate_as_service_role();
INSERT INTO public.group_user_mapping("group","user","role")
SELECT gid, uidB, 'user' FROM _v          -- << casing fix
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm' AND key=(SELECT permA FROM _v)
    AND granted_by='group'
    AND tenant=(SELECT tenant FROM _v)
), 1::bigint, 'uB erbt permA via group');

-- ---------------------------------------------------------------------------
-- permB hinzufügen (service_role) -> beide haben A+B
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();
INSERT INTO public.group_permissions("group","permission")
SELECT gid, permB FROM _v
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1a');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidA FROM _v)
    AND kind='perm'
    AND key IN ((SELECT permA FROM _v),(SELECT permB FROM _v))
), 2::bigint, 'uA hat nun 2 Permissions via group');

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm'
    AND key IN ((SELECT permA FROM _v),(SELECT permB FROM _v))
), 2::bigint, 'uB hat nun 2 Permissions via group');

-- ---------------------------------------------------------------------------
-- permA entfernen (service_role) -> beide nur noch B
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();
DELETE FROM public.group_permissions
WHERE "group"=(SELECT gid FROM _v)
  AND "permission"=(SELECT permA FROM _v);

SELECT tests.authenticate_as('user_1a');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidA FROM _v)
    AND kind='perm'
    AND key IN ((SELECT permA FROM _v),(SELECT permB FROM _v))
), 1::bigint, 'uA: permA entfernt, 1 übrig');

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm'
    AND key IN ((SELECT permA FROM _v),(SELECT permB FROM _v))
), 1::bigint, 'uB: permA entfernt, 1 übrig');

-- ---------------------------------------------------------------------------
-- uB aus Gruppe entfernen (service_role) -> uB hat nichts mehr
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();
DELETE FROM public.group_user_mapping
WHERE "group"=(SELECT gid FROM _v)
  AND "user" =(SELECT uidB FROM _v);

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm'
    AND key IN ((SELECT permA FROM _v),(SELECT permB FROM _v))
), 0::bigint, 'uB nach Austritt: keine Permissions');

-- ---------------------------------------------------------------------------
-- Optional: Feature-Grant add/remove (nur wenn group_features existiert)
-- ---------------------------------------------------------------------------
SELECT CASE WHEN to_regclass('public.group_features') IS NOT NULL THEN
  tests.authenticate_as_service_role()
ELSE NULL END;

INSERT INTO public.group_features("group","feature")
SELECT gid, feat1 FROM _v
WHERE to_regclass('public.group_features') IS NOT NULL
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1a');
SELECT CASE WHEN to_regclass('public.group_features') IS NOT NULL THEN
  is((
    SELECT count(*)::bigint FROM public.user_grants_view
    WHERE "user"=(SELECT uidA FROM _v)
      AND kind='feat' AND key=(SELECT feat1 FROM _v)
      AND granted_by='group'
  ), 1::bigint, 'uA: Feature feat1 via group')
ELSE ok(TRUE, 'group_features nicht vorhanden – Feature-Teil übersprungen') END;

SELECT tests.authenticate_as_service_role();
DELETE FROM public.group_features
WHERE to_regclass('public.group_features') IS NOT NULL
  AND "group"  =(SELECT gid FROM _v)
  AND "feature"=(SELECT feat1 FROM _v);

SELECT tests.authenticate_as('user_1a');
SELECT CASE WHEN to_regclass('public.group_features') IS NOT NULL THEN
  is((
    SELECT count(*)::bigint FROM public.user_grants_view
    WHERE "user"=(SELECT uidA FROM _v)
      AND kind='feat' AND key=(SELECT feat1 FROM _v)
  ), 0::bigint, 'uA: Feature feat1 nach Remove weg')
ELSE ok(TRUE, 'group_features nicht vorhanden – Feature-Teil übersprungen') END;

-- ---------------------------------------------------------------------------
-- Direct grants (als uA). uA hat 'supabase.admin' via Gruppe.
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as('user_1a');

INSERT INTO public.user_direct_grants("user", tenant, kind, key)
SELECT uidB, tenant, 'perm', permA FROM _v
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm'
    AND key =(SELECT permA FROM _v)
    AND granted_by='direct'
), 1::bigint, 'uB: direct permA sichtbar im Cache');

-- UPDATE: permA -> permB
SELECT tests.authenticate_as('user_1a');
UPDATE public.user_direct_grants
SET key = (SELECT permB FROM _v), updated_at=now()
WHERE "user" =(SELECT uidB FROM _v)
  AND tenant =(SELECT tenant FROM _v)
  AND kind='perm'
  AND key   =(SELECT permA FROM _v);

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm'
    AND key =(SELECT permA FROM _v)
    AND granted_by='direct'
), 0::bigint, 'uB: direct permA nach UPDATE verschwunden');

SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm'
    AND key =(SELECT permB FROM _v)
    AND granted_by='direct'
), 1::bigint, 'uB: direct permB nach UPDATE vorhanden');

-- DELETE: direct permB
SELECT tests.authenticate_as('user_1a');
DELETE FROM public.user_direct_grants
WHERE "user" =(SELECT uidB FROM _v)
  AND tenant =(SELECT tenant FROM _v)
  AND kind='perm'
  AND key   =(SELECT permB FROM _v);

SELECT tests.authenticate_as('user_1b');
SELECT is((
  SELECT count(*)::bigint FROM public.user_grants_view
  WHERE "user"=(SELECT uidB FROM _v)
    AND kind='perm'
    AND key =(SELECT permB FROM _v)
    AND granted_by='direct'
), 0::bigint, 'uB: direct permB nach DELETE weg');

-- ----------------------------------------------------------------------------
-- RLS: Nicht-Admin darf user_direct_grants NICHT schreiben
-- ----------------------------------------------------------------------------
SELECT tests.authenticate_as('user_1b');

SELECT throws_like(
  $q$
    INSERT INTO public.user_direct_grants("user", tenant, kind, key)
    VALUES (auth.uid(), '00000000-0000-0000-0000-000000000000', 'perm', 'perm.forbidden.self');
  $q$,
  '%policy%',
  'uB darf nicht in user_direct_grants schreiben (RLS/ACL greift)'
);

-- uB sieht keine fremden Zeilen in user_grants
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.user_grants_view
    WHERE "user" <> auth.uid()
  ),
  'uB sieht in user_grants keine fremden Zeilen (RLS)'
);

-- uB sieht keine fremden Zeilen in user_direct_grants
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.user_direct_grants
    WHERE "user" <> auth.uid()
  ),
  'uB sieht in user_direct_grants keine fremden Zeilen (RLS)'
);

SELECT * FROM finish();
ROLLBACK;
