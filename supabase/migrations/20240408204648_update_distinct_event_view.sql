create
or replace view
  current_distinct_event as
SELECT DISTINCT
ON (key) *
FROM
    events
WHERE
    (
    "endDateTime"
    > now()
   OR "endDateTime" IS NULL
    )
  AND ("startingDateTime"
    > now())
  AND (recurrence != 'None')
ORDER BY key, CASE WHEN ("startingDateTime" - NOW()) >= INTERVAL '0' THEN ("startingDateTime" - NOW()) ELSE (NOW() - "startingDateTime")
END;

drop view if exists distinct_event;

create
or replace view
  distinct_event as
SELECT DISTINCT
ON (key) *
FROM
    events
WHERE
    (
    "endDateTime"
    > now()
   OR "endDateTime" IS NULL
    )
  AND (recurrence != 'None')
ORDER BY
    key,
    created_at DESC;