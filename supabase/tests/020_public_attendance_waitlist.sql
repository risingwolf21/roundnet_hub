BEGIN;
\i 000_setup_tests_users.inc
SELECT plan(6);

\set grp   '00000000-0000-0000-0000-000000000004'

INSERT INTO public.event_group(id, name, visible, is_public) 
VALUES (:'grp','AttendGrp', true, true) ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group","role") VALUES
  (tests.get_supabase_uid('user_1a'), :'grp', 'user'),
  (tests.get_supabase_uid('user_1b'), :'grp', 'user'),
  (tests.get_supabase_uid('user_2a'), :'grp', 'user')
ON CONFLICT DO NOTHING;

INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","maxAttendees")
VALUES ('series-att','Train','—', now()+interval '2 days', now()+interval '2 days 2 hours', :'grp', 2)
RETURNING id \gset

-- UserA antwortet
SELECT tests.authenticate_as('user_1a');
SELECT ok( (SELECT (SELECT state FROM public.update_attendance(:'id'::uuid, tests.get_supabase_uid('user_1a'), 'Attending')) IS NOT NULL),
           'A antwortet Attending');

-- UserB antwortet
SELECT tests.authenticate_as('user_1b');
SELECT ok( (SELECT (SELECT state FROM public.update_attendance(:'id'::uuid, tests.get_supabase_uid('user_1b'), 'Attending')) IS NOT NULL),
           'B antwortet Attending');

-- UserC antwortet -> sollte Waiting (max=2)
SELECT tests.authenticate_as('user_2a');
SELECT is( (SELECT state FROM public.update_attendance(:'id'::uuid, tests.get_supabase_uid('user_2a'), 'Attending') LIMIT 1),
           'Waiting', 'C landet auf Warteliste');

-- Prüfe Zählung
SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Attending'), 2::bigint, '2 Attending');
SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Waiting'),   1::bigint, '1 Waiting');

-- maxAttendees erhöhen => Trigger hebt Waiting → Attending an
UPDATE public.events SET "maxAttendees" = 3 WHERE id=:'id'::uuid;
SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Attending'), 3::bigint, 'Promotion von Waiting');

-- wieder reduzieren => Letzte zurück auf Waiting
-- UPDATE public.events SET "maxAttendees" = 2 WHERE id=:'id'::uuid;
-- SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Attending'), 2::bigint, 'Demotion zurück');

SELECT * FROM finish();
ROLLBACK;
