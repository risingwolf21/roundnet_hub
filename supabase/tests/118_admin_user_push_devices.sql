-- Regression tests for 20261126120000_admin_user_push_devices.sql
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(4);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@push-devices.local')
FROM unnest(ARRAY['pd_manager', 'pd_member', 'pd_plain']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;

INSERT INTO public.permissions(name) VALUES ('users.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.user_direct_grants("user", kind, key) VALUES (pg_temp.u('pd_manager'), 'perm', 'users.manage');

INSERT INTO notifications.web_push_subscriptions ("user", endpoint, p256dh, auth, platform, revoked_at) VALUES
  (pg_temp.u('pd_member'), 'https://push.test/active', 'k', 'a', 'ios', NULL),
  (pg_temp.u('pd_member'), 'https://push.test/revoked', 'k', 'a', 'android', now());

SELECT tests.authenticate_as('pd_plain');
SELECT throws_ok($$ SELECT * FROM public.admin_user_push_devices() $$,
  '42501', 'forbidden', 'users without users.manage cannot read push devices');

SELECT tests.authenticate_as('pd_manager');
SELECT is((SELECT array_agg(platform) FROM public.admin_user_push_devices() WHERE "user" = tests.get_supabase_uid('pd_member')),
  ARRAY['ios'], 'user managers see only active devices');
SELECT is((SELECT count(*)::int FROM public.admin_user_push_devices() WHERE "user" = tests.get_supabase_uid('pd_plain')),
  0, 'users without a subscription have no devices');

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'admin_user_push_devices'
              AND has_function_privilege('anon', p.oid, 'EXECUTE')), 0, 'anon cannot execute it');

SELECT * FROM finish();
ROLLBACK;
