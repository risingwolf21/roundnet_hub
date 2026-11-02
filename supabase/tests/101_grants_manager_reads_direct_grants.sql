-- 101_grants_manager_reads_direct_grants.sql
-- A rights manager (grants.manage, not supabase.admin) can read other users' direct grants —
-- the same rows grant_user_grants / revoke_user_grants already let them change. Plain users
-- still only see their own.
BEGIN;
SELECT plan(4);

SELECT tests.authenticate_as_service_role();
INSERT INTO public.permissions(name) VALUES ('grants.manage'), ('perm.test.udg_read') ON CONFLICT DO NOTHING;
DELETE FROM public.user_direct_grants WHERE "user" IN (tests.get_supabase_uid('user_1a'), tests.get_supabase_uid('user_1b'), tests.get_supabase_uid('user_1c'));
INSERT INTO public.user_direct_grants("user", kind, key) VALUES
  (tests.get_supabase_uid('user_1a'), 'perm', 'grants.manage'),
  (tests.get_supabase_uid('user_1b'), 'perm', 'perm.test.udg_read');

SELECT tests.authenticate_as('user_1a');
SELECT is(
  (SELECT count(*)::int FROM public.user_direct_grants WHERE "user" = tests.get_supabase_uid('user_1b')),
  1, 'grants.manage reads another user''s direct grants');

SELECT tests.authenticate_as('user_1c');
SELECT is(
  (SELECT count(*)::int FROM public.user_direct_grants WHERE "user" = tests.get_supabase_uid('user_1b')),
  0, 'a user without grants.manage does not see other users'' grants');

SELECT tests.authenticate_as('user_1b');
SELECT is(
  (SELECT count(*)::int FROM public.user_direct_grants WHERE "user" = tests.get_supabase_uid('user_1b')),
  1, 'everyone still reads their own grants');

-- Reading is not writing: direct DML stays reserved to supabase.admin (managers use the RPCs).
SELECT tests.authenticate_as('user_1a');
SELECT throws_ok(
  $$ INSERT INTO public.user_direct_grants("user", kind, key) VALUES (tests.get_supabase_uid('user_1c'), 'perm', 'perm.test.udg_read') $$,
  '42501', NULL, 'grants.manage cannot insert directly (RLS)');

SELECT * FROM finish();
ROLLBACK;
