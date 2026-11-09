set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.run_event_transformation_worker_if_needed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_has_work boolean;
  v_result bigint;
BEGIN
  /*
    Es gibt Arbeit, wenn:
    - aktive Transformationen existieren
    - mindestens ein Event existiert, das:
        - im Zeitfenster liegt
        - noch nicht applied wurde
  */
  SELECT EXISTS (
    SELECT 1
    FROM public.event_transformations tr
    JOIN public.events e
      ON e.key = tr.event_key
    WHERE tr.active = true
      AND (e."startingDateTime" - tr.lead_time) <= now()
      AND e."startingDateTime" > now() - interval '2 days'
      AND NOT EXISTS (
        SELECT 1
        FROM public.event_transformation_applications a
        WHERE a.transformation_id = tr.id
          AND a.event_id = e.id
      )
  )
  INTO v_has_work;

  if v_has_work then
    select * from public.invoke_edge_function('event-transformation-worker') into v_result;
    return json_build_object('request_id', v_result);
  else
    return jsonb_build_object('processed', 0, 'skipped', true);
  end if;
END;
$function$
;

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
  v_prev := jsonb_build_object(
  'title', v_event.title,
  'description', v_event.description,
  'group', v_event."group",
  'key', v_event.key,
  'recurrence', v_event.recurrence,
  'startingDateTime', v_event."startingDateTime",
  'maxAttendees', v_event."maxAttendees"
);

  v_next := v_tr.next;

  UPDATE public.events
SET
  title = CASE WHEN v_next ? 'title' THEN v_next->>'title' ELSE title END,
  description = CASE WHEN v_next ? 'description' THEN v_next->>'description' ELSE description END,
  "group" = CASE
    WHEN v_next ? 'group' THEN (v_next->>'group')::uuid
    ELSE "group"
  END,
  recurrence = CASE
    WHEN v_next ? 'recurrence' THEN (v_next->>'recurrence')::public."EventRecurrence"
    ELSE recurrence
  END,
  "answerDeadline" = CASE
    WHEN v_next ? 'disableAnswerDeadline'
        AND (v_next->>'disableAnswerDeadline')::boolean = true
    THEN NULL
    ELSE "answerDeadline"
  END
  WHERE id = v_event.id;

  -- Wenn die Regel verlangt exclude_from_generation (entweder im next oder true per default),
  -- decouple die Instanz, indem wir einen neuen key setzen.
  IF ( (v_next ? 'exclude_from_generation' AND (v_next->>'exclude_from_generation')::boolean )
       OR (
  v_tr.trigger ? 'force_key_change'
  AND (v_tr.trigger->>'force_key_change')::boolean
) ) THEN
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

select cron.schedule(
  'event_transformations',
  '0 * * * *',
  $$select public.run_event_transformation_worker_if_needed();$$
);

INSERT INTO public.permissions (name, description) VALUES ('event.transform', 'Erlaubt das Transformieren von Events via Event Transformation Regeln.') ON CONFLICT (name) DO NOTHING;