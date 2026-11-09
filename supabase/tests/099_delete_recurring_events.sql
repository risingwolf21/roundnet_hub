-- Tests for public.delete_recurring_events(p_key, p_start_time) (20251205065159).
--
-- "Delete this & all future": removes every event sharing the key whose start is at/after the
-- cutoff (with its attendance / pledges / bring-items / comments), leaves earlier occurrences
-- intact, and stamps recurrenceEnd = cutoff on the latest surviving occurrence. It returns one
-- summary row per deleted event plus one for the recurrence update.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(6);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

\set grp '00000000-0000-0000-0000-000000000042'
\set k   'del-rec-series'

-- Past occurrence (kept) + two future occurrences (deleted by the cutoff = now()).
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES (:'k','Past','—', now()-interval '5 days', now()-interval '5 days'+interval '2 hours', :'grp');
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES (:'k','Fut1','—', now()+interval '2 days', now()+interval '2 days'+interval '2 hours', :'grp')
RETURNING id AS fut1 \gset
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES (:'k','Fut2','—', now()+interval '9 days', now()+interval '9 days'+interval '2 hours', :'grp');

-- A child row on the first future occurrence, to prove the cascade.
INSERT INTO public.event_attendance_user_mapping("user","event","state")
VALUES (tests.get_supabase_uid('user_1a'), :'fut1'::uuid, 'Attending');

-- Run the delete, capturing its summary rows.
CREATE TEMP TABLE delres AS SELECT * FROM public.delete_recurring_events(:'k', now());

SELECT is((SELECT coalesce(sum(deleted_event),0)::int FROM delres),
          2, 'reports two future occurrences deleted');
SELECT is((SELECT count(*)::int FROM delres WHERE recurrence_updated),
          1, 'reports exactly one recurrence-end update');

SELECT is((SELECT count(*)::int FROM public.events WHERE key = :'k' AND "startingDateTime" > now()),
          0, 'both future occurrences are gone');
SELECT is((SELECT count(*)::int FROM public.events WHERE key = :'k'),
          1, 'the past occurrence is kept');

SELECT is((SELECT "recurrenceEnd" FROM public.events WHERE key = :'k'),
          now(), 'the surviving occurrence has recurrenceEnd set to the cutoff');

SELECT is((SELECT count(*)::int FROM public.event_attendance_user_mapping WHERE event = :'fut1'::uuid),
          0, 'a deleted occurrence''s attendance is cascaded away');

SELECT * FROM finish();
ROLLBACK;
