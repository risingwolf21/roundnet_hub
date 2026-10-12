-- Security hardening (20261002072326_security_hardening.sql):
-- membership helpers, user_grants_view, grant RPCs, user_direct_grants,
-- private admin wrappers, admin_notify_emit, key_handover and
-- increase_challenge_stats_count.
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(97);

-- ---------------------------------------------------------------------------
-- Fixtures (postgres, no JWT)
--   G = a1..01 (public, joinable)   H = a1..02 (public, joinable)
--   sm_gadmin  : admin of G   (+ direct event/items/challenge permissions)
--   sm_user    : user of G
--   sm_user2   : user of G
--   sm_trial   : trial of G   (+ direct event.edit)
--   sm_trial_h : trial of H
--   sm_req     : joinRequested in G
--   sm_out     : user of H only (+ the same direct permissions as sm_gadmin)
--   sm_padmin  : supabase.admin (direct), no membership
--   sm_gm      : grants.manage (direct)
--   sm_analyst : admin.analytics.view (direct)
--   sm_notifier: admin.notify_users (direct)
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@sec-test.local')
FROM unnest(ARRAY['sm_gadmin','sm_user','sm_user2','sm_trial','sm_trial_h','sm_req','sm_out',
                  'sm_padmin','sm_gm','sm_analyst','sm_notifier']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;
CREATE FUNCTION pg_temp.rows(q text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int; BEGIN EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT; RETURN n; END $$;

CREATE TEMP TABLE _snap (k text PRIMARY KEY, v bigint) ON COMMIT DROP;
GRANT ALL ON _snap TO PUBLIC;

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'SM G', true, true, false),
  ('a1000000-0000-0000-0000-000000000002', 'SM H', true, true, false);

INSERT INTO public.permissions(name)
SELECT unnest(ARRAY['event.comment','event.signup','event.edit','event.delete','event.manage.attendees',
                    'items.manage','challenge.manage','supabase.admin','grants.manage',
                    'admin.analytics.view','admin.notify_users','drinks.select'])
ON CONFLICT DO NOTHING;
INSERT INTO public.features(name) SELECT unnest(ARRAY['events','events.trials','items']) ON CONFLICT DO NOTHING;

INSERT INTO public.group_permissions("group","permission") VALUES
  ('a1000000-0000-0000-0000-000000000001', 'event.comment'),
  ('a1000000-0000-0000-0000-000000000001', 'event.signup'),
  ('a1000000-0000-0000-0000-000000000002', 'event.comment');
INSERT INTO public.group_features("group","feature") VALUES
  ('a1000000-0000-0000-0000-000000000001', 'events'),
  ('a1000000-0000-0000-0000-000000000001', 'events.trials'),
  ('a1000000-0000-0000-0000-000000000001', 'items'),
  ('a1000000-0000-0000-0000-000000000002', 'events'),
  ('a1000000-0000-0000-0000-000000000002', 'items');

INSERT INTO public.group_user_mapping("user","group",role)
SELECT pg_temp.u(x.u), x.g::uuid, x.r::public."GroupRole" FROM (VALUES
  ('sm_gadmin',  'a1000000-0000-0000-0000-000000000001', 'admin'),
  ('sm_user',    'a1000000-0000-0000-0000-000000000001', 'user'),
  ('sm_user2',   'a1000000-0000-0000-0000-000000000001', 'user'),
  ('sm_trial',   'a1000000-0000-0000-0000-000000000001', 'trial'),
  ('sm_req',     'a1000000-0000-0000-0000-000000000001', 'joinRequested'),
  ('sm_out',     'a1000000-0000-0000-0000-000000000002', 'user'),
  ('sm_trial_h', 'a1000000-0000-0000-0000-000000000002', 'trial')
) x(u, g, r);

INSERT INTO public.user_direct_grants("user", kind, key)
SELECT pg_temp.u(x.u), 'perm', x.k FROM (VALUES
  ('sm_gadmin', 'event.edit'), ('sm_gadmin', 'event.delete'), ('sm_gadmin', 'event.manage.attendees'),
  ('sm_gadmin', 'items.manage'), ('sm_gadmin', 'challenge.manage'), ('sm_gadmin', 'event.comment'),
  ('sm_out', 'event.edit'), ('sm_out', 'event.delete'), ('sm_out', 'event.manage.attendees'),
  ('sm_out', 'items.manage'), ('sm_out', 'challenge.manage'), ('sm_out', 'event.comment'),
  ('sm_trial', 'event.edit'),
  ('sm_padmin', 'supabase.admin'),
  ('sm_gm', 'grants.manage'),
  ('sm_analyst', 'admin.analytics.view'),
  ('sm_notifier', 'admin.notify_users')
) x(u, k);

INSERT INTO public.events(id, "key", title, description, recurrence, "startingDateTime", "endDateTime", "group") VALUES
  ('e1000000-0000-0000-0000-000000000001', 'sm-e1', 'SM E1', '', 'None', now() + interval '1 day', now() + interval '1 day 2 hours', 'a1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0000-000000000004', 'sm-e4', 'SM E4', '', 'None', now() + interval '1 day', now() + interval '1 day 2 hours', 'a1000000-0000-0000-0000-000000000002');

INSERT INTO public.items(id, name, type, current_holder, "group") VALUES
  (990001, 'SM Key G',    'mtvGym', pg_temp.u('sm_user'), 'a1000000-0000-0000-0000-000000000001'),
  (990002, 'SM Key none', 'mtvGym', pg_temp.u('sm_user'), NULL);

INSERT INTO public.challenge(id, name, "group", max_points_per_day, max_points_per_week, automated) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'SM C1', 'a1000000-0000-0000-0000-000000000001', 2, 3, false),
  ('c1000000-0000-0000-0000-000000000002', 'SM C2 automated', 'a1000000-0000-0000-0000-000000000001', 2, 3, true),
  ('c1000000-0000-0000-0000-000000000003', 'SM CH', 'a1000000-0000-0000-0000-000000000002', 2, 3, false);

-- ===========================================================================
-- A. Membership helper functions (8)
-- ===========================================================================
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(ARRAY[public.is_full_member_of_group('a1000000-0000-0000-0000-000000000001'),
                public.is_member_of_event('e1000000-0000-0000-0000-000000000001'),
                public.is_full_member_of_event('e1000000-0000-0000-0000-000000000001')],
          ARRAY[true, true, true], 'helpers: group admin is full member of group and event');

SELECT tests.authenticate_as('sm_user');
SELECT is(ARRAY[public.is_full_member_of_group('a1000000-0000-0000-0000-000000000001'),
                public.is_member_of_event('e1000000-0000-0000-0000-000000000001'),
                public.is_full_member_of_event('e1000000-0000-0000-0000-000000000001')],
          ARRAY[true, true, true], 'helpers: user is full member of group and event');
SELECT is(public.is_member_of_event(gen_random_uuid()), false, 'helpers: unknown event -> not a member');

SELECT tests.authenticate_as('sm_trial');
SELECT is(ARRAY[public.is_full_member_of_group('a1000000-0000-0000-0000-000000000001'),
                public.is_member_of_event('e1000000-0000-0000-0000-000000000001'),
                public.is_full_member_of_event('e1000000-0000-0000-0000-000000000001')],
          ARRAY[false, true, false], 'helpers: trial is event member but not full member');

SELECT tests.authenticate_as('sm_req');
SELECT is(ARRAY[public.is_full_member_of_group('a1000000-0000-0000-0000-000000000001'),
                public.is_member_of_event('e1000000-0000-0000-0000-000000000001'),
                public.is_full_member_of_event('e1000000-0000-0000-0000-000000000001')],
          ARRAY[false, false, false], 'helpers: joinRequested is no member at all');

SELECT tests.authenticate_as('sm_out');
SELECT is(ARRAY[public.is_full_member_of_group('a1000000-0000-0000-0000-000000000001'),
                public.is_member_of_event('e1000000-0000-0000-0000-000000000001'),
                public.is_full_member_of_event('e1000000-0000-0000-0000-000000000001')],
          ARRAY[false, false, false], 'helpers: member of another group is no member');

SELECT tests.authenticate_as('sm_padmin');
SELECT is(ARRAY[public.is_full_member_of_group('a1000000-0000-0000-0000-000000000001'),
                public.is_member_of_event('e1000000-0000-0000-0000-000000000001'),
                public.is_full_member_of_event('e1000000-0000-0000-0000-000000000001')],
          ARRAY[false, false, false], 'helpers: platform admin is not implicitly a member');

SELECT tests.clear_authentication();
SELECT throws_ok(
  $$ SELECT public.is_full_member_of_group('a1000000-0000-0000-0000-000000000001') $$,
  '42501', NULL, 'helpers: anon cannot execute membership helpers');

-- ===========================================================================
-- B. user_grants_view (9)
-- ===========================================================================
SELECT tests.authenticate_as('sm_trial');
SELECT is(
  (SELECT array_agg(key || ':' || granted_by ORDER BY key) FROM public.user_grants_view WHERE kind = 'perm'),
  ARRAY['event.edit:direct', 'event.signup:group'],
  'grants view: trial gets only event.signup from the group (+ own direct grants)');
SELECT is(
  (SELECT array_agg(key ORDER BY key) FROM public.user_grants_view WHERE kind = 'feat'),
  ARRAY['events', 'events.trials'],
  'grants view: trial only gets features events/events.trials');

SELECT tests.authenticate_as('sm_trial_h');
SELECT is(
  (SELECT coalesce(array_agg(key ORDER BY key), '{}') FROM public.user_grants_view WHERE kind = 'perm'),
  '{}'::text[],
  'grants view: trial gets no permission when the group lacks event.signup');
SELECT is(
  (SELECT array_agg(key ORDER BY key) FROM public.user_grants_view WHERE kind = 'feat'),
  ARRAY['events'],
  'grants view: trial gets events but not other group features');

SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.user_grants_view), 0, 'grants view: joinRequested gets nothing');

SELECT tests.authenticate_as('sm_user');
SELECT is(
  (SELECT array_agg(key || ':' || granted_by ORDER BY key) FROM public.user_grants_view WHERE kind = 'perm'),
  ARRAY['event.comment:group', 'event.signup:group'],
  'grants view: full member gets all group permissions');
SELECT is(
  (SELECT array_agg(key ORDER BY key) FROM public.user_grants_view WHERE kind = 'feat'),
  ARRAY['events', 'events.trials', 'items'],
  'grants view: full member gets all group features');

SELECT tests.authenticate_as('sm_gadmin');
SELECT is(
  (SELECT array_agg(key || ':' || granted_by ORDER BY key) FROM public.user_grants_view WHERE kind = 'perm'),
  ARRAY['challenge.manage:direct', 'event.comment:direct', 'event.delete:direct', 'event.edit:direct',
        'event.manage.attendees:direct', 'event.signup:group', 'items.manage:direct'],
  'grants view: group + direct grants, direct wins on duplicates');
SELECT is(
  (SELECT count(*) - count(DISTINCT (kind, key)) FROM public.user_grants_view)::int, 0,
  'grants view: no duplicate (kind,key) rows');

-- ===========================================================================
-- C. grant_group_grants / revoke_group_grants (12)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ SELECT public.grant_group_grants('a1000000-0000-0000-0000-000000000001', ARRAY['event.edit']) $$,
  '42501', 'forbidden', 'grant_group_grants: regular member is forbidden');
SELECT throws_ok($$ SELECT public.revoke_group_grants('a1000000-0000-0000-0000-000000000001', ARRAY['event.comment']) $$,
  '42501', 'forbidden', 'revoke_group_grants: regular member is forbidden');

SELECT tests.authenticate_as('sm_gadmin');
SELECT throws_ok($$ SELECT public.grant_group_grants('a1000000-0000-0000-0000-000000000001', ARRAY['event.delete'], ARRAY['items']) $$,
  '42501', 'forbidden', 'grant_group_grants: group admin is forbidden');
SELECT throws_ok($$ SELECT public.revoke_group_grants('a1000000-0000-0000-0000-000000000001', ARRAY['event.comment']) $$,
  '42501', 'forbidden', 'revoke_group_grants: group admin is forbidden');

SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT public.grant_group_grants('a1000000-0000-0000-0000-000000000001', ARRAY['event.edit']) $$,
  '42501', NULL, 'grant_group_grants: anon has no EXECUTE');

SELECT tests.authenticate_as('sm_user');
SELECT set_config('request.jwt.claims', '{}', true);
SELECT throws_ok($$ SELECT public.grant_group_grants('a1000000-0000-0000-0000-000000000001', ARRAY['event.edit']) $$,
  '28P01', 'unauthenticated', 'grant_group_grants: authenticated role without uid is rejected');

SELECT tests.authenticate_as('sm_padmin');
SELECT lives_ok($$ SELECT public.grant_group_grants('a1000000-0000-0000-0000-000000000002', ARRAY['event.delete'], ARRAY['sm.feat.test']) $$,
  'grant_group_grants: supabase.admin may grant');
SELECT lives_ok($$ SELECT public.grant_group_grants('a1000000-0000-0000-0000-000000000002', NULL, NULL) $$,
  'grant_group_grants: NULL arrays are a no-op');

RESET ROLE;
SELECT is(
  ARRAY[EXISTS (SELECT 1 FROM public.group_permissions WHERE "group" = 'a1000000-0000-0000-0000-000000000002' AND permission = 'event.delete'),
        EXISTS (SELECT 1 FROM public.group_features WHERE "group" = 'a1000000-0000-0000-0000-000000000002' AND feature = 'sm.feat.test')],
  ARRAY[true, true],
  'grant_group_grants: permission and (new) feature were granted');

SELECT tests.authenticate_as('sm_gm');
SELECT lives_ok($$ SELECT public.grant_group_grants('a1000000-0000-0000-0000-000000000002', ARRAY['event.signup']) $$,
  'grant_group_grants: grants.manage may grant');
SELECT lives_ok($$ SELECT public.revoke_group_grants('a1000000-0000-0000-0000-000000000002', ARRAY['event.delete','event.signup'], ARRAY['sm.feat.test']) $$,
  'revoke_group_grants: grants.manage may revoke');

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.group_permissions WHERE "group" = 'a1000000-0000-0000-0000-000000000002' AND permission IN ('event.delete','event.signup'))
  + (SELECT count(*)::int FROM public.group_features WHERE "group" = 'a1000000-0000-0000-0000-000000000002' AND feature = 'sm.feat.test'),
  0,
  'revoke_group_grants: permissions and feature were revoked');

-- ===========================================================================
-- D. user_direct_grants (12)
-- ===========================================================================
SELECT is(
  (SELECT column_default FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_direct_grants' AND column_name = 'user'),
  NULL,
  'user_direct_grants."user" has no default anymore');

SELECT tests.authenticate_as('sm_padmin');
SELECT throws_ok($$ INSERT INTO public.user_direct_grants(kind, key) VALUES ('perm', 'drinks.select') $$,
  '23502', NULL, 'user_direct_grants: "user" must be given explicitly (no auth.uid() default)');

SELECT tests.authenticate_as('sm_user');
SELECT throws_like(
  format($$ INSERT INTO public.user_direct_grants("user", kind, key) VALUES (%L, 'perm', 'supabase.admin') $$, pg_temp.u('sm_user')),
  '%row-level security%', 'user_direct_grants: user cannot grant themselves');
SELECT throws_like(
  format($$ INSERT INTO public.user_direct_grants("user", kind, key) VALUES (%L, 'perm', 'supabase.admin') $$, pg_temp.u('sm_user2')),
  '%row-level security%', 'user_direct_grants: user cannot grant others');

SELECT tests.authenticate_as('sm_gm');
SELECT throws_like(
  format($$ INSERT INTO public.user_direct_grants("user", kind, key) VALUES (%L, 'perm', 'drinks.select') $$, pg_temp.u('sm_user')),
  '%row-level security%', 'user_direct_grants: grants.manage alone cannot write direct grants');

SELECT tests.authenticate_as('sm_padmin');
SELECT lives_ok(
  format($$ INSERT INTO public.user_direct_grants("user", kind, key) VALUES (%L, 'perm', 'drinks.select') $$, pg_temp.u('sm_user')),
  'user_direct_grants: supabase.admin can grant');

SELECT tests.authenticate_as('sm_user');
SELECT is(
  (SELECT count(*)::int FROM public.user_grants_view WHERE kind = 'perm' AND key = 'drinks.select' AND granted_by = 'direct'),
  1, 'user_direct_grants: granted permission is effective');
SELECT is(pg_temp.rows($$ UPDATE public.user_direct_grants SET key = 'supabase.admin' WHERE "user" = auth.uid() $$),
  0, 'user_direct_grants: user cannot update own direct grants');
SELECT is(pg_temp.rows($$ DELETE FROM public.user_direct_grants WHERE "user" = auth.uid() $$),
  0, 'user_direct_grants: user cannot delete own direct grants');

SELECT tests.authenticate_as('sm_padmin');
SELECT is(
  pg_temp.rows(format($$ DELETE FROM public.user_direct_grants WHERE "user" = %L AND key = 'drinks.select' $$, pg_temp.u('sm_user'))),
  1, 'user_direct_grants: supabase.admin can revoke');

SELECT tests.clear_authentication();
SELECT throws_like(
  format($$ INSERT INTO public.user_direct_grants("user", kind, key) VALUES (%L, 'perm', 'supabase.admin') $$, pg_temp.u('sm_user')),
  '%row-level security%', 'user_direct_grants: anon cannot write');
SELECT is((SELECT count(*)::int FROM public.user_direct_grants), 0, 'user_direct_grants: anon sees nothing');

-- ===========================================================================
-- E. Private implementations + guarded wrappers (16)
-- ===========================================================================
RESET ROLE;
SELECT is(
  has_schema_privilege('authenticated', 'private', 'USAGE') OR has_schema_privilege('anon', 'private', 'USAGE'),
  false, 'private schema is not usable by API roles');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p
    WHERE p.pronamespace = 'private'::regnamespace
      AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'))),
  0, 'private implementations are not executable by API roles');

SELECT tests.authenticate_as('sm_analyst');
SELECT throws_ok($$ SELECT * FROM private.admin_analytics_drinks_ranking(now() - interval '1 year', now()) $$,
  '42501', NULL, 'private implementation cannot be called directly');

SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ SELECT * FROM public.admin_analytics_attendance_ranking(now() - interval '1 year', now()) $$,
  '42501', 'forbidden', 'attendance ranking: regular user forbidden');
SELECT throws_ok($$ SELECT * FROM public.admin_challenge_zero_points_candidates('c1000000-0000-0000-0000-000000000001', now() - interval '1 year', now()) $$,
  '42501', 'forbidden', 'zero points candidates: regular user forbidden');

SELECT tests.authenticate_as('sm_analyst');
SELECT lives_ok($$ SELECT * FROM public.admin_analytics_attendance_ranking(now() - interval '1 year', now()) $$,
  'attendance ranking: admin.analytics.view allowed');
SELECT lives_ok($$ SELECT * FROM public.admin_analytics_drinks_ranking(now() - interval '1 year', now()) $$,
  'drinks ranking: admin.analytics.view allowed');
SELECT lives_ok($$ SELECT * FROM public.admin_challenge_zero_points_candidates('c1000000-0000-0000-0000-000000000001', now() - interval '1 year', now()) $$,
  'zero points candidates: admin.analytics.view allowed');
SELECT throws_ok($$ SELECT util.get_table_metadata(ARRAY['public']) $$,
  '42501', 'forbidden', 'table metadata: admin.analytics.view is not enough');

SELECT tests.authenticate_as('sm_padmin');
SELECT throws_ok($$ SELECT * FROM public.admin_challenge_zero_points_candidates('c1000000-0000-0000-0000-000000000001', now() - interval '1 year', now()) $$,
  '42501', 'forbidden', 'zero points candidates: supabase.admin does not imply admin.analytics.view');
SELECT isnt(util.get_table_metadata(ARRAY['public']), NULL, 'table metadata: supabase.admin allowed');

SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok($$ SELECT * FROM public.create_next_occurrences(now(), interval '1 day') $$,
  'create_next_occurrences: event.edit allowed');

SELECT tests.authenticate_as_service_role();
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT lives_ok($$ SELECT * FROM public.create_next_occurrences(now(), interval '1 day') $$,
  'create_next_occurrences: service_role JWT allowed');

SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT * FROM public.admin_analytics_attendance_ranking(now() - interval '1 year', now()) $$,
  '42501', NULL, 'attendance ranking: anon has no EXECUTE');
SELECT throws_ok($$ SELECT * FROM public.create_next_occurrences(now(), interval '1 day') $$,
  '42501', NULL, 'create_next_occurrences: anon has no EXECUTE');
SELECT throws_ok($$ SELECT util.get_table_metadata(ARRAY['public']) $$,
  '42501', NULL, 'table metadata: anon has no EXECUTE');

-- ===========================================================================
-- F. notifications.admin_notify_emit (7)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT throws_ok(
  format($$ SELECT notifications.admin_notify_emit(ARRAY[%L]::uuid[], 'sm.test', 't', 'b', '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL) $$, pg_temp.u('sm_user2')),
  '42501', 'forbidden', 'admin_notify_emit: regular user forbidden');
SELECT throws_ok(
  format($$ SELECT notifications.notify_emit(ARRAY[%L]::uuid[], 'sm.test', 't', 'b', '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL) $$, pg_temp.u('sm_user2')),
  '42501', NULL, 'notify_emit: not executable by authenticated');

SELECT tests.authenticate_as('sm_padmin');
SELECT throws_ok(
  format($$ SELECT notifications.admin_notify_emit(ARRAY[%L]::uuid[], 'sm.test', 't', 'b', '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL) $$, pg_temp.u('sm_user2')),
  '42501', 'forbidden', 'admin_notify_emit: requires admin.notify_users specifically');

SELECT tests.authenticate_as('sm_notifier');
SELECT is(
  notifications.admin_notify_emit(ARRAY[pg_temp.u('sm_user')], 'sm.test', 't', 'b', '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL),
  1, 'admin_notify_emit: admin.notify_users can notify');
SELECT is(
  notifications.admin_notify_emit(ARRAY[]::uuid[], 'sm.test', 't', 'b', '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL),
  0, 'admin_notify_emit: empty recipient list');

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM notifications.notifications WHERE "user" = pg_temp.u('sm_user') AND topic = 'sm.test'),
  1, 'admin_notify_emit: notification row created');

SELECT tests.clear_authentication();
SELECT throws_ok(
  format($$ SELECT notifications.admin_notify_emit(ARRAY[%L]::uuid[], 'sm.test', 't', 'b', '{}'::jsonb, NULL, NULL, 'normal', NULL, NULL) $$, pg_temp.u('sm_user2')),
  '42501', NULL, 'admin_notify_emit: anon has no EXECUTE');

-- ===========================================================================
-- G. key_handover (14)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ SELECT * FROM public.key_handover(-1, auth.uid()) $$,
  '23503', 'item -1 not found', 'key_handover: unknown item');
SELECT throws_ok($$ SELECT * FROM public.key_handover(990002, auth.uid()) $$,
  '23514', 'item 990002 has no group', 'key_handover: item without group');

SELECT tests.authenticate_as('sm_trial');
SELECT throws_ok($$ SELECT * FROM public.key_handover(990001, auth.uid()) $$,
  '42501', 'not in group for item 990001', 'key_handover: trial member is rejected');
SELECT tests.authenticate_as('sm_req');
SELECT throws_ok($$ SELECT * FROM public.key_handover(990001, auth.uid()) $$,
  '42501', 'not in group for item 990001', 'key_handover: joinRequested is rejected');
SELECT tests.authenticate_as('sm_out');
SELECT throws_ok($$ SELECT * FROM public.key_handover(990001, auth.uid()) $$,
  '42501', 'not in group for item 990001', 'key_handover: non-member (even with items.manage) is rejected');
SELECT tests.authenticate_as('sm_padmin');
SELECT throws_ok($$ SELECT * FROM public.key_handover(990001, auth.uid()) $$,
  '42501', 'not in group for item 990001', 'key_handover: platform admin without membership is rejected');

SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ SELECT * FROM public.key_handover(990001, '00000000-0000-0000-0000-00000000dead') $$,
  '23503', 'new holder 00000000-0000-0000-0000-00000000dead not found', 'key_handover: unknown new holder');
SELECT throws_ok(format($$ SELECT * FROM public.key_handover(990001, %L) $$, pg_temp.u('sm_trial')),
  '23503', format('new holder %s not in group', pg_temp.u('sm_trial')), 'key_handover: new holder must not be trial');
SELECT throws_ok(format($$ SELECT * FROM public.key_handover(990001, %L) $$, pg_temp.u('sm_req')),
  '23503', format('new holder %s not in group', pg_temp.u('sm_req')), 'key_handover: new holder must not be joinRequested');
SELECT throws_ok(format($$ SELECT * FROM public.key_handover(990001, %L) $$, pg_temp.u('sm_out')),
  '23503', format('new holder %s not in group', pg_temp.u('sm_out')), 'key_handover: new holder must be in the item group');

SELECT results_eq(
  format($$ SELECT * FROM public.key_handover(990001, %L) $$, pg_temp.u('sm_gadmin')),
  format($$ VALUES (990001::bigint, %L::uuid) $$, pg_temp.u('sm_gadmin')),
  'key_handover: full member can hand over to another full member');
SELECT is((SELECT current_holder FROM public.items WHERE id = 990001), pg_temp.u('sm_gadmin'),
  'key_handover: holder was updated');

SELECT tests.authenticate_as('sm_gadmin');
INSERT INTO _snap SELECT 'ih', count(*) FROM public.item_history WHERE key = 990001;
SELECT results_eq(
  format($$ SELECT * FROM public.key_handover(990001, %L) $$, pg_temp.u('sm_gadmin')),
  format($$ VALUES (990001::bigint, %L::uuid) $$, pg_temp.u('sm_gadmin')),
  'key_handover: handing over to the current holder is a no-op');
SELECT is((SELECT count(*) FROM public.item_history WHERE key = 990001), (SELECT v FROM _snap WHERE k = 'ih'),
  'key_handover: no-op does not write history');

-- ===========================================================================
-- H. increase_challenge_stats_count (19)
--    C1: max 2/day, 3/week. 2026-09-30 is a Wednesday.
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT set_config('request.jwt.claims', '{}', true);
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-09-30 12:00+00') $$,
  '28P01', 'unauthenticated', 'challenge points: unauthenticated rejected');

SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 0, '2026-09-30 12:00+00') $$,
  'P0001', 'amount must be > 0', 'challenge points: zero amount rejected');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', -5, '2026-09-30 12:00+00') $$,
  'P0001', 'amount must be > 0', 'challenge points: negative amount rejected');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count(gen_random_uuid(), 1, '2026-09-30 12:00+00') $$,
  'P0001', 'Could not select given challenge', 'challenge points: unknown challenge');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000002', 1, '2026-09-30 12:00+00') $$,
  'P0001', 'This challenge is automated. You can not add any points manually', 'challenge points: automated challenge rejected');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000003', 1, '2026-09-30 12:00+00') $$,
  '42501', 'forbidden: not a member of the challenge''s group', 'challenge points: challenge of another group rejected');

SELECT tests.authenticate_as('sm_trial');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-09-30 12:00+00') $$,
  '42501', 'forbidden: not a member of the challenge''s group', 'challenge points: trial rejected');
SELECT tests.authenticate_as('sm_req');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-09-30 12:00+00') $$,
  '42501', 'forbidden: not a member of the challenge''s group', 'challenge points: joinRequested rejected');
SELECT tests.authenticate_as('sm_out');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-09-30 12:00+00') $$,
  '42501', 'forbidden: not a member of the challenge''s group', 'challenge points: non-member (with challenge.manage) rejected');

SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 3, '2026-09-30 12:00+00') $$,
  'P0001', 'Maximum points per day already reached', 'challenge points: single entry above daily cap rejected');
SELECT is(
  (SELECT "user" FROM public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-09-30 12:00+00', NULL, 'sm-comment', 'sm-cat')),
  pg_temp.u('sm_user'), 'challenge points: entry is always written for the caller');
SELECT is(
  (SELECT count(*)::int FROM public.challenge_stats_meta m JOIN public.challenge_stats s ON s.id = m.challenge_stat
    WHERE s."user" = auth.uid() AND m.comment = 'sm-comment' AND m.category = 'sm-cat'),
  1, 'challenge points: meta row (comment/category) written');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 2, '2026-09-30 18:00+00') $$,
  'P0001', 'Maximum points per day already reached', 'challenge points: daily cap enforced across entries');
SELECT lives_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 2, '2026-10-01 12:00+00') $$,
  'challenge points: next day allowed up to the weekly cap');
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-10-02 12:00+00') $$,
  'P0001', 'Maximum points per week already reached', 'challenge points: weekly cap enforced');
SELECT lives_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-10-05 12:00+00') $$,
  'challenge points: new week resets the weekly cap');
SELECT is(
  (SELECT sum(count) FROM public.challenge_stats WHERE "user" = auth.uid() AND challenge = 'c1000000-0000-0000-0000-000000000001'),
  4::numeric, 'challenge points: only accepted entries were stored');

SELECT tests.authenticate_as('sm_user2');
SELECT lives_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 2, '2026-09-30 12:00+00') $$,
  'challenge points: caps are per user');

SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT public.increase_challenge_stats_count('c1000000-0000-0000-0000-000000000001', 1, '2026-09-30 12:00+00') $$,
  '42501', NULL, 'challenge points: anon has no EXECUTE');

SELECT * FROM finish();
ROLLBACK;
