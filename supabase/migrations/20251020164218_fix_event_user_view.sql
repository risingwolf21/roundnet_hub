create or replace view "public"."events_user_view" with (security_invoker = on) as SELECT e.id,
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

create view public.event_groups_view with (security_invoker = on) as
 SELECT eg.created_at,
    eg.description,
    eg.name,
    eg.color,
    eg.id,
    eg.is_public,
    eg.need_request_to_join,
    eg.parent_group,
    eg.visible,
    gum.role
   FROM event_group eg
     LEFT JOIN group_user_mapping gum ON eg.id = gum."group" AND gum."user" = ((( SELECT auth.uid() AS uid))::text);

grant select on table public.permissions to anon;
grant select on table public.features to anon;
