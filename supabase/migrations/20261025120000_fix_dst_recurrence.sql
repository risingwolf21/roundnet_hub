-- Fix DST drift in recurring-event generation.
--
-- Problem: create_next_occurrences_candidates() advanced each series by adding a
-- fixed absolute interval ('7 days' / '14 days') to a timestamptz. Postgres adds
-- exactly 168h / 336h of absolute time, so whenever the step crosses a daylight-
-- saving boundary the local wall-clock time shifts by an hour: a training at
-- 19:00 Europe/Berlin becomes 18:00 after the autumn switch (and 20:00 after the
-- spring switch).
--
-- Fix: advance the recurrence in LOCAL wall-clock time. We drop the template start
-- to the club-local clock (AT TIME ZONE 'Europe/Berlin' -> timestamp), add the
-- day-based step there (a plain timestamp has no DST, so 19:00 + 7 days = 19:00),
-- then convert each slot back to an instant (AT TIME ZONE 'Europe/Berlin' ->
-- timestamptz). endDateTime / answerDeadline keep their fixed offset from the
-- (now-correct) start, so they land at the right local time too.
--
-- Only the stepping math changes; the template selection (latest occurrence per
-- key), horizon handling, recurrenceEnd/run_at filters and de-duplication are
-- identical to 20260930075703_fix_functions.sql.

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_next_occurrences_candidates(p_run_at timestamp with time zone, p_horizon interval)
 RETURNS TABLE(key text, group_id uuid, title text, description text, recurrence public."EventRecurrence", "startingDateTime" timestamp with time zone, "endDateTime" timestamp with time zone, place text, "answerDeadline" timestamp with time zone, "maxAttendees" numeric, "recurrenceEnd" timestamp with time zone, items_enabled boolean, constellations_enabled boolean, required_item public."ItemType")
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  -- Club-local timezone. Recurrence advances in this zone's wall-clock time so
  -- training times stay fixed (e.g. 19:00) across the DST switch.
  v_tz text := 'Europe/Berlin';
BEGIN
  RETURN QUERY
  WITH
  params AS (
    SELECT p_run_at AS run_at, p_run_at + p_horizon AS hz
  ),

  -- pro key die NEUESTE Instanz als Vorlage (deterministisch via ORDER BY)
  base AS (
    SELECT DISTINCT ON (e."key")
           e."key",
           e."group",
           e.title, e.description, e.place,
           e.recurrence,
           e."answerDeadline", e."maxAttendees", e."recurrenceEnd",
           e.items_enabled, e.constellations_enabled, e.required_item,
           e."startingDateTime" AS base_start,
           (e."endDateTime" - e."startingDateTime") AS dur,
           (e."answerDeadline" - e."startingDateTime") AS answer_offset
    FROM public.events e
    WHERE e.recurrence <> 'None'::"EventRecurrence"
    ORDER BY e."key", e."startingDateTime" DESC, e.id DESC
  ),

  expanded AS (
    SELECT b.*,
           CASE b.recurrence
             WHEN 'Weekly'      THEN INTERVAL '7 days'
             WHEN 'Fortnightly' THEN INTERVAL '14 days'
           END AS step
    FROM base b
  ),

  -- erster neuer Slot NACH der Basis, berechnet in LOKALER Zeit (DST-sicher)
  seeds AS (
    SELECT x.*,
           (x.base_start AT TIME ZONE v_tz) + x.step AS ns_local
    FROM expanded x
  ),

  -- wenn der erste Slot bereits hinter dem Horizont liegt: Serie überspringen
  seeds_clamped AS (
    SELECT s.*
    FROM seeds s
    CROSS JOIN params p
    WHERE (s.ns_local AT TIME ZONE v_tz) <= p.hz
  ),

  -- alle Slots von ns bis Horizon (inkl.), zusätzlich recurrenceEnd respektieren.
  -- Die Slots werden in lokaler Wanduhrzeit erzeugt und danach je Slot in einen
  -- Zeitpunkt (timestamptz) zurückgewandelt -> die Ortszeit bleibt konstant.
  candidates AS (
    SELECT
      h."key",
      h."group",
      h.title,
      h.description,
      h.place,
      h.recurrence,
      CASE WHEN h.answer_offset IS NULL THEN NULL
           ELSE (g.gs + h.answer_offset)
      END AS "answerDeadline",
      h."maxAttendees",
      h."recurrenceEnd",
      h.items_enabled,
      h.constellations_enabled,
      h.required_item,
      g.gs AS "startingDateTime",
      (g.gs + h.dur) AS "endDateTime"
    FROM seeds_clamped h
    CROSS JOIN params p
    CROSS JOIN LATERAL generate_series(
                 h.ns_local,
                 (p.hz AT TIME ZONE v_tz),
                 h.step
               ) AS gs_local
    CROSS JOIN LATERAL (SELECT (gs_local AT TIME ZONE v_tz) AS gs) g
    WHERE (h."recurrenceEnd" IS NULL OR g.gs <= h."recurrenceEnd")
      AND g.gs > p.run_at             -- Startet nach p_run_at
      AND (g.gs + h.dur) > p.run_at   -- Endet nach p_run_at
  ),

  -- nur Events vorschlagen, die noch nicht existieren (key + starting)
  to_insert AS (
    SELECT c.*
    FROM candidates c
    LEFT JOIN public.events e
      ON e."key" = c."key"
     AND e."startingDateTime" = c."startingDateTime"
    WHERE e.id IS NULL
  )
  SELECT
    t."key",
    t."group",
    t.title,
    t.description,
    t.recurrence,
    t."startingDateTime",
    t."endDateTime",
    t.place,
    t."answerDeadline",
    t."maxAttendees",
    t."recurrenceEnd",
    t.items_enabled,
    t.constellations_enabled,
    t.required_item
  FROM to_insert t
  ORDER BY t."key", t."startingDateTime";
END;$function$
;
