-- Automatic recurring-event generation: a daily pg_cron job tops up occurrences from the
-- series templates, mirroring the event_transformations pattern
-- (cron → public.run_*_if_needed() gatekeeper → invoke_edge_function → pg_net → edge fn).
-- The manual "Erstellen" button invokes the same edge function on demand from the app.

create or replace function public.run_recurrence_expander_if_needed()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_needed boolean;
  v_result bigint;
begin
  -- Only call the edge function when some active series is within ~a horizon of running dry.
  select exists (
    select 1
    from public.event_series s
    where s.active
      and (s.until is null or s.until > now())
      and coalesce(
            (select max(e.occurrence_date) from public.events e where e.series_id = s.id),
            date '-infinity'
          ) < ((now() at time zone s.timezone)::date + 55)
  ) into v_needed;

  if not v_needed then
    return jsonb_build_object('invoked', false);
  end if;

  select public.invoke_edge_function('recurrence-expander', jsonb_build_object('horizon_days', 60))
    into v_result;
  return jsonb_build_object('invoked', true, 'request_id', v_result);
end;
$function$;

revoke all on function public.run_recurrence_expander_if_needed() from public, anon, authenticated;

-- (Re)schedule the daily job at 02:00.
select cron.unschedule('recurrence_expander')
where exists (select 1 from cron.job where jobname = 'recurrence_expander');

select cron.schedule(
  'recurrence_expander',
  '0 2 * * *',
  $$select public.run_recurrence_expander_if_needed();$$
);
