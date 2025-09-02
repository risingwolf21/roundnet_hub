grant select on table "games"."players" to "authenticated";

create policy "players_self_select"
on "games"."players"
as permissive
for select
to authenticated
using ((player = (auth.uid())::text));


create policy "players_self_update"
on "games"."players"
as permissive
for update
to authenticated
using ((player = (auth.uid())::text))
with check ((player = (auth.uid())::text));



drop trigger if exists "after_user_insert" on "public"."user";

alter table "public"."event_attendance_user_mapping" drop constraint "event_attendance_user_mapping_event_fkey";

alter table "public"."event_comments" drop constraint "event_comments_event_fkey";

drop function if exists "public"."add_initial_user_data"();

CREATE INDEX if not exists "events_startingDateTime_key_idx" ON public.events USING btree ("startingDateTime", key);

CREATE INDEX if not exists ix_items_event ON public.event_bring_items USING btree (event);

CREATE INDEX if not exists ix_pledges_item ON public.event_bring_pledges USING btree (item);

CREATE UNIQUE INDEX if not exists uq_events_key_start ON public.events USING btree (key, "startingDateTime");

alter table "public"."event_bring_pledges" drop constraint if exists "pledges_qty_positive";

alter table "public"."event_bring_pledges" add constraint "pledges_qty_positive" CHECK ((qty > (0)::numeric)) not valid;

alter table "public"."event_bring_pledges" validate constraint "pledges_qty_positive";

alter table "public"."events" drop constraint if exists "events_end_after_start";

alter table "public"."events" add constraint "events_end_after_start" CHECK (("endDateTime" > "startingDateTime")) not valid;

alter table "public"."events" validate constraint "events_end_after_start";

alter table "public"."event_attendance_user_mapping" drop constraint if exists "event_attendance_user_mapping_event_fkey";

alter table "public"."event_attendance_user_mapping" add constraint "event_attendance_user_mapping_event_fkey" FOREIGN KEY (event) REFERENCES events(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."event_attendance_user_mapping" validate constraint "event_attendance_user_mapping_event_fkey";

alter table "public"."event_comments" drop constraint if exists "event_comments_event_fkey";

alter table "public"."event_comments" add constraint "event_comments_event_fkey" FOREIGN KEY (event) REFERENCES events(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."event_comments" validate constraint "event_comments_event_fkey";

set check_function_bodies = off;

drop function if exists public.create_next_occurrences;

CREATE OR REPLACE FUNCTION public.create_next_occurrences(p_run_at timestamp with time zone, p_horizon interval)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_inserted int := 0;
begin
  -- Weekly & Fortnightly in einem Rutsch.
  -- Für Monthly kann separat erweitert werden.
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
  )
  insert into public.events(
    "key", title, description, recurrence,
    "startingDateTime","endDateTime","group",
    place, "answerDeadline","maxAttendees","recurrenceEnd",
    items_enabled, constellations_enabled, required_item
  )
  select "key", title, description, recurrence,
         start_time, end_time, "group",
         place, "answerDeadline","maxAttendees","recurrenceEnd",
         items_enabled, constellations_enabled, required_item
  from to_insert
  on conflict ("key","startingDateTime") do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$
;

create or replace view "public"."event_bring_item_status" as  SELECT bi.id AS item_id,
    bi.event AS event_id,
    bi.name,
    bi.unit,
    bi.required_qty,
    COALESCE(sum(p.qty), (0)::numeric) AS pledged_qty,
    GREATEST((bi.required_qty - COALESCE(sum(p.qty), (0)::numeric)), (0)::numeric) AS shortfall,
    GREATEST((COALESCE(sum(p.qty), (0)::numeric) - bi.required_qty), (0)::numeric) AS surplus,
    (COALESCE(sum(p.qty), (0)::numeric) >= bi.required_qty) AS fulfilled
   FROM (event_bring_items bi
     LEFT JOIN event_bring_pledges p ON ((p.item = bi.id)))
  GROUP BY bi.id, bi.event, bi.name, bi.unit, bi.required_qty;


CREATE OR REPLACE FUNCTION public.test_login(uid text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
END; $function$
;

CREATE OR REPLACE FUNCTION public.trg_pledge_sanity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.qty is null or new.qty <= 0 then
    raise exception 'qty must be > 0' using errcode = '23514';
  end if;
  return new;
end $function$
;

CREATE TRIGGER trg_pledge_sanity_bi BEFORE INSERT ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_pledge_sanity();

CREATE TRIGGER trg_pledge_sanity_bu BEFORE UPDATE OF qty ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_pledge_sanity();


