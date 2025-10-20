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
     JOIN group_user_mapping gus ON (((e."group" = gus."group") AND (gus."user" = ( SELECT (auth.uid())::text AS uid)))));



