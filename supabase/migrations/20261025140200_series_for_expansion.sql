-- Feed for the frontend recurrence expander: returns the active series the caller may edit,
-- with interval fields as seconds (JS-friendly) so the client needn't parse Postgres intervals.
-- Authz mirrors the event_series write policy (event.edit + full member of the series' group).

create or replace function public.series_for_expansion(p_series_id uuid default null)
 returns table(
   id uuid,
   rrule text,
   dtstart timestamptz,
   timezone text,
   until timestamptz,
   duration_s double precision,
   meeting_offset_s double precision,
   answer_offset_s double precision
 )
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select s.id, s.rrule, s.dtstart, s.timezone, s.until,
         extract(epoch from s.duration),
         extract(epoch from s.meeting_offset),
         extract(epoch from s.answer_offset)
  from public.event_series s
  where s.active = true
    and (p_series_id is null or s.id = p_series_id)
    and public.authorize('event.edit')
    and public.is_full_member_of_group(s."group");
$function$;

revoke all on function public.series_for_expansion(uuid) from public, anon;
grant execute on function public.series_for_expansion(uuid) to authenticated, service_role;
