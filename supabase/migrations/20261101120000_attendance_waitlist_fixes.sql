-- Waitlist hardening for event attendance.
--
-- Fixes:
--  1. Two promotion triggers existed on event_attendance_user_mapping — the legacy
--     WaitingListAttendanceTrigger (fires first by name, no notification, ignores trials) shadowed
--     the newer auto_promote_from_waitinglist (which sends the "you moved up" notification). Drop
--     the legacy one so auto_promote is the single decline-promotion path.
--  2. update_attendance counted the actor's OWN row, so re-confirming "Attending" on a full event
--     demoted the user to the waitlist. Exclude the actor's own row from the capacity count.
--  3. The FIFO key "lastUpdate" was not refreshed on a state change (ON CONFLICT updated only
--     state), so a returning user kept a stale (old) timestamp and jumped the queue. Refresh it.
--  4. Signup capacity was a check-then-insert with no lock (concurrent signups could overbook).
--     Serialize per event with a transaction-scoped advisory lock.
--  5. auto_promote mixed the regular and trial pools (counted both against maxAttendees and
--     promoted any waiter). Treat the two pools separately: a freed regular seat promotes a
--     regular waiter against maxAttendees; a freed trial seat promotes a trial waiter against
--     max_trial_attendees.
--
-- NOT changed here (documented follow-up): direct writes to the table still bypass the capacity
-- logic, because capacity lives in the update_attendance RPC (SECURITY INVOKER) and several
-- INVOKER trigger functions legitimately write attending states as the acting user. Closing that
-- safely needs a dedicated refactor (make all attendance writers SECURITY DEFINER + restrict RLS).

-- 1) Drop the legacy promotion trigger + function ---------------------------------------------
DROP TRIGGER IF EXISTS "WaitingListAttendanceTrigger" ON public.event_attendance_user_mapping;
DROP FUNCTION IF EXISTS public.trg_update_waiting_list_attendance();
DROP FUNCTION IF EXISTS public.updatewaitinglistattendance();

-- 2) Harden the signup RPC --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_attendance(p_event uuid, p_user uuid, p_state public."EventAttendance")
 RETURNS SETOF public.event_attendance_user_mapping
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_is_member   boolean;
  v_event_open  boolean;
  v_max         numeric;
  v_max_trial   numeric;
  v_accepted    bigint;
  v_accepted_trial bigint;
  v_is_trial    boolean;
  v_final_state public."EventAttendance";
BEGIN
  -- 1) Actor muss Mitglied der Event-Gruppe sein
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'forbidden: not a member of the event''s group' USING ERRCODE = '42501';
  END IF;

  -- 2) Event offen & nicht abgesagt
  SELECT (e."startingDateTime" > now() AND e."isCancelled" = FALSE)
  FROM public.events e
  WHERE e.id = p_event
  INTO v_event_open;

  IF COALESCE(v_event_open, false) = false THEN
    RAISE EXCEPTION 'event closed: cannot change attendance' USING ERRCODE = '22023';
  END IF;

  -- 3) Für andere zu-/absagen nur mit Permission
  IF p_user <> auth.uid() AND NOT public.authorize('event.manage.attendees') THEN
    RAISE EXCEPTION 'forbidden: cannot update other user''s attendance' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent signups for the SAME event so the count-then-insert below is atomic
  -- (otherwise two parallel calls could both pass the capacity check and overbook).
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('attendance:' || p_event::text)::bigint);

  -- 4) Kapazität (Accepted zählt) — OHNE die eigene Zeile, sonst würde ein erneutes Zusagen bei
  --    vollem Event den Nutzer auf die Warteliste schieben.
  SELECT e."maxAttendees" INTO v_max FROM public.events e WHERE e.id = p_event;
  SELECT e."max_trial_attendees" INTO v_max_trial FROM public.events e WHERE e.id = p_event;

  SELECT COUNT(*)::bigint
  INTO v_accepted
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'Attending'
    AND m."user" <> p_user;

  SELECT COUNT(*)::bigint
  INTO v_accepted_trial
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'AttendingAsTrial'
    AND m."user" <> p_user;

  -- 5) Ziel-State bestimmen. WICHTIG: Trial-Rolle ZUERST bestimmen, damit ein Trial-Nutzer
  --    gegen die Trial-Kapazität geprüft wird und nicht fälschlich an der (ggf. vollen)
  --    regulären Kapazität scheitert.
  v_is_trial := EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = p_user
      AND gum."role" = 'trial'
  );

  IF p_state = 'Declined' THEN
    v_final_state := 'Declined';

  ELSIF v_is_trial THEN
    -- Trial-Nutzer landen immer in den Trial-Zuständen; Kapazität = max_trial_attendees.
    IF p_state IN ('Attending', 'AttendingAsTrial')
       AND NOT (v_max_trial IS NOT NULL AND v_accepted_trial >= v_max_trial) THEN
      v_final_state := 'AttendingAsTrial';
    ELSE
      v_final_state := 'WaitingAsTrial';
    END IF;

  ELSIF p_state = 'Attending' AND v_max IS NOT NULL AND v_accepted >= v_max THEN
    v_final_state := 'Waiting';

  ELSIF p_state = 'AttendingAsTrial' AND v_max_trial IS NOT NULL AND v_accepted_trial >= v_max_trial THEN
    v_final_state := 'WaitingAsTrial';

  ELSE
    v_final_state := p_state;
  END IF;

  -- 6) Upsert — lastUpdate IMMER mitschreiben, damit die Warteschlangen-Reihenfolge (FIFO nach
  --    lastUpdate) den Zeitpunkt des aktuellen Zustandswechsels widerspiegelt.
  RETURN QUERY
  INSERT INTO public.event_attendance_user_mapping("user","event","state","lastUpdate")
  VALUES (p_user, p_event, v_final_state, now())
  ON CONFLICT ("user","event") DO UPDATE
  SET state = EXCLUDED.state,
      "lastUpdate" = now()
  RETURNING *;
END;
$function$;

-- 3) Per-pool auto-promotion on a decline ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_promote_from_waitinglist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_cap         numeric;
  v_count       integer;
  v_waiting_state text;
  v_attending_state text;
  v_next_user   uuid;
BEGIN
  -- Only when someone who occupied a seat drops out.
  IF NEW.state <> 'Declined' THEN
    RETURN NEW;
  END IF;

  IF OLD.state = 'Attending' THEN
    v_waiting_state := 'Waiting';
    v_attending_state := 'Attending';
    SELECT "maxAttendees" INTO v_cap FROM public.events WHERE id = NEW.event;
  ELSIF OLD.state = 'AttendingAsTrial' THEN
    v_waiting_state := 'WaitingAsTrial';
    v_attending_state := 'AttendingAsTrial';
    SELECT max_trial_attendees INTO v_cap FROM public.events WHERE id = NEW.event;
  ELSE
    RETURN NEW;  -- was not occupying a seat
  END IF;

  -- No cap on this pool => there is no waitlist for it.
  IF v_cap IS NULL THEN
    RETURN NEW;
  END IF;

  -- Seat still full for this pool? nothing to do.
  SELECT COUNT(*) INTO v_count
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event AND state = v_attending_state::public."EventAttendance";

  IF v_count >= v_cap THEN
    RETURN NEW;
  END IF;

  -- Oldest waiter in the SAME pool.
  SELECT "user" INTO v_next_user
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event AND state = v_waiting_state::public."EventAttendance"
  ORDER BY "lastUpdate" ASC
  LIMIT 1;

  IF v_next_user IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.event_attendance_user_mapping
  SET state = v_attending_state::public."EventAttendance",
      "lastUpdate" = now()
  WHERE event = NEW.event AND "user" = v_next_user;

  PERFORM notifications.enqueue_notification(
    p_user    := v_next_user,
    p_title   := 'Du bist aufgerückt!',
    p_body    := 'Ein Platz wurde frei. Du bist von der Warteliste auf die Teilnehmerliste gerutscht.',
    p_topic   := 'event.waitinglist.promoted',
    p_source_type := 'event',
    p_source_id   := NEW.event   -- uuid param; passing ::text would fail type match
  );

  RETURN NEW;
END;
$$;

-- Trigger unchanged (still AFTER UPDATE); recreate to be safe.
DROP TRIGGER IF EXISTS trg_auto_promote_waitinglist ON public.event_attendance_user_mapping;
CREATE TRIGGER trg_auto_promote_waitinglist
  AFTER UPDATE ON public.event_attendance_user_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_from_waitinglist();
