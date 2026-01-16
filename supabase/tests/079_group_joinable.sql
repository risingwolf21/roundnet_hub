BEGIN;
\i 000_setup_tests_users.inc
SELECT plan(1);

\set grp   '00000000-0000-0000-0000-000000000004'
\set grp1   '00000000-0000-0000-0000-000000000005'
\set grp2   '00000000-0000-0000-0000-000000000006'

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join) 
VALUES (:'grp','Main Group', true, true, false) ON CONFLICT DO NOTHING;

INSERT INTO public.event_group(id, name, visible, is_public, need_request_to_join) 
VALUES (:'grp1','Group 1', true, true, true) ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group","role") VALUES
  (tests.get_supabase_uid('user_1a'), :'grp', 'user')
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1a');

SELECT is( (SELECT * FROM public.is_group_public_joinable(:'grp'::uuid)),
           TRUE, 'Main Group is joinable');

SELECT tests.authenticate_as('user_2a');

SELECT is( !(SELECT * FROM public.is_group_public_joinable(:'grp1'::uuid)),
           TRUE, 'Main Group is joinable');

SELECT * FROM finish();
ROLLBACK;