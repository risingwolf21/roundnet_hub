-- Regression tests for 20261106100000_native_push_tokens.sql
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(7);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@native-push.local')
FROM unnest(ARRAY['np_a', 'np_b']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;

SELECT tests.authenticate_as('np_a');
SELECT lives_ok($$ SELECT notifications.upsert_native_push_token('apns-token-1', 'apns', 'dev-a', 'ios') $$,
  'user registers an APNs token');
SELECT is((SELECT kind FROM notifications.web_push_subscriptions WHERE endpoint = 'apns-token-1'), 'apns', 'kind is stored');
SELECT is((SELECT "user" FROM notifications.web_push_subscriptions WHERE endpoint = 'apns-token-1'), pg_temp.u('np_a'), 'token belongs to the caller');

SELECT lives_ok($$ SELECT notifications.upsert_native_push_token('apns-token-2', 'apns', 'dev-a', 'ios') $$,
  'a refreshed token for the same device replaces the old one');
SELECT is((SELECT count(*)::int FROM notifications.web_push_subscriptions
            WHERE "user" = pg_temp.u('np_a') AND device_id = 'dev-a' AND revoked_at IS NULL), 1, 'one active row per device');

SELECT throws_ok($$ SELECT notifications.upsert_native_push_token('x', 'web', 'dev-a', 'ios') $$, 'P0001', 'invalid kind', 'only native kinds are accepted');

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT throws_ok($$ INSERT INTO notifications.web_push_subscriptions("user", endpoint, kind) VALUES (tests.get_supabase_uid('np_b'), 'https://x.example', 'web') $$,
  '23514', NULL, 'web subscriptions still need their keys');

SELECT * FROM finish();
ROLLBACK;
