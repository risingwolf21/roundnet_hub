-- Enforce event capacity at the DATA layer, not just in the update_attendance RPC.
--
-- Until now the capacity/waitlist decision lived only inside update_attendance. A client could
-- write event_attendance_user_mapping directly (RLS only checks membership + event open) and set
-- itself to 'Attending' past the cap — overbooking / jumping the queue. This adds a BEFORE
-- INSERT/UPDATE trigger that clamps every write (direct writes, the RPC, and promotions alike):
--   * trial-role users are forced onto the trial states (so a direct 'Attending' can't take a
--     regular seat),
--   * an attending state beyond its pool's cap is clamped to the matching waiting state
--     (regular -> Waiting against maxAttendees, trial -> WaitingAsTrial against max_trial_attendees),
--   * a per-event advisory lock serializes concurrent writes so the count-then-decide is atomic,
--   * "lastUpdate" is refreshed on every state change to keep the waitlist FIFO order meaningful.
-- service_role (system/admin) writes are left untouched.
--
-- Also fixes update_attendance_on_max_trial_attendees_change, which used maxAttendees instead of
-- max_trial_attendees (so raising the trial cap promoted nobody).

-- 1) Capacity-clamp trigger -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_attendance_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_cap   numeric;
  v_count integer;
  v_is_trial boolean;
BEGIN
  -- Trusted system/admin writes (service role) are not clamped.
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.state IN ('Attending','AttendingAsTrial','Waiting','WaitingAsTrial') THEN
    -- Serialize concurrent writes for this event so the capacity count below is atomic.
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('attendance:' || NEW.event::text)::bigint);

    -- Trial-role members are always on the trial states (prevents taking a regular seat directly).
    SELECT EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.group_user_mapping gum ON gum."group" = e."group"
      WHERE e.id = NEW.event AND gum."user" = NEW."user" AND gum."role" = 'trial'
    ) INTO v_is_trial;

    IF v_is_trial THEN
      NEW.state := CASE WHEN NEW.state IN ('Attending','AttendingAsTrial')
                        THEN 'AttendingAsTrial'::public."EventAttendance"
                        ELSE 'WaitingAsTrial'::public."EventAttendance" END;
    END IF;

    -- Capacity clamp for the matching pool (own row excluded so re-confirming keeps the seat).
    IF NEW.state = 'Attending' THEN
      SELECT "maxAttendees" INTO v_cap FROM public.events WHERE id = NEW.event;
    ELSIF NEW.state = 'AttendingAsTrial' THEN
      SELECT max_trial_attendees INTO v_cap FROM public.events WHERE id = NEW.event;
    ELSE
      v_cap := NULL;  -- already a waiting state, nothing to clamp
    END IF;

    IF v_cap IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count
      FROM public.event_attendance_user_mapping
      WHERE event = NEW.event AND state = NEW.state AND "user" <> NEW."user";

      IF v_count >= v_cap THEN
        NEW.state := CASE WHEN NEW.state = 'AttendingAsTrial'
                          THEN 'WaitingAsTrial'::public."EventAttendance"
                          ELSE 'Waiting'::public."EventAttendance" END;
      END IF;
    END IF;
  END IF;

  -- Keep FIFO ordering meaningful.
  IF TG_OP = 'INSERT' OR NEW.state IS DISTINCT FROM OLD.state THEN
    NEW."lastUpdate" := now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_attendance_capacity() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_attendance_capacity ON public.event_attendance_user_mapping;
CREATE TRIGGER trg_enforce_attendance_capacity
  BEFORE INSERT OR UPDATE ON public.event_attendance_user_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_attendance_capacity();

-- 2) Fix the trial cap-change promotion (was using maxAttendees instead of max_trial_attendees)
CREATE OR REPLACE FUNCTION public.update_attendance_on_max_trial_attendees_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF (NEW.max_trial_attendees < OLD.max_trial_attendees) THEN
    WITH users_to_update AS (
      SELECT m."user"
      FROM public.event_attendance_user_mapping m
      WHERE m.event = NEW.id AND m.state = 'AttendingAsTrial'
      ORDER BY m."lastUpdate"
      OFFSET NEW.max_trial_attendees)
    UPDATE public.event_attendance_user_mapping
      SET state = 'WaitingAsTrial'
      WHERE event = NEW.id AND "user" IN (SELECT "user" FROM users_to_update);
  ELSIF (NEW.max_trial_attendees > OLD.max_trial_attendees) THEN
    WITH users_to_update AS (
      SELECT m."user"
      FROM public.event_attendance_user_mapping m
      WHERE m.event = NEW.id AND m.state = 'WaitingAsTrial'
      ORDER BY m."lastUpdate"
      LIMIT (NEW.max_trial_attendees - OLD.max_trial_attendees))
    UPDATE public.event_attendance_user_mapping
      SET state = 'AttendingAsTrial'
      WHERE event = NEW.id AND "user" IN (SELECT "user" FROM users_to_update);
  END IF;
  RETURN NEW;
END;
$function$;
