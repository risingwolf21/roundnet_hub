-- 20261113120000_parent_members_see_subgroup_events: members of a parent group see events,
-- attendance and comments of its visible subgroups (view only); hidden or private subgroups,
-- trial members of the parent and outsiders see nothing.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(14);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT tests.create_supabase_user(n, n || '@subgroup-events.test')
FROM unnest(ARRAY['ps_parent','ps_trial','ps_sub','ps_out']) n;

\set parent  '00000000-0000-0000-0000-0000000011f1'
\set sub     '00000000-0000-0000-0000-0000000011f2'
\set hidden  '00000000-0000-0000-0000-0000000011f3'
\set private '00000000-0000-0000-0000-0000000011f4'

INSERT INTO public.event_group(id, name, visible, is_public, parent_group) VALUES
  (:'parent',  'PS Parent',  true,  true, NULL);
INSERT INTO public.event_group(id, name, visible, is_public, parent_group) VALUES
  (:'sub',     'PS Sub',     true,  true,  :'parent'),
  (:'hidden',  'PS Hidden',  false, true,  :'parent'),
  (:'private', 'PS Private', true,  false, :'parent');

INSERT INTO public.group_user_mapping("user","group",role) VALUES
  (tests.get_supabase_uid('ps_parent'), :'parent', 'user'),
  (tests.get_supabase_uid('ps_trial'),  :'parent', 'trial'),
  (tests.get_supabase_uid('ps_sub'),    :'sub',    'user');

INSERT INTO public.user_direct_grants("user", kind, key) VALUES
  (tests.get_supabase_uid('ps_parent'), 'perm', 'event.comment'),
  (tests.get_supabase_uid('ps_parent'), 'perm', 'event.signup');

INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES ('ps-sub','Sub','—', now()+interval '1 day', now()+interval '1 day 2 hours', :'sub') RETURNING id AS es \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES ('ps-hidden','Hidden','—', now()+interval '1 day', now()+interval '1 day 2 hours', :'hidden') RETURNING id AS eh \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES ('ps-private','Private','—', now()+interval '1 day', now()+interval '1 day 2 hours', :'private') RETURNING id AS ep \gset

INSERT INTO public.event_attendance_user_mapping("user", event, state)
VALUES (tests.get_supabase_uid('ps_sub'), :'es', 'Attending');
INSERT INTO public.event_comments("user", event, comment)
VALUES (tests.get_supabase_uid('ps_sub'), :'es', 'hallo');

-- A) Member of the parent group: sees the visible subgroup's event, read only.
SELECT tests.authenticate_as('ps_parent');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = :'es'::uuid), 1, 'parent member sees the event of a visible subgroup');
SELECT is((SELECT user_group_role::text FROM public.events_user_view WHERE id = :'es'::uuid), NULL, 'it is in events_user_view without a group role');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = :'es'::uuid), 1, 'parent member sees the attendance');
SELECT is((SELECT count(*)::int FROM public.event_comments WHERE event = :'es'::uuid), 1, 'parent member sees the comments');
SELECT is((SELECT count(*)::int FROM public.events WHERE id IN (:'eh'::uuid, :'ep'::uuid)), 0, 'not the events of hidden or private subgroups');

SELECT throws_ok(
  format($$INSERT INTO public.event_attendance_user_mapping("user", event, state) VALUES (%L, %L, 'Attending')$$,
         tests.get_supabase_uid('ps_parent'), :'es'),
  '42501', NULL, 'parent member cannot sign up');
SELECT throws_ok(
  format($$INSERT INTO public.event_comments("user", event, comment) VALUES (%L, %L, 'x')$$,
         tests.get_supabase_uid('ps_parent'), :'es'),
  '42501', NULL, 'parent member cannot comment');
UPDATE public.events SET title = 'Changed' WHERE id = :'es'::uuid;
SELECT is((SELECT title FROM public.events WHERE id = :'es'::uuid), 'Sub', 'parent member cannot edit the event');

-- B) Trial member of the parent group and outsider: nothing.
SELECT tests.authenticate_as('ps_trial');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = :'es'::uuid), 0, 'trial member of the parent does not see it');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = :'es'::uuid), 0, 'nor its attendance');

SELECT tests.authenticate_as('ps_out');
SELECT is((SELECT count(*)::int FROM public.events WHERE id = :'es'::uuid), 0, 'outsider does not see it');
SELECT is((SELECT count(*)::int FROM public.events_user_view WHERE id = :'es'::uuid), 0, 'nor in events_user_view');

-- C) Member of the subgroup: unchanged, with their group role.
SELECT tests.authenticate_as('ps_sub');
SELECT is((SELECT user_group_role::text FROM public.events_user_view WHERE id = :'es'::uuid), 'user', 'subgroup member sees it with their role');
SELECT is((SELECT user_state::text FROM public.events_user_view WHERE id = :'es'::uuid), 'Attending', 'and their own attendance');

SELECT * FROM finish();
ROLLBACK;
