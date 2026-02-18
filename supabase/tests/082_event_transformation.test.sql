BEGIN;

SET
  LOCAL TIME ZONE 'UTC';

SELECT
  plan (2);

CREATE TEMP TABLE _vars (base_event uuid);

-- Seed: Basis-Event (Weekly), 2h Dauer, Deadline 2h vor Start, mit Items
-- Basis-Start: 2025-02-03 18:00:00Z (Berlin lokal 19:00, Winterzeit)
WITH
  ins AS (
    INSERT INTO
      public.events (
        "key",
        "title",
        "description",
        "recurrence",
        "startingDateTime",
        "endDateTime",
        "answerDeadline",
        "group",
        place,
        items_enabled
      )
    VALUES
      (
        'series-quick',
        'Training',
        'Wöchentlich',
        'Weekly',
        (now () + interval '1 day'),
        (now () + interval '1 day' + interval '2 hours'),
        (now ()),
        '00000000-0000-0000-0000-000000000042',
        'Halle 1',
        false
      ) RETURNING id
  )
INSERT INTO
  _vars (base_event)
SELECT
  id
FROM
  ins;

INSERT INTO
  "public"."event_transformations" (
    "id",
    "event_key",
    "created_by",
    "created_at",
    "lead_time",
    "trigger",
    "next",
    "one_time",
    "active",
    "reason"
  )
VALUES
  (
    '20c586f2-c3ef-4fd6-84df-26224f9941fc',
    'series-quick',
    tests.get_supabase_uid ('user_1a'),
    now (),
    '25:00:00',
    '{"attending_lt": 1}',
    '{"group": "00000000-0000-0000-0000-000000000042", "title": "Freies Spiel", "description": "Freies Spiel, ehemals Training Gruppe A Goethehalle", "disableAnswerDeadline": true}',
    'false',
    'true',
    null
  );

SELECT
  is (
    (
      SELECT
        *
      FROM
        public.run_event_transformations ()
    ),
    '1',
    'eine Transformation wurde angewendet'
  );

WITH
  ins AS (
    INSERT INTO
      public.events (
        "key",
        "title",
        "description",
        "recurrence",
        "startingDateTime",
        "endDateTime",
        "answerDeadline",
        "group",
        place,
        items_enabled
      )
    VALUES
      (
        'series-quick',
        'Training 2',
        'Wöchentlich',
        'Weekly',
        (now () + interval '1 day' + interval '1 minute'),
        (now () + interval '1 day' + interval '2 hours'),
        (now ()),
        '00000000-0000-0000-0000-000000000042',
        'Halle 1',
        false
      ) RETURNING id
  )
INSERT INTO
  _vars (base_event)
SELECT
  id
FROM
  ins;

INSERT INTO
  public.event_attendance_user_mapping ("user", "event", "state")
VALUES
  (
    tests.get_supabase_uid ('user_1a'),
    (
      SELECT
        base_event
      FROM
        _vars
      LIMIT
        1
    ),
    'Attending'
  ),
  (
    tests.get_supabase_uid ('user_1b'),
    (
      SELECT
        base_event
      FROM
        _vars
      LIMIT
        1
    ),
    'Attending'
  );

SELECT
  is (
    (
      SELECT
        *
      FROM
        public.run_event_transformations ()
    ),
    '0',
    'Keine Transformation wurde angewendet weil ein Nutzer für das Event bereits als Attending eingetragen ist (Condition: attending_lt: 1)'
  );

SELECT
  *
FROM
  finish ();

ROLLBACK;