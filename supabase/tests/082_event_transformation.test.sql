-- Tests for the event-transformation engine (run_event_transformations ->
-- apply_transformation_to_event, 20251205065159 / 20260128184754).
--
-- A transformation rewrites a due occurrence (matched by event key, within lead_time,
-- not older than 2 days) when its trigger condition holds, logs an application row, and
-- never re-applies. run_event_transformations() walks every active rule globally, so we
-- assert on the EFFECT on our own events / application rows (deterministic regardless of
-- any other seed data) rather than on the global applied-count return value.
--
-- Unique event keys per scenario avoid collisions with other rules.

BEGIN;
SET LOCAL TIME ZONE 'UTC';
SELECT plan(7);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

\set grp '00000000-0000-0000-0000-000000000042'

-- ---------------------------------------------------------------------------
-- Scenario A: due event, 0 attending, trigger attending_lt:1 -> APPLIED
--   next: retitle to 'Freies Spiel' and drop the answer deadline.
-- ---------------------------------------------------------------------------
INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","answerDeadline","group",place,items_enabled)
VALUES ('tr082-a','Training A','Woechentlich','Weekly', now()+interval '1 day', now()+interval '1 day'+interval '2 hours', now(), :'grp', 'Halle 1', false)
RETURNING id AS ev_a \gset

INSERT INTO public.event_transformations(id,event_key,created_by,created_at,lead_time,trigger,next,one_time,active,reason)
VALUES ('aa000000-0000-0000-0000-0000000000a1','tr082-a', tests.get_supabase_uid('user_1a'), now(),
        '25:00:00', '{"attending_lt": 1}',
        '{"title": "Freies Spiel", "disableAnswerDeadline": true}', false, true, null);

-- ---------------------------------------------------------------------------
-- Scenario B: due event but 1 attending -> trigger NOT met -> NOT applied
-- ---------------------------------------------------------------------------
INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","answerDeadline","group",place,items_enabled)
VALUES ('tr082-b','Training B','Woechentlich','Weekly', now()+interval '1 day', now()+interval '1 day'+interval '2 hours', now(), :'grp', 'Halle 1', false)
RETURNING id AS ev_b \gset

INSERT INTO public.event_transformations(id,event_key,created_by,created_at,lead_time,trigger,next,one_time,active,reason)
VALUES ('bb000000-0000-0000-0000-0000000000b1','tr082-b', tests.get_supabase_uid('user_1a'), now(),
        '25:00:00', '{"attending_lt": 1}',
        '{"title": "Freies Spiel"}', false, true, null);

INSERT INTO public.event_attendance_user_mapping("user","event","state")
VALUES (tests.get_supabase_uid('user_1a'), :'ev_b'::uuid, 'Attending');

-- ---------------------------------------------------------------------------
-- Scenario C: event not yet due (starting - lead_time > now) -> NOT applied
-- ---------------------------------------------------------------------------
INSERT INTO public.events("key","title","description","recurrence","startingDateTime","endDateTime","answerDeadline","group",place,items_enabled)
VALUES ('tr082-c','Training C','Woechentlich','Weekly', now()+interval '10 days', now()+interval '10 days'+interval '2 hours', now()+interval '9 days', :'grp', 'Halle 1', false)
RETURNING id AS ev_c \gset

INSERT INTO public.event_transformations(id,event_key,created_by,created_at,lead_time,trigger,next,one_time,active,reason)
VALUES ('cc000000-0000-0000-0000-0000000000c1','tr082-c', tests.get_supabase_uid('user_1a'), now(),
        '01:00:00', '{"attending_lt": 1}',
        '{"title": "Freies Spiel"}', false, true, null);

-- Run the engine.
SELECT public.run_event_transformations();

-- A: applied -----------------------------------------------------------------
SELECT is((SELECT title FROM public.events WHERE id = :'ev_a'::uuid),
          'Freies Spiel', 'A: due event with trigger met is retitled');
SELECT ok((SELECT "answerDeadline" FROM public.events WHERE id = :'ev_a'::uuid) IS NULL,
          'A: disableAnswerDeadline cleared the answer deadline');
SELECT is((SELECT count(*)::int FROM public.event_transformation_applications
            WHERE transformation_id = 'aa000000-0000-0000-0000-0000000000a1' AND event_id = :'ev_a'::uuid),
          1, 'A: exactly one application logged');

-- B: not applied (trigger condition not met) ---------------------------------
SELECT is((SELECT title FROM public.events WHERE id = :'ev_b'::uuid),
          'Training B', 'B: event with >=1 attending is left untouched (attending_lt not met)');
SELECT is((SELECT count(*)::int FROM public.event_transformation_applications
            WHERE transformation_id = 'bb000000-0000-0000-0000-0000000000b1' AND event_id = :'ev_b'::uuid),
          0, 'B: no application logged when the trigger is not met');

-- C: not applied (not due yet) -----------------------------------------------
SELECT is((SELECT title FROM public.events WHERE id = :'ev_c'::uuid),
          'Training C', 'C: event outside its lead_time window is not transformed');

-- Idempotency: re-running does not apply A a second time ----------------------
SELECT public.run_event_transformations();
SELECT is((SELECT count(*)::int FROM public.event_transformation_applications
            WHERE transformation_id = 'aa000000-0000-0000-0000-0000000000a1' AND event_id = :'ev_a'::uuid),
          1, 'A: re-running the engine does not re-apply (idempotent)');

SELECT * FROM finish();
ROLLBACK;
