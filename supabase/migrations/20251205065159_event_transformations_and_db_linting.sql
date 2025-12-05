
  create table "public"."event_transformation_applications" (
    "id" uuid not null default gen_random_uuid(),
    "transformation_id" uuid not null,
    "event_id" uuid not null,
    "created_by" uuid default auth.uid(),
    "created_at" timestamp with time zone default now(),
    "prev" jsonb not null,
    "next" jsonb not null,
    "note" text
      );



  create table "public"."event_transformations" (
    "id" uuid not null default gen_random_uuid(),
    "event_key" text not null,
    "created_by" uuid default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "lead_time" interval not null default '12:00:00'::interval,
    "trigger" jsonb default '{}'::jsonb,
    "next" jsonb not null,
    "one_time" boolean not null default true,
    "active" boolean not null default true,
    "reason" text
      );


CREATE UNIQUE INDEX event_transformation_applications_pkey ON public.event_transformation_applications USING btree (id);

CREATE UNIQUE INDEX event_transformations_pkey ON public.event_transformations USING btree (id);

CREATE INDEX idx_event_transformation_applications_event ON public.event_transformation_applications USING btree (event_id);

CREATE INDEX idx_event_transformations_key_active ON public.event_transformations USING btree (event_key, active);

alter table "public"."event_transformation_applications" add constraint "event_transformation_applications_pkey" PRIMARY KEY using index "event_transformation_applications_pkey";

alter table "public"."event_transformations" add constraint "event_transformations_pkey" PRIMARY KEY using index "event_transformations_pkey";

alter table "public"."event_transformation_applications" add constraint "event_transformation_applications_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_transformation_applications" validate constraint "event_transformation_applications_event_id_fkey";

alter table "public"."event_transformation_applications" add constraint "event_transformation_applications_transformation_id_fkey" FOREIGN KEY (transformation_id) REFERENCES public.event_transformations(id) ON DELETE CASCADE not valid;

alter table "public"."event_transformation_applications" validate constraint "event_transformation_applications_transformation_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.apply_transformation_to_event(p_transformation_id uuid, p_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
  v_tr record;
  v_event record;
  v_prev jsonb;
  v_next jsonb;
  v_key_new text;
BEGIN
  SELECT * INTO v_tr FROM public.event_transformations WHERE id = p_transformation_id FOR UPDATE;
  IF NOT FOUND OR NOT v_tr.active THEN
    RAISE EXCEPTION 'transformation not found or not active';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  -- build prev snapshot (adjust fields you want to capture)
  v_prev := to_jsonb(json_build_object(
    'title', v_event.title,
    'description', v_event.description,
    'group', v_event."group",
    'key', v_event.key,
    'recurrence', v_event.recurrence,
    'startingDateTime', v_event."startingDateTime",
    'maxAttendees', v_event."maxAttendees"
  ));

  v_next := v_tr.next;

  -- apply fields that are present in next
  IF v_next ? 'title' THEN
    UPDATE public.events SET title = v_next->>'title' WHERE id = v_event.id;
  END IF;
  IF v_next ? 'description' THEN
    UPDATE public.events SET description = v_next->>'description' WHERE id = v_event.id;
  END IF;
  IF v_next ? 'group' THEN
    UPDATE public.events SET "group" = (v_next->>'group')::uuid WHERE id = v_event.id;
  END IF;
  IF v_next ? 'recurrence' THEN
    UPDATE public.events SET recurrence = (v_next->>'recurrence')::public."EventRecurrence" WHERE id = v_event.id;
  END IF;

  -- Wenn die Regel verlangt exclude_from_generation (entweder im next oder true per default),
  -- decouple die Instanz, indem wir einen neuen key setzen.
  IF ( (v_next ? 'exclude_from_generation' AND (v_next->>'exclude_from_generation')::boolean )
       OR v_tr.trigger ? 'force_key_change' ) THEN
    v_key_new := gen_random_uuid()::text;
    UPDATE public.events SET key = v_key_new WHERE id = v_event.id;
    -- optional: schreibe den neue key auch in v_next für das Log
    v_next := jsonb_set(v_next, '{key}', to_jsonb(v_key_new));
  END IF;

  -- Insert application log
  INSERT INTO public.event_transformation_applications(
    transformation_id, event_id, prev, next, created_by
  ) VALUES (
    v_tr.id, v_event.id, v_prev, v_next, auth.uid()
  );

  -- Wenn one_time, deaktiviere die Regel
  IF v_tr.one_time THEN
    UPDATE public.event_transformations SET active = false WHERE id = v_tr.id;
  END IF;
END;$function$
;

CREATE OR REPLACE FUNCTION public.create_event_transformation_by_key(p_event_key text, p_lead_time interval, p_trigger jsonb, p_next jsonb, p_one_time boolean DEFAULT true, p_reason text DEFAULT NULL::text)
 RETURNS public.event_transformations
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_insert public.event_transformations%ROWTYPE;
BEGIN
  INSERT INTO public.event_transformations(
    event_key, lead_time, trigger, next, one_time, reason, created_by
  ) VALUES (
    p_event_key,
    COALESCE(p_lead_time, '2 hours'),
    COALESCE(p_trigger, '{}'::jsonb),
    p_next,
    p_one_time,
    p_reason,
    auth.uid()
  )
  RETURNING * INTO v_insert;

  RETURN v_insert;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revert_transformation_application(p_application_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  a record;
  e record;
BEGIN
  SELECT * INTO a FROM public.event_transformation_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application not found';
  END IF;

  SELECT * INTO e FROM public.events WHERE id = a.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  -- restore prev fields (only those captured)
  IF a.prev ? 'title' THEN
    UPDATE public.events SET title = a.prev->>'title' WHERE id = e.id;
  END IF;
  IF a.prev ? 'description' THEN
    UPDATE public.events SET description = a.prev->>'description' WHERE id = e.id;
  END IF;
  IF a.prev ? 'group' THEN
    UPDATE public.events SET "group" = (a.prev->>'group')::uuid WHERE id = e.id;
  END IF;
  IF a.prev ? 'key' THEN
    UPDATE public.events SET key = a.prev->>'key' WHERE id = e.id;
  END IF;

  -- optional: mark something or insert audit
END;
$function$
;

CREATE OR REPLACE FUNCTION public.run_event_transformations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
  tr record;
  e record;
  applied_count int := 0;
  -- helper to check if already applied for this event
  already_applied int;
BEGIN
  FOR tr IN
    SELECT * FROM public.event_transformations WHERE active = true
  LOOP
    -- finde alle Events mit diesem key, die innerhalb der lead_time fällig sind
    FOR e IN
      SELECT * FROM public.events
      WHERE "key" = tr.event_key
        AND ("startingDateTime" - tr.lead_time) <= now()
        AND "startingDateTime" > now() - interval '2 days'
    LOOP
      -- überspringen, wenn für diese event bereits eine application existiert
      SELECT count(*) INTO already_applied
      FROM public.event_transformation_applications a
      WHERE a.transformation_id = tr.id AND a.event_id = e.id;

      IF already_applied > 0 THEN
        CONTINUE;
      END IF;

      -- check trigger: z.B. attending_lt
      IF tr.trigger ? 'attending_lt' THEN
        -- count attending
        PERFORM 1; -- placeholder
        IF (SELECT count(*) FROM public.event_attendance_user_mapping a WHERE a.event = e.id AND a.state = 'Attending') >= (tr.trigger->>'attending_lt')::int THEN
          -- Bedingung nicht erfüllt => skip
          CONTINUE;
        END IF;
      END IF;

      -- apply transformation to this event instance
      BEGIN
        PERFORM public.apply_transformation_to_event(tr.id, e.id);
        applied_count := applied_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'apply_transformation failed for trans % on event %: %', tr.id, e.id, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RETURN applied_count;
END;$function$
;

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
      AND e."startingDateTime" < p_run_at
      AND e."endDateTime" < p_run_at
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$declare
    claims jsonb;
    permissions text[];
    features text[];
  begin

    Select array(select distinct gp."permission"::text from public."group_permissions" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user" = (event->>'user_id')::uuid and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into permissions;

    Select array(select distinct gp."feature"::text from public."group_features" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user" = (event->>'user_id')::uuid and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into features;

    claims := event->'claims';

    if permissions is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_permissions}', to_jsonb(permissions));
    else
      claims := jsonb_set(claims, '{user_permissions}', '[]'::jsonb);
    end if;

    if features is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_features}', to_jsonb(features));
    else
      claims := jsonb_set(claims, '{user_features}', '[]'::jsonb);
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;$function$
;

CREATE OR REPLACE FUNCTION public.delete_recurring_events(p_key text, p_start_time timestamp with time zone)
 RETURNS TABLE(event_id uuid, deleted_event integer, deleted_comments integer, deleted_bring_items integer, deleted_bring_pledges integer, deleted_attendance integer, recurrence_updated boolean, recurrence_event_id uuid)
 LANGUAGE plpgsql
AS $function$DECLARE
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
      AND COALESCE("startingDateTime", created_at) >= p_start_time
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
  ORDER BY COALESCE("startingDateTime", created_at) DESC
  LIMIT 1;

  IF v_latest_event_id IS NOT NULL THEN
    -- Update recurrenceEnd to the provided p_start_time (adjustable if you prefer a different value)
    UPDATE public.events
    SET "recurrenceEnd" = p_start_time
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.gettingjsonarray(items json)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
    drink_record json;
BEGIN
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
       raise log 'logging message: %', drink_record->>'name';
    END LOOP;
    
END;$function$
;

CREATE OR REPLACE FUNCTION public.insert_event_with_bring_items(p_event jsonb, p_items jsonb)
 RETURNS TABLE(event_id uuid, inserted_item_ids uuid[])
 LANGUAGE plpgsql
AS $function$DECLARE
  v_event_id uuid;
  v_item_id uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_item jsonb;
  allowed_event_keys text[] := ARRAY[
    'id','title','description','startingDateTime','endDateTime','meetingDateTime','key','group',
    'items_enabled','recurrence','recurrenceEnd','created_at','isCancelled','place','answerDeadline', 'max_trial_attendees', 'items_enabled',
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
    BEGIN
      PERFORM (p_event ->> 'id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid uuid for event.id: %', p_event ->> 'id';
    END;
  END IF;

  IF p_event ? 'startingDateTime' THEN
    BEGIN
      PERFORM (p_event ->> 'startingDateTime')::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.startingDateTime: %', p_event ->> 'startingDateTime';
    END;
  END IF;

  IF p_event ? 'endDateTime' THEN
    BEGIN
      PERFORM (p_event ->> 'endDateTime')::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.endDateTime: %', p_event ->> 'endDateTime';
    END;
  END IF;

  IF p_event ? 'items_enabled' THEN
    BEGIN
      PERFORM (p_event ->> 'items_enabled')::boolean;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid boolean for event.items_enabled: %', p_event ->> 'items_enabled';
    END;
  END IF;

  IF p_event ? 'created_at' THEN
    BEGIN
      PERFORM (p_event ->> 'created_at')::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.created_at: %', p_event ->> 'created_at';
    END;
  END IF;

  IF p_event ? 'isCancelled' THEN
    BEGIN
      PERFORM (p_event ->> 'isCancelled')::boolean;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid boolean for event.isCancelled: %', p_event ->> 'isCancelled';
    END;
  END IF;

  IF p_event ? 'maxAttendees' THEN
    BEGIN
      PERFORM (p_event ->> 'maxAttendees')::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid numeric for event.maxAttendees: %', p_event ->> 'maxAttendees';
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
    CASE WHEN p_event ? 'items_enabled' THEN (p_event ->> 'items_enabled')::boolean ELSE FALSE END,
    CASE WHEN p_event ? 'recurrence' THEN (p_event ->> 'recurrence')::"EventRecurrence" ELSE 'None'::"EventRecurrence" END,
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
        BEGIN
          PERFORM (p_event ->> 'required_qty')::numeric;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid numeric for item.required_qty: %', p_event ->> 'required_qty';
        END;
      END IF;

      IF v_item ? 'sort_order' THEN
        BEGIN
          PERFORM (p_event ->> 'sort_order')::int;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid int for item.sort_order: %', p_event ->> 'sort_order';
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
      )
      RETURNING id INTO v_item_id;

      v_ids := array_append(v_ids, v_item_id);
    END LOOP;
  END IF;

  -- Return inserted ids
  event_id := v_event_id;
  inserted_item_ids := v_ids;
  RETURN NEXT;
END;$function$
;

CREATE OR REPLACE FUNCTION public.run_push_worker_if_needed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_has_work boolean;
  v_result bigint;
begin
  select exists (
    select 1
      from notifications.notification_outbox_targets t
      join notifications.notification_outbox o on o.id = t.outbox_id
     where (t.last_status is null or t.last_status >= 400)           -- nie versucht oder fehlgeschlagen
       and (t.next_attempt_at is null or t.next_attempt_at <= now()) -- fällig
       and o.status = 'pending'
  )
  into v_has_work;

  if v_has_work then
    select * from public.invoke_edge_function('push-worker') into v_result;
    return json_build_object('request_id', v_result);
  else
    return jsonb_build_object('processed', 0, 'skipped', true);
  end if;
end;$function$
;

grant delete on table "public"."event_transformation_applications" to "anon";

grant insert on table "public"."event_transformation_applications" to "anon";

grant references on table "public"."event_transformation_applications" to "anon";

grant select on table "public"."event_transformation_applications" to "anon";

grant trigger on table "public"."event_transformation_applications" to "anon";

grant truncate on table "public"."event_transformation_applications" to "anon";

grant update on table "public"."event_transformation_applications" to "anon";

grant delete on table "public"."event_transformation_applications" to "authenticated";

grant insert on table "public"."event_transformation_applications" to "authenticated";

grant references on table "public"."event_transformation_applications" to "authenticated";

grant select on table "public"."event_transformation_applications" to "authenticated";

grant trigger on table "public"."event_transformation_applications" to "authenticated";

grant truncate on table "public"."event_transformation_applications" to "authenticated";

grant update on table "public"."event_transformation_applications" to "authenticated";

grant delete on table "public"."event_transformation_applications" to "service_role";

grant insert on table "public"."event_transformation_applications" to "service_role";

grant references on table "public"."event_transformation_applications" to "service_role";

grant select on table "public"."event_transformation_applications" to "service_role";

grant trigger on table "public"."event_transformation_applications" to "service_role";

grant truncate on table "public"."event_transformation_applications" to "service_role";

grant update on table "public"."event_transformation_applications" to "service_role";

grant delete on table "public"."event_transformations" to "anon";

grant insert on table "public"."event_transformations" to "anon";

grant references on table "public"."event_transformations" to "anon";

grant select on table "public"."event_transformations" to "anon";

grant trigger on table "public"."event_transformations" to "anon";

grant truncate on table "public"."event_transformations" to "anon";

grant update on table "public"."event_transformations" to "anon";

grant delete on table "public"."event_transformations" to "authenticated";

grant insert on table "public"."event_transformations" to "authenticated";

grant references on table "public"."event_transformations" to "authenticated";

grant select on table "public"."event_transformations" to "authenticated";

grant trigger on table "public"."event_transformations" to "authenticated";

grant truncate on table "public"."event_transformations" to "authenticated";

grant update on table "public"."event_transformations" to "authenticated";

grant delete on table "public"."event_transformations" to "service_role";

grant insert on table "public"."event_transformations" to "service_role";

grant references on table "public"."event_transformations" to "service_role";

grant select on table "public"."event_transformations" to "service_role";

grant trigger on table "public"."event_transformations" to "service_role";

grant truncate on table "public"."event_transformations" to "service_role";

grant update on table "public"."event_transformations" to "service_role";


