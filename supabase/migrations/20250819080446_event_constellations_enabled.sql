alter table "public"."events"
add column "constellations_enabled" boolean not null default false;

create or replace view "public"."distinct_event" with(security_invoker=on) as  SELECT DISTINCT ON (events.key) events.id,
    events.created_at,
    events.description,
    events."meetingDateTime",
    events."startingDateTime",
    events.title,
    events."endDateTime",
    events.key,
    events."isCancelled",
    events.place,
    events.recurrence,
    events."group",
    events."answerDeadline",
    events."maxAttendees",
    events."recurrenceEnd",
    events."constellations_enabled"
   FROM events
  WHERE ((events."startingDateTime" > now()) AND (events.recurrence <> 'None'::"EventRecurrence"))
  ORDER BY events.key, events."startingDateTime" DESC;

  create or replace view "public"."current_distinct_event" with(security_invoker=on) as  SELECT DISTINCT ON (events.key) events.id,
    events.created_at,
    events.description,
    events."meetingDateTime",
    events."startingDateTime",
    events.title,
    events."endDateTime",
    events.key,
    events."isCancelled",
    events.place,
    events.recurrence,
    events."group",
    events."answerDeadline",
    events."maxAttendees",
    events."recurrenceEnd",
    events."constellations_enabled"
   FROM events
  WHERE (((events."endDateTime" > now()) OR (events."endDateTime" IS NULL)) AND (events."startingDateTime" > now()) AND (events.recurrence <> 'None'::"EventRecurrence"))
  ORDER BY events.key,
        CASE
            WHEN ((events."startingDateTime" - now()) >= '00:00:00'::interval) THEN (events."startingDateTime" - now())
            ELSE (now() - events."startingDateTime")
        END;


drop view public.events_user_view;

create or replace view public.events_user_view with(security_invoker=on) as
select
  e.id,
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
  e.required_item,
  e."constellations_enabled",
  eaus.state as user_state,
  (
    select
      count(*) as count
    from
      event_attendance_user_mapping ea
    where
      ea.event = e.id
      and ea.state = 'Attending'::"EventAttendance"
  ) as attending_count,
  (
    select
      count(*) as count
    from
      event_attendance_user_mapping ea
    where
      ea.event = e.id
      and ea.state = 'Declined'::"EventAttendance"
  ) as declined_count
from
  events e
  left join event_attendance_user_mapping eaus on e.id = eaus.event
  and eaus."user" = (
    (
      select
        auth.uid ()::text as uid
    )
  );