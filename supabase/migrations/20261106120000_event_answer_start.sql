-- "Attendance opens" date: the counterpart of events."answerDeadline".
-- From this instant on members can answer (attend/decline) an event. NULL = always open.
-- New events get it set to 5 days before the start by the client; existing events stay NULL
-- (always open) so nothing that is already open gets closed retroactively.
-- Like answerDeadline this is enforced in the UI only.

-- ============================================================
-- 1. Columns
-- ============================================================
alter table public.events
  add column if not exists "answerStart" timestamptz;

-- offset relative to the occurrence start (negative = before), like answer_offset
alter table public.event_series
  add column if not exists answer_start_offset interval default interval '-5 days';

-- ============================================================
-- 2. events_user_view: append the new column (must stay last for CREATE OR REPLACE)
-- ============================================================
create or replace view public.events_user_view with (security_invoker=on) as
  select e.id,
    e.created_at,
    e.title,
    e.description,
    e."meetingDateTime",
    e."startingDateTime",
    e."endDateTime",
    e.key,
    e."isCancelled",
    e.place,
    e."group",
    e.recurrence,
    e."answerDeadline",
    e."recurrenceEnd",
    e."maxAttendees",
    e.max_trial_attendees,
    e.required_item,
    e.constellations_enabled,
    eaus.state as user_state,
    gus.role as user_group_role,
    (select count(*) from public.event_attendance_user_mapping ea
      where ea.event = e.id and ea.state = 'Attending'::public."EventAttendance") as attending_count,
    (select count(*) from public.event_attendance_user_mapping ea
      where ea.event = e.id and ea.state = 'Declined'::public."EventAttendance") as declined_count,
    e."answerStart"
  from public.events e
    left join public.event_attendance_user_mapping eaus
      on e.id = eaus.event and eaus."user" = (select auth.uid())
    join public.group_user_mapping gus
      on e."group" = gus."group" and gus."user" = (select auth.uid());

-- ============================================================
-- 3. series_for_expansion: expose the offset in seconds
-- ============================================================
drop function if exists public.series_for_expansion(uuid);

create function public.series_for_expansion(p_series_id uuid default null)
 returns table(
   id uuid,
   rrule text,
   dtstart timestamptz,
   timezone text,
   until timestamptz,
   duration_s double precision,
   meeting_offset_s double precision,
   answer_offset_s double precision,
   answer_start_offset_s double precision
 )
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select s.id, s.rrule, s.dtstart, s.timezone, s.until,
         extract(epoch from s.duration),
         extract(epoch from s.meeting_offset),
         extract(epoch from s.answer_offset),
         extract(epoch from s.answer_start_offset)
  from public.event_series s
  where s.active = true
    and (p_series_id is null or s.id = p_series_id)
    and public.authorize('event.edit')
    and public.is_full_member_of_group(s."group");
$function$;

revoke all on function public.series_for_expansion(uuid) from public, anon;
grant execute on function public.series_for_expansion(uuid) to authenticated, service_role;

-- ============================================================
-- 4. _expand_series_sql: emit 'answer_start' per slot
-- ============================================================
create or replace function public._expand_series_sql(p_series_id uuid, p_horizon_days integer default 60, p_from timestamp with time zone default now())
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s     public.event_series%rowtype;
  v_tz  text;
  v_step interval;
  v_now timestamptz := p_from;
  v_to  timestamptz;
  v_slots jsonb;
begin
  select * into s from public.event_series where id = p_series_id and active;
  if not found then
    return jsonb_build_object('skipped', true);
  end if;

  v_tz := coalesce(s.timezone, 'Europe/Berlin');
  v_step := case s.recurrence
    when 'Weekly'::public."EventRecurrence"      then interval '7 days'
    when 'Fortnightly'::public."EventRecurrence" then interval '14 days'
    when 'Monthly'::public."EventRecurrence"     then interval '1 month'
    else null
  end;
  if v_step is null then
    return jsonb_build_object('skipped', true);  -- custom rules are materialized by the client
  end if;

  v_to := v_now + make_interval(days => p_horizon_days);
  if s.until is not null and s.until < v_to then
    v_to := s.until;
  end if;

  -- Step in LOCAL time (floating), convert each slot back to an instant: 19:00 stays 19:00 across DST.
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'occurrence_date', (g.gs_local)::date,
             'starting', t.gs_ts,
             'ending',   t.gs_ts + s.duration,
             'meeting',  case when s.meeting_offset is null then null else t.gs_ts + s.meeting_offset end,
             'deadline', case when s.answer_offset  is null then null else t.gs_ts + s.answer_offset  end,
             'answer_start', case when s.answer_start_offset is null then null else t.gs_ts + s.answer_start_offset end
           ) order by t.gs_ts
         ), '[]'::jsonb)
    into v_slots
  from generate_series(
         (s.dtstart at time zone v_tz),
         (v_to      at time zone v_tz),
         v_step
       ) as g(gs_local)
  cross join lateral (select (g.gs_local at time zone v_tz) as gs_ts) t
  where t.gs_ts > v_now
    and (s.until is null or t.gs_ts <= s.until);

  -- 'fill': automatic generation only ADDS missing future occurrences; it never rewrites,
  -- moves, cancels or deletes an existing occurrence (non-retroactive).
  return public.apply_series_occurrences(p_series_id, v_slots, 'fill');
end;
$function$;

-- ============================================================
-- 5. apply_series_occurrences: carry answerStart on insert + sync
-- ============================================================
create or replace function public.apply_series_occurrences(p_series_id uuid, p_slots jsonb, p_mode text default 'sync')
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s          public.event_series%rowtype;
  slot       jsonb;
  v_item     jsonb;
  v_existing public.events%rowtype;
  v_date     date;
  v_start    timestamptz;
  v_end      timestamptz;
  v_meeting  timestamptz;
  v_deadline timestamptz;
  v_answer_start timestamptz;
  v_new_id   uuid;
  v_creator  uuid;
  v_dates    date[];
  v_inserted int := 0;
  v_updated  int := 0;
  v_cancelled int := 0;
  v_deleted  int := 0;
begin
  select * into s from public.event_series where id = p_series_id;
  if not found then
    raise exception 'unknown event_series %', p_series_id using errcode = '22023';
  end if;

  v_creator := coalesce(s.created_by, (select auth.uid()));

  select coalesce(array_agg((e->>'occurrence_date')::date), array[]::date[])
    into v_dates
  from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) e;

  -- ---- upsert each slot ------------------------------------------------
  for slot in select * from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb))
  loop
    v_date     := (slot->>'occurrence_date')::date;
    v_start    := (slot->>'starting')::timestamptz;
    v_end      := (slot->>'ending')::timestamptz;
    v_meeting  := nullif(slot->>'meeting','')::timestamptz;
    v_deadline := nullif(slot->>'deadline','')::timestamptz;
    v_answer_start := nullif(slot->>'answer_start','')::timestamptz;

    select * into v_existing
    from public.events
    where series_id = p_series_id and occurrence_date = v_date
    order by "startingDateTime"
    limit 1;

    if not found then
      -- brand-new occurrence
      insert into public.events(
        "key","group",series_id,occurrence_date,title,description,place,
        "startingDateTime","endDateTime","meetingDateTime","answerDeadline","answerStart",
        recurrence,"recurrenceEnd","maxAttendees",max_trial_attendees,required_item,
        items_enabled,constellations_enabled,reminder_before
      ) values (
        s.key, s."group", s.id, v_date, s.title, s.description, s.place,
        v_start, v_end, v_meeting, v_deadline, v_answer_start,
        s.recurrence, s.until, s.max_attendees, s.max_trial_attendees, s.required_item,
        s.items_enabled, s.constellations_enabled, s.reminder_before
      )
      on conflict ("key","startingDateTime") do nothing
      returning id into v_new_id;

      if v_new_id is not null then
        v_inserted := v_inserted + 1;

        -- materialize the bring-items template (only when we can attribute a creator)
        if s.items_enabled and v_creator is not null and jsonb_typeof(s.items_template) = 'array' then
          for v_item in select * from jsonb_array_elements(s.items_template)
          loop
            insert into public.event_bring_items(event,name,unit,required_qty,notes,sort_order,created_by)
            values (
              v_new_id,
              v_item->>'name',
              coalesce(nullif(v_item->>'unit',''),'Stk'),
              coalesce((v_item->>'required_qty')::numeric, 0),
              nullif(v_item->>'notes',''),
              coalesce((v_item->>'sort_order')::int, 0),
              v_creator
            );
          end loop;
        end if;
      end if;

    elsif p_mode = 'sync'
          and v_existing."startingDateTime" > now()
          and v_existing.detached = false
          and v_existing."key" = s.key
          and v_existing."isCancelled" = false then
      -- update the future, series-managed occurrence in place (id preserved)
      update public.events
      set title               = s.title,
          description         = s.description,
          place               = s.place,
          "startingDateTime"  = v_start,
          "endDateTime"       = v_end,
          "meetingDateTime"   = v_meeting,
          "answerDeadline"    = v_deadline,
          "answerStart"       = v_answer_start,
          recurrence          = s.recurrence,
          "recurrenceEnd"     = s.until,
          "maxAttendees"      = s.max_attendees,
          max_trial_attendees = s.max_trial_attendees,
          required_item       = s.required_item,
          items_enabled       = s.items_enabled,
          constellations_enabled = s.constellations_enabled,
          reminder_before     = s.reminder_before
      where id = v_existing.id;
      v_updated := v_updated + 1;
    end if;
    -- past or detached occurrences are left untouched
  end loop;

  -- ---- prune future occurrences the rule no longer produces (sync only) ----
  if p_mode = 'sync' then
  for v_existing in
    select * from public.events
    where series_id = p_series_id
      and detached = false
      and "key" = s.key
      and "isCancelled" = false
      and "startingDateTime" > now()
      and not (occurrence_date = any(v_dates))
  loop
    if exists (select 1 from public.event_attendance_user_mapping where event = v_existing.id)
       or exists (select 1 from public.event_bring_pledges where event = v_existing.id)
       or exists (select 1 from games.match where event = v_existing.id) then
      update public.events set "isCancelled" = true where id = v_existing.id;
      v_cancelled := v_cancelled + 1;
    else
      delete from public.events where id = v_existing.id;
      v_deleted := v_deleted + 1;
    end if;
  end loop;
  end if;

  return jsonb_build_object(
    'inserted', v_inserted, 'updated', v_updated,
    'cancelled', v_cancelled, 'deleted', v_deleted
  );
end;
$function$;

-- ============================================================
-- 6. insert_event_with_bring_items: accept + store answerStart
-- ============================================================
create or replace function public.insert_event_with_bring_items(p_event jsonb, p_items jsonb)
 returns table(event_id uuid, inserted_item_ids uuid[])
 language plpgsql
as $function$DECLARE
  v_event_id uuid;
  v_item_id uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_item jsonb;
  allowed_event_keys text[] := ARRAY[
    'id','title','description','startingDateTime','endDateTime','meetingDateTime','key','group',
    'items_enabled','recurrence','recurrenceEnd','created_at','isCancelled','place','answerDeadline', 'answerStart', 'max_trial_attendees', 'items_enabled',
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
    "answerStart",
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
    CASE WHEN p_event ? 'answerStart' THEN (p_event ->> 'answerStart')::timestamptz ELSE NULL END,
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
END;$function$;
