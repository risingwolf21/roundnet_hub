-- Insert new notification topic
INSERT INTO notifications.notification_topics (topic, scope_type, description, default_enabled)
VALUES ('event.waitinglist.promoted', 'event', 'Warteliste: Platz freigeworden', true)
ON CONFLICT (topic) DO NOTHING;

-- Auto-promote function
CREATE OR REPLACE FUNCTION public.auto_promote_from_waitinglist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_attendees integer;
  v_attending_count integer;
  v_next_user uuid;
  v_next_state text;
  v_event_title text;
BEGIN
  -- Only fire when someone declines/leaves who was attending
  IF NEW.state NOT IN ('Declined', 'DeclinedAsTrial') THEN
    RETURN NEW;
  END IF;
  IF OLD.state NOT IN ('Attending', 'AttendingAsTrial') THEN
    RETURN NEW;
  END IF;

  -- Get event maxAttendees and title
  SELECT "maxAttendees", title
  INTO v_max_attendees, v_event_title
  FROM public.events
  WHERE id = NEW.event;

  -- Only proceed if event has a cap
  IF v_max_attendees IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current attending users
  SELECT COUNT(*)
  INTO v_attending_count
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event
    AND state IN ('Attending', 'AttendingAsTrial');

  -- If still at or above cap, no promotion needed
  IF v_attending_count >= v_max_attendees THEN
    RETURN NEW;
  END IF;

  -- Find oldest waiting user
  SELECT user, state
  INTO v_next_user, v_next_state
  FROM public.event_attendance_user_mapping
  WHERE event = NEW.event
    AND state IN ('Waiting', 'WaitingAsTrial')
  ORDER BY "lastUpdate" ASC
  LIMIT 1;

  IF v_next_user IS NULL THEN
    RETURN NEW;
  END IF;

  -- Promote: Waiting -> Attending, WaitingAsTrial -> AttendingAsTrial
  UPDATE public.event_attendance_user_mapping
  SET state = CASE
    WHEN v_next_state = 'WaitingAsTrial' THEN 'AttendingAsTrial'
    ELSE 'Attending'
  END,
  "lastUpdate" = now()
  WHERE event = NEW.event
    AND "user" = v_next_user;

  -- Send notification
  PERFORM notifications.enqueue_notification(
    p_user    := v_next_user,
    p_title   := 'Du bist aufgerückt!',
    p_body    := 'Ein Platz wurde frei. Du bist von der Warteliste auf die Teilnehmerliste gerutscht.',
    p_topic   := 'event.waitinglist.promoted',
    p_source_type := 'event',
    p_source_id   := NEW.event::text
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_auto_promote_waitinglist ON public.event_attendance_user_mapping;
CREATE TRIGGER trg_auto_promote_waitinglist
  AFTER UPDATE ON public.event_attendance_user_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_from_waitinglist();
