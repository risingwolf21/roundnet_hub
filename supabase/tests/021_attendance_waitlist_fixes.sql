-- Regression tests for the waitlist hardening (20261101120000_attendance_waitlist_fixes).
BEGIN;
SELECT plan(13);

\set grp '00000000-0000-0000-0000-000000000021'

INSERT INTO public.event_group(id, name, visible, is_public)
VALUES (:'grp','WaitlistGrp', true, true) ON CONFLICT DO NOTHING;

INSERT INTO public.group_user_mapping("user","group","role") VALUES
  (tests.get_supabase_uid('user_1a'), :'grp', 'user'),
  (tests.get_supabase_uid('user_1b'), :'grp', 'user'),
  (tests.get_supabase_uid('user_1c'), :'grp', 'user'),
  (tests.get_supabase_uid('user_2a'), :'grp', 'trial'),
  (tests.get_supabase_uid('user_2b'), :'grp', 'trial');

-- ============================================================================
-- A) Only one decline-promotion trigger remains (legacy dropped)
-- ============================================================================
SELECT is(
  (SELECT count(*)::int FROM pg_trigger
     WHERE tgrelid = 'public.event_attendance_user_mapping'::regclass
       AND tgname = 'WaitingListAttendanceTrigger'),
  0, 'legacy WaitingListAttendanceTrigger is gone');
SELECT is(
  (SELECT count(*)::int FROM pg_trigger
     WHERE tgrelid = 'public.event_attendance_user_mapping'::regclass
       AND tgname = 'trg_auto_promote_waitinglist'),
  1, 'auto_promote trigger is the single decline-promotion path');

-- ============================================================================
-- B) Capacity + self re-confirm + FIFO promotion (regular pool), cap = 1
-- ============================================================================
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","maxAttendees")
VALUES ('wl-reg','Reg','—', now()+interval '2 days', now()+interval '2 days 2 hours', :'grp', 1)
RETURNING id AS reg \gset

SELECT tests.authenticate_as('user_1a');
SELECT is((SELECT state FROM public.update_attendance(:'reg'::uuid, tests.get_supabase_uid('user_1a'),'Attending') LIMIT 1),
          'Attending', 'A nimmt den einzigen Platz');

SELECT tests.authenticate_as('user_1b');
SELECT is((SELECT state FROM public.update_attendance(:'reg'::uuid, tests.get_supabase_uid('user_1b'),'Attending') LIMIT 1),
          'Waiting', 'B landet auf der Warteliste (voll)');

SELECT tests.authenticate_as('user_1c');
SELECT is((SELECT state FROM public.update_attendance(:'reg'::uuid, tests.get_supabase_uid('user_1c'),'Attending') LIMIT 1),
          'Waiting', 'C landet ebenfalls auf der Warteliste');

-- Self re-confirm while full must NOT demote A to the waitlist.
SELECT tests.authenticate_as('user_1a');
SELECT is((SELECT state FROM public.update_attendance(:'reg'::uuid, tests.get_supabase_uid('user_1a'),'Attending') LIMIT 1),
          'Attending', 'erneutes Zusagen bei vollem Event behält den Platz (kein Self-Count-Bug)');

-- A declines -> oldest waiter (B) is promoted, not C (FIFO by lastUpdate).
SELECT public.update_attendance(:'reg'::uuid, tests.get_supabase_uid('user_1a'),'Declined');
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'reg'::uuid AND "user"=tests.get_supabase_uid('user_1b')),
          'Attending', 'B rückt als ältester Wartender nach');
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'reg'::uuid AND "user"=tests.get_supabase_uid('user_1c')),
          'Waiting', 'C bleibt auf der Warteliste (FIFO)');
SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event=:'reg'::uuid AND state='Attending'),
          1, 'weiterhin genau 1 Teilnehmer (kein Overbooking durch Promotion)');

-- ============================================================================
-- C) Regular and trial pools are independent on promotion
--    maxAttendees = 1, max_trial_attendees = 1
-- ============================================================================
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","maxAttendees","max_trial_attendees","trials_open")
VALUES ('wl-mix','Mix','—', now()+interval '3 days', now()+interval '3 days 2 hours', :'grp', 1, 1, true)
RETURNING id AS mix \gset

-- regular seat + regular waiter
SELECT tests.authenticate_as('user_1a');
SELECT public.update_attendance(:'mix'::uuid, tests.get_supabase_uid('user_1a'),'Attending');
SELECT tests.authenticate_as('user_1b');
SELECT public.update_attendance(:'mix'::uuid, tests.get_supabase_uid('user_1b'),'Attending');  -- -> Waiting

-- trial seat + trial waiter (trial-role users get the *AsTrial variants)
SELECT tests.authenticate_as('user_2a');
SELECT is((SELECT state FROM public.update_attendance(:'mix'::uuid, tests.get_supabase_uid('user_2a'),'Attending') LIMIT 1),
          'AttendingAsTrial', 'Trial-Nutzer nimmt den Trial-Platz');
SELECT tests.authenticate_as('user_2b');
SELECT is((SELECT state FROM public.update_attendance(:'mix'::uuid, tests.get_supabase_uid('user_2b'),'Attending') LIMIT 1),
          'WaitingAsTrial', 'zweiter Trial-Nutzer auf Trial-Warteliste');

-- The regular attendee declines -> the REGULAR waiter is promoted, the trial waiter stays put.
SELECT tests.authenticate_as('user_1a');
SELECT public.update_attendance(:'mix'::uuid, tests.get_supabase_uid('user_1a'),'Declined');
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'mix'::uuid AND "user"=tests.get_supabase_uid('user_1b')),
          'Attending', 'frei gewordener Regular-Platz zieht den Regular-Wartenden nach');
SELECT is((SELECT state FROM public.event_attendance_user_mapping WHERE event=:'mix'::uuid AND "user"=tests.get_supabase_uid('user_2b')),
          'WaitingAsTrial', 'Trial-Wartender bleibt (Pools getrennt)');

SELECT * FROM finish();
ROLLBACK;
