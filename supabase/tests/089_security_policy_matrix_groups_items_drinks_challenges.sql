-- Security hardening (20261002072326_security_hardening.sql):
-- RLS policy matrix for event_group, items, item_history, history (drinks),
-- payments (insert), challenge, challenge_stats, challenge_stats_meta and
-- group_user_mapping.
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(145);

-- ---------------------------------------------------------------------------
-- Fixtures (postgres, no JWT)
--   G  a1..01 public/joinable   members: gadmin(admin) user user2 trial req
--   H  a1..02 public/joinable   members: out(user)
--   J  a1..05 public/joinable   no members
--   P  a1..06 needs a request   no members
--   Q  a1..07 empty             Q2 a1..0c empty
--   I  a1..08 invisible root    members: user
--   S  a1..09 public subgroup of G   members: user
--   S2 a1..0a private subgroup of G  members: user2
--   Z  a1..0b                   members: gadmin(admin)
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@sec-test.local')
FROM unnest(ARRAY['sm_gadmin','sm_user','sm_user2','sm_trial','sm_req','sm_out','sm_padmin','sm_grpmgr',
                  'sm_cashier','sm_drinkadm','sm_new','sm_new2']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;
CREATE FUNCTION pg_temp.rows(q text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int; BEGIN EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT; RETURN n; END $$;

-- seed data may insert explicit ids without advancing the identity sequences
SELECT setval(pg_get_serial_sequence('public.history', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.history), false);
SELECT setval(pg_get_serial_sequence('public.payments', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.payments), false);
SELECT setval(pg_get_serial_sequence('public.items', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.items), false);
SELECT setval(pg_get_serial_sequence('public.item_history', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.item_history), false);
SELECT setval(pg_get_serial_sequence('public.challenge_stats', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.challenge_stats), false);

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join, parent_group) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'SM G',  true,  true,  false, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'SM H',  true,  true,  false, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'SM J',  true,  true,  false, NULL),
  ('a1000000-0000-0000-0000-000000000006', 'SM P',  true,  false, true,  NULL),
  ('a1000000-0000-0000-0000-000000000007', 'SM Q',  true,  true,  false, NULL),
  ('a1000000-0000-0000-0000-00000000000c', 'SM Q2', true,  true,  false, NULL),
  ('a1000000-0000-0000-0000-000000000008', 'SM I',  false, false, false, NULL),
  ('a1000000-0000-0000-0000-000000000009', 'SM S',  true,  true,  false, 'a1000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-00000000000a', 'SM S2', true,  false, false, 'a1000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-00000000000b', 'SM Z',  true,  true,  false, NULL);

INSERT INTO public.permissions(name)
SELECT unnest(ARRAY['items.manage','challenge.manage','supabase.admin','groups.manage.admin',
                    'drinks.confirm.payments','drinks.history.admin'])
ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group",role)
SELECT pg_temp.u(x.u), x.g::uuid, x.r::public."GroupRole" FROM (VALUES
  ('sm_gadmin', 'a1000000-0000-0000-0000-000000000001', 'admin'),
  ('sm_user',   'a1000000-0000-0000-0000-000000000001', 'user'),
  ('sm_user2',  'a1000000-0000-0000-0000-000000000001', 'user'),
  ('sm_trial',  'a1000000-0000-0000-0000-000000000001', 'trial'),
  ('sm_req',    'a1000000-0000-0000-0000-000000000001', 'joinRequested'),
  ('sm_out',    'a1000000-0000-0000-0000-000000000002', 'user'),
  ('sm_user',   'a1000000-0000-0000-0000-000000000008', 'user'),
  ('sm_user',   'a1000000-0000-0000-0000-000000000009', 'user'),
  ('sm_user2',  'a1000000-0000-0000-0000-00000000000a', 'user'),
  ('sm_gadmin', 'a1000000-0000-0000-0000-00000000000b', 'admin')
) x(u, g, r);

INSERT INTO public.user_direct_grants("user", kind, key)
SELECT pg_temp.u(x.u), 'perm', x.k FROM (VALUES
  ('sm_gadmin', 'items.manage'), ('sm_gadmin', 'challenge.manage'),
  ('sm_out', 'items.manage'), ('sm_out', 'challenge.manage'),
  ('sm_padmin', 'supabase.admin'),
  ('sm_grpmgr', 'groups.manage.admin'),
  ('sm_cashier', 'drinks.confirm.payments'),
  ('sm_drinkadm', 'drinks.history.admin')
) x(u, k);

INSERT INTO public.items(id, name, type, current_holder, "group") VALUES
  (990001, 'SM Key G',    'mtvGym', pg_temp.u('sm_user'), 'a1000000-0000-0000-0000-000000000001'),
  (990002, 'SM Key none', 'mtvGym', pg_temp.u('sm_user'), NULL),
  (990003, 'SM Key H',    'mtvGym', pg_temp.u('sm_out'),  'a1000000-0000-0000-0000-000000000002');
INSERT INTO public.item_history(id, key, "current_user", past_user) VALUES
  (990301, 990001, pg_temp.u('sm_user'), NULL),
  (990303, 990003, pg_temp.u('sm_out'),  NULL);

INSERT INTO public.drink(id, name, price, active, deleted, type)
VALUES ('dd000000-0000-0000-0000-000000000001', 'SM Drink 1', 2.5, true, false, 'Drink');
INSERT INTO public.payments(id, "user", "amountToPay", "paymentState") VALUES
  (990101, pg_temp.u('sm_user'),  0, 'Open'),
  (990103, pg_temp.u('sm_user'),  0, 'Fulfilled'),
  (990104, pg_temp.u('sm_user2'), 0, 'Open');
INSERT INTO public.vouchers(id, "user", total_drinks) VALUES
  ('ee000000-0000-0000-0000-000000000001', pg_temp.u('sm_user'),  10),
  ('ee000000-0000-0000-0000-000000000002', pg_temp.u('sm_user2'), 10);
INSERT INTO public.history(id, "user", drink, count, amount, payment) VALUES
  (990201, pg_temp.u('sm_user'),  'dd000000-0000-0000-0000-000000000001', 1, 2.5, 990101),
  (990202, pg_temp.u('sm_user'),  'dd000000-0000-0000-0000-000000000001', 1, 2.5, 990103),
  (990203, pg_temp.u('sm_user2'), 'dd000000-0000-0000-0000-000000000001', 1, 2.5, 990104);

INSERT INTO public.challenge(id, name, "group", max_points_per_day, max_points_per_week) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'SM C1',  'a1000000-0000-0000-0000-000000000001', 5, 10),
  ('c1000000-0000-0000-0000-000000000004', 'SM Cdel','a1000000-0000-0000-0000-000000000001', 5, 10),
  ('c1000000-0000-0000-0000-000000000003', 'SM CH',  'a1000000-0000-0000-0000-000000000002', 5, 10);
INSERT INTO public.challenge_stats(id, "user", challenge, count) VALUES
  (990401, pg_temp.u('sm_user2'), 'c1000000-0000-0000-0000-000000000001', 1),
  (990402, pg_temp.u('sm_user'),  'c1000000-0000-0000-0000-000000000001', 1),
  (990403, pg_temp.u('sm_out'),   'c1000000-0000-0000-0000-000000000003', 1),
  (990404, pg_temp.u('sm_user2'), 'c1000000-0000-0000-0000-000000000001', 1),
  (990405, pg_temp.u('sm_user2'), 'c1000000-0000-0000-0000-000000000001', 1);
INSERT INTO public.challenge_stats_meta(challenge_stat, comment) VALUES
  (990404, 'meta G'), (990403, 'meta H');

-- ===========================================================================
-- event_group (23)
-- ===========================================================================
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000001'), 1, 'groups select: visible root group is listed for everyone');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000008'), 0, 'groups select: invisible root group hidden from non-members');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000009'), 0, 'groups select: public subgroup hidden from non-members of the parent');
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000008'), 1, 'groups select: member sees invisible group');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000009'), 1, 'groups select: parent member sees public subgroup');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-00000000000a'), 0, 'groups select: parent member does not see private subgroup');
SELECT tests.authenticate_as('sm_user2');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-00000000000a'), 1, 'groups select: subgroup member sees private subgroup');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000009'), 0, 'groups select: trial of parent does not see public subgroup');
SELECT tests.authenticate_as('sm_padmin');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000008'), 1, 'groups select: supabase.admin sees all groups');
SELECT tests.authenticate_as('sm_grpmgr');
SELECT is((SELECT count(*)::int FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000008'), 1, 'groups select: groups.manage.admin sees all groups');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.event_group $$, '42501', NULL, 'groups select: anon has no table privilege');

SELECT tests.authenticate_as('sm_padmin');
SELECT lives_ok($$ INSERT INTO public.event_group(name) VALUES ('sm by padmin') $$, 'groups insert: supabase.admin');
SELECT tests.authenticate_as('sm_grpmgr');
SELECT lives_ok($$ INSERT INTO public.event_group(name) VALUES ('sm by grpmgr') $$, 'groups insert: groups.manage.admin');
SELECT tests.authenticate_as('sm_gadmin');
SELECT throws_like($$ INSERT INTO public.event_group(name) VALUES ('sm by gadmin') $$, '%row-level security%', 'groups insert: group admin rejected');

SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ UPDATE public.event_group SET description = 'x' WHERE id = 'a1000000-0000-0000-0000-000000000001' $$), 0, 'groups update: member rejected');
SELECT tests.authenticate_as('sm_trial');
SELECT is(pg_temp.rows($$ UPDATE public.event_group SET description = 'x' WHERE id = 'a1000000-0000-0000-0000-000000000001' $$), 0, 'groups update: trial rejected');
SELECT tests.authenticate_as('sm_grpmgr');
SELECT is(pg_temp.rows($$ UPDATE public.event_group SET description = 'x' WHERE id = 'a1000000-0000-0000-0000-000000000002' $$), 0, 'groups update: groups.manage.admin cannot update');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-00000000000c' $$), 0, 'groups delete: groups.manage.admin cannot delete');
SELECT tests.authenticate_as('sm_padmin');
SELECT is(pg_temp.rows($$ UPDATE public.event_group SET description = 'x' WHERE id = 'a1000000-0000-0000-0000-000000000002' $$), 1, 'groups update: supabase.admin');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-00000000000c' $$), 1, 'groups delete: supabase.admin');
SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-00000000000b' $$), 0, 'groups delete: non-admin rejected');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-000000000002' $$), 0, 'groups delete: group admin cannot delete other groups');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_group WHERE id = 'a1000000-0000-0000-0000-00000000000b' $$), 1, 'groups delete: group admin deletes own group');

-- ===========================================================================
-- items + item_history (23)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.items WHERE id IN (990001, 990002, 990003)), ARRAY[990001, 990002]::bigint[], 'items select: member sees group + group-less items');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.item_history WHERE id IN (990301, 990303)), ARRAY[990301]::bigint[], 'item_history select: member sees history of group items');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.items WHERE id IN (990001, 990002, 990003)), ARRAY[990002]::bigint[], 'items select: trial only sees group-less items');
SELECT is((SELECT count(*)::int FROM public.item_history WHERE id IN (990301, 990303)), 0, 'item_history select: trial sees nothing');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.items WHERE id IN (990001, 990002, 990003)), ARRAY[990002]::bigint[], 'items select: joinRequested only sees group-less items');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.items WHERE id IN (990001, 990002, 990003)), ARRAY[990002, 990003]::bigint[], 'items select: other group member sees own group items');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.item_history WHERE id IN (990301, 990303)), ARRAY[990303]::bigint[], 'item_history select: other group member sees own group history');

SELECT throws_like($$ INSERT INTO public.items(name, type, "group") VALUES ('x', 'mtvGym', 'a1000000-0000-0000-0000-000000000001') $$, '%row-level security%', 'items insert: items.manage of another group rejected');
SELECT lives_ok($$ INSERT INTO public.items(name, type, "group") VALUES ('x', 'mtvGym', 'a1000000-0000-0000-0000-000000000002') $$, 'items insert: items.manage in own group');
SELECT is(pg_temp.rows($$ UPDATE public.items SET name = 'x' WHERE id = 990001 $$), 0, 'items update: items.manage of another group rejected');
SELECT throws_like($$ INSERT INTO public.item_history(key, "current_user") VALUES (990001, auth.uid()) $$, '%row-level security%', 'item_history insert: items.manage of another group rejected');

SELECT tests.authenticate_as('sm_user');
SELECT throws_like($$ INSERT INTO public.items(name, type, "group") VALUES ('x', 'mtvGym', 'a1000000-0000-0000-0000-000000000001') $$, '%row-level security%', 'items insert: member without items.manage rejected');
SELECT is(pg_temp.rows($$ UPDATE public.items SET name = 'x', current_holder = auth.uid() WHERE id = 990001 $$), 0, 'items update: member without items.manage rejected');
SELECT throws_like($$ INSERT INTO public.item_history(key, "current_user") VALUES (990001, auth.uid()) $$, '%row-level security%', 'item_history insert: member without items.manage rejected');

SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok($$ INSERT INTO public.items(name, type, "group") VALUES ('x', 'mtvGym', 'a1000000-0000-0000-0000-000000000001') $$, 'items insert: items.manage in own group');
SELECT lives_ok($$ INSERT INTO public.items(name, type, "group") VALUES ('x', 'mtvGym', NULL) $$, 'items insert: items.manage without group');
SELECT lives_ok($$ INSERT INTO public.item_history(key, "current_user") VALUES (990001, auth.uid()) $$, 'item_history insert: items.manage in own group');
SELECT is(pg_temp.rows($$ UPDATE public.items SET name = 'renamed' WHERE id = 990001 $$), 1, 'items update: items.manage in own group');
SELECT throws_like($$ UPDATE public.items SET "group" = 'a1000000-0000-0000-0000-000000000002' WHERE id = 990001 $$, '%row-level security%', 'items update: cannot move item to a foreign group');
SELECT is(pg_temp.rows($$ DELETE FROM public.items WHERE id = 990001 $$), 0, 'items delete: no delete policy');
SELECT throws_ok($$ UPDATE public.item_history SET past_user = NULL WHERE id = 990301 $$, '42501', NULL, 'item_history update: no privilege');
SELECT throws_ok($$ DELETE FROM public.item_history WHERE id = 990301 $$, '42501', NULL, 'item_history delete: no privilege');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.items $$, '42501', NULL, 'items select: anon has no access');

-- ===========================================================================
-- history (drinks) + payments insert (22)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.history WHERE id IN (990201, 990202, 990203)), ARRAY[990201, 990202]::bigint[], 'history select: own rows only');
SELECT tests.authenticate_as('sm_cashier');
SELECT is((SELECT count(*)::int FROM public.history WHERE id IN (990201, 990202, 990203)), 3, 'history select: drinks.confirm.payments sees all');
SELECT tests.authenticate_as('sm_drinkadm');
SELECT is((SELECT count(*)::int FROM public.history WHERE id IN (990201, 990202, 990203)), 3, 'history select: drinks.history.admin sees all');

SELECT tests.authenticate_as('sm_user');
SELECT lives_ok($$ INSERT INTO public.history("user", drink, count, payment) VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000001', 1, 990101) $$,
  'history insert: own open payment');
SELECT lives_ok($$ INSERT INTO public.history("user", drink, count, payment, voucher) VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000001', 1, 990101, 'ee000000-0000-0000-0000-000000000001') $$,
  'history insert: with own voucher');
SELECT throws_like($$ INSERT INTO public.history("user", drink, count, payment, voucher) VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000001', 1, 990101, 'ee000000-0000-0000-0000-000000000002') $$,
  '%row-level security%', 'history insert: with someone else''s voucher rejected');
SELECT throws_like($$ INSERT INTO public.history("user", drink, count, payment) VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000001', 1, 990104) $$,
  '%row-level security%', 'history insert: on someone else''s payment rejected');
SELECT throws_like(format($$ INSERT INTO public.history("user", drink, count, payment) VALUES (%L, 'dd000000-0000-0000-0000-000000000001', 1, 990104) $$, pg_temp.u('sm_user2')),
  '%row-level security%', 'history insert: for another user rejected');
SELECT is(pg_temp.rows($$ UPDATE public.history SET count = 2 WHERE id = 990201 $$), 1, 'history update: own row on open payment');
SELECT is(pg_temp.rows($$ UPDATE public.history SET count = 2 WHERE id = 990202 $$), 0, 'history update: own row on fulfilled payment rejected');
SELECT is(pg_temp.rows($$ UPDATE public.history SET count = 2 WHERE id = 990203 $$), 0, 'history update: someone else''s row rejected');
SELECT is(pg_temp.rows($$ DELETE FROM public.history WHERE id = 990201 $$), 0, 'history delete: user cannot delete');

SELECT tests.authenticate_as('sm_cashier');
SELECT throws_like(format($$ INSERT INTO public.history("user", drink, count, payment) VALUES (%L, 'dd000000-0000-0000-0000-000000000001', 1, 990101) $$, pg_temp.u('sm_user')),
  '%row-level security%', 'history insert: drinks.confirm.payments cannot insert for others');
SELECT tests.authenticate_as('sm_drinkadm');
SELECT is(pg_temp.rows($$ UPDATE public.history SET count = 2 WHERE id = 990203 $$), 0, 'history update: drinks.history.admin is read-only');
SELECT is(pg_temp.rows($$ DELETE FROM public.history WHERE id = 990203 $$), 0, 'history delete: drinks.history.admin is read-only');
SELECT tests.authenticate_as('sm_cashier');
SELECT is(pg_temp.rows($$ UPDATE public.history SET count = 2 WHERE id = 990203 $$), 1, 'history update: drinks.confirm.payments');
SELECT is(pg_temp.rows($$ DELETE FROM public.history WHERE id = 990203 $$), 1, 'history delete: drinks.confirm.payments');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.history $$, '42501', NULL, 'history select: anon has no access');

SELECT tests.authenticate_as('sm_user');
SELECT lives_ok($$ INSERT INTO public.payments("user", "amountToPay", "paymentState") VALUES (auth.uid(), 0, 'Open') $$, 'payments insert: own empty open payment');
SELECT throws_like($$ INSERT INTO public.payments("user", "amountToPay", "paymentState") VALUES (auth.uid(), 10, 'Open') $$,
  '%row-level security%', 'payments insert: cannot preset amountToPay');
SELECT throws_like(format($$ INSERT INTO public.payments("user", "amountToPay", "paymentState") VALUES (%L, 0, 'Open') $$, pg_temp.u('sm_user2')),
  '%row-level security%', 'payments insert: not for other users');
SELECT tests.authenticate_as('sm_cashier');
SELECT throws_like(format($$ INSERT INTO public.payments("user", "amountToPay", "paymentState") VALUES (%L, 0, 'Open') $$, pg_temp.u('sm_user2')),
  '%row-level security%', 'payments insert: drinks.confirm.payments cannot open payments for others');

-- ===========================================================================
-- challenge (16)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.challenge WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 2, 'challenge select: member');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is((SELECT count(*)::int FROM public.challenge WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 2, 'challenge select: group admin');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.challenge WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 0, 'challenge select: trial sees nothing');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.challenge WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 0, 'challenge select: joinRequested sees nothing');
SELECT tests.authenticate_as('sm_padmin');
SELECT is((SELECT count(*)::int FROM public.challenge WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 0, 'challenge select: platform admin without membership sees nothing');
SELECT throws_like($$ INSERT INTO public.challenge(name, "group") VALUES ('x', 'a1000000-0000-0000-0000-000000000001') $$, '%row-level security%', 'challenge insert: platform admin without membership rejected');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT array_agg(id) FROM public.challenge WHERE id IN ('c1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003')),
  ARRAY['c1000000-0000-0000-0000-000000000003']::uuid[], 'challenge select: member of another group only sees own');
SELECT throws_like($$ INSERT INTO public.challenge(name, "group") VALUES ('x', 'a1000000-0000-0000-0000-000000000001') $$, '%row-level security%', 'challenge insert: challenge.manage of another group rejected');
SELECT is(pg_temp.rows($$ UPDATE public.challenge SET name = 'x' WHERE id = 'c1000000-0000-0000-0000-000000000001' $$), 0, 'challenge update: challenge.manage of another group rejected');

SELECT tests.authenticate_as('sm_user');
SELECT throws_like($$ INSERT INTO public.challenge(name, "group") VALUES ('x', 'a1000000-0000-0000-0000-000000000001') $$, '%row-level security%', 'challenge insert: member rejected');
SELECT is(pg_temp.rows($$ UPDATE public.challenge SET name = 'x' WHERE id = 'c1000000-0000-0000-0000-000000000001' $$), 0, 'challenge update: member rejected');
SELECT is(pg_temp.rows($$ DELETE FROM public.challenge WHERE id = 'c1000000-0000-0000-0000-000000000004' $$), 0, 'challenge delete: member rejected');
SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok($$ INSERT INTO public.challenge(name, "group") VALUES ('x', 'a1000000-0000-0000-0000-000000000001') $$, 'challenge insert: group admin');
SELECT is(pg_temp.rows($$ UPDATE public.challenge SET name = 'x' WHERE id = 'c1000000-0000-0000-0000-000000000001' $$), 1, 'challenge update: group admin');
SELECT is(pg_temp.rows($$ DELETE FROM public.challenge WHERE id = 'c1000000-0000-0000-0000-000000000004' $$), 1, 'challenge delete: group admin');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.challenge $$, '42501', NULL, 'challenge select: anon has no access');

-- ===========================================================================
-- challenge_stats (16) + challenge_stats_meta (9)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.challenge_stats WHERE id IN (990401, 990402, 990403)), ARRAY[990401, 990402]::bigint[], 'stats select: member sees group stats only');
SELECT throws_like($$ INSERT INTO public.challenge_stats("user", challenge, count) VALUES (auth.uid(), 'c1000000-0000-0000-0000-000000000001', 100) $$,
  '%row-level security%', 'stats insert: member cannot bypass increase_challenge_stats_count');
SELECT is(pg_temp.rows($$ UPDATE public.challenge_stats SET count = 100 WHERE id = 990402 $$), 0, 'stats update: member cannot update own stats');
SELECT is(pg_temp.rows($$ DELETE FROM public.challenge_stats WHERE id = 990401 $$), 0, 'stats delete: member cannot delete others'' stats');
SELECT is(pg_temp.rows($$ DELETE FROM public.challenge_stats WHERE id = 990402 $$), 1, 'stats delete: member deletes own stats');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.challenge_stats WHERE id IN (990401, 990402, 990403)), 0, 'stats select: trial sees nothing');
SELECT throws_like($$ INSERT INTO public.challenge_stats("user", challenge, count) VALUES (auth.uid(), 'c1000000-0000-0000-0000-000000000001', 1) $$,
  '%row-level security%', 'stats insert: trial rejected');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.challenge_stats WHERE id IN (990401, 990402, 990403)), 0, 'stats select: joinRequested sees nothing');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT array_agg(id ORDER BY id) FROM public.challenge_stats WHERE id IN (990401, 990403)), ARRAY[990401, 990403]::bigint[],
  'stats select: challenge.manage sees stats of all groups');
-- challenge_stats_insert_manager only checks the permission, not group membership (by design)
SELECT lives_ok(format($$ INSERT INTO public.challenge_stats("user", challenge, count) VALUES (%L, 'c1000000-0000-0000-0000-000000000001', 1) $$, pg_temp.u('sm_user')),
  'stats insert: challenge.manage may insert (any group)');
SELECT is(pg_temp.rows($$ UPDATE public.challenge_stats SET count = 5 WHERE id = 990401 $$), 0, 'stats update: challenge.manage of another group rejected');
SELECT is(pg_temp.rows($$ DELETE FROM public.challenge_stats WHERE id = 990401 $$), 0, 'stats delete: challenge.manage of another group rejected');
SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok(format($$ INSERT INTO public.challenge_stats("user", challenge, count) VALUES (%L, 'c1000000-0000-0000-0000-000000000001', 1) $$, pg_temp.u('sm_user')),
  'stats insert: challenge.manage in own group');
SELECT is(pg_temp.rows($$ UPDATE public.challenge_stats SET count = 5 WHERE id = 990401 $$), 1, 'stats update: challenge.manage in own group');
SELECT is(pg_temp.rows($$ DELETE FROM public.challenge_stats WHERE id = 990401 $$), 1, 'stats delete: challenge.manage in own group');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.challenge_stats $$, '42501', NULL, 'stats select: anon has no access');

SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.challenge_stats_meta WHERE challenge_stat IN (990403, 990404)), 1, 'meta select: member sees group meta only');
SELECT throws_like($$ INSERT INTO public.challenge_stats_meta(challenge_stat, comment) VALUES (990405, 'x') $$, '%row-level security%', 'meta insert: member rejected');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.challenge_stats_meta WHERE challenge_stat IN (990403, 990404)), 0, 'meta select: trial sees nothing');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.challenge_stats_meta WHERE challenge_stat IN (990403, 990404)), 2, 'meta select: challenge.manage sees all');
SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok($$ INSERT INTO public.challenge_stats_meta(challenge_stat, comment) VALUES (990405, 'by manager') $$, 'meta insert: challenge.manage');
SELECT is(pg_temp.rows($$ UPDATE public.challenge_stats_meta SET comment = 'x' WHERE challenge_stat = 990404 $$), 0, 'meta update: no update policy');
SELECT is(pg_temp.rows($$ DELETE FROM public.challenge_stats_meta WHERE challenge_stat = 990404 $$), 0, 'meta delete: no delete policy');
SELECT tests.clear_authentication();
SELECT is((SELECT count(*)::int FROM public.challenge_stats_meta), 0, 'meta select: anon sees nothing');
SELECT throws_like($$ INSERT INTO public.challenge_stats_meta(challenge_stat, comment) VALUES (990405, 'anon') $$, '%row-level security%', 'meta insert: anon rejected');

-- ===========================================================================
-- group_user_mapping (36)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.group_user_mapping WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 5, 'gum select: member sees all mappings of the group');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.group_user_mapping WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 5, 'gum select: trial sees all mappings of the group');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT array_agg("user") FROM public.group_user_mapping WHERE "group" = 'a1000000-0000-0000-0000-000000000001'),
  ARRAY[pg_temp.u('sm_req')], 'gum select: joinRequested only sees own request');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.group_user_mapping WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 0, 'gum select: non-member sees nothing');
SELECT tests.authenticate_as('sm_padmin');
SELECT is((SELECT count(*)::int FROM public.group_user_mapping WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 5, 'gum select: supabase.admin sees everything');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.group_user_mapping $$, '42501', NULL, 'gum select: anon has no access');

SELECT tests.authenticate_as('sm_new');
SELECT lives_ok($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (auth.uid(), 'a1000000-0000-0000-0000-000000000005', 'user') $$,
  'gum insert: self-join public open group as user');
SELECT throws_like($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (auth.uid(), 'a1000000-0000-0000-0000-000000000006', 'user') $$,
  '%row-level security%', 'gum insert: self-join as user rejected when a request is needed');
SELECT lives_ok($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (auth.uid(), 'a1000000-0000-0000-0000-000000000006', 'joinRequested') $$,
  'gum insert: join request');
SELECT throws_like($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (auth.uid(), 'a1000000-0000-0000-0000-000000000002', 'trial') $$,
  '%row-level security%', 'gum insert: self-join as trial rejected');
SELECT throws_like($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (auth.uid(), 'a1000000-0000-0000-0000-000000000007', 'admin') $$,
  '%row-level security%', 'gum insert: self-join as admin of an empty group rejected');
SELECT throws_like(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000005', 'user') $$, pg_temp.u('sm_new2')),
  '%row-level security%', 'gum insert: plain member cannot add others');
SELECT throws_like(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000002', 'joinRequested') $$, pg_temp.u('sm_new2')),
  '%row-level security%', 'gum insert: cannot file join requests for others');

SELECT tests.authenticate_as('sm_user');
SELECT throws_like(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000001', 'user') $$, pg_temp.u('sm_new2')),
  '%row-level security%', 'gum insert: member cannot add users');

SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000001', 'user') $$, pg_temp.u('sm_new2')),
  'gum insert: group admin adds user');
SELECT throws_like(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000001', 'trial') $$, pg_temp.u('sm_new')),
  '%row-level security%', 'gum insert: group admin cannot insert trial (only user/admin)');
SELECT lives_ok(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000001', 'admin') $$, pg_temp.u('sm_new')),
  'gum insert: group admin adds admin');
SELECT throws_like(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000002', 'user') $$, pg_temp.u('sm_new')),
  '%row-level security%', 'gum insert: group admin cannot add users to other groups');

SELECT tests.authenticate_as('sm_grpmgr');
SELECT lives_ok($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (auth.uid(), 'a1000000-0000-0000-0000-000000000007', 'admin') $$,
  'gum insert: groups.manage.admin sets first admin of an empty group');
SELECT throws_like(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000002', 'admin') $$, pg_temp.u('sm_new2')),
  '%row-level security%', 'gum insert: groups.manage.admin cannot add admins to groups with members');
SELECT tests.authenticate_as('sm_padmin');
SELECT lives_ok(format($$ INSERT INTO public.group_user_mapping("user", "group", role) VALUES (%L, 'a1000000-0000-0000-0000-000000000002', 'admin') $$, pg_temp.u('sm_new2')),
  'gum insert: supabase.admin adds admins anywhere');

SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ UPDATE public.group_user_mapping SET role = 'admin' WHERE "user" = auth.uid() AND "group" = 'a1000000-0000-0000-0000-000000000001' $$), 0, 'gum update: member cannot promote self');
SELECT tests.authenticate_as('sm_trial');
SELECT is(pg_temp.rows($$ UPDATE public.group_user_mapping SET role = 'user' WHERE "user" = auth.uid() AND "group" = 'a1000000-0000-0000-0000-000000000001' $$), 0, 'gum update: trial cannot promote self');
SELECT tests.authenticate_as('sm_req');
SELECT is(pg_temp.rows($$ UPDATE public.group_user_mapping SET role = 'user' WHERE "user" = auth.uid() AND "group" = 'a1000000-0000-0000-0000-000000000001' $$), 0, 'gum update: joinRequested cannot accept own request');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows(format($$ UPDATE public.group_user_mapping SET role = 'user' WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_req'))),
  1, 'gum update: group admin accepts join request');
SELECT is(pg_temp.rows(format($$ UPDATE public.group_user_mapping SET role = 'joinRequested' WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000002' $$, pg_temp.u('sm_out'))),
  0, 'gum update: group admin cannot update other groups');
SELECT throws_like(format($$ UPDATE public.group_user_mapping SET "group" = 'a1000000-0000-0000-0000-000000000002' WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_req')),
  '%row-level security%', 'gum update: group admin cannot move members into other groups');
SELECT tests.authenticate_as('sm_padmin');
SELECT is(pg_temp.rows(format($$ UPDATE public.group_user_mapping SET role = 'admin' WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000002' $$, pg_temp.u('sm_out'))),
  1, 'gum update: supabase.admin');

SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.group_user_mapping WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_trial'))),
  0, 'gum delete: member cannot remove others');
SELECT tests.authenticate_as('sm_out');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.group_user_mapping WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_trial'))),
  0, 'gum delete: non-member cannot remove members');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.group_user_mapping WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_trial'))),
  1, 'gum delete: group admin removes member');
SELECT tests.authenticate_as('sm_user2');
SELECT is(pg_temp.rows($$ DELETE FROM public.group_user_mapping WHERE "user" = auth.uid() AND "group" = 'a1000000-0000-0000-0000-000000000001' $$),
  1, 'gum delete: member leaves group');
SELECT tests.authenticate_as('sm_padmin');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.group_user_mapping WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000002' $$, pg_temp.u('sm_out'))),
  1, 'gum delete: supabase.admin removes anyone');

-- leaving a root group also removes subgroup memberships (self delete)
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.group_user_mapping WHERE "user" = pg_temp.u('sm_user2') AND "group" = 'a1000000-0000-0000-0000-00000000000a'),
  0, 'gum delete: leaving the root group removes own subgroup memberships');

-- trg_delete_user_from_subgroups is now SECURITY DEFINER (20261102090000): when a group
-- admin removes a member from the root group, the cascade into the subgroups bypasses RLS,
-- so the member's subgroup mappings are removed too and they lose access to the subgroup's
-- events (previously they silently survived).
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.group_user_mapping WHERE "user" = %L AND "group" = 'a1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user'))),
  1, 'gum delete: group admin removes member that is also in a subgroup');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.group_user_mapping WHERE "user" = pg_temp.u('sm_user') AND "group" = 'a1000000-0000-0000-0000-000000000009'),
  0, 'gum delete: removal by group admin also removes subgroup memberships');

SELECT * FROM finish();
ROLLBACK;
