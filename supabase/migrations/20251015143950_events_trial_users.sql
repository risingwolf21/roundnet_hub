drop view if exists "public"."event_groups_view";

drop view if exists "public"."events_user_view";

alter table "public"."event_attendance_user_mapping" alter column "state" drop default;

alter type "public"."EventAttendance" add value if not exists 'AttendingAsTrial';

alter type "public"."EventAttendance" add value if not exists 'WaitingAsTrial';

alter type "public"."GroupRole" add value if not exists 'trial';

alter table "public"."event_attendance_user_mapping" alter column "state" set default 'Unanswered'::"EventAttendance";

alter table "public"."events" add column "max_trial_attendees" numeric;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_attendance_on_max_trial_attendees_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
    newEvent public.events;
begin
    select * into newEvent from events where id = new.id limit 1;
    if (new."max_trial_attendees" < old."max_trial_attendees") then
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'AttendingAsTrial'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'WaitingAsTrial'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
    else
        if (new."max_trial_attendees" > old."max_trial_attendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'WaitingAsTrial'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'AttendingAsTrial'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;
$function$
;

create or replace view "public"."event_groups_view" as  SELECT eg.created_at,
    eg.description,
    eg.name,
    eg.color,
    eg.id,
    eg.is_public,
    eg.need_request_to_join,
    eg.parent_group,
    eg.visible,
    gum.role
   FROM (event_group eg
     LEFT JOIN group_user_mapping gum ON (((eg.id = gum."group") AND (gum."user" = (( SELECT auth.uid() AS uid))::text))));


create or replace view "public"."events_user_view" as  SELECT e.id,
    e.created_at,
    e.title,
    e.description,
    e."meetingDateTime",
    e."startingDateTime",
    e."endDateTime",
    e.key,
    e."isCancelled",
    e.place,
    e."group",
    e.recurrence,
    e."answerDeadline",
    e."recurrenceEnd",
    e."maxAttendees",
    e.max_trial_attendees,
    e.required_item,
    e.constellations_enabled,
    eaus.state AS user_state,
    gus.role AS user_group_role,
    ( SELECT count(*) AS count
           FROM event_attendance_user_mapping ea
          WHERE ((ea.event = e.id) AND (ea.state = 'Attending'::"EventAttendance"))) AS attending_count,
    ( SELECT count(*) AS count
           FROM event_attendance_user_mapping ea
          WHERE ((ea.event = e.id) AND (ea.state = 'Declined'::"EventAttendance"))) AS declined_count
   FROM ((events e
     LEFT JOIN event_attendance_user_mapping eaus ON (((e.id = eaus.event) AND (eaus."user" = ( SELECT (auth.uid())::text AS uid)))))
     LEFT JOIN group_user_mapping gus ON (((e."group" = gus."group") AND (gus."user" = ( SELECT (auth.uid())::text AS uid)))));


CREATE OR REPLACE FUNCTION public.is_user_in_group(group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$SELECT EXISTS (
    SELECT 1
    FROM group_user_mapping
    WHERE "group" = group_id AND "user" = auth.uid()::text AND ("role" = 'user'::public."GroupRole" OR "role" = 'admin'::public."GroupRole" OR "role" = 'trial'::public."GroupRole")
  );$function$
;

CREATE OR REPLACE FUNCTION public.update_attendance(p_event uuid, p_user text, p_state "EventAttendance")
 RETURNS SETOF event_attendance_user_mapping
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$DECLARE
  v_is_member   boolean;
  v_event_open  boolean;
  v_max         numeric;
  v_max_trial   numeric;
  v_accepted    bigint;
  v_accepted_trial bigint;
  v_final_state public."EventAttendance";
BEGIN
  -- 1) Actor muss Mitglied der Event-Gruppe sein
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = auth.uid()::text
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
  IF p_user <> auth.uid()::text AND NOT public.authorize('event.attendance.manage') THEN
    RAISE EXCEPTION 'forbidden: cannot update other user''s attendance' USING ERRCODE = '42501';
  END IF;

  -- 4) Kapazität (Accepted zählt)
  SELECT e."maxAttendees" INTO v_max FROM public.events e WHERE e.id = p_event;
  SELECT e."max_trial_attendees" INTO v_max_trial FROM public.events e WHERE e.id = p_event;

  SELECT COUNT(*)::bigint
  INTO v_accepted
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'Attending';

  SELECT COUNT(*)::bigint
  INTO v_accepted_trial
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'AttendingAsTrial';

  -- 5) Ziel-State bestimmen
  IF p_state = 'Declined' THEN
    v_final_state := 'Declined';

  ELSIF p_state = 'Attending' AND v_max IS NOT NULL AND v_accepted >= v_max THEN
    -- Kapazität voll -> auf Waiting (außer Declined)
    v_final_state := 'Waiting';

  ELSIF p_state = 'AttendingAsTrial' AND v_max_trial IS NOT NULL AND v_accepted_trial >= v_max_trial THEN
    -- Kapazität bei Trial voll -> auf WaitingAsTrial (außer Declined)
    v_final_state := 'WaitingAsTrial';

  ELSE
    v_final_state := p_state;
  END IF;

  -- Letzte Sicherheit. Als Trial User darf ich nicht Attendning oder Waiting als State haben
  IF (SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = auth.uid()::text
      AND gum."role" = 'trial'
  )) THEN
    IF v_final_state = 'Attending' THEN
      v_final_state = 'AttendingAsTrial';
    ELSIF v_final_state = 'Waiting' THEN
      v_final_state = 'WaitingAsTrial';
    END IF;
  END IF;

  -- 6) Upsert (RLS prüft zusätzlich INSERT/UPDATE-Policies)
  RETURN QUERY
  INSERT INTO public.event_attendance_user_mapping("user","event","state")
  VALUES (p_user, p_event, v_final_state)
  ON CONFLICT ("user","event") DO UPDATE
  SET state = EXCLUDED.state
  RETURNING *;
END;$function$
;

CREATE TRIGGER trg_events_max_trial_attendees_change AFTER UPDATE ON public.events FOR EACH ROW WHEN ((new.max_trial_attendees <> old.max_trial_attendees)) EXECUTE FUNCTION update_attendance_on_max_trial_attendees_change();


