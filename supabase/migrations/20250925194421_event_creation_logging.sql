set check_function_bodies = off;

drop function if exists public.create_next_occurrences;

CREATE OR REPLACE FUNCTION public.create_next_occurrences(p_run_at timestamp with time zone, p_horizon interval)
 RETURNS SETOF events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
begin
  -- Weekly & Fortnightly in einem Rutsch.
  -- Für Monthly kann separat erweitert werden.
  return query
  with base as (
    -- pro Serie (key) eine "Basis-Zeile": früheste Instanz als Referenz
    select distinct on (e."key")
           e."key",
           e."group",
           e.title, e.description, e.place,
           e.recurrence,
           e."answerDeadline", e."maxAttendees", e."recurrenceEnd",
           e.items_enabled, e.constellations_enabled, e.required_item,
           e."startingDateTime" as base_start,
           (e."endDateTime" - e."startingDateTime") as dur
    from public.events e
    where e.recurrence in ('Weekly','Fortnightly')
    order by e."key", e."startingDateTime"
  ),
  expanded as (
    select b.*,
           case b.recurrence
             when 'Weekly'      then interval '7 days'
             when 'Fortnightly' then interval '14 days'
           end as step
    from base b
  ),
  seeds as (
    select
      e.*,
      -- nächste Serie-Startzeit ≥ p_run_at, an 'step' ausgerichtet
      (
        e.base_start
        + ceil(
            extract(epoch from (p_run_at - e.base_start))
            / extract(epoch from e.step)
          )::int * e.step
      ) as ns
    from expanded e
  ),
  horizon as (
    select s.*, (s.ns + p_horizon) as hz
    from seeds s
  ),
  candidates as (
    -- inklusiv bis hz (<=)
    select h."key", h."group", h.title, h.description, h.place, h.recurrence,
           h."answerDeadline", h."maxAttendees", h."recurrenceEnd",
           h.items_enabled, h.constellations_enabled, h.required_item,
           h.dur,
           gs as start_time,
           (gs + h.dur) as end_time
    from horizon h,
         lateral generate_series(h.ns, h.hz, h.step) as gs
    where (h."recurrenceEnd" is null or gs <= h."recurrenceEnd")
  ),
  to_insert as (
    -- Anti-Join: nimm nur die, die es noch nicht gibt
    select c.*
    from candidates c
    left join public.events e
      on e."key" = c."key" and e."startingDateTime" = c.start_time
    where e.id is null
  ),
  ins as (
    insert into public.events(
      "key", title, description, recurrence,
      "startingDateTime","endDateTime","group",
      place, "answerDeadline","maxAttendees","recurrenceEnd",
      items_enabled, constellations_enabled, required_item
    )
    select
      m."key",
      m.title,
      m.description,
      m.recurrence,
      m.start_time,
      m.end_time,
      m.grp,
      m.place,
      m.answer_deadline_shifted,
      m.max_attendees,
      m.recurrence_end,
      m.items_enabled,
      m.constellations_enabled,
      m.required_item
    from missing m
    on conflict ("key","startingDateTime") do nothing
    returning *
  )
  select * from ins;
end;
$function$
;

create policy "allow_all_admin_notifiy_users"
on "public"."notifications"
as permissive
for all
to authenticated
using (( SELECT authorize('admin.notify_users'::text) AS authorize));



