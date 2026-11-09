-- Regression tests for 20261002072326_security_hardening.sql
-- Each block reproduces a previously working privilege escalation / data leak.
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(24);

-- ---------------------------------------------------------------------------
-- Fixtures (service_role)
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();

INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","group")
VALUES ('sec-evt','Sec','D','None', now() + interval '1 day', now() + interval '1 day 3 hours',
        '00000000-0000-0000-0000-000000000042');

INSERT INTO public.permissions(name) VALUES ('event.signup') ON CONFLICT DO NOTHING;
INSERT INTO public.group_permissions("group","permission")
VALUES ('00000000-0000-0000-0000-000000000042', 'event.signup') ON CONFLICT DO NOTHING;

-- seed data may insert explicit ids without advancing the identity sequence
SELECT setval(pg_get_serial_sequence('public.history', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.history), false);
SELECT setval(pg_get_serial_sequence('public.payments', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.payments), false);

INSERT INTO public.group_user_mapping("user","group","role")
VALUES (tests.get_supabase_uid('user_1c'), '00000000-0000-0000-0000-000000000042', 'joinRequested');

INSERT INTO public.drink(id, name, price, active, deleted, type)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'Sec Drink', 2.5, true, false, 'Drink');

-- ---------------------------------------------------------------------------
-- Groups: creation, cross-group admin, self-promotion, grant escalation
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as('user_1b');
SELECT throws_like(
  $$ INSERT INTO public.event_group(name) VALUES ('evil') $$,
  '%row-level security%',
  'regular users cannot create groups'
);

SELECT throws_like(
  format($$ INSERT INTO public.group_user_mapping("user","group","role") VALUES (%L, '00000000-0000-0000-0000-000000000042', 'admin') $$,
         tests.get_supabase_uid('user_1b')),
  '%row-level security%',
  'users cannot add themselves as group admin'
);

SELECT tests.authenticate_as('user_1a');
WITH u AS (UPDATE public.event_group SET name = 'PWNED' WHERE id = '00000000-0000-0000-0000-000000000044' RETURNING 1)
SELECT is(count(*)::int, 0, 'group admin cannot update a group they do not administer') FROM u;

WITH u AS (UPDATE public.event_group SET description = 'ok' WHERE id = '00000000-0000-0000-0000-000000000042' RETURNING 1)
SELECT is(count(*)::int, 1, 'group admin can still update their own group') FROM u;

SELECT throws_ok(
  $$ SELECT public.grant_group_grants('00000000-0000-0000-0000-000000000042', ARRAY['supabase.admin']) $$,
  '42501', NULL,
  'group admins cannot grant permissions to their group'
);

SELECT throws_like(
  format($$ INSERT INTO public.user_direct_grants("user", tenant, kind, key)
            VALUES (%L, '00000000-0000-0000-0000-000000000000', 'perm', 'supabase.admin') $$,
         tests.get_supabase_uid('user_1a')),
  '%row-level security%',
  'users cannot grant themselves direct permissions'
);

-- ---------------------------------------------------------------------------
-- Membership roles: joinRequested sees nothing, trial only sees + signs up
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as('user_1c');
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE "key" = 'sec-evt'),
  0,
  'pending join request does not reveal group events'
);
SELECT is(
  (SELECT count(*)::int FROM public.user_grants_view WHERE "user" = tests.get_supabase_uid('user_1c')),
  0,
  'pending join request grants no permissions/features'
);

SELECT tests.authenticate_as_service_role();
UPDATE public.group_user_mapping SET role = 'trial'
WHERE "user" = tests.get_supabase_uid('user_1c') AND "group" = '00000000-0000-0000-0000-000000000042';

SELECT tests.authenticate_as('user_1c');
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE "key" = 'sec-evt'),
  1,
  'trial member sees group events'
);
SELECT is(
  (SELECT coalesce(array_agg(key ORDER BY key), '{}') FROM public.user_grants_view
    WHERE "user" = tests.get_supabase_uid('user_1c') AND kind = 'perm'),
  ARRAY['event.signup']::text[],
  'trial member only gets event.signup (not the group''s event.edit)'
);

-- ---------------------------------------------------------------------------
-- Protected columns
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as('user_1b');
SELECT throws_like(
  $$ UPDATE public."user" SET role = 'admin' WHERE id = auth.uid() $$,
  '%protected user columns%',
  'users cannot change their own role'
);

SELECT lives_ok(
  $$ UPDATE public."user" SET "displayName" = 'Sec' WHERE id = auth.uid() $$,
  'users can still edit their own profile'
);

SELECT throws_like(
  $$ UPDATE games.players SET ka_index = 3000 WHERE coalesce(linked_user_id, player) = auth.uid() $$,
  '%permission denied%',
  'users cannot change their own ELO rating'
);

WITH u AS (UPDATE games.players SET hide_rating = true WHERE coalesce(linked_user_id, player) = auth.uid() RETURNING 1)
SELECT is(count(*)::int, 1, 'users can toggle hide_rating on their own player') FROM u;

WITH u AS (UPDATE games.players SET hide_rating = true WHERE coalesce(linked_user_id, player) <> auth.uid() RETURNING 1)
SELECT is(count(*)::int, 0, 'users cannot update other players') FROM u;

-- ---------------------------------------------------------------------------
-- Drinks: price is taken from the drink, not from the client
-- ---------------------------------------------------------------------------
SELECT lives_ok(
  $$ SELECT public.add_drinks_history('[{"id":"dddddddd-0000-0000-0000-000000000001","count":2,"price":0}]'::json) $$,
  'add_drinks_history works for regular users'
);
SELECT is(
  (SELECT sum(amount) FROM public.history
    WHERE "user" = tests.get_supabase_uid('user_1b') AND drink = 'dddddddd-0000-0000-0000-000000000001'),
  5.00::numeric,
  'history amount is computed from the drink price (client price ignored)'
);

SELECT throws_like(
  $$ INSERT INTO public.payments("user","amountToPay","paymentState") VALUES (auth.uid(), 0, 'Fulfilled') $$,
  '%row-level security%',
  'users cannot create already fulfilled payments'
);

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  $$ SELECT * FROM public.admin_analytics_drinks_ranking(now() - interval '1 year', now()) $$,
  '42501', NULL,
  'analytics require admin.analytics.view'
);
SELECT throws_ok(
  $$ SELECT * FROM public.create_next_occurrences(now(), interval '1 day') $$,
  '42501', NULL,
  'create_next_occurrences requires event.create/event.edit'
);
SELECT throws_ok(
  $$ SELECT util.get_table_metadata(ARRAY['public']) $$,
  '42501', NULL,
  'table metadata requires supabase.admin'
);

-- ---------------------------------------------------------------------------
-- Guard: SECURITY DEFINER functions are closed by default.
-- New definer functions get EXECUTE for PUBLIC automatically; this fails until
-- they are explicitly revoked or added to the allow-list below.
-- ---------------------------------------------------------------------------
SELECT tests.authenticate_as_service_role();
RESET ROLE;

SELECT is(
  (SELECT coalesce(array_agg(n.nspname || '.' || p.proname ORDER BY 1), '{}')
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public','games','notifications','util','audit','private')
      AND p.prokind = 'f' AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  '{}'::text[],
  'no SECURITY DEFINER function is executable by anon'
);

SELECT set_eq(
  $$ SELECT n.nspname || '.' || p.proname
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public','games','notifications','util','audit','private')
        AND p.prokind = 'f' AND p.prosecdef
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE') $$,
  ARRAY[
    'public.is_user_in_group',
    'public.is_user_admin_in_group',
    'public.is_full_member_of_group',
    'public.is_member_of_event',
    'public.is_full_member_of_event',
    'public.group_has_no_members',
    'games.is_match_public_or_match_member',
    'public.grant_group_grants',
    'public.revoke_group_grants',
    'public.grant_user_grants',
    'public.revoke_user_grants',
    'public.key_handover',
    'public.edit_item',
    'public.admin_expire_trials',
    'public.admin_user_effective_grants',
    'public._sum_challenge_points_for_self',
    'public.increase_challenge_stats_count',
    'public.admin_analytics_attendance_ranking',
    'public.admin_analytics_drinks_ranking',
    'public.admin_challenge_zero_points_candidates',
    'public.create_next_occurrences',
    'public.series_for_expansion',
    'public.expand_series',
    'games.add_match_with_sets',
    'games.merge_guest_player',
    'notifications.upsert_webpush_subscription',
    'notifications.admin_notify_emit',
    'util.get_table_metadata'
  ],
  'only allow-listed SECURITY DEFINER functions are executable by authenticated'
);

SELECT is(
  (SELECT has_table_privilege('authenticated', 'games.players', 'UPDATE')
       OR has_table_privilege('anon', 'games.players', 'INSERT')),
  false,
  'games.players has no table-wide write grants for API roles'
);

SELECT * FROM finish();
ROLLBACK;
