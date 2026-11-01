-- Recurring Events v2 — the SQL merge that turns expanded RRULE slots into occurrences.
--
-- The RRULE math runs in the recurrence-expander edge function (rrule.js); it hands the
-- resulting slots to THIS function, which owns all the risky database logic so the pgTAP
-- harness can test it directly:
--   * insert brand-new occurrences (and materialize the items template)
--   * update FUTURE, series-managed occurrences in place — preserving the row id, so
--     attendance / bring-items / pledges / comments / games.match survive a series edit
--   * never touch past or `detached` (manually edited) occurrences, nor occurrences whose
--     `key` no longer matches the series' key — the event_transformations feature rewrites an
--     occurrence's key to decouple it, so a key mismatch is treated as "detached" too
--   * prune future occurrences the rule no longer produces: cancel them if they carry
--     attendance/pledges/matches, otherwise delete
--
-- p_mode controls how much it may touch existing rows:
--   * 'sync' (default) — full behaviour above; used for a deliberate series edit
--     ("this & all future"), which may move/prune future occurrences.
--   * 'fill' — INSERT-ONLY / non-retroactive: adds occurrences for slot dates that do not
--     yet exist and never updates, cancels or deletes an existing occurrence. This is what
--     automatic generation (the nightly cron and the "generate upcoming" button) uses, so
--     turning the feature on / letting the cron run never rewrites what is already there.
--
-- p_slots: jsonb array of
--   { "occurrence_date": "YYYY-MM-DD", "starting": <tstz>, "ending": <tstz>,
--     "meeting": <tstz|null>, "deadline": <tstz|null> }

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

    select * into v_existing
    from public.events
    where series_id = p_series_id and occurrence_date = v_date
    order by "startingDateTime"
    limit 1;

    if not found then
      -- brand-new occurrence
      insert into public.events(
        "key","group",series_id,occurrence_date,title,description,place,
        "startingDateTime","endDateTime","meetingDateTime","answerDeadline",
        recurrence,"recurrenceEnd","maxAttendees",max_trial_attendees,required_item,
        items_enabled,constellations_enabled,reminder_before
      ) values (
        s.key, s."group", s.id, v_date, s.title, s.description, s.place,
        v_start, v_end, v_meeting, v_deadline,
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

-- Maintenance/RPC surface: callable by the edge function (service_role) only.
revoke all on function public.apply_series_occurrences(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.apply_series_occurrences(uuid, jsonb, text) to service_role;
