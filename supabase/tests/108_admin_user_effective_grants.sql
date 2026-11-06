-- Regression tests for 20261106110000_admin_user_effective_grants.sql
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(6);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@eff-grants.local')
FROM unnest(ARRAY['eg_manager', 'eg_member', 'eg_trial', 'eg_plain']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join)
VALUES ('b3000000-0000-0000-0000-000000000001', 'EG Group', true, true, false);

INSERT INTO public.permissions(name) VALUES ('event.signup'), ('drinks.select') ON CONFLICT DO NOTHING;
INSERT INTO public.features(name) VALUES ('events') ON CONFLICT DO NOTHING;
INSERT INTO public.group_permissions("group", permission)
VALUES ('b3000000-0000-0000-0000-000000000001', 'event.signup'),
       ('b3000000-0000-0000-0000-000000000001', 'drinks.select');
INSERT INTO public.group_features("group", feature)
VALUES ('b3000000-0000-0000-0000-000000000001', 'events');

INSERT INTO public.group_user_mapping("user", "group", role)
VALUES (pg_temp.u('eg_member'), 'b3000000-0000-0000-0000-000000000001', 'user'),
       (pg_temp.u('eg_trial'), 'b3000000-0000-0000-0000-000000000001', 'trial');

INSERT INTO public.user_direct_grants("user", kind, key)
VALUES (pg_temp.u('eg_manager'), 'perm', 'grants.manage'),
       (pg_temp.u('eg_member'), 'perm', 'moderation.manage');

SELECT tests.authenticate_as('eg_plain');
SELECT throws_ok($$ SELECT * FROM public.admin_user_effective_grants(tests.get_supabase_uid('eg_member')) $$,
  '42501', 'forbidden', 'users without grants.manage cannot read other users'' grants');

SELECT tests.authenticate_as('eg_manager');
SELECT is((SELECT count(*)::int FROM public.admin_user_effective_grants(pg_temp.u('eg_member')) WHERE source = 'group'),
  3, 'a member inherits all permissions and features of the group');
SELECT is((SELECT count(*)::int FROM public.admin_user_effective_grants(pg_temp.u('eg_member')) WHERE source = 'direct' AND key = 'moderation.manage'),
  1, 'direct grants are listed as direct');
SELECT is((SELECT group_name FROM public.admin_user_effective_grants(pg_temp.u('eg_member')) WHERE key = 'drinks.select'),
  'EG Group', 'inherited grants name the group');
SELECT is((SELECT array_agg(key ORDER BY key) FROM public.admin_user_effective_grants(pg_temp.u('eg_trial'))),
  ARRAY['event.signup', 'events'], 'trial members only inherit the trial subset');

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'admin_user_effective_grants'
              AND has_function_privilege('anon', p.oid, 'EXECUTE')), 0, 'anon cannot execute it');

SELECT * FROM finish();
ROLLBACK;
