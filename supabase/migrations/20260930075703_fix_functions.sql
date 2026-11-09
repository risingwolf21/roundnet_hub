set check_function_bodies = off;

DROP FUNCTION IF EXISTS public.create_next_occurrences_candidates(timestamp with time zone, interval);

CREATE OR REPLACE FUNCTION public.create_next_occurrences_candidates(p_run_at timestamp with time zone, p_horizon interval)
 RETURNS TABLE(key text, group_id uuid, title text, description text, recurrence public."EventRecurrence", "startingDateTime" timestamp with time zone, "endDateTime" timestamp with time zone, place text, "answerDeadline" timestamp with time zone, "maxAttendees" numeric, "recurrenceEnd" timestamp with time zone, items_enabled boolean, constellations_enabled boolean, required_item public."ItemType")
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
      c.group_id,
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
      group_id,
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


CREATE OR REPLACE FUNCTION public.add_drinks_history(items json)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
    user_id uuid := auth.uid();
    payment_id bigint;
    drink_record json;
    voucher_record RECORD;
    total_drink_count numeric;
    drink_id uuid;
    drink_count numeric;
    drink_price numeric;
    drink_amount numeric;
BEGIN
    IF jsonb_typeof(items::jsonb) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', items;
    END IF;

    -- get or create payment id
    SELECT id
    INTO payment_id
    FROM payments
    WHERE "user" = user_id
    AND "paymentState" = 'Open';
    IF
    payment_id IS NULL THEN
            INSERT INTO payments ("user", "amountToPay", "paymentState")
            VALUES (user_id, 0, 'Open')
            RETURNING id INTO payment_id;
    END IF;

    IF payment_id IS NULL THEN
        RAISE EXCEPTION 'Es wurde kein Payment gefunden oder konnte nicht erstellt werden';
    END IF;

    -- Iterate over all drinks that need to be added
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
        drink_id := (drink_record->>'id')::uuid;
        drink_count := (drink_record->>'count')::numeric;
        drink_price := (drink_record->>'price')::numeric;
        raise log 'Adding drink %', drink_record;
        total_drink_count := drink_count; -- Initialize remaining count for this drink
        -- Loop over the vouchers of the user
        FOR voucher_record IN SELECT id, available FROM user_vouchers
        LOOP
            -- If the remaining count is fulfilled, exit the loop
            IF total_drink_count <= 0 THEN
                EXIT;
            END IF;
            -- Check if the voucher has enough available count
            IF voucher_record.available > 0 THEN
                IF voucher_record.available < total_drink_count THEN
                    -- Create a history entry with the voucher for the available amount
                    drink_amount := drink_price * voucher_record.available;
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, voucher_record.available, drink_amount, voucher_record.id);
                    -- Decrease the remaining count
                    total_drink_count := total_drink_count - voucher_record.available;
                ELSE
                    drink_amount := drink_price * total_drink_count;
                    -- Create a history entry with the voucher for the remaining count
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount, voucher_record.id);
                    -- Set remaining count to zero as it is fulfilled
                    total_drink_count := 0;
                END IF;
            END IF;
        END LOOP;
        -- If there is still remaining count, create a history entry without a voucher
        IF total_drink_count > 0 THEN
            drink_amount := drink_price * total_drink_count;
            INSERT INTO history (drink, "user", payment, count, amount)
            VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount);
        END IF;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Drinks: %', SQLERRM;
END;$function$
;

CREATE EXTENSION IF NOT EXISTS pg_net;