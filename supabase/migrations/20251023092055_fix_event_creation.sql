grant delete on table "audit"."log" to "anon";

grant insert on table "audit"."log" to "anon";

grant references on table "audit"."log" to "anon";

grant select on table "audit"."log" to "anon";

grant trigger on table "audit"."log" to "anon";

grant truncate on table "audit"."log" to "anon";

grant update on table "audit"."log" to "anon";

grant delete on table "audit"."log" to "authenticated";

grant insert on table "audit"."log" to "authenticated";

grant references on table "audit"."log" to "authenticated";

grant select on table "audit"."log" to "authenticated";

grant trigger on table "audit"."log" to "authenticated";

grant truncate on table "audit"."log" to "authenticated";

grant update on table "audit"."log" to "authenticated";

grant delete on table "audit"."log" to "service_role";

grant insert on table "audit"."log" to "service_role";

grant references on table "audit"."log" to "service_role";

grant select on table "audit"."log" to "service_role";

grant trigger on table "audit"."log" to "service_role";

grant truncate on table "audit"."log" to "service_role";

grant update on table "audit"."log" to "service_role";

grant select on table "public"."features" to "anon";

grant select on table "public"."permissions" to "anon";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.insert_event_with_bring_items(p_event jsonb, p_items jsonb)
 RETURNS TABLE(event_id uuid, inserted_item_ids uuid[])
 LANGUAGE plpgsql
AS $function$DECLARE
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


