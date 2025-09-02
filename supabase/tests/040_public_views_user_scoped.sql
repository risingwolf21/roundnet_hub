BEGIN;
SELECT plan(4);

\set u '00000000-0000-0000-0000-000000000001'
\set g '00000000-0000-0000-0000-000000000002'

INSERT INTO public."user"("userId","displayName") VALUES (:'u','Viewer') ON CONFLICT DO NOTHING;
INSERT INTO public.event_group(id, name, visible, is_public) VALUES (:'g','ViewGrp', true, true) ON CONFLICT DO NOTHING;
INSERT INTO public.group_user_mapping("user","group","role") VALUES (:'u', :'g', 'user') ON CONFLICT DO NOTHING;

INSERT INTO public.events("key","title","startingDateTime","endDateTime","group","recurrence")
VALUES ('series-v','View','2025-03-01 18:00+00','2025-03-01 20:00+00', :'g', 'Weekly')
RETURNING id \gset

-- Attendance setzen
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'u', true);
SELECT state FROM public.update_attendance(:'id'::uuid, :'u', 'Attending');

-- View prüfen
SELECT is( (SELECT user_state FROM public.events_user_view WHERE id=:'id'::uuid), 'Attending', 'user_state Attending');
SELECT is( (SELECT attending_count FROM public.events_user_view WHERE id=:'id'::uuid), 1::bigint, 'attending_count=1');
SELECT is( (SELECT declined_count  FROM public.events_user_view WHERE id=:'id'::uuid), 0::bigint, 'declined_count=0');

-- Sichtbarkeit nur, wenn im selben Group-Kontext (implizit über RLS der Basistabellen)
SELECT is( (SELECT count(*) FROM public.events_user_view WHERE key='series-v'), 1::bigint, 'User sieht eigenes Event');

SELECT * FROM finish();
ROLLBACK;
