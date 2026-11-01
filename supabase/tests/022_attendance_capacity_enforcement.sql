-- Data-layer enforcement: direct writes can't bypass the cap, and the trial cap-change promotes.
BEGIN;
SELECT plan(7);

\set grp '00000000-0000-0000-0000-000000000022'

INSERT INTO public.event_group(id, name, visible, is_public)
VALUES (:'grp','CapGrp', true, true) ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group","role") VALUES
  (tests.get_supabase_uid('user_1a'), :'grp', 'user'),
  (tests.get_supabase_uid('user_1b'), :'grp', 'user'),
  (tests.get_supabase_uid('user_2a'), :'grp', 'trial'),
  (tests.get_supabase_uid('user_2b'), :'grp', 'trial');

INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","maxAttendees")
VALUES ('cap-a','A','—', now()+interval '2 days', now()+interval '2 days 2 hours', :'grp', 1)
RETURNING id AS eva \gset

INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","maxAttendees","max_trial_attendees")
VALUES ('cap-b','B','—', now()+interval '3 days', now()+interval '3 days 2 hours', :'grp', 10, 1)
RETURNING id AS evb \gset

-- ============================================================================
-- A) Direct table writes are clamped (bypass closed)
-- ============================================================================
SELECT tests.authenticate_as('user_1a');
INSERT INTO public.event_attendance_user_mapping("user","event","state")
VALUES (tests.get_supabase_uid('user_1a'), :'eva'::uuid, 'Attending');

SELECT tests.authenticate_as('user_1b');
INSERT INTO public.event_attendance_user_mapping("user","event","state")
VALUES (tests.get_supabase_uid('user_1b'), :'eva'::uuid, 'Attending');  -- cap=1, voll -> Waiting

SELECT tests.authenticate_as_service_role();
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'eva'::uuid AND "user"=tests.get_supabase_uid('user_1b')),
          'Waiting', 'direkter INSERT über die Kapazität wird auf Waiting geclamped');

-- Try to jump the queue with a direct UPDATE.
SELECT tests.authenticate_as('user_1b');
UPDATE public.event_attendance_user_mapping SET state='Attending'
  WHERE event=:'eva'::uuid AND "user"=tests.get_supabase_uid('user_1b');

SELECT tests.authenticate_as_service_role();
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'eva'::uuid AND "user"=tests.get_supabase_uid('user_1b')),
          'Waiting', 'direktes UPDATE auf Attending wird ebenfalls geclamped');
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'eva'::uuid AND "user"=tests.get_supabase_uid('user_1a')),
          'Attending', 'A behält seinen Platz');

-- ============================================================================
-- B) Trial role + trial cap enforced at the data layer; trial cap-change promotes
-- ============================================================================
SELECT tests.authenticate_as('user_2a');
INSERT INTO public.event_attendance_user_mapping("user","event","state")
VALUES (tests.get_supabase_uid('user_2a'), :'evb'::uuid, 'Attending');  -- Trial-Rolle -> AttendingAsTrial

SELECT tests.authenticate_as('user_2b');
INSERT INTO public.event_attendance_user_mapping("user","event","state")
VALUES (tests.get_supabase_uid('user_2b'), :'evb'::uuid, 'Attending');  -- Trial voll -> WaitingAsTrial

SELECT tests.authenticate_as_service_role();
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'evb'::uuid AND "user"=tests.get_supabase_uid('user_2a')),
          'AttendingAsTrial', 'Trial-Nutzer wird datenseitig auf Trial-Platz gelegt (kein Regular-Seat via Direkt-Write)');
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'evb'::uuid AND "user"=tests.get_supabase_uid('user_2b')),
          'WaitingAsTrial', 'zweiter Trial-Nutzer auf Trial-Warteliste');

-- Raise the trial cap -> the trial waiter is promoted (was broken: used maxAttendees).
UPDATE public.events SET max_trial_attendees = 2 WHERE id=:'evb'::uuid;
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'evb'::uuid AND "user"=tests.get_supabase_uid('user_2b')),
          'AttendingAsTrial', 'Erhöhen von max_trial_attendees rückt den Trial-Wartenden nach');

-- ============================================================================
-- C) Raising the regular cap still promotes (clamp does not block it)
-- ============================================================================
UPDATE public.events SET "maxAttendees" = 2 WHERE id=:'eva'::uuid;
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'eva'::uuid AND "user"=tests.get_supabase_uid('user_1b')),
          'Attending', 'Erhöhen von maxAttendees rückt den regulären Wartenden nach');

SELECT * FROM finish();
ROLLBACK;
