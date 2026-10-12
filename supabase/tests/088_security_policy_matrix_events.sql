-- Security hardening (20261002072326_security_hardening.sql):
-- RLS policy matrix for events, event_attendance_user_mapping,
-- event_bring_items, event_bring_pledges and event_comments.
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(100);

-- ---------------------------------------------------------------------------
-- Fixtures (postgres, no JWT)
--   G = a1..01 (perms: event.comment, event.signup), H = a1..02 (no perms)
--   sm_gadmin : admin of G  + direct event.edit/delete/manage.attendees/comment
--   sm_user   : user of G
--   sm_user2  : user of G
--   sm_trial  : trial of G  + direct event.edit/comment
--   sm_req    : joinRequested in G
--   sm_out    : user of H   + direct event.edit/delete/manage.attendees/comment
--   sm_padmin : supabase.admin, no membership
--   E1 future (items on), E2 past, E3 cancelled, E5 future (items off), E6 future: G
--   E4 future: H
-- ---------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@sec-test.local')
FROM unnest(ARRAY['sm_gadmin','sm_user','sm_user2','sm_trial','sm_req','sm_out','sm_padmin']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;
CREATE FUNCTION pg_temp.rows(q text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int; BEGIN EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT; RETURN n; END $$;

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'SM G', true, true, false),
  ('a1000000-0000-0000-0000-000000000002', 'SM H', true, true, false);

INSERT INTO public.permissions(name)
SELECT unnest(ARRAY['event.comment','event.signup','event.edit','event.delete','event.manage.attendees','supabase.admin'])
ON CONFLICT DO NOTHING;
INSERT INTO public.group_permissions("group","permission") VALUES
  ('a1000000-0000-0000-0000-000000000001', 'event.comment'),
  ('a1000000-0000-0000-0000-000000000001', 'event.signup');

INSERT INTO public.group_user_mapping("user","group",role)
SELECT pg_temp.u(x.u), x.g::uuid, x.r::public."GroupRole" FROM (VALUES
  ('sm_gadmin', 'a1000000-0000-0000-0000-000000000001', 'admin'),
  ('sm_user',   'a1000000-0000-0000-0000-000000000001', 'user'),
  ('sm_user2',  'a1000000-0000-0000-0000-000000000001', 'user'),
  ('sm_trial',  'a1000000-0000-0000-0000-000000000001', 'trial'),
  ('sm_req',    'a1000000-0000-0000-0000-000000000001', 'joinRequested'),
  ('sm_out',    'a1000000-0000-0000-0000-000000000002', 'user')
) x(u, g, r);

INSERT INTO public.user_direct_grants("user", kind, key)
SELECT pg_temp.u(x.u), 'perm', x.k FROM (VALUES
  ('sm_gadmin', 'event.edit'), ('sm_gadmin', 'event.delete'), ('sm_gadmin', 'event.manage.attendees'), ('sm_gadmin', 'event.comment'),
  ('sm_out', 'event.edit'), ('sm_out', 'event.delete'), ('sm_out', 'event.manage.attendees'), ('sm_out', 'event.comment'),
  ('sm_trial', 'event.edit'), ('sm_trial', 'event.comment'),
  ('sm_padmin', 'supabase.admin')
) x(u, k);

INSERT INTO public.events(id, "key", title, description, recurrence, "startingDateTime", "endDateTime", "group", "isCancelled", items_enabled) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'sm-e1', 'SM E1', '', 'None', now() + interval '1 day',  now() + interval '1 day 2 hours',  'a1000000-0000-0000-0000-000000000001', false, true),
  ('e1000000-0000-0000-0000-000000000002', 'sm-e2', 'SM E2', '', 'None', now() - interval '1 day',  now() - interval '22 hours',       'a1000000-0000-0000-0000-000000000001', false, false),
  ('e1000000-0000-0000-0000-000000000003', 'sm-e3', 'SM E3', '', 'None', now() + interval '1 day',  now() + interval '1 day 2 hours',  'a1000000-0000-0000-0000-000000000001', true,  false),
  ('e1000000-0000-0000-0000-000000000004', 'sm-e4', 'SM E4', '', 'None', now() + interval '1 day',  now() + interval '1 day 2 hours',  'a1000000-0000-0000-0000-000000000002', false, true),
  ('e1000000-0000-0000-0000-000000000005', 'sm-e5', 'SM E5', '', 'None', now() + interval '2 days', now() + interval '2 days 2 hours', 'a1000000-0000-0000-0000-000000000001', false, false),
  ('e1000000-0000-0000-0000-000000000006', 'sm-e6', 'SM E6', '', 'None', now() + interval '3 days', now() + interval '3 days 2 hours', 'a1000000-0000-0000-0000-000000000001', false, false);

INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES
  (pg_temp.u('sm_user2'), 'e1000000-0000-0000-0000-000000000001', 'Attending'),
  (pg_temp.u('sm_user'),  'e1000000-0000-0000-0000-000000000002', 'Attending');

INSERT INTO public.event_bring_items(id, event, name) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Ball'),
  ('b1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Net'),
  ('b1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000004', 'Ball H'),
  ('b1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000005', 'Ball E5');

INSERT INTO public.event_bring_pledges(id, event, item, qty, "user") VALUES
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, pg_temp.u('sm_user2')),
  ('f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, pg_temp.u('sm_user2'));

INSERT INTO public.event_comments(id, "user", event, comment)
VALUES ('cc000000-0000-0000-0000-000000000001', pg_temp.u('sm_user2'), 'e1000000-0000-0000-0000-000000000001', 'hello');

-- ===========================================================================
-- events (23)
-- ===========================================================================
SELECT tests.authenticate_as('sm_gadmin');
SELECT is((SELECT count(*)::int FROM public.events WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 5, 'events select: group admin sees group events');
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.events WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 5, 'events select: member sees group events');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.events WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 5, 'events select: trial sees group events');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.events WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 0, 'events select: joinRequested sees nothing');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.events WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 0, 'events select: non-member sees nothing');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = 'e1000000-0000-0000-0000-000000000004'), 1, 'events select: non-member sees events of own group');
SELECT tests.authenticate_as('sm_padmin');
SELECT is((SELECT count(*)::int FROM public.events WHERE "group" = 'a1000000-0000-0000-0000-000000000001'), 0, 'events select: platform admin is not a member');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.events $$, '42501', NULL, 'events select: anon has no access');

SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok($$ INSERT INTO public.events("key", title, recurrence, "startingDateTime", "endDateTime", "group")
                   VALUES ('sm-new-1', 'n', 'None', now() + interval '5 days', now() + interval '5 days 1 hour', 'a1000000-0000-0000-0000-000000000001') $$,
  'events insert: full member with event.edit');
SELECT tests.authenticate_as('sm_user');
SELECT throws_like($$ INSERT INTO public.events("key", title, recurrence, "startingDateTime", "endDateTime", "group")
                   VALUES ('sm-new-2', 'n', 'None', now() + interval '5 days', now() + interval '5 days 1 hour', 'a1000000-0000-0000-0000-000000000001') $$,
  '%row-level security%', 'events insert: member without event.edit rejected');
SELECT tests.authenticate_as('sm_trial');
SELECT throws_like($$ INSERT INTO public.events("key", title, recurrence, "startingDateTime", "endDateTime", "group")
                   VALUES ('sm-new-3', 'n', 'None', now() + interval '5 days', now() + interval '5 days 1 hour', 'a1000000-0000-0000-0000-000000000001') $$,
  '%row-level security%', 'events insert: trial with event.edit rejected');
SELECT tests.authenticate_as('sm_out');
SELECT throws_like($$ INSERT INTO public.events("key", title, recurrence, "startingDateTime", "endDateTime", "group")
                   VALUES ('sm-new-4', 'n', 'None', now() + interval '5 days', now() + interval '5 days 1 hour', 'a1000000-0000-0000-0000-000000000001') $$,
  '%row-level security%', 'events insert: non-member with event.edit rejected');
SELECT lives_ok($$ INSERT INTO public.events("key", title, recurrence, "startingDateTime", "endDateTime", "group")
                   VALUES ('sm-new-5', 'n', 'None', now() + interval '5 days', now() + interval '5 days 1 hour', 'a1000000-0000-0000-0000-000000000002') $$,
  'events insert: event.edit works in own group');
SELECT tests.authenticate_as('sm_padmin');
SELECT throws_like($$ INSERT INTO public.events("key", title, recurrence, "startingDateTime", "endDateTime", "group")
                   VALUES ('sm-new-6', 'n', 'None', now() + interval '5 days', now() + interval '5 days 1 hour', 'a1000000-0000-0000-0000-000000000001') $$,
  '%row-level security%', 'events insert: platform admin without membership rejected');
SELECT tests.clear_authentication();
SELECT throws_ok($$ INSERT INTO public.events("key", title, recurrence, "startingDateTime", "endDateTime", "group")
                   VALUES ('sm-new-7', 'n', 'None', now() + interval '5 days', now() + interval '5 days 1 hour', 'a1000000-0000-0000-0000-000000000001') $$,
  '42501', NULL, 'events insert: anon has no access');

SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows($$ UPDATE public.events SET title = 'x' WHERE id = 'e1000000-0000-0000-0000-000000000001' $$), 1, 'events update: full member with event.edit');
SELECT throws_like($$ UPDATE public.events SET "group" = 'a1000000-0000-0000-0000-000000000002' WHERE id = 'e1000000-0000-0000-0000-000000000005' $$,
  '%row-level security%', 'events update: cannot move event into a group without membership');
SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ UPDATE public.events SET title = 'x' WHERE id = 'e1000000-0000-0000-0000-000000000001' $$), 0, 'events update: member without event.edit');
SELECT tests.authenticate_as('sm_trial');
SELECT is(pg_temp.rows($$ UPDATE public.events SET title = 'x' WHERE id = 'e1000000-0000-0000-0000-000000000001' $$), 0, 'events update: trial with event.edit');
SELECT tests.authenticate_as('sm_out');
SELECT is(pg_temp.rows($$ UPDATE public.events SET title = 'x' WHERE id = 'e1000000-0000-0000-0000-000000000001' $$), 0, 'events update: non-member with event.edit');

SELECT is(pg_temp.rows($$ DELETE FROM public.events WHERE id = 'e1000000-0000-0000-0000-000000000006' $$), 0, 'events delete: non-member with event.delete');
SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ DELETE FROM public.events WHERE id = 'e1000000-0000-0000-0000-000000000006' $$), 0, 'events delete: member without event.delete');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows($$ DELETE FROM public.events WHERE id = 'e1000000-0000-0000-0000-000000000006' $$), 1, 'events delete: full member with event.delete');

-- ===========================================================================
-- event_attendance_user_mapping (24)
-- ===========================================================================
SELECT tests.authenticate_as('sm_gadmin');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = 'e1000000-0000-0000-0000-000000000001'), 1, 'attendance select: group admin');
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = 'e1000000-0000-0000-0000-000000000001'), 1, 'attendance select: member');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = 'e1000000-0000-0000-0000-000000000001'), 1, 'attendance select: trial');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = 'e1000000-0000-0000-0000-000000000001'), 0, 'attendance select: joinRequested sees nothing');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = 'e1000000-0000-0000-0000-000000000001'), 0, 'attendance select: non-member sees nothing');
SELECT tests.authenticate_as('sm_padmin');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = 'e1000000-0000-0000-0000-000000000001'), 0, 'attendance select: platform admin sees nothing');

SELECT tests.authenticate_as('sm_user');
SELECT lives_ok($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'Attending') $$,
  'attendance insert: member signs up');
SELECT throws_like(format($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (%L, 'e1000000-0000-0000-0000-000000000005', 'Attending') $$, pg_temp.u('sm_user2')),
  '%row-level security%', 'attendance insert: member cannot sign up others');
SELECT throws_like($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000002', 'Attending') $$,
  '%row-level security%', 'attendance insert: past event rejected');
SELECT throws_like($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000003', 'Attending') $$,
  '%row-level security%', 'attendance insert: cancelled event rejected');
SELECT tests.authenticate_as('sm_trial');
SELECT lives_ok($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'AttendingAsTrial') $$,
  'attendance insert: trial signs up');
SELECT tests.authenticate_as('sm_req');
SELECT throws_like($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'Attending') $$,
  '%row-level security%', 'attendance insert: joinRequested rejected');
SELECT tests.authenticate_as('sm_out');
SELECT throws_like($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'Attending') $$,
  '%row-level security%', 'attendance insert: non-member (with manage.attendees) rejected');
SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok(format($$ INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (%L, 'e1000000-0000-0000-0000-000000000005', 'Attending') $$, pg_temp.u('sm_user2')),
  'attendance insert: manager signs up another member');

SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ UPDATE public.event_attendance_user_mapping SET state = 'Declined' WHERE "user" = auth.uid() AND event = 'e1000000-0000-0000-0000-000000000001' $$),
  1, 'attendance update: own row');
SELECT is(pg_temp.rows(format($$ UPDATE public.event_attendance_user_mapping SET state = 'Declined' WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user2'))),
  0, 'attendance update: not someone else''s row');
SELECT is(pg_temp.rows($$ UPDATE public.event_attendance_user_mapping SET state = 'Declined' WHERE "user" = auth.uid() AND event = 'e1000000-0000-0000-0000-000000000002' $$),
  0, 'attendance update: not after the event started');
SELECT tests.authenticate_as('sm_out');
SELECT is(pg_temp.rows(format($$ UPDATE public.event_attendance_user_mapping SET state = 'Declined' WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user2'))),
  0, 'attendance update: non-member manager cannot update');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.event_attendance_user_mapping WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user2'))),
  0, 'attendance delete: non-member manager cannot delete');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows(format($$ UPDATE public.event_attendance_user_mapping SET state = 'Declined' WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user2'))),
  1, 'attendance update: manager updates another member');

SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.event_attendance_user_mapping WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000001' $$, pg_temp.u('sm_user2'))),
  0, 'attendance delete: not someone else''s row');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_attendance_user_mapping WHERE "user" = auth.uid() AND event = 'e1000000-0000-0000-0000-000000000002' $$),
  1, 'attendance delete: own row (also for past events)');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows(format($$ DELETE FROM public.event_attendance_user_mapping WHERE "user" = %L AND event = 'e1000000-0000-0000-0000-000000000005' $$, pg_temp.u('sm_user2'))),
  1, 'attendance delete: manager deletes another member''s row');
SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.event_attendance_user_mapping $$, '42501', NULL, 'attendance select: anon has no access');

-- ===========================================================================
-- event_bring_items (15)
-- ===========================================================================
SELECT tests.authenticate_as('sm_gadmin');
SELECT is((SELECT count(*)::int FROM public.event_bring_items WHERE event = 'e1000000-0000-0000-0000-000000000001'), 2, 'bring items select: group admin');
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.event_bring_items WHERE event = 'e1000000-0000-0000-0000-000000000001'), 2, 'bring items select: member');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.event_bring_items WHERE event = 'e1000000-0000-0000-0000-000000000001'), 0, 'bring items select: trial sees nothing');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.event_bring_items WHERE event = 'e1000000-0000-0000-0000-000000000001'), 0, 'bring items select: joinRequested sees nothing');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.event_bring_items WHERE event = 'e1000000-0000-0000-0000-000000000001'), 0, 'bring items select: non-member sees nothing');

SELECT tests.authenticate_as('sm_gadmin');
SELECT lives_ok($$ INSERT INTO public.event_bring_items(event, name) VALUES ('e1000000-0000-0000-0000-000000000001', 'Cones') $$, 'bring items insert: full member with event.edit');
SELECT tests.authenticate_as('sm_user');
SELECT throws_like($$ INSERT INTO public.event_bring_items(event, name) VALUES ('e1000000-0000-0000-0000-000000000001', 'Cones 2') $$, '%row-level security%', 'bring items insert: member without event.edit');
SELECT tests.authenticate_as('sm_trial');
SELECT throws_like($$ INSERT INTO public.event_bring_items(event, name) VALUES ('e1000000-0000-0000-0000-000000000001', 'Cones 3') $$, '%row-level security%', 'bring items insert: trial with event.edit');
SELECT tests.authenticate_as('sm_out');
SELECT throws_like($$ INSERT INTO public.event_bring_items(event, name) VALUES ('e1000000-0000-0000-0000-000000000001', 'Cones 4') $$, '%row-level security%', 'bring items insert: non-member with event.edit');

SELECT is(pg_temp.rows($$ UPDATE public.event_bring_items SET notes = 'x' WHERE id = 'b1000000-0000-0000-0000-000000000001' $$), 0, 'bring items update: non-member with event.edit');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_bring_items WHERE id = 'b1000000-0000-0000-0000-000000000002' $$), 0, 'bring items delete: non-member with event.edit');
SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ UPDATE public.event_bring_items SET notes = 'x' WHERE id = 'b1000000-0000-0000-0000-000000000001' $$), 0, 'bring items update: member without event.edit');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_bring_items WHERE id = 'b1000000-0000-0000-0000-000000000002' $$), 0, 'bring items delete: member without event.edit');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows($$ UPDATE public.event_bring_items SET notes = 'x' WHERE id = 'b1000000-0000-0000-0000-000000000001' $$), 1, 'bring items update: full member with event.edit');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_bring_items WHERE id = 'b1000000-0000-0000-0000-000000000002' $$), 1, 'bring items delete: full member with event.edit');

-- ===========================================================================
-- event_bring_pledges (17)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.event_bring_pledges WHERE item = 'b1000000-0000-0000-0000-000000000001'), 2, 'pledges select: member');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.event_bring_pledges WHERE item = 'b1000000-0000-0000-0000-000000000001'), 0, 'pledges select: trial sees nothing');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.event_bring_pledges WHERE item = 'b1000000-0000-0000-0000-000000000001'), 0, 'pledges select: joinRequested sees nothing');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.event_bring_pledges WHERE item = 'b1000000-0000-0000-0000-000000000001'), 0, 'pledges select: non-member sees nothing');

SELECT tests.authenticate_as('sm_user');
SELECT lives_ok($$ INSERT INTO public.event_bring_pledges(id, event, item, qty, "user")
                   VALUES ('f1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, auth.uid()) $$,
  'pledges insert: member pledges for self');
SELECT throws_like(format($$ INSERT INTO public.event_bring_pledges(event, item, qty, "user")
                   VALUES ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, %L) $$, pg_temp.u('sm_user2')),
  '%row-level security%', 'pledges insert: not on behalf of others');
SELECT throws_like($$ INSERT INTO public.event_bring_pledges(event, item, qty, "user")
                   VALUES ('e1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 1, auth.uid()) $$,
  '%row-level security%', 'pledges insert: not when items are disabled for the event');
SELECT tests.authenticate_as('sm_trial');
SELECT throws_ok($$ INSERT INTO public.event_bring_pledges(event, item, qty, "user")
                   VALUES ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, auth.uid()) $$,
  'P0001', 'Unknown item referenced', 'pledges insert: trial rejected (item invisible to the invoker-rights sync trigger)');
SELECT tests.authenticate_as('sm_out');
SELECT throws_ok($$ INSERT INTO public.event_bring_pledges(event, item, qty, "user")
                   VALUES ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, auth.uid()) $$,
  'P0001', 'Unknown item referenced', 'pledges insert: non-member rejected (item invisible to the invoker-rights sync trigger)');

SELECT is(pg_temp.rows($$ UPDATE public.event_bring_pledges SET qty = 5 WHERE id = 'f1000000-0000-0000-0000-000000000001' $$), 0, 'pledges update: non-member with event.edit');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_bring_pledges WHERE id = 'f1000000-0000-0000-0000-000000000001' $$), 0, 'pledges delete: non-member with event.edit');
SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ UPDATE public.event_bring_pledges SET qty = 2 WHERE id = 'f1000000-0000-0000-0000-000000000003' $$), 1, 'pledges update: own pledge');
SELECT is(pg_temp.rows($$ UPDATE public.event_bring_pledges SET qty = 5 WHERE id = 'f1000000-0000-0000-0000-000000000001' $$), 0, 'pledges update: not someone else''s pledge');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_bring_pledges WHERE id = 'f1000000-0000-0000-0000-000000000001' $$), 0, 'pledges delete: not someone else''s pledge');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_bring_pledges WHERE id = 'f1000000-0000-0000-0000-000000000003' $$), 1, 'pledges delete: own pledge');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows($$ UPDATE public.event_bring_pledges SET qty = 3 WHERE id = 'f1000000-0000-0000-0000-000000000001' $$), 1, 'pledges update: editor updates others'' pledges');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_bring_pledges WHERE id = 'f1000000-0000-0000-0000-000000000002' $$), 1, 'pledges delete: editor deletes others'' pledges');

-- ===========================================================================
-- event_comments (21)
-- ===========================================================================
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000001'), 1, 'comments select: member with event.comment');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000001'), 1, 'comments select: group admin');
SELECT tests.authenticate_as('sm_trial');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000001'), 0, 'comments select: trial (even with event.comment) sees nothing');
SELECT tests.authenticate_as('sm_req');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000001'), 0, 'comments select: joinRequested sees nothing');
SELECT tests.authenticate_as('sm_out');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000001'), 0, 'comments select: non-member sees nothing');

SELECT tests.authenticate_as('sm_user');
SELECT lives_ok($$ INSERT INTO public.event_comments(id, "user", event, comment)
                   VALUES ('cc000000-0000-0000-0000-000000000002', auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'mine') $$,
  'comments insert: member comments');
SELECT throws_like(format($$ INSERT INTO public.event_comments("user", event, comment)
                   VALUES (%L, 'e1000000-0000-0000-0000-000000000001', 'fake') $$, pg_temp.u('sm_user2')),
  '%row-level security%', 'comments insert: not as another user');
SELECT lives_ok($$ INSERT INTO public.event_comments(id, "user", event, comment, reply_to)
                   VALUES ('cc000000-0000-0000-0000-000000000003', auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'reply', 'cc000000-0000-0000-0000-000000000001') $$,
  'comments insert: reply to a top-level comment');
SELECT throws_like($$ INSERT INTO public.event_comments("user", event, comment, reply_to)
                   VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'nested', 'cc000000-0000-0000-0000-000000000003') $$,
  '%row-level security%', 'comments insert: no reply to a reply');
SELECT tests.authenticate_as('sm_trial');
SELECT throws_like($$ INSERT INTO public.event_comments("user", event, comment) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 't') $$,
  '%row-level security%', 'comments insert: trial rejected');
SELECT tests.authenticate_as('sm_out');
SELECT throws_like($$ INSERT INTO public.event_comments("user", event, comment) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'o') $$,
  '%row-level security%', 'comments insert: non-member rejected');

SELECT tests.authenticate_as('sm_user');
SELECT is(pg_temp.rows($$ UPDATE public.event_comments SET comment = 'x' WHERE id = 'cc000000-0000-0000-0000-000000000002' $$), 1, 'comments update: own comment');
SELECT is(pg_temp.rows($$ UPDATE public.event_comments SET comment = 'x' WHERE id = 'cc000000-0000-0000-0000-000000000001' $$), 0, 'comments update: not someone else''s');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000001' $$), 0, 'comments delete: not someone else''s');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000003' $$), 1, 'comments delete: own comment');
SELECT tests.authenticate_as('sm_gadmin');
SELECT is(pg_temp.rows($$ UPDATE public.event_comments SET comment = 'x' WHERE id = 'cc000000-0000-0000-0000-000000000001' $$), 0, 'comments update: group admin cannot edit others');
SELECT is(pg_temp.rows($$ DELETE FROM public.event_comments WHERE id = 'cc000000-0000-0000-0000-000000000001' $$), 0, 'comments delete: group admin cannot delete others');

-- without event.comment a member loses access to comments
RESET ROLE;
DELETE FROM public.group_permissions WHERE "group" = 'a1000000-0000-0000-0000-000000000001' AND permission = 'event.comment';
SELECT tests.authenticate_as('sm_user');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE event = 'e1000000-0000-0000-0000-000000000001'), 0, 'comments select: member without event.comment sees nothing');
SELECT is(pg_temp.rows($$ UPDATE public.event_comments SET comment = 'y' WHERE id = 'cc000000-0000-0000-0000-000000000002' $$), 0, 'comments update: member without event.comment');
SELECT throws_like($$ INSERT INTO public.event_comments("user", event, comment) VALUES (auth.uid(), 'e1000000-0000-0000-0000-000000000001', 'n') $$,
  '%row-level security%', 'comments insert: member without event.comment');

SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT count(*) FROM public.event_comments $$, '42501', NULL, 'comments select: anon has no access');

SELECT * FROM finish();
ROLLBACK;
