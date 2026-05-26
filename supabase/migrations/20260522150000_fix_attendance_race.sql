-- Fix race condition in attendance trigger functions by serializing concurrent
-- executions for the same event using PostgreSQL advisory transaction locks.
--
-- All three functions use the same lock key prefix ('attendance_event_') so
-- they serialize against each other. pg_advisory_xact_lock is automatically
-- released at the end of the transaction.

-- ---------------------------------------------------------------------------
-- 1. trg_update_attendance_on_maxattendees_change
--    Fires on: events (AFTER UPDATE when maxAttendees changes)
--    Lock on:  NEW.id (the event id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_update_attendance_on_maxattendees_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
    newEvent public.events;
begin
    PERFORM pg_advisory_xact_lock(('x' || md5('attendance_event_' || NEW.id::text))::bit(64)::bigint);
    select * into newEvent from events where id = new.id limit 1;
    if (new."maxAttendees" < old."maxAttendees") then
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'Attending'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'Waiting'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
    else
        if (new."maxAttendees" > old."maxAttendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'Waiting'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'Attending'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;$function$
;

-- ---------------------------------------------------------------------------
-- 2. trg_update_waiting_list_attendance
--    Fires on: event_attendance_user_mapping (AFTER DELETE OR UPDATE)
--    Lock on:  NEW.event (the event FK column)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_update_waiting_list_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
  BEGIN
    PERFORM pg_advisory_xact_lock(('x' || md5('attendance_event_' || NEW.event::text))::bit(64)::bigint);
    if((Select count(*) from event_attendance_user_mapping where event_attendance_user_mapping.event = NEW.event AND event_attendance_user_mapping.state = 'Attending') < (Select events."maxAttendees" from events where events.id = NEW.event LIMIT 1) AND NEW.state = 'Declined') then

    UPDATE event_attendance_user_mapping
    SET state = 'Attending'
    WHERE event_attendance_user_mapping."user" = (SELECT event_attendance_user_mapping."user" from event_attendance_user_mapping where event_attendance_user_mapping.state = 'Waiting' AND event_attendance_user_mapping.event = NEW.event order by event_attendance_user_mapping."lastUpdate" Limit 1);
    end if;
    return NEW;
  END;$function$
;

-- ---------------------------------------------------------------------------
-- 3. auto_promote_from_waitinglist
--    Fires on: event_attendance_user_mapping (AFTER UPDATE)
--    Lock on:  NEW.event (the event FK column)
-- ---------------------------------------------------------------------------
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
  PERFORM pg_advisory_xact_lock(('x' || md5('attendance_event_' || NEW.event::text))::bit(64)::bigint);

  -- Only fire when someone declines/leaves who was attending
  IF NEW.state NOT IN ('Declined') THEN
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
