-- Regression tests for 20261106090000_ugc_moderation.sql
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(20);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@ugc-test.local')
FROM unnest(ARRAY['ugc_author', 'ugc_reader', 'ugc_other', 'ugc_mod', 'ugc_outsider']) n;

CREATE FUNCTION pg_temp.u(text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT tests.get_supabase_uid($1) $$;
CREATE FUNCTION pg_temp.rows(q text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int; BEGIN EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT; RETURN n; END $$;

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join)
VALUES ('b2000000-0000-0000-0000-000000000001', 'UGC G', true, true, false);

INSERT INTO public.permissions(name) VALUES ('event.comment') ON CONFLICT DO NOTHING;
INSERT INTO public.group_permissions("group", permission)
VALUES ('b2000000-0000-0000-0000-000000000001', 'event.comment') ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user", "group", role)
SELECT pg_temp.u(n), 'b2000000-0000-0000-0000-000000000001', 'user'
FROM unnest(ARRAY['ugc_author', 'ugc_reader', 'ugc_other', 'ugc_mod']) n;

INSERT INTO public.user_direct_grants("user", kind, key)
VALUES (pg_temp.u('ugc_mod'), 'perm', 'moderation.manage');

INSERT INTO public.events(id, "key", title, description, recurrence, "startingDateTime", "endDateTime", "group")
VALUES ('b2000000-0000-0000-0000-0000000000e1', 'ugc-e1', 'UGC', '', 'None', now() + interval '1 day', now() + interval '1 day 2 hours',
        'b2000000-0000-0000-0000-000000000001');

INSERT INTO public.event_comments(id, "user", event, comment, "displayName")
VALUES ('b2000000-0000-0000-0000-0000000000c1', pg_temp.u('ugc_author'), 'b2000000-0000-0000-0000-0000000000e1', 'rude text', 'Author'),
       ('b2000000-0000-0000-0000-0000000000c2', pg_temp.u('ugc_other'), 'b2000000-0000-0000-0000-0000000000e1', 'hello', 'Other');
INSERT INTO public.event_comments(id, "user", event, comment, "displayName", reply_to)
VALUES ('b2000000-0000-0000-0000-0000000000c3', pg_temp.u('ugc_other'), 'b2000000-0000-0000-0000-0000000000e1', 'reply', 'Other',
        'b2000000-0000-0000-0000-0000000000c1');

-- Reporting
SELECT tests.authenticate_as('ugc_reader');
SELECT lives_ok($$ INSERT INTO public.content_reports(reporter, comment_id, reason)
  VALUES (pg_temp.u('ugc_reader'), 'b2000000-0000-0000-0000-0000000000c1', 'harassment') $$, 'member reports a comment');
SELECT is((SELECT reported_user FROM public.content_reports WHERE comment_id = 'b2000000-0000-0000-0000-0000000000c1'),
  pg_temp.u('ugc_author'), 'reported user is taken from the comment');
SELECT is((SELECT comment_text FROM public.content_reports WHERE comment_id = 'b2000000-0000-0000-0000-0000000000c1'),
  'rude text', 'text is kept in the report');
SELECT throws_like($$ INSERT INTO public.content_reports(reporter, comment_id, reason)
  VALUES (pg_temp.u('ugc_reader'), 'b2000000-0000-0000-0000-0000000000c1', 'spam') $$, '%duplicate key%', 'same comment cannot be reported twice');
SELECT throws_like($$ INSERT INTO public.content_reports(reporter, comment_id, reason)
  VALUES (pg_temp.u('ugc_other'), 'b2000000-0000-0000-0000-0000000000c1', 'spam') $$, '%row-level security%', 'cannot report in the name of someone else');
SELECT throws_ok($$ INSERT INTO public.content_reports(reporter, comment_id, reason, status)
  VALUES (pg_temp.u('ugc_reader'), 'b2000000-0000-0000-0000-0000000000c2', 'bogus', 'open') $$, '23514', NULL, 'unknown reasons are rejected');
SELECT is((SELECT status FROM public.content_reports WHERE reporter = pg_temp.u('ugc_reader')), 'open', 'reports start open');

SELECT tests.authenticate_as('ugc_outsider');
SELECT throws_like($$ INSERT INTO public.content_reports(reporter, comment_id, reason)
  VALUES (pg_temp.u('ugc_outsider'), 'b2000000-0000-0000-0000-0000000000c1', 'spam') $$, '%row-level security%', 'non-members cannot report comments they cannot see');
SELECT is((SELECT count(*)::int FROM public.content_reports), 0, 'reports are private for outsiders');

SELECT tests.authenticate_as('ugc_author');
SELECT throws_like($$ INSERT INTO public.content_reports(reporter, comment_id, reason)
  VALUES (pg_temp.u('ugc_author'), 'b2000000-0000-0000-0000-0000000000c1', 'spam') $$, '%own content%', 'own content cannot be reported');
SELECT is((SELECT count(*)::int FROM public.content_reports), 0, 'the reported user does not see reports');

-- Moderation
SELECT tests.authenticate_as('ugc_mod');
SELECT is((SELECT count(*)::int FROM public.content_reports WHERE status = 'open' AND comment_id = 'b2000000-0000-0000-0000-0000000000c1'), 1, 'moderators see open reports');
SELECT tests.authenticate_as('ugc_reader');
SELECT throws_ok($$ SELECT public.moderate_report((SELECT id FROM public.content_reports WHERE comment_id = 'b2000000-0000-0000-0000-0000000000c1'), 'remove') $$, '42501', NULL,
  'normal members cannot moderate');
SELECT tests.authenticate_as('ugc_mod');
SELECT lives_ok($$ SELECT public.moderate_report((SELECT id FROM public.content_reports WHERE comment_id = 'b2000000-0000-0000-0000-0000000000c1'), 'remove') $$, 'moderator removes the comment');
SELECT tests.authenticate_as_service_role();
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE id = 'b2000000-0000-0000-0000-0000000000c1'), 0, 'comment is gone');
SELECT ok((SELECT reply_to IS NULL FROM public.event_comments WHERE id = 'b2000000-0000-0000-0000-0000000000c3'), 'replies survive as top-level comments');
SELECT ok((SELECT status = 'removed' AND handled_by = pg_temp.u('ugc_mod') AND comment_text = 'rude text' FROM public.content_reports WHERE comment_text = 'rude text'),
  'report is closed and keeps the text');

-- Blocking
SELECT tests.authenticate_as('ugc_reader');
INSERT INTO public.user_blocks(blocker, blocked) VALUES (pg_temp.u('ugc_reader'), pg_temp.u('ugc_other'));
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE "user" = pg_temp.u('ugc_other')), 0, 'blocked users comments are hidden');
SELECT tests.authenticate_as('ugc_author');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE "user" = pg_temp.u('ugc_other')), 2, 'others still see them');
SELECT tests.authenticate_as('ugc_reader');
SELECT is(pg_temp.rows($$ DELETE FROM public.user_blocks WHERE blocker = pg_temp.u('ugc_reader') $$), 1, 'unblocking works');

SELECT * FROM finish();
ROLLBACK;
