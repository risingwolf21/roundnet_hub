-- Guest trials: people try out a group through an invite link, without an account.
--
-- Guests are ordinary trial members (role 'trial') whose auth user is anonymous
-- (supabase.auth.signInAnonymously). They share everything with today's trials: the trial
-- slots of an event (max_trial_attendees), the trial attendance states, the 28-day expiry and
-- the "accept as member" path. On top of that:
--   * every trial membership can carry an event limit (trial_event_limit). Each "attend" a
--     trial member clicks uses one training; declining or a cancelled event gives it back.
--     The trial ends when the limit is used up and its last training is over, or after the
--     28 days, whichever comes first.
--   * group admins create invite links (trial_invites); redeem_trial_invite() makes the caller
--     a trial member with the link's limit. Only groups with the feature events.trials.guests
--     (toggled in the grants manager, on top of events.trials) accept links.
--   * switching that feature (or events.trials) off ends the group's guest trials at once.
--   * guests are signed in as `authenticated`, like everyone else. They are blocked from every
--     table except the few the trial flow needs (section 7), and may read users only of
--     their own groups.

-- ---------------------------------------------------------------------
-- 1. The feature, the event limit and events open for trials
-- ---------------------------------------------------------------------
insert into public.features(name, description)
values ('events.trials.guests', 'Gäste per Link für Probetrainings')
on conflict (name) do nothing;

alter table public.group_user_mapping
  add column if not exists trial_event_limit integer
  constraint group_user_mapping_trial_event_limit_check check (trial_event_limit > 0);

comment on column public.group_user_mapping.trial_event_limit is
  'Trainings a trial member may sign up for in this group. NULL = only the time limit applies.';

-- Trial members only see and join events a trainer opened for trials (section 8).
-- max_trial_attendees stays the optional seat limit: NULL = unlimited trial seats.
alter table public.events
  add column if not exists trials_open boolean not null default false;
alter table public.event_series
  add column if not exists trials_open boolean not null default false;

comment on column public.events.trials_open is
  'Trial members may see and sign up for this event. Seats: max_trial_attendees (NULL = unlimited).';

-- Existing events start closed, except where trial members already signed up for a coming
-- training: those events (and their series) stay open so nobody loses a booked place.
update public.events e set trials_open = true
where e."startingDateTime" > now()
  and exists (select 1 from public.event_attendance_user_mapping a
              where a.event = e.id
                and a.state in ('AttendingAsTrial'::public."EventAttendance", 'WaitingAsTrial'::public."EventAttendance"));

update public.event_series s set trials_open = true
where exists (select 1 from public.events e where e.series_id = s.id and e.trials_open);

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------

-- True for an anonymous (guest) session.
create or replace function public.is_guest()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

grant execute on function public.is_guest() to authenticated, anon, service_role;

-- Trainings a trial member has used in a group: trial sign-ups (attending or waiting) on
-- events that are not cancelled. An event can be left out (the one being signed up for).
create or replace function public.trial_events_used(p_user uuid, p_group uuid, p_except_event uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.event_attendance_user_mapping a
  join public.events e on e.id = a.event
  where a."user" = p_user
    and e."group" = p_group
    and not coalesce(e."isCancelled", false)
    and a.state in ('AttendingAsTrial'::public."EventAttendance", 'WaitingAsTrial'::public."EventAttendance")
    and (p_except_event is null or a.event <> p_except_event);
$$;

revoke all on function public.trial_events_used(uuid, uuid, uuid) from public, anon, authenticated;

-- What the app shows: "noch 2 von 3". For the caller, or for a member of a group the caller administers.
create or replace function public.trial_status(p_group uuid, p_user uuid default null)
returns table (event_limit integer, events_used integer, trial_started_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
begin
  if v_user is distinct from auth.uid()
     and not (public.is_user_admin_in_group(p_group) or coalesce(public.authorize('supabase.admin'), false)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select gum.trial_event_limit, public.trial_events_used(v_user, p_group), gum.trial_started_at
  from public.group_user_mapping gum
  where gum."user" = v_user and gum."group" = p_group and gum.role = 'trial'::public."GroupRole";
end;
$$;

revoke all on function public.trial_status(uuid, uuid) from public, anon;
grant execute on function public.trial_status(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Invite links
-- ---------------------------------------------------------------------
create table if not exists public.trial_invites (
  id          uuid primary key default gen_random_uuid(),
  "group"     uuid not null references public.event_group(id) on delete cascade,
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  event_limit integer not null default 3 check (event_limit > 0),
  expires_at  timestamptz,
  max_uses    integer check (max_uses > 0),
  uses        integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists idx_trial_invites_group on public.trial_invites ("group");

alter table public.trial_invites enable row level security;

grant select, insert, update on public.trial_invites to authenticated;
grant all on public.trial_invites to service_role;

-- Group admins manage their group's links; creating one needs the feature.
drop policy if exists trial_invites_select_group_admin on public.trial_invites;
create policy trial_invites_select_group_admin on public.trial_invites
  for select to authenticated
  using (public.is_user_admin_in_group("group") or public.authorize('supabase.admin'));

drop policy if exists trial_invites_insert_group_admin on public.trial_invites;
create policy trial_invites_insert_group_admin on public.trial_invites
  for insert to authenticated
  with check (
    (public.is_user_admin_in_group("group") or public.authorize('supabase.admin'))
    and exists (select 1 from public.group_features gf
                where gf."group" = trial_invites."group" and gf.feature = 'events.trials.guests')
    and uses = 0
  );

drop policy if exists trial_invites_update_group_admin on public.trial_invites;
create policy trial_invites_update_group_admin on public.trial_invites
  for update to authenticated
  using (public.is_user_admin_in_group("group") or public.authorize('supabase.admin'))
  with check (public.is_user_admin_in_group("group") or public.authorize('supabase.admin'));

-- The use counter and the group only change through redeem_trial_invite().
create or replace function public.trg_trial_invites_protect()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.uses is distinct from old.uses or new."group" is distinct from old."group" or new.token is distinct from old.token) then
    raise exception 'forbidden: only limits and active can be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_trial_invites_protect on public.trial_invites;
create trigger trg_trial_invites_protect
  before update on public.trial_invites
  for each row execute function public.trg_trial_invites_protect();

-- The guest (or any signed-in person) redeems a link and becomes a trial member of its group.
create or replace function public.redeem_trial_invite(p_token text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_invite public.trial_invites;
  v_role   public."GroupRole";
  v_name   text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  select * into v_invite from public.trial_invites where token = p_token for update;

  if not found
     or not v_invite.active
     or (v_invite.expires_at is not null and v_invite.expires_at < now())
     or (v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses)
     or (select count(*) from public.group_features gf
         where gf."group" = v_invite."group" and gf.feature in ('events.trials', 'events.trials.guests')) < 2 then
    raise exception 'trial invite is not valid' using errcode = '22023', hint = 'trial_invite_invalid';
  end if;

  select role into v_role from public.group_user_mapping
  where "user" = v_uid and "group" = v_invite."group";

  -- Already in the group: nothing to do, the link is not used up.
  if v_role in ('user'::public."GroupRole", 'admin'::public."GroupRole", 'trial'::public."GroupRole") then
    return v_invite."group";
  end if;

  insert into public.group_user_mapping("user", "group", role, trial_event_limit)
  values (v_uid, v_invite."group", 'trial'::public."GroupRole", v_invite.event_limit)
  on conflict ("user", "group") do update
    set role = 'trial'::public."GroupRole", trial_event_limit = excluded.trial_event_limit;

  update public.trial_invites set uses = uses + 1 where id = v_invite.id;

  if v_name is not null and public.is_guest() then
    update public."user" set "displayName" = left(v_name, 60), name = left(v_name, 60) where id = v_uid;
  end if;

  return v_invite."group";
end;
$$;

revoke all on function public.redeem_trial_invite(text, text) from public, anon;
grant execute on function public.redeem_trial_invite(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Signing up: the event limit
-- ---------------------------------------------------------------------
-- Same as 20261101140000_attendance_capacity_enforcement, plus for trial members: no sign-up on
-- an event that is not open for trials (section 8), and a new sign-up (attending or waiting, not
-- a promotion from the waitlist) is refused once their limit is used.
CREATE OR REPLACE FUNCTION public.enforce_attendance_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_cap   numeric;
  v_count integer;
  v_is_trial boolean;
  v_group uuid;
  v_limit integer;
  v_open boolean;
BEGIN
  -- Trusted system/admin writes (service role) are not clamped.
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.state IN ('Attending','AttendingAsTrial','Waiting','WaitingAsTrial') THEN
    -- Serialize concurrent writes for this event so the capacity count below is atomic.
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('attendance:' || NEW.event::text)::bigint);

    -- Trial-role members are always on the trial states (prevents taking a regular seat directly).
    SELECT e."group", gum.trial_event_limit, true, e.trials_open
    INTO v_group, v_limit, v_is_trial, v_open
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = NEW.event AND gum."user" = NEW."user" AND gum."role" = 'trial';
    v_is_trial := coalesce(v_is_trial, false);

    IF v_is_trial THEN
      NEW.state := CASE WHEN NEW.state IN ('Attending','AttendingAsTrial')
                        THEN 'AttendingAsTrial'::public."EventAttendance"
                        ELSE 'WaitingAsTrial'::public."EventAttendance" END;

      IF NOT v_open THEN
        RAISE EXCEPTION 'event is not open for trials'
          USING errcode = 'P0001', hint = 'trial_event_closed';
      END IF;

      -- A new sign-up uses one training; moving between attending and waiting does not.
      IF v_limit IS NOT NULL
         AND (TG_OP = 'INSERT' OR OLD.state NOT IN ('AttendingAsTrial','WaitingAsTrial'))
         AND public.trial_events_used(NEW."user", v_group, NEW.event) >= v_limit THEN
        RAISE EXCEPTION 'trial event limit reached (%)', v_limit
          USING errcode = 'P0001', hint = 'trial_event_limit_reached';
      END IF;
    END IF;

    -- Capacity clamp for the matching pool (own row excluded so re-confirming keeps the seat).
    IF NEW.state = 'Attending' THEN
      SELECT "maxAttendees" INTO v_cap FROM public.events WHERE id = NEW.event;
    ELSIF NEW.state = 'AttendingAsTrial' THEN
      SELECT max_trial_attendees INTO v_cap FROM public.events WHERE id = NEW.event;
    ELSE
      v_cap := NULL;  -- already a waiting state, nothing to clamp
    END IF;

    IF v_cap IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count
      FROM public.event_attendance_user_mapping
      WHERE event = NEW.event AND state = NEW.state AND "user" <> NEW."user";

      IF v_count >= v_cap THEN
        NEW.state := CASE WHEN NEW.state = 'AttendingAsTrial'
                          THEN 'WaitingAsTrial'::public."EventAttendance"
                          ELSE 'Waiting'::public."EventAttendance" END;
      END IF;
    END IF;
  END IF;

  -- Keep FIFO ordering meaningful.
  IF TG_OP = 'INSERT' OR NEW.state IS DISTINCT FROM OLD.state THEN
    NEW."lastUpdate" := now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_attendance_capacity() FROM public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Ending a trial
-- ---------------------------------------------------------------------
-- One trial ends: demote to joinRequested (revokes group access), drop future trial sign-ups,
-- keep past attendance, notify the person and the group admins (German and English, as in
-- 20261103110000_localized_notifications). Moved out of expire_trial_memberships so the
-- feature switch (section 6) ends trials the same way.
create or replace function public.end_trial(p_user uuid, p_group uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_group_name text;
  v_admins     uuid[];
begin
  update public.group_user_mapping
    set role = 'joinRequested'::public."GroupRole", trial_event_limit = null
    where "user" = p_user
      and "group" = p_group
      and role = 'trial'::public."GroupRole";
  if not found then
    return false;
  end if;

  delete from public.event_attendance_user_mapping eaum
  using public.events e
  where eaum.event = e.id
    and e."group" = p_group
    and eaum."user" = p_user
    and eaum.state in ('AttendingAsTrial'::public."EventAttendance",
                       'WaitingAsTrial'::public."EventAttendance")
    and e."startingDateTime" > now();

  select g."name" into v_group_name
  from public.event_group g
  where g.id = p_group;

  perform notifications.notify_emit(
    array[p_user],
    'group.trial.expired',
    'Probezeit beendet',
    'Deine Probezeit bei ' || coalesce(v_group_name, 'der Gruppe') || ' ist abgelaufen.',
    jsonb_build_object('group', p_group, 'url', '/'),
    'group',
    p_group,
    'normal',
    'group',
    p_group,
    'Trial period ended',
    'Your trial period at ' || coalesce(v_group_name, 'the group') || ' has ended.'
  );

  select array_agg(gum2."user")
    into v_admins
  from public.group_user_mapping gum2
  where gum2."group" = p_group
    and gum2.role = 'admin'::public."GroupRole";

  if v_admins is not null then
    perform notifications.notify_emit(
      v_admins,
      'group.trial.expired.admin',
      'Probezeit beendet',
      'Die Probezeit eines Nutzers bei ' || coalesce(v_group_name, 'der Gruppe') || ' ist abgelaufen.',
      jsonb_build_object('group', p_group, 'url', '/'),
      'group',
      p_group,
      'normal',
      'group',
      p_group,
      'Trial period ended',
      'A user''s trial period at ' || coalesce(v_group_name, 'the group') || ' has ended.'
    );
  end if;

  return true;
end;
$function$;

revoke execute on function public.end_trial(uuid, uuid) from public, anon, authenticated;

-- The nightly job: the 28 days are over, or the event limit is used up and the last training
-- is over (whichever comes first).
create or replace function public.expire_trial_memberships()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_days  int := coalesce((select value::int from public.app_config where key = 'trial_duration_days'), 28);
  v_count int := 0;
  r       record;
begin
  for r in
    select gum."user" as user_id, gum."group" as group_id
    from public.group_user_mapping gum
    where gum.role = 'trial'::public."GroupRole"
      and (
        (gum.trial_started_at is not null and gum.trial_started_at < now() - make_interval(days => v_days))
        or (
          gum.trial_event_limit is not null
          and public.trial_events_used(gum."user", gum."group") >= gum.trial_event_limit
          and not exists (
            select 1
            from public.event_attendance_user_mapping a
            join public.events e on e.id = a.event
            where a."user" = gum."user"
              and e."group" = gum."group"
              and a.state in ('AttendingAsTrial'::public."EventAttendance", 'WaitingAsTrial'::public."EventAttendance")
              and not coalesce(e."isCancelled", false)
              and coalesce(e."endDateTime", e."startingDateTime") > now()
          )
        )
      )
  loop
    begin
      if public.end_trial(r.user_id, r.group_id) then
        v_count := v_count + 1;
      end if;
    exception when others then
      -- One bad row must not abort the whole batch (house pattern).
      insert into util.background_errors(source, op, ref_id, message, details)
      values ('public.group_user_mapping', 'expire_trial_memberships', r.group_id, sqlerrm,
              jsonb_build_object('user', r.user_id, 'group', r.group_id));
    end;
  end loop;

  return v_count;
end;
$function$;

revoke execute on function public.expire_trial_memberships() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Switching the feature off ends the group's guest trials
-- ---------------------------------------------------------------------
create or replace function public.trg_group_features_end_guest_trials()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  -- Not this feature, or the whole group is being deleted (its memberships go with it).
  if old.feature not in ('events.trials', 'events.trials.guests')
     or not exists (select 1 from public.event_group g where g.id = old."group") then
    return old;
  end if;

  update public.trial_invites set active = false where "group" = old."group" and active;

  for r in
    select gum."user" as user_id
    from public.group_user_mapping gum
    join auth.users u on u.id = gum."user"
    where gum."group" = old."group"
      and gum.role = 'trial'::public."GroupRole"
      and u.is_anonymous
  loop
    perform public.end_trial(r.user_id, old."group");
  end loop;

  return old;
end;
$$;

revoke execute on function public.trg_group_features_end_guest_trials() from public, anon, authenticated;

drop trigger if exists trg_group_features_end_guest_trials on public.group_features;
create trigger trg_group_features_end_guest_trials
  after delete on public.group_features
  for each row execute function public.trg_group_features_end_guest_trials();

-- ---------------------------------------------------------------------
-- 7. What guests may touch
-- ---------------------------------------------------------------------
-- Guests are `authenticated`, so every policy written for signed-in users would let them in.
-- A RESTRICTIVE policy blocks them on every table with RLS in public and games, except:
--   * tables the trial flow reads and writes (sign-ups, comments, notifications, calendar),
--   * tables it only reads (events, groups, memberships, grants, app config): writes blocked,
--   * public.user: only their own row and people in their groups.
-- A new table is blocked for guests only after this block runs again; test 110 fails when a
-- table has neither the block nor an entry in the lists below.
do $$
declare
  t record;
  v_full text[] := array[
    'event_attendance_user_mapping', 'event_bring_pledges', 'event_comments',
    'notifications', 'notification_token', 'user_notification_preferences',
    'user_notification_settings', 'web_push_subscriptions', 'object_subscriptions',
    'user_activity', 'user_calender_settings', 'user_calendar_event_mapping'
  ];
  v_read text[] := array[
    'app_config', 'events', 'event_bring_items', 'event_group', 'group_user_mapping',
    'features', 'permissions', 'group_features', 'group_permissions', 'user_direct_grants',
    'user_grants', 'notification_topics'
  ];
begin
  for t in
    select c.oid, n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and c.relrowsecurity
      and n.nspname in ('public', 'games')
  loop
    execute format('drop policy if exists guests_blocked on %I.%I', t.schema_name, t.table_name);
    execute format('drop policy if exists guests_read_only_insert on %I.%I', t.schema_name, t.table_name);
    execute format('drop policy if exists guests_read_only_update on %I.%I', t.schema_name, t.table_name);
    execute format('drop policy if exists guests_read_only_delete on %I.%I', t.schema_name, t.table_name);

    if t.schema_name = 'public' and (t.table_name = any(v_full) or t.table_name = 'user') then
      continue;
    elsif t.schema_name = 'public' and t.table_name = any(v_read) then
      execute format('create policy guests_read_only_insert on %I.%I as restrictive for insert to authenticated with check (not (select public.is_guest()))', t.schema_name, t.table_name);
      execute format('create policy guests_read_only_update on %I.%I as restrictive for update to authenticated using (not (select public.is_guest())) with check (not (select public.is_guest()))', t.schema_name, t.table_name);
      execute format('create policy guests_read_only_delete on %I.%I as restrictive for delete to authenticated using (not (select public.is_guest()))', t.schema_name, t.table_name);
    else
      execute format('create policy guests_blocked on %I.%I as restrictive for all to authenticated using (not (select public.is_guest())) with check (not (select public.is_guest()))', t.schema_name, t.table_name);
    end if;
  end loop;
end $$;

-- Guests see their own user row and the people in their groups (attendance lists), and may
-- only change their own row (their name; protected columns stay guarded by trg_user_protect_columns).
drop policy if exists guests_user_scope on public."user";
create policy guests_user_scope on public."user"
  as restrictive for all to authenticated
  using (
    not (select public.is_guest())
    or id = (select auth.uid())
    or exists (
      select 1
      from public.group_user_mapping mine
      join public.group_user_mapping theirs on theirs."group" = mine."group"
      where mine."user" = (select auth.uid())
        and theirs."user" = "user".id
    )
  )
  with check (not (select public.is_guest()) or id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 8. Events open for trials
-- ---------------------------------------------------------------------
-- Trial members (guests included) only see events that are open for trials.
drop policy if exists events_trials_only_open on public.events;
create policy events_trials_only_open on public.events
  as restrictive for select to authenticated
  using (
    trials_open
    or not exists (
      select 1 from public.group_user_mapping gum
      where gum."group" = events."group"
        and gum."user" = (select auth.uid())
        and gum.role = 'trial'::public."GroupRole"
    )
  );

-- A new occurrence takes the setting of its series; changing the series changes its coming,
-- series-managed occurrences (like apply_series_occurrences' sync does for the other fields).
create or replace function public.trg_events_trials_open_from_series()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.series_id is not null then
    select s.trials_open into new.trials_open from public.event_series s where s.id = new.series_id;
    new.trials_open := coalesce(new.trials_open, false);
  end if;
  return new;
end;
$$;

revoke execute on function public.trg_events_trials_open_from_series() from public, anon, authenticated;

drop trigger if exists trg_events_trials_open_from_series on public.events;
create trigger trg_events_trials_open_from_series
  before insert on public.events
  for each row execute function public.trg_events_trials_open_from_series();

create or replace function public.trg_event_series_sync_trials_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.events
     set trials_open = new.trials_open
   where series_id = new.id
     and detached = false
     and "isCancelled" = false
     and "startingDateTime" > now()
     and trials_open is distinct from new.trials_open;
  return new;
end;
$$;

revoke execute on function public.trg_event_series_sync_trials_open() from public, anon, authenticated;

drop trigger if exists trg_event_series_sync_trials_open on public.event_series;
create trigger trg_event_series_sync_trials_open
  after update of trials_open on public.event_series
  for each row
  when (old.trials_open is distinct from new.trials_open)
  execute function public.trg_event_series_sync_trials_open();

-- events_user_view: append the new column (must stay last for CREATE OR REPLACE).
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
    e."answerStart",
    e.trials_open
  from public.events e
    left join public.event_attendance_user_mapping eaus
      on e.id = eaus.event and eaus."user" = (select auth.uid())
    join public.group_user_mapping gus
      on e."group" = gus."group" and gus."user" = (select auth.uid());
