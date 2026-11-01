-- Authenticated entry point for recurrence generation. The frontend expands a series' RRULE
-- into slots (in the browser) and calls this to apply them. The heavy DB merge
-- (apply_series_occurrences) stays SECURITY DEFINER / service_role-only; this thin wrapper adds
-- the per-series authorization (event.edit + full member of the series' group, matching the
-- event_series write policy), then delegates. Trusting client-computed slots is safe: the caller
-- may already edit the series template directly, so they can set any times anyway.

-- p_mode: 'fill' (default) just adds missing occurrences without touching existing ones —
-- used by plain "generate upcoming"; 'sync' propagates a deliberate template edit to the
-- future occurrences (move/prune). Only these two values are accepted.
create or replace function public.expand_series(p_series_id uuid, p_slots jsonb, p_mode text default 'fill')
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_group uuid;
begin
  if p_mode not in ('fill', 'sync') then
    raise exception 'invalid mode %', p_mode using errcode = '22023';
  end if;

  select "group" into v_group from public.event_series where id = p_series_id;
  if v_group is null then
    raise exception 'unknown event_series %', p_series_id using errcode = '22023';
  end if;

  if not (coalesce(public.authorize('event.edit'), false) and public.is_full_member_of_group(v_group)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return public.apply_series_occurrences(p_series_id, p_slots, p_mode);
end;
$function$;

revoke all on function public.expand_series(uuid, jsonb, text) from public, anon;
grant execute on function public.expand_series(uuid, jsonb, text) to authenticated, service_role;
