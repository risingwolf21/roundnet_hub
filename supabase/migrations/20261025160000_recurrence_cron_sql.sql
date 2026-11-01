-- Automatic occurrence generation via pg_cron — pure SQL (no edge function).
--
-- The interactive path expands RRULE in the browser, but a cron can't run JS. This SQL
-- expander covers the recurrence kinds the UI produces (Weekly / Fortnightly / Monthly) using
-- the same DST-safe local-time stepping as the DST fix, and applies through the same idempotent
-- apply_series_occurrences, so it coexists with the frontend expander without creating
-- duplicates (both key occurrences by (series_id, occurrence_date)).

set check_function_bodies = off;

-- Expand one active series into [now, now+horizon] slots (local wall-clock preserved) and apply.
create or replace function public._expand_series_sql(p_series_id uuid, p_horizon_days int default 60, p_from timestamptz default now())
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
             'deadline', case when s.answer_offset  is null then null else t.gs_ts + s.answer_offset  end
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

revoke all on function public._expand_series_sql(uuid, int, timestamptz) from public, anon, authenticated;

-- Expand every active series (the nightly workhorse).
create or replace function public.expand_all_due_series(p_horizon_days int default 60)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_count int := 0;
begin
  for r in select id from public.event_series where active loop
    perform public._expand_series_sql(r.id, p_horizon_days);
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('processed', v_count);
end;
$function$;

revoke all on function public.expand_all_due_series(int) from public, anon, authenticated;

-- Gatekeeper: only do work when some active series is within ~a horizon of running dry.
create or replace function public.run_recurrence_expander_if_needed()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_needed boolean;
begin
  select exists (
    select 1
    from public.event_series s
    where s.active
      and (s.until is null or s.until > now())
      and coalesce(
            (select max(e.occurrence_date) from public.events e where e.series_id = s.id),
            date '-infinity'
          ) < ((now() at time zone coalesce(s.timezone, 'Europe/Berlin'))::date + 55)
  ) into v_needed;

  if not v_needed then
    return jsonb_build_object('invoked', false);
  end if;

  return public.expand_all_due_series(60);
end;
$function$;

revoke all on function public.run_recurrence_expander_if_needed() from public, anon, authenticated;

-- Daily at 02:00.
select cron.unschedule('recurrence_expander')
where exists (select 1 from cron.job where jobname = 'recurrence_expander');

select cron.schedule(
  'recurrence_expander',
  '0 2 * * *',
  $$select public.run_recurrence_expander_if_needed();$$
);
