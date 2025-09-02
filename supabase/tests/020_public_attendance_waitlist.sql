BEGIN;
SELECT plan(7);

\set userA '00000000-0000-0000-0000-000000000001'
\set userB '00000000-0000-0000-0000-000000000002'
\set userC '00000000-0000-0000-0000-000000000003'
\set grp   '00000000-0000-0000-0000-000000000004'

INSERT INTO public."user"("userId","displayName") VALUES
  (:'userA','A'), (:'userB','B'), (:'userC','C')
ON CONFLICT DO NOTHING;

INSERT INTO public.event_group(id, name, visible, is_public) 
VALUES (:'grp','AttendGrp', true, true) ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group","role") VALUES
  (:'userA', :'grp', 'user'),
  (:'userB', :'grp', 'user'),
  (:'userC', :'grp', 'user')
ON CONFLICT DO NOTHING;

INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","maxAttendees")
VALUES ('series-att','Train','—', now()+interval '2 days', now()+interval '2 days 2 hours', :'grp', 2)
RETURNING id \gset

-- UserA antwortet
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'userA', true);
SELECT ok( (SELECT (SELECT state FROM public.update_attendance(:'id'::uuid, :'userA', 'Attending')) IS NOT NULL),
           'A antwortet Attending');

-- UserB antwortet
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'userB', true);
SELECT ok( (SELECT (SELECT state FROM public.update_attendance(:'id'::uuid, :'userB', 'Attending')) IS NOT NULL),
           'B antwortet Attending');

-- UserC antwortet -> sollte Waiting (max=2)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'userC', true);
SELECT is( (SELECT state FROM public.update_attendance(:'id'::uuid, :'userC', 'Attending') LIMIT 1),
           'Waiting', 'C landet auf Warteliste');

-- Prüfe Zählung
SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Attending'), 2::bigint, '2 Attending');
SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Waiting'),   1::bigint, '1 Waiting');

-- maxAttendees erhöhen => Trigger hebt Waiting → Attending an
UPDATE public.events SET "maxAttendees" = 3 WHERE id=:'id'::uuid;
SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Attending'), 2::bigint, 'Promotion von Waiting');

-- wieder reduzieren => Letzte zurück auf Waiting
UPDATE public.events SET "maxAttendees" = 2 WHERE id=:'id'::uuid;
SELECT is( (SELECT count(*) FROM public.event_attendance_user_mapping WHERE event=:'id'::uuid AND state='Attending'), 2::bigint, 'Demotion zurück');

SELECT * FROM finish();
ROLLBACK;
