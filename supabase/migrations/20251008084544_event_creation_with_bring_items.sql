alter table "public"."event_bring_pledges" drop constraint "event_bring_pledges_qty_check";

alter table "public"."event_bring_pledges" drop constraint "pledges_qty_positive";

drop function if exists "public"."create_next_occurrences"(p_run_at timestamp with time zone, p_horizon interval);

alter table "public"."event_bring_items" alter column "required_qty" drop not null;

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_qty_check" CHECK ((qty >= (0)::numeric)) not valid;

alter table "public"."event_bring_pledges" validate constraint "event_bring_pledges_qty_check";

alter table "public"."event_bring_pledges" add constraint "pledges_qty_positive" CHECK ((qty >= (0)::numeric)) not valid;

alter table "public"."event_bring_pledges" validate constraint "pledges_qty_positive";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_next_occurrences(p_run_at timestamp with time zone, p_horizon interval, p_tz text DEFAULT 'Europe/Berlin'::text)
 RETURNS SETOF events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
begin
  /*
    Weekly & Fortnightly only (Monthly entfernt).
    - Lokale Kalenderarithmetik (DST-sicher) über p_tz.
    - Für jede neue Instanz werden Felder vom neuesten VORHERIGEN Event übernommen
      (Fallback: Basisinstanz). answerDeadline wird relativ zur Startzeit verschoben.
    - Bring-Items werden vom neuesten Vorgänger kopiert (idempotent).
  */

  return query
  /* Basis je Serie (für Raster & Fallbacks) */
  with base as (
    select distinct on (e."key")
           e.id                                  as base_id,
           e."key",
           e."group"                             as base_group,
           e.title                               as base_title,
           e.description                         as base_description,
           e.place                               as base_place,
           e.recurrence                          as base_recurrence,
           e."answerDeadline"                    as base_answerDeadline,
           e."maxAttendees"                      as base_maxAttendees,
           e."recurrenceEnd"                     as base_recurrenceEnd,
           e.items_enabled                       as base_items_enabled,
           e.constellations_enabled              as base_constellations_enabled,
           e.required_item                       as base_required_item,
           e."startingDateTime"                  as base_start,
           (e."endDateTime" - e."startingDateTime") as base_dur,
           (e."startingDateTime" at time zone p_tz) as base_local
    from public.events e
    where e.recurrence in ('Weekly','Fortnightly')
    order by e."key", e."startingDateTime"
  ),
  expanded as (
    select b.*,
           extract(hour   from b.base_local)::int        as base_h,
           extract(minute from b.base_local)::int        as base_m,
           floor(extract(second from b.base_local))::int as base_s,
           case b.base_recurrence
             when 'Weekly'      then interval '7 days'
             when 'Fortnightly' then interval '14 days'
           end as step
    from base b
  ),
  horizon_local as (
    select (p_run_at at time zone p_tz)               as run_local,
           ((p_run_at + p_horizon) at time zone p_tz) as hz_local
  ),

  /* Startkandidat (lokal) je Serie am Raster >= run_local */
  seeds as (
    select e.*, h.run_local, h.hz_local,
           ( e.base_local
             + ceil(
                 greatest(extract(epoch from (h.run_local - e.base_local)), 0)
                 / extract(epoch from e.step)
               )::int * e.step
           ) as start_local
    from expanded e
    join horizon_local h on true
  ),

  /* Alle lokalen Startzeiten bis zur Horizon erzeugen und in timestamptz in p_tz umwandeln */
  candidate_starts as (
    select
      s."key",
      make_timestamptz(
        extract(year  from gs_local)::int,
        extract(month from gs_local)::int,
        extract(day   from gs_local)::int,
        s.base_h, s.base_m, s.base_s,
        p_tz
      ) as start_time
    from seeds s,
         lateral generate_series(s.start_local, s.hz_local, s.step) as gs_local
  ),

  /* Für jeden Kandidaten das neueste VORHERIGE Event derselben Serie als Template suchen */
  templated as (
    select
      cs."key",
      cs.start_time,
      -- neuestes vorhandenes Vorgänger-Event:
      prev.id                   as prev_id,
      prev."group"              as prev_group,
      prev.title                as prev_title,
      prev.description          as prev_description,
      prev.place                as prev_place,
      prev.recurrence           as prev_recurrence,
      prev."answerDeadline"     as prev_answerDeadline,
      prev."maxAttendees"       as prev_maxAttendees,
      prev."recurrenceEnd"      as prev_recurrenceEnd,
      prev.items_enabled        as prev_items_enabled,
      prev.constellations_enabled as prev_constellations_enabled,
      prev.required_item        as prev_required_item,
      prev."startingDateTime"   as prev_start,
      (prev."endDateTime" - prev."startingDateTime") as prev_dur,
      -- Basis-Fallback:
      b.base_id,
      b.base_group, b.base_title, b.base_description, b.base_place,
      b.base_recurrence, b.base_answerDeadline, b.base_maxAttendees,
      b.base_recurrenceEnd, b.base_items_enabled, b.base_constellations_enabled,
      b.base_required_item, b.base_start, b.base_dur
    from candidate_starts cs
    join base b on b."key" = cs."key"
    left join lateral (
      select e_prev.*
      from public.events e_prev
      where e_prev."key" = cs."key"
        and e_prev."startingDateTime" < cs.start_time
      order by e_prev."startingDateTime" desc
      limit 1
    ) prev on true
  ),

  /* Felder für Insert berechnen (inkl. Deadline-Verschiebung) */
  to_insert as (
    select
      t."key",
      coalesce(t.prev_title,  t.base_title)               as title,
      coalesce(t.prev_description, t.base_description)    as description,
      coalesce(t.prev_place,  t.base_place)               as place,
      coalesce(t.prev_recurrence, t.base_recurrence)      as recurrence,
      -- Start & Ende (Dauer aus Vorgänger, Fallback Basis)
      t.start_time                                        as start_time,
      (coalesce(t.prev_dur, t.base_dur))                  as dur,
      (t.start_time + coalesce(t.prev_dur, t.base_dur))   as end_time,
      -- answerDeadline relativ zur Startzeit des jeweiligen Templates
      case
        when t.prev_answerDeadline is not null
          then t.start_time + (t.prev_answerDeadline - t.prev_start)
        when t.base_answerDeadline is not null
          then t.start_time + (t.base_answerDeadline - t.base_start)
        else null
      end                                                  as answer_deadline_shifted,
      coalesce(t.prev_maxAttendees, t.base_maxAttendees)   as max_attendees,
      coalesce(t.prev_recurrenceEnd, t.base_recurrenceEnd) as recurrence_end,
      coalesce(t.prev_items_enabled, t.base_items_enabled) as items_enabled,
      coalesce(t.prev_constellations_enabled, t.base_constellations_enabled) as constellations_enabled,
      coalesce(t.prev_required_item, t.base_required_item) as required_item,
      coalesce(t.prev_group, t.base_group)                 as grp
    from templated t
  ),

  /* Recurrence-Ende respektieren */
  bounded as (
    select *
    from to_insert
    where recurrence_end is null or start_time <= recurrence_end
  ),

  /* Anti-Join gegen bereits existierende Events */
  missing as (
    select b.*
    from bounded b
    left join public.events e
      on e."key" = b."key" and e."startingDateTime" = b.start_time
    where e.id is null
  ),

  /* Insert der neuen Events */
  ins as (
    insert into public.events(
      "key", title, description, recurrence,
      "startingDateTime","endDateTime","group",
      place, "answerDeadline","maxAttendees","recurrenceEnd",
      items_enabled, constellations_enabled, required_item
    )
    select
      m."key",
      m.title,
      m.description,
      m.recurrence,
      m.start_time,
      m.end_time,
      m.grp,
      m.place,
      m.answer_deadline_shifted,
      m.max_attendees,
      m.recurrence_end,
      m.items_enabled,
      m.constellations_enabled,
      m.required_item
    from missing m
    on conflict ("key","startingDateTime") do nothing
    returning *
  )

    /* --- Reihenfolge-korrektes (kaskadierendes) Item-Klonen --- */
  , ins_ord as (
    select i.*, row_number() over (partition by i."key" order by i."startingDateTime") as rn
    from ins i
  )
  , first_prev as (
    -- für die erste neue Instanz pro Serie: ältestes vorhandenes Event davor
    select io.id as new_event,
           (
             select e0.id
             from public.events e0
             where e0."key" = io."key"
               and e0."startingDateTime" < io."startingDateTime"
             order by e0."startingDateTime" desc
             limit 1
           ) as src_event,
           io."key", io."startingDateTime", io.rn
    from ins_ord io
    where io.rn = 1
  )
  , next_chain as (
    -- folgende neuen Instanzen klonen jeweils vom direkt vorherigen NEUEN Event
    select io.id as new_event,
           lag(io.id) over (partition by io."key" order by io."startingDateTime") as src_event,
           io."key", io."startingDateTime", io.rn
    from ins_ord io
    where io.rn > 1
  )
  , chain as (
    select * from first_prev
    union all
    select * from next_chain
  )
  , cloned as (
    insert into public.event_bring_items(event, name, unit, required_qty, notes, sort_order)
    select ch.new_event, bi.name, bi.unit, bi.required_qty, bi.notes, bi.sort_order
      from chain ch
      join public.event_bring_items bi on bi.event = ch.src_event
    on conflict (event, name) do nothing
    returning event
  )
  select * from ins;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_event(p_event_id uuid)
 RETURNS TABLE(deleted_event integer, deleted_comments integer, deleted_bring_items integer, deleted_bring_pledges integer, deleted_attendance integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_deleted_comments integer := 0;
  v_deleted_bring_items integer := 0;
  v_deleted_bring_pledges integer := 0;
  v_deleted_attendance integer := 0;
  v_deleted_event integer := 0;
BEGIN
  -- Start transaction (function runs within a transaction context)
  -- Delete pledges first (depends on items)
  DELETE FROM public.event_bring_pledges
  WHERE event = p_event_id
  RETURNING 1 INTO STRICT v_deleted_bring_pledges;
  IF NOT FOUND THEN
    v_deleted_bring_pledges := 0;
  END IF;

  -- Actually count number of deleted rows (robust approach)
  GET DIAGNOSTICS v_deleted_bring_pledges = ROW_COUNT;

  -- Delete bring items
  DELETE FROM public.event_bring_items
  WHERE event = p_event_id
  RETURNING 1 INTO STRICT v_deleted_bring_items;
  IF NOT FOUND THEN
    v_deleted_bring_items := 0;
  END IF;
  GET DIAGNOSTICS v_deleted_bring_items = ROW_COUNT;

  -- Delete comments
  DELETE FROM public.event_comments
  WHERE event = p_event_id
  RETURNING 1 INTO STRICT v_deleted_comments;
  IF NOT FOUND THEN
    v_deleted_comments := 0;
  END IF;
  GET DIAGNOSTICS v_deleted_comments = ROW_COUNT;

  -- Delete attendance mappings
  DELETE FROM public.event_attendance_user_mapping
  WHERE event = p_event_id
  RETURNING 1 INTO STRICT v_deleted_attendance;
  IF NOT FOUND THEN
    v_deleted_attendance := 0;
  END IF;
  GET DIAGNOSTICS v_deleted_attendance = ROW_COUNT;

  -- Finally delete the event
  DELETE FROM public.events
  WHERE id = p_event_id
  RETURNING 1 INTO STRICT v_deleted_event;
  IF NOT FOUND THEN
    v_deleted_event := 0;
  END IF;
  GET DIAGNOSTICS v_deleted_event = ROW_COUNT;

  -- Return counts
  deleted_event := v_deleted_event;
  deleted_comments := v_deleted_comments;
  deleted_bring_items := v_deleted_bring_items;
  deleted_bring_pledges := v_deleted_bring_pledges;
  deleted_attendance := v_deleted_attendance;

  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_recurring_events(p_key text, p_start_time timestamp with time zone)
 RETURNS TABLE(event_id uuid, deleted_event integer, deleted_comments integer, deleted_bring_items integer, deleted_bring_pledges integer, deleted_attendance integer, recurrence_updated boolean, recurrence_event_id uuid)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_event RECORD;
  v_deleted_comments integer;
  v_deleted_bring_items integer;
  v_deleted_bring_pledges integer;
  v_deleted_attendance integer;
  v_deleted_event integer;
  v_updated_rows integer;
  v_latest_event_id uuid;
BEGIN
  FOR v_event IN
    SELECT id
    FROM public.events
    WHERE key = p_key
      AND COALESCE(startingDateTime, created_at) >= p_start_time
  LOOP
    -- initialize counters
    v_deleted_comments := 0;
    v_deleted_bring_items := 0;
    v_deleted_bring_pledges := 0;
    v_deleted_attendance := 0;
    v_deleted_event := 0;

    -- Delete pledges for this event
    DELETE FROM public.event_bring_pledges
    WHERE event = v_event.id;
    GET DIAGNOSTICS v_deleted_bring_pledges = ROW_COUNT;

    -- Delete bring items for this event
    DELETE FROM public.event_bring_items
    WHERE event = v_event.id;
    GET DIAGNOSTICS v_deleted_bring_items = ROW_COUNT;

    -- Delete comments for this event
    DELETE FROM public.event_comments
    WHERE event = v_event.id;
    GET DIAGNOSTICS v_deleted_comments = ROW_COUNT;

    -- Delete attendance mappings for this event
    DELETE FROM public.event_attendance_user_mapping
    WHERE event = v_event.id;
    GET DIAGNOSTICS v_deleted_attendance = ROW_COUNT;

    -- Delete the event itself
    DELETE FROM public.events
    WHERE id = v_event.id;
    GET DIAGNOSTICS v_deleted_event = ROW_COUNT;

    -- Return a row summarizing what was deleted for this event
    event_id := v_event.id;
    deleted_event := v_deleted_event;
    deleted_comments := v_deleted_comments;
    deleted_bring_items := v_deleted_bring_items;
    deleted_bring_pledges := v_deleted_bring_pledges;
    deleted_attendance := v_deleted_attendance;

    recurrence_updated := false;
    recurrence_event_id := NULL;
    RETURN NEXT;
  END LOOP;

  SELECT id INTO v_latest_event_id
  FROM public.events
  WHERE key = p_key
  ORDER BY COALESCE(startingDateTime, created_at) DESC
  LIMIT 1;

  IF v_latest_event_id IS NOT NULL THEN
    -- Update recurrenceEnd to the provided p_start_time (adjustable if you prefer a different value)
    UPDATE public.events
    SET recurrenceEnd = p_start_time
    WHERE id = v_latest_event_id;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    -- Return one row summarizing the recurrence update (no deletions)
    event_id := v_latest_event_id;
    deleted_event := 0;
    deleted_comments := 0;
    deleted_bring_items := 0;
    deleted_bring_pledges := 0;
    deleted_attendance := 0;
    recurrence_updated := (v_updated_rows > 0);
    recurrence_event_id := v_latest_event_id;
    RETURN NEXT;
  END IF;

  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_event_with_bring_items(p_event jsonb, p_items jsonb)
 RETURNS TABLE(event_id uuid, inserted_item_ids uuid[])
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_event_id uuid;
  v_item_id uuid;
  v_ids uuid[] := '{}';
  v_item jsonb;
  -- helper vars for validation
  v_temp_text text;
  v_temp_uuid uuid;
  v_temp_timestamptz timestamptz;
  v_temp_bool boolean;
  v_temp_numeric numeric;
  v_temp_int int;
  allowed_event_keys text[] := ARRAY[
    'id','title','description','startingDateTime','endDateTime','meetingDateTime','key','group',
    'items_enabled','recurrence','recurrenceEnd','created_at','isCancelled','place','answerDeadline',
    'maxAttendees','required_item','constellations_enabled'
  ];
  allowed_item_keys text[] := ARRAY[
    'name','unit','required_qty','notes','sort_order'
  ];
  key text;
BEGIN
  -- Basic validation: p_event must be an object
  IF p_event IS NULL OR jsonb_typeof(p_event) <> 'object' THEN
    RAISE EXCEPTION 'p_event must be a JSON object';
  END IF;

  -- Validate no unknown keys in p_event
  FOR key IN SELECT jsonb_object_keys(p_event)
  LOOP
    IF NOT (key = ANY (allowed_event_keys)) THEN
      RAISE EXCEPTION 'Unknown event field: %', key;
    END IF;
  END LOOP;

  -- Validate types/casts for some known fields (raise helpful errors)
  IF p_event ? 'id' THEN
    v_temp_text := p_event ->> 'id';
    BEGIN
      v_temp_uuid := v_temp_text::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid uuid for event.id: %', v_temp_text;
    END;
  END IF;

  IF p_event ? 'startingDateTime' THEN
    v_temp_text := p_event ->> 'startingDateTime';
    BEGIN
      v_temp_timestamptz := v_temp_text::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.startingDateTime: %', v_temp_text;
    END;
  END IF;

  IF p_event ? 'endDateTime' THEN
    v_temp_text := p_event ->> 'endDateTime';
    BEGIN
      v_temp_timestamptz := v_temp_text::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.endDateTime: %', v_temp_text;
    END;
  END IF;

  IF p_event ? 'items_enabled' THEN
    v_temp_text := p_event ->> 'items_enabled';
    BEGIN
      v_temp_bool := v_temp_text::boolean;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid boolean for event.items_enabled: %', v_temp_text;
    END;
  END IF;

  IF p_event ? 'created_at' THEN
    v_temp_text := p_event ->> 'created_at';
    BEGIN
      v_temp_timestamptz := v_temp_text::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.created_at: %', v_temp_text;
    END;
  END IF;

  IF p_event ? 'isCancelled' THEN
    v_temp_text := p_event ->> 'isCancelled';
    BEGIN
      v_temp_bool := v_temp_text::boolean;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid boolean for event.isCancelled: %', v_temp_text;
    END;
  END IF;

  IF p_event ? 'maxAttendees' THEN
    v_temp_text := p_event ->> 'maxAttendees';
    BEGIN
      v_temp_numeric := v_temp_text::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid numeric for event.maxAttendees: %', v_temp_text;
    END;
  END IF;

  -- Ensure event id
  IF p_event ? 'id' THEN
    v_event_id := (p_event ->> 'id')::uuid;
  ELSE
    v_event_id := gen_random_uuid();
  END IF;

  -- Insert event (explicit columns)
  INSERT INTO public.events (
    id,
    title,
    description,
    "startingDateTime",
    "endDateTime",
    "meetingDateTime",
    "key",
    "group",
    items_enabled,
    recurrence,
    "recurrenceEnd",
    created_at,
    "isCancelled",
    place,
    "answerDeadline",
    "maxAttendees",
    required_item,
    constellations_enabled
  )
  VALUES (
    v_event_id,
    NULLIF(p_event ->> 'title', ''),
    NULLIF(p_event ->> 'description', ''),
    CASE WHEN p_event ? 'startingDateTime' THEN (p_event ->> 'startingDateTime')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'endDateTime' THEN (p_event ->> 'endDateTime')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'meetingDateTime' THEN (p_event ->> 'meetingDateTime')::timestamptz ELSE NULL END,
    COALESCE(NULLIF(p_event ->> 'key', ''), gen_random_uuid()::text),
    CASE WHEN p_event ? 'group' THEN (p_event ->> 'group')::uuid ELSE NULL END,
    CASE WHEN p_event ? 'items_enabled' THEN (p_event ->> 'items_enabled')::boolean ELSE NULL END,
    CASE WHEN p_event ? 'recurrence' THEN (p_event ->> 'recurrence')::"EventRecurrence" ELSE NULL END,
    CASE WHEN p_event ? 'recurrenceEnd' THEN (p_event ->> 'recurrenceEnd')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'created_at' THEN (p_event ->> 'created_at')::timestamptz ELSE now()::timestamptz END,
    CASE WHEN p_event ? 'isCancelled' THEN (p_event ->> 'isCancelled')::boolean ELSE FALSE END,
    NULLIF(p_event ->> 'place', ''),
    CASE WHEN p_event ? 'answerDeadline' THEN (p_event ->> 'answerDeadline')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'maxAttendees' THEN (p_event ->> 'maxAttendees')::numeric ELSE NULL END,
    CASE WHEN p_event ? 'required_item' THEN (p_event ->> 'required_item')::"ItemType" ELSE NULL END,
    CASE WHEN p_event ? 'constellations_enabled' THEN (p_event ->> 'constellations_enabled')::boolean ELSE FALSE END
  );

  -- Validate and insert items if provided
  IF p_items IS NOT NULL THEN
    IF jsonb_typeof(p_items) <> 'array' THEN
      RAISE EXCEPTION 'p_items must be a JSON array or null';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      -- ensure object
      IF jsonb_typeof(v_item) <> 'object' THEN
        RAISE EXCEPTION 'Each item must be a JSON object';
      END IF;

      -- unknown keys check
      FOR key IN SELECT jsonb_object_keys(v_item)
      LOOP
        IF NOT (key = ANY (allowed_item_keys)) THEN
          RAISE EXCEPTION 'Unknown item field: %', key;
        END IF;
      END LOOP;

      IF v_item ? 'required_qty' THEN
        v_temp_text := v_item ->> 'required_qty';
        BEGIN
          v_temp_numeric := v_temp_text::numeric;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid numeric for item.required_qty: %', v_temp_text;
        END;
      END IF;

      IF v_item ? 'sort_order' THEN
        v_temp_text := v_item ->> 'sort_order';
        BEGIN
          v_temp_int := v_temp_text::int;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid int for item.sort_order: %', v_temp_text;
        END;
      END IF;

      -- perform insert
      INSERT INTO public.event_bring_items (
        event,
        name,
        unit,
        required_qty,
        notes,
        sort_order,
        created_by,
        created_at
      )
      VALUES (
        v_event_id,
        NULLIF(v_item ->> 'name', ''),
        COALESCE(NULLIF(v_item ->> 'unit', ''), 'Stk'),
        CASE WHEN v_item ? 'required_qty' THEN (v_item ->> 'required_qty')::numeric ELSE 0 END,
        NULLIF(v_item ->> 'notes', ''),
        CASE WHEN v_item ? 'sort_order' THEN (v_item ->> 'sort_order')::int ELSE 0 END,
        (select auth.uid()),
        now()
      );

      v_ids := array_append(v_ids, v_item_id);
    END LOOP;
  END IF;

  -- Return inserted ids
  event_id := v_event_id;
  inserted_item_ids := v_ids;
  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_pledge_sanity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$begin
  if new.qty is null or new.qty < 0 then
    raise exception 'qty must be >= 0' using errcode = '23514';
  end if;
  return new;
end$function$
;


