set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_next_occurrences_candidates(p_run_at timestamp with time zone, p_horizon interval)
 RETURNS TABLE(key text, "group" uuid, title text, description text, recurrence public."EventRecurrence", "startingDateTime" timestamp with time zone, "endDateTime" timestamp with time zone, place text, "answerDeadline" timestamp with time zone, "maxAttendees" numeric, "recurrenceEnd" timestamp with time zone, items_enabled boolean, constellations_enabled boolean, required_item public."ItemType")
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$BEGIN
  RETURN QUERY
  WITH
  params AS (
    SELECT p_run_at AS run_at, p_run_at + p_horizon AS hz
  ),

  -- BASIS wie in deiner View, aber parameterisiert:
  --   - nur zukünftige, wiederkehrende Events
  --   - pro key die FRÜHESTE zukünftige Instanz (deterministisch via ORDER BY)
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

  -- erster möglicher neuer Slot NACH der Basis
  seeds AS (
    SELECT x.*, x.base_start + x.step AS ns
    FROM expanded x
  ),

  -- wenn der erste Slot bereits hinter dem Horizont liegt: Serie überspringen
  seeds_clamped AS (
    SELECT s.*
    FROM seeds s
    CROSS JOIN params p
    WHERE s.ns <= p.hz
  ),

  -- alle Slots von ns bis Horizon (inkl.), zusätzlich recurrenceEnd respektieren
  candidates AS (
    SELECT
      h."key",
      h."group",
      h.title,
      h.description,
      h.place,
      h.recurrence,
      CASE WHEN h.answer_offset IS NULL THEN NULL
           ELSE (gs + h.answer_offset)
      END AS "answerDeadline",
      h."maxAttendees",
      h."recurrenceEnd",
      h.items_enabled,
      h.constellations_enabled,
      h.required_item,
      gs AS "startingDateTime",
      (gs + h.dur) AS "endDateTime"
    FROM seeds_clamped h
    CROSS JOIN params p
    CROSS JOIN LATERAL generate_series(h.ns, p.hz, h.step) AS gs
    WHERE (h."recurrenceEnd" IS NULL OR gs <= h."recurrenceEnd")
      -- NEUE FILTER-BEDINGUNGEN HIER:
      AND gs > p.run_at             -- Startet nach p_run_at
      AND (gs + h.dur) > p.run_at   -- Endet nach p_run_at
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


