drop view if exists "public"."distinct_event";

alter table
    "public"."events" rename column "end_at" to "endDateTime";

alter table
    "public"."events"
add
    column "recurrenceEnd" timestamp with time zone;

create
or replace view "public"."distinct_event" as
SELECT
    DISTINCT ON (events.key) events.id,
    events.created_at,
    events.description,
    events."meetingDateTime",
    events."startingDateTime",
    events.title,
    events."recurrenceEnd",
    events."endDateTime",
    events.key,
    events."isCancelled",
    events.place,
    events.recurrence,
    events."group",
    events."answerDeadline",
    events."maxAttendees"
FROM
    events
WHERE
    (
        (
            (events."recurrenceEnd" > now())
            OR (events."recurrenceEnd" IS NULL)
        )
        AND (events.recurrence <> 'None' :: "EventRecurrence")
    )
ORDER BY
    events.key,
    events.created_at DESC;