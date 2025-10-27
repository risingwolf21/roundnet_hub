revoke select on table "public"."features" from "anon";

revoke select on table "public"."permissions" from "anon";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_next_occurrences_candidates(p_run_at timestamp with time zone, p_horizon interval)
 RETURNS TABLE(key text, "group" uuid, title text, description text, recurrence "EventRecurrence", "startingDateTime" timestamp with time zone, "endDateTime" timestamp with time zone, place text, "answerDeadline" timestamp with time zone, "maxAttendees" numeric, "recurrenceEnd" timestamp with time zone, items_enabled boolean, constellations_enabled boolean, required_item "ItemType")
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
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
      AND e."startingDateTime" > p_run_at
      AND e."endDateTime" > p_run_at
    ORDER BY e."key", e."startingDateTime" ASC, e.id DESC
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
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_next_occurrences(p_run_at timestamp with time zone, p_horizon interval)
 RETURNS SETOF events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  /*
    Insertet genau die Kandidaten, die create_next_occurrences_candidates(..)
    liefern würde. Duplikate werden durch ON CONFLICT verhindert.
    Gibt die tatsächlich NEU eingefügten Events zurück.
  */

  RETURN QUERY
  WITH cand AS (
    SELECT
      c."key",
      c."group",
      c.title,
      c.description,
      c.recurrence,
      c."startingDateTime",
      c."endDateTime",
      c.place,
      c."answerDeadline",
      c."maxAttendees",
      c."recurrenceEnd",
      c.items_enabled,
      c.constellations_enabled,
      c.required_item
    FROM public.create_next_occurrences_candidates(p_run_at, p_horizon) AS c
  ),
  ins AS (
    INSERT INTO public.events (
      "key",
      "group",
      title,
      description,
      recurrence,
      "startingDateTime",
      "endDateTime",
      place,
      "answerDeadline",
      "maxAttendees",
      "recurrenceEnd",
      items_enabled,
      constellations_enabled,
      required_item
    )
    SELECT
      "key",
      "group",
      title,
      description,
      recurrence,
      "startingDateTime",
      "endDateTime",
      place,
      "answerDeadline",
      "maxAttendees",
      "recurrenceEnd",
      items_enabled,
      constellations_enabled,
      required_item
    FROM cand
    ON CONFLICT ("key","startingDateTime") DO NOTHING
    RETURNING *
  )
  SELECT * FROM ins;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_table_names()
 RETURNS TABLE(table_name text, table_schema text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$BEGIN
    RETURN QUERY
    SELECT t.table_name::text, t.table_schema::text
    FROM information_schema.tables AS t
    WHERE (t.table_schema = 'public' OR t.table_schema = 'permissions' OR t.table_schema = 'games' OR t.table_schema = 'audit')
      AND t.table_type = 'BASE TABLE';
END;$function$
;

CREATE TRIGGER trg_audit_user_direct_grants AFTER INSERT OR DELETE OR UPDATE ON public.user_direct_grants FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_user_grants AFTER INSERT OR DELETE OR UPDATE ON public.user_grants FOR EACH ROW EXECUTE FUNCTION audit.log_change();

create or replace function util_get_primary_keys(schema_name text, table_name text)
returns table(column_name text)
language sql
stable
as $$
  select a.attname as column_name
  from pg_index i
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  join pg_class c on c.oid = i.indrelid
  join pg_namespace n on n.oid = c.relnamespace
  where i.indisprimary and n.nspname = schema_name and c.relname = table_name
  order by array_position(i.indkey, a.attnum);
$$;

revoke all on function util_get_primary_keys(text, text) from public;
grant execute on function util_get_primary_keys(text, text) to authenticated, anon;
