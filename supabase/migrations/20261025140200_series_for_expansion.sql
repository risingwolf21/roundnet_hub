-- Feed for the recurrence-expander edge function: returns each active series with its
-- interval fields as seconds (JS-friendly), so the function needn't parse Postgres intervals.

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
    and (p_series_id is null or s.id = p_series_id);
$function$;

revoke all on function public.series_for_expansion(uuid) from public, anon, authenticated;
grant execute on function public.series_for_expansion(uuid) to service_role;
