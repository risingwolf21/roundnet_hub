-- Security hardening (20261002072326_security_hardening.sql):
-- column-protection triggers (history, attendance, comments, user,
-- games.players) and the games.players privilege model.
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(67);

-- ---------------------------------------------------------------------------
-- Fixtures (postgres, no JWT)
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@sec-test.local')
FROM unnest(ARRAY['sm_gadmin','sm_user','sm_user2','sm_cashier','sm_usermgr','sm_padmin','sm_legacy']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;
CREATE FUNCTION pg_temp.rows(q text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int; BEGIN EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT; RETURN n; END $$;

-- seed data may insert explicit ids without advancing the identity sequence
SELECT setval(pg_get_serial_sequence('public.history', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM public.history), false);

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join)
VALUES ('a1000000-0000-0000-0000-000000000001', 'SM G', true, true, false);

INSERT INTO public.permissions(name)
SELECT unnest(ARRAY['event.comment','event.manage.attendees','drinks.confirm.payments','users.manage','supabase.admin'])
ON CONFLICT DO NOTHING;
INSERT INTO public.group_permissions("group","permission") VALUES ('a1000000-0000-0000-0000-000000000001', 'event.comment');

INSERT INTO public.group_user_mapping("user","group",role)
SELECT pg_temp.u(x.u), 'a1000000-0000-0000-0000-000000000001', x.r::public."GroupRole" FROM (VALUES
  ('sm_gadmin', 'admin'), ('sm_user', 'user'), ('sm_user2', 'user')
) x(u, r);

INSERT INTO public.user_direct_grants("user", kind, key)
SELECT pg_temp.u(x.u), 'perm', x.k FROM (VALUES
  ('sm_gadmin', 'event.manage.attendees'),
  ('sm_cashier', 'drinks.confirm.payments'),
  ('sm_usermgr', 'users.manage'),
  ('sm_padmin', 'supabase.admin')
) x(u, k);

INSERT INTO public.events(id, "key", title, description, recurrence, "startingDateTime", "endDateTime", "group") VALUES
  ('e1000000-0000-0000-0000-000000000001', 'sm-e1', 'SM E1', '', 'None', now() + interval '1 day', now() + interval '1 day 2 hours', 'a1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0000-000000000005', 'sm-e5', 'SM E5', '', 'None', now() + interval '2 days', now() + interval '2 days 2 hours', 'a1000000-0000-0000-0000-000000000001');

INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES
  (pg_temp.u('sm_user'),  'e1000000-0000-0000-0000-000000000001', 'Attending'),
  (pg_temp.u('sm_user2'), 'e1000000-0000-0000-0000-000000000001', 'Attending');

INSERT INTO public.event_comments(id, "user", event, comment)
VALUES ('cc000000-0000-0000-0000-000000000001', pg_temp.u('sm_user'), 'e1000000-0000-0000-0000-000000000001', 'hello');

INSERT INTO public.drink(id, name, price, active, deleted, type) VALUES
  ('dd000000-0000-0000-0000-000000000001', 'SM Drink 1', 2.5, true, false, 'Drink'),
  ('dd000000-0000-0000-0000-000000000002', 'SM Drink 2', 4.0, true, false, 'Drink');

INSERT INTO public.payments(id, "user", "amountToPay", "paymentState") VALUES
  (990101, pg_temp.u('sm_user'), 0, 'Open'),
  (990102, pg_temp.u('sm_user'), 0, 'Open'),
  (990103, pg_temp.u('sm_user'), 0, 'Fulfilled');

INSERT INTO public.vouchers(id, "user", total_drinks, title)
VALUES ('ee000000-0000-0000-0000-000000000001', pg_temp.u('sm_user'), 10, 'SM voucher');

UPDATE games.players SET rg_link = 'https://old', rg_index = 1500, rg_avatar_url = 'avatar', rg_id = 'rg1'
WHERE linked_user_id = pg_temp.u('sm_user');

-- legacy player: player id = user id, linked_user_id NULL
DELETE FROM games.players WHERE linked_user_id = pg_temp.u('sm_legacy');
INSERT INTO games.players(player, linked_user_id, rg_link, rg_index, rg_avatar_url, rg_id)
VALUES (pg_temp.u('sm_legacy'), NULL, 'https://legacy', 1400, 'avatar', 'rgL');

-- ===========================================================================
-- 1. trg_history_enforce_amount (16)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');

WITH i AS (
  INSERT INTO public.history(id, "user", drink, count, amount, payment)
  VALUES (990201, auth.uid(), 'dd000000-0000-0000-0000-000000000001', 2, 999, 990101)
  RETURNING amount)
SELECT is(amount, 5.00::numeric, 'history: insert amount is price * count, client amount ignored') FROM i;

WITH i AS (
  INSERT INTO public.history("user", drink, count, payment)
  VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000002', 1, 990101)
  RETURNING amount)
SELECT is(amount, 4.00::numeric, 'history: insert without amount gets computed amount') FROM i;

SELECT throws_ok($$ INSERT INTO public.history("user", drink, count, payment) VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000001', 0, 990101) $$,
  '22023', 'count must be > 0', 'history: zero count rejected');
SELECT throws_ok($$ INSERT INTO public.history("user", drink, count, payment) VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000001', -3, 990101) $$,
  '22023', 'count must be > 0', 'history: negative count rejected');
SELECT throws_ok($$ INSERT INTO public.history("user", drink, count, payment) VALUES (auth.uid(), 'dd000000-0000-0000-0000-0000000000ff', 1, 990101) $$,
  '23503', 'unknown drink dd000000-0000-0000-0000-0000000000ff', 'history: unknown drink rejected');
SELECT throws_like($$ INSERT INTO public.history("user", drink, count, payment) VALUES (auth.uid(), 'dd000000-0000-0000-0000-000000000001', 1, 990103) $$,
  '%row-level security%', 'history: insert on a fulfilled payment rejected');

WITH u AS (UPDATE public.history SET count = 3 WHERE id = 990201 RETURNING amount)
SELECT is(amount, 7.50::numeric, 'history: update count recomputes amount from the stored unit price') FROM u;
WITH u AS (UPDATE public.history SET amount = 0 WHERE id = 990201 RETURNING amount)
SELECT is(amount, 7.50::numeric, 'history: user cannot change amount directly') FROM u;

SELECT throws_ok($$ UPDATE public.history SET drink = 'dd000000-0000-0000-0000-000000000002' WHERE id = 990201 $$,
  '42501', 'forbidden: only count can be changed', 'history: user cannot change drink');
SELECT throws_ok($$ UPDATE public.history SET payment = 990102 WHERE id = 990201 $$,
  '42501', 'forbidden: only count can be changed', 'history: user cannot move entry to another payment');
SELECT throws_ok($$ UPDATE public.history SET voucher = 'ee000000-0000-0000-0000-000000000001' WHERE id = 990201 $$,
  '42501', 'forbidden: only count can be changed', 'history: user cannot attach a voucher afterwards');
SELECT throws_ok(format($$ UPDATE public.history SET "user" = %L WHERE id = 990201 $$, pg_temp.u('sm_user2')),
  '42501', 'forbidden: only count can be changed', 'history: user cannot move entry to another user');
SELECT throws_ok($$ UPDATE public.history SET count = 0 WHERE id = 990201 $$,
  '22023', 'count must be > 0', 'history: update to zero count rejected');

SELECT tests.authenticate_as('sm_cashier');
WITH u AS (UPDATE public.history SET amount = 1.23 WHERE id = 990201 RETURNING amount)
SELECT is(amount, 1.23::numeric, 'history: drinks.confirm.payments may correct the amount') FROM u;
SELECT is(pg_temp.rows($$ UPDATE public.history SET drink = 'dd000000-0000-0000-0000-000000000002' WHERE id = 990201 $$),
  1, 'history: drinks.confirm.payments may change the drink');

SELECT tests.authenticate_as_service_role();
WITH i AS (
  INSERT INTO public.history("user", drink, count, amount, payment)
  VALUES (pg_temp.u('sm_user'), 'dd000000-0000-0000-0000-000000000001', 1, 9.99, 990101)
  RETURNING amount)
SELECT is(amount, 9.99::numeric, 'history: service_role keeps the given amount') FROM i;

-- ===========================================================================
-- 2. trg_attendance_immutable_keys (5)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ UPDATE public.event_attendance_user_mapping SET event = 'e1000000-0000-0000-0000-000000000005'
                    WHERE "user" = auth.uid() AND event = 'e1000000-0000-0000-0000-000000000001' $$,
  '42501', 'forbidden: event and user cannot be changed', 'attendance: user cannot move own row to another event');
SELECT throws_ok(format($$ UPDATE public.event_attendance_user_mapping SET "user" = %L
                    WHERE "user" = auth.uid() AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_gadmin')),
  '42501', 'forbidden: event and user cannot be changed', 'attendance: user cannot move own row to another user');
SELECT is(pg_temp.rows($$ UPDATE public.event_attendance_user_mapping SET state = 'Declined'
                    WHERE "user" = auth.uid() AND event = 'e1000000-0000-0000-0000-000000000001' $$),
  1, 'attendance: user can still change own state');

SELECT tests.authenticate_as('sm_gadmin');
SELECT throws_ok(format($$ UPDATE public.event_attendance_user_mapping SET event = 'e1000000-0000-0000-0000-000000000005'
                    WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user2')),
  '42501', 'forbidden: event and user cannot be changed', 'attendance: attendee manager cannot move rows either');

SELECT tests.authenticate_as_service_role();
SELECT is(pg_temp.rows(format($$ UPDATE public.event_attendance_user_mapping SET event = 'e1000000-0000-0000-0000-000000000005'
                    WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user2'))),
  1, 'attendance: service_role may move rows');

-- ===========================================================================
-- 3. trg_event_comment_immutable_event (3)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ UPDATE public.event_comments SET event = 'e1000000-0000-0000-0000-000000000005'
                    WHERE id = 'cc000000-0000-0000-0000-000000000001' $$,
  '42501', 'forbidden: event cannot be changed', 'comments: author cannot move comment to another event');
WITH u AS (UPDATE public.event_comments SET comment = 'edited' WHERE id = 'cc000000-0000-0000-0000-000000000001' RETURNING edited)
SELECT is(edited, true, 'comments: author can still edit the text') FROM u;

SELECT tests.authenticate_as_service_role();
SELECT is(pg_temp.rows($$ UPDATE public.event_comments SET event = 'e1000000-0000-0000-0000-000000000005'
                    WHERE id = 'cc000000-0000-0000-0000-000000000001' $$),
  1, 'comments: service_role may move comments');

-- ===========================================================================
-- 4. trg_user_protect_columns + public."user" policies (14)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT throws_ok($$ UPDATE public."user" SET verified = true WHERE id = auth.uid() $$,
  '42501', 'forbidden: protected user columns', 'user: cannot change own verified');
SELECT throws_ok($$ UPDATE public."user" SET disabled = true WHERE id = auth.uid() $$,
  '42501', 'forbidden: protected user columns', 'user: cannot change own disabled');
SELECT throws_ok($$ UPDATE public."user" SET email = 'evil@example.com' WHERE id = auth.uid() $$,
  '42501', 'forbidden: protected user columns', 'user: cannot change own email');
SELECT throws_ok($$ UPDATE public."user" SET id = gen_random_uuid() WHERE id = auth.uid() $$,
  '42501', 'forbidden: protected user columns', 'user: cannot change own id');
SELECT is(pg_temp.rows($$ UPDATE public."user" SET "displayName" = 'SM', name = 'SM', "avatarUrl" = 'x', last_seen_at = now() WHERE id = auth.uid() $$),
  1, 'user: can change displayName/name/avatarUrl/last_seen_at on own row');
SELECT is(pg_temp.rows(format($$ UPDATE public."user" SET "displayName" = 'pwned' WHERE id = %L $$, pg_temp.u('sm_user2'))),
  0, 'user: cannot update other users');
SELECT throws_like($$ INSERT INTO public."user"(id, email) VALUES (gen_random_uuid(), 'x@example.com') $$,
  '%row-level security%', 'user: cannot insert user rows');
SELECT is(pg_temp.rows($$ DELETE FROM public."user" WHERE id = auth.uid() $$),
  0, 'user: cannot delete user rows');
SELECT is(
  (SELECT count(*)::int FROM public."user" WHERE id IN (pg_temp.u('sm_user2'), pg_temp.u('sm_cashier'), pg_temp.u('sm_padmin'))),
  3, 'user: authenticated users can read other profiles');

SELECT tests.authenticate_as('sm_usermgr');
SELECT is(pg_temp.rows(format($$ UPDATE public."user" SET verified = true, disabled = true, role = 'trainer' WHERE id = %L $$, pg_temp.u('sm_user2'))),
  1, 'user: users.manage may change protected columns of others');

SELECT tests.authenticate_as('sm_padmin');
SELECT is(pg_temp.rows($$ UPDATE public."user" SET verified = true WHERE id = auth.uid() $$),
  1, 'user: supabase.admin may change protected columns on own row');
SELECT is(pg_temp.rows(format($$ UPDATE public."user" SET "displayName" = 'x' WHERE id = %L $$, pg_temp.u('sm_user2'))),
  0, 'user: supabase.admin without users.manage cannot update other users (policy)');

SELECT tests.authenticate_as_service_role();
SELECT is(pg_temp.rows(format($$ UPDATE public."user" SET role = 'admin' WHERE id = %L $$, pg_temp.u('sm_user'))),
  1, 'user: service_role may change protected columns');

SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public."user" $$, '42501', NULL, 'user: anon has no access');

-- ===========================================================================
-- 5. games.players: trg_players_reset_rg_data + column privileges (23)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
WITH u AS (UPDATE games.players SET rg_link = 'https://new' WHERE linked_user_id = auth.uid()
           RETURNING rg_index::text, rg_avatar_url, rg_id)
SELECT is(ARRAY[rg_index, rg_avatar_url, rg_id], ARRAY[NULL, NULL, NULL]::text[],
  'players: changing rg_link clears rg_index/rg_avatar_url/rg_id') FROM u;

RESET ROLE;
UPDATE games.players SET rg_index = 1500, rg_avatar_url = 'avatar', rg_id = 'rg1' WHERE linked_user_id = pg_temp.u('sm_user');

SELECT tests.authenticate_as('sm_user');
WITH u AS (UPDATE games.players SET hide_rating = true WHERE linked_user_id = auth.uid() RETURNING rg_index)
SELECT is(rg_index, 1500::numeric, 'players: other updates keep the rg data') FROM u;
WITH u AS (UPDATE games.players SET rg_link = 'https://new' WHERE linked_user_id = auth.uid() RETURNING rg_index)
SELECT is(rg_index, 1500::numeric, 'players: re-saving the same rg_link keeps the rg data') FROM u;
SELECT is(pg_temp.rows($$ UPDATE games.players SET gender = 'f' WHERE linked_user_id = auth.uid() $$),
  1, 'players: user can change own gender');

SELECT throws_ok($$ UPDATE games.players SET rg_index = 9999 WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot set rg_index');
SELECT throws_ok($$ UPDATE games.players SET rg_avatar_url = 'x' WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot set rg_avatar_url');
SELECT throws_ok($$ UPDATE games.players SET rg_id = 'x' WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot set rg_id');
SELECT throws_ok($$ UPDATE games.players SET effective_rating_cached = 3000 WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot set effective_rating_cached');
SELECT throws_ok($$ UPDATE games.players SET pro_status = true WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot set pro_status');
SELECT throws_ok($$ UPDATE games.players SET matches_played = 999 WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot set matches_played');
SELECT throws_ok($$ UPDATE games.players SET display_name = 'x' WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot set display_name');
SELECT throws_ok($$ UPDATE games.players SET linked_user_id = NULL WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot relink player');
SELECT throws_ok($$ UPDATE games.players SET player = gen_random_uuid() WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot change player id');

SELECT is(pg_temp.rows(format($$ UPDATE games.players SET hide_rating = true WHERE linked_user_id = %L $$, pg_temp.u('sm_user2'))),
  0, 'players: cannot update another (new-style) player');
SELECT is(pg_temp.rows(format($$ UPDATE games.players SET hide_rating = true WHERE player = %L $$, pg_temp.u('sm_legacy'))),
  0, 'players: cannot update another (legacy) player');
SELECT throws_ok($$ INSERT INTO games.players(player) VALUES (gen_random_uuid()) $$, '42501', NULL, 'players: cannot insert players');
SELECT throws_ok($$ DELETE FROM games.players WHERE linked_user_id = auth.uid() $$, '42501', NULL, 'players: cannot delete players');
SELECT is(
  (SELECT count(*)::int FROM games.players WHERE coalesce(linked_user_id, player) IN (pg_temp.u('sm_user2'), pg_temp.u('sm_legacy'))),
  2, 'players: authenticated can read all players');

SELECT tests.authenticate_as('sm_legacy');
SELECT is(pg_temp.rows($$ UPDATE games.players SET hide_rating = true WHERE player = auth.uid() $$),
  1, 'players: legacy player (player = uid, linked_user_id NULL) can self-update');
WITH u AS (UPDATE games.players SET rg_link = 'https://legacy-new' WHERE player = auth.uid() RETURNING rg_index)
SELECT is(rg_index, NULL, 'players: legacy player rg_link change clears rg data') FROM u;

RESET ROLE;
UPDATE games.players SET rg_index = 1500 WHERE linked_user_id = pg_temp.u('sm_user');
SELECT tests.authenticate_as_service_role();
WITH u AS (UPDATE games.players SET rg_link = 'https://service' WHERE linked_user_id = pg_temp.u('sm_user') RETURNING rg_index)
SELECT is(rg_index, 1500::numeric, 'players: service_role rg_link change keeps rg data') FROM u;

SELECT tests.clear_authentication();
SELECT throws_ok($$ UPDATE games.players SET hide_rating = true $$, '42501', NULL, 'players: anon cannot update');
SELECT is((SELECT count(*)::int FROM games.players), 0, 'players: anon sees no rows (select policy is for authenticated)');

-- ===========================================================================
-- 6. Catalog: games.players / games schema privileges, dropped policy (6)
-- ===========================================================================
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM pg_class c, aclexplode(c.relacl) a WHERE c.oid = 'games.players'::regclass AND a.grantee = 0),
  0, 'players: PUBLIC holds no privileges');
SELECT is(
  has_schema_privilege('public', 'games', 'CREATE') OR has_schema_privilege('anon', 'games', 'CREATE')
    OR has_schema_privilege('authenticated', 'games', 'CREATE'),
  false, 'games schema: no CREATE for PUBLIC/anon/authenticated');
SELECT set_eq(
  $$ SELECT attname::text FROM pg_attribute
      WHERE attrelid = 'games.players'::regclass AND attnum > 0 AND NOT attisdropped
        AND has_column_privilege('authenticated', 'games.players', attname, 'UPDATE') $$,
  ARRAY['hide_rating', 'rg_link', 'gender'],
  'players: authenticated may only update hide_rating, rg_link, gender');
SELECT is(
  (SELECT count(*)::int FROM pg_attribute
    WHERE attrelid = 'games.players'::regclass AND attnum > 0 AND NOT attisdropped
      AND has_column_privilege('anon', 'games.players', attname, 'UPDATE')),
  0, 'players: anon may not update any column');
SELECT is(
  (SELECT bool_or(has_table_privilege(r, 'games.players', p))
     FROM unnest(ARRAY['anon','authenticated']) r,
          unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p),
  false, 'players: API roles have no table-wide write privileges');
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'games' AND tablename = 'match' AND policyname = 'match_update_rated_by_creator'),
  0, 'games.match: match_update_rated_by_creator policy dropped');

SELECT * FROM finish();
ROLLBACK;
