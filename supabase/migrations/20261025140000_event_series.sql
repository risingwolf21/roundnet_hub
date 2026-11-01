-- Recurring Events v2 — explicit series template (source of truth) + RRULE.
--
-- Today a "series" is only the set of events rows sharing `key`, and the generator
-- templates off the latest occurrence. This introduces public.event_series as the
-- single source of truth: each recurring training is one series row carrying an iCal
-- RRULE, its local start/duration/offsets, and an items blueprint. Occurrences remain
-- real `events` rows, now linked by `series_id` and tagged with the RRULE slot's local
-- `occurrence_date` (a stable identity that survives time changes); `detached` marks an
-- occurrence a user edited individually so series regeneration leaves it alone.
--
-- `events.key` is intentionally KEPT (views, event_transformations.event_key, the
-- uq_events_key_start index and every generator ON CONFLICT still rely on it); the series
-- carries that same key so generated occurrences stay compatible.

-- ============================================================
-- 1. event_series (template)
-- ============================================================
create table if not exists public.event_series (
  id                    uuid primary key default gen_random_uuid(),
  -- physical series key, kept in sync with events.key for backwards compatibility
  key                   text not null unique default gen_random_uuid()::text,
  "group"               uuid not null references public.event_group(id) on delete cascade,
  title                 text not null default '',
  description           text not null default '',
  place                 text,
  timezone              text not null default 'Europe/Berlin',
  -- iCal recurrence rule, e.g. 'FREQ=WEEKLY;INTERVAL=1;BYDAY=WE'
  rrule                 text not null,
  -- legacy enum, kept in sync for events.recurrence + the current_distinct_event view and
  -- the detail UI (best-effort mapping for custom rules)
  recurrence            public."EventRecurrence" not null default 'Weekly',
  -- convenience copy of the rule's UNTIL (also mirrored onto generated events.recurrenceEnd)
  until                 timestamptz,
  -- anchor: first occurrence instant; expanded in `timezone` so wall-clock is stable
  dtstart               timestamptz not null,
  duration              interval not null,
  meeting_offset        interval,
  answer_offset         interval,
  max_attendees         numeric,
  max_trial_attendees   numeric,
  required_item         public."ItemType",
  items_enabled         boolean not null default false,
  constellations_enabled boolean not null default false,
  reminder_before       text,
  -- bring-items blueprint: [{name, unit, required_qty, notes, sort_order}]
  items_template        jsonb not null default '[]'::jsonb,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  created_by            uuid
);

create index if not exists idx_event_series_group on public.event_series ("group");

-- ============================================================
-- 2. events: link to series
-- ============================================================
alter table public.events
  add column if not exists series_id       uuid references public.event_series(id) on delete set null,
  add column if not exists occurrence_date  date,
  add column if not exists detached         boolean not null default false;

-- Non-unique on purpose: the merge function (apply_series_occurrences) looks rows up by
-- (series_id, occurrence_date) and updates in place. A unique index here would risk
-- failing the backfill on any pre-existing duplicate-date occurrence in production.
create index if not exists idx_events_series_occurrence
  on public.events (series_id, occurrence_date);

-- ============================================================
-- 3. RLS — mirror the events table policies exactly
--    (20261002072326_security_hardening.sql: is_user_in_group / is_full_member_of_group
--     + authorize('event.create'|'event.edit'|'event.delete'))
-- ============================================================
alter table public.event_series enable row level security;

grant select, insert, update, delete on public.event_series to authenticated;
grant all on public.event_series to service_role;

drop policy if exists event_series_select_member on public.event_series;
create policy event_series_select_member on public.event_series
  for select to authenticated
  using (public.is_user_in_group("group"));

drop policy if exists event_series_insert_with_perm on public.event_series;
create policy event_series_insert_with_perm on public.event_series
  for insert to authenticated
  with check (
    (public.authorize('event.create') or public.authorize('event.edit'))
    and public.is_full_member_of_group("group")
  );

drop policy if exists event_series_update_with_perm on public.event_series;
create policy event_series_update_with_perm on public.event_series
  for update to authenticated
  using (public.authorize('event.edit') and public.is_full_member_of_group("group"))
  with check (public.authorize('event.edit') and public.is_full_member_of_group("group"));

drop policy if exists event_series_delete_with_perm on public.event_series;
create policy event_series_delete_with_perm on public.event_series
  for delete to authenticated
  using (public.authorize('event.delete') and public.is_full_member_of_group("group"));

-- ============================================================
-- 4. Backfill: one series per existing recurring `key`, derived from the CURRENT
--    (latest) occurrence so the template reflects the schedule/settings in effect now
--    (a training that changed weekday/time over its life keeps its CURRENT rhythm, and
--    forward generation never reschedules existing future occurrences). recurrence='None'
--    events are left unlinked.
-- ============================================================
insert into public.event_series (
  key, "group", title, description, place, timezone, rrule, recurrence, until, dtstart, duration,
  meeting_offset, answer_offset, max_attendees, max_trial_attendees, required_item,
  items_enabled, constellations_enabled, reminder_before, items_template, active
)
select
  a.key,
  a."group",
  a.title,
  a.description,
  a.place,
  'Europe/Berlin',
  case a.recurrence
    when 'Weekly'::public."EventRecurrence"      then 'FREQ=WEEKLY;INTERVAL=1;BYDAY='  || d.wd
    when 'Fortnightly'::public."EventRecurrence" then 'FREQ=WEEKLY;INTERVAL=2;BYDAY='  || d.wd
    when 'Monthly'::public."EventRecurrence"     then 'FREQ=MONTHLY;BYMONTHDAY='       || d.dom
  end
  || case when a."recurrenceEnd" is not null
          then ';UNTIL=' || to_char(a."recurrenceEnd" at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"')
          else '' end,
  a.recurrence,
  a."recurrenceEnd",
  a."startingDateTime",
  (a."endDateTime" - a."startingDateTime"),
  (a."meetingDateTime" - a."startingDateTime"),
  (a."answerDeadline" - a."startingDateTime"),
  a."maxAttendees",
  a.max_trial_attendees,
  a.required_item,
  a.items_enabled,
  a.constellations_enabled,
  a.reminder_before,
  coalesce(it.items_template, '[]'::jsonb),
  true
from (
  select distinct on (e.key) e.*
  from public.events e
  where e.recurrence <> 'None'::public."EventRecurrence"
  order by e.key, e."startingDateTime" desc          -- latest occurrence = current anchor
) a
cross join lateral (select (a."startingDateTime" at time zone 'Europe/Berlin') as loc) l
cross join lateral (
  select (array['SU','MO','TU','WE','TH','FR','SA'])[extract(dow from l.loc)::int + 1] as wd,
         extract(day from l.loc)::int as dom
) d
left join lateral (
  select jsonb_agg(
           jsonb_build_object(
             'name', bi.name, 'unit', bi.unit, 'required_qty', bi.required_qty,
             'notes', bi.notes, 'sort_order', bi.sort_order
           ) order by bi.sort_order
         ) as items_template
  from public.event_bring_items bi
  where bi.event = a.id
) it on true
on conflict (key) do nothing;

-- Link every recurring occurrence to its series + tag its local slot date.
update public.events e
set series_id       = s.id,
    occurrence_date = (e."startingDateTime" at time zone s.timezone)::date
from public.event_series s
where s.key = e.key
  and e.recurrence <> 'None'::public."EventRecurrence"
  and e.series_id is distinct from s.id;
