-- Trial-user lifecycle, step 1: record WHEN a membership became "trial".
--
-- group_user_mapping previously had no timestamp, so "4 weeks since the trial
-- started" was uncomputable. We add a dedicated column maintained by a BEFORE
-- trigger (captured no matter how the role is set), and backfill existing
-- trials from the audit log.

-- 1) Column
alter table public.group_user_mapping
  add column if not exists trial_started_at timestamptz;

-- 2) Backfill existing trials BEFORE the trigger exists (the trigger's
--    "still trial -> preserve OLD value" branch would otherwise null these out).
--    Use the most recent audit-log entry that set role -> 'trial'; fall back to
--    now() so pre-existing trials get a fresh window instead of expiring at once.
update public.group_user_mapping gum
set trial_started_at = coalesce((
  select max(a.at)
  from audit.log a
  where a.table_name = 'group_user_mapping'
    and a.op in ('INSERT', 'UPDATE')
    and a.new_data->>'role'  = 'trial'
    and a.new_data->>'user'  = gum."user"::text
    and a.new_data->>'group' = gum."group"::text
), now())
where gum.role = 'trial'::public."GroupRole"
  and gum.trial_started_at is null;

-- 3) Capture trigger: keep trial_started_at correct for every future role change,
--    regardless of the code path that performs it (UI mutation, RPC, admin SQL).
create or replace function public.set_trial_started_at()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if NEW.role = 'trial'::public."GroupRole" then
    if TG_OP = 'INSERT' or OLD.role is distinct from 'trial'::public."GroupRole" then
      NEW.trial_started_at := now();                 -- became trial: start the clock
    end if;
  else
    NEW.trial_started_at := null;                    -- not a trial: clear it
  end if;
  return NEW;
end;
$function$;

drop trigger if exists trg_set_trial_started_at on public.group_user_mapping;
create trigger trg_set_trial_started_at
  before insert or update on public.group_user_mapping
  for each row execute function public.set_trial_started_at();

-- Trial-user lifecycle, step 2: automatically end trials after N days.
--
-- A daily pg_cron job demotes trials older than the configured window back to
-- 'joinRequested' (which revokes their group access via the existing grants-refresh
-- + RLS), frees their future trial event slots, and notifies the user + group admins.

-- 1) Notification topics (notify_emit honours per-user topic preferences).
insert into notifications.notification_topics (topic, scope_type, description, default_enabled)
values
  ('group.trial.expired',       'group', 'Probezeit beendet',                 true),
  ('group.trial.expired.admin', 'group', 'Probezeit eines Nutzers beendet',   true)
on conflict (topic) do nothing;

-- 2) Configurable duration (admins can change it without a new migration).
insert into public.app_config (key, value)
values ('trial_duration_days', '28')
on conflict (key) do nothing;

-- 3) The worker. Idempotent: only selects trials older than the window.
create or replace function public.expire_trial_memberships()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_days       int := coalesce((select value::int from public.app_config where key = 'trial_duration_days'), 28);
  v_count      int := 0;
  r            record;
  v_group_name text;
  v_admins     uuid[];
begin
  for r in
    select gum."user" as user_id, gum."group" as group_id
    from public.group_user_mapping gum
    where gum.role = 'trial'::public."GroupRole"
      and gum.trial_started_at is not null
      and gum.trial_started_at < now() - make_interval(days => v_days)
  loop
    begin
      -- Demote: trial -> joinRequested. This fires the existing grants-refresh
      -- trigger (strips perms) and does NOT mis-fire "request confirmed"
      -- (that only fires joinRequested -> user/admin).
      update public.group_user_mapping
        set role = 'joinRequested'::public."GroupRole"
        where "user" = r.user_id
          and "group" = r.group_id
          and role = 'trial'::public."GroupRole";

      -- Free trial slots on FUTURE events; keep past attendance history.
      delete from public.event_attendance_user_mapping eaum
      using public.events e
      where eaum.event = e.id
        and e."group" = r.group_id
        and eaum."user" = r.user_id
        and eaum.state in ('AttendingAsTrial'::public."EventAttendance",
                           'WaitingAsTrial'::public."EventAttendance")
        and e."startingDateTime" > now();

      select g."name" into v_group_name
      from public.event_group g
      where g.id = r.group_id;

      -- Notify the (now ex-)trial user.
      perform notifications.notify_emit(
        array[r.user_id],
        'group.trial.expired',
        'Probezeit beendet',
        'Deine Probezeit bei ' || coalesce(v_group_name, 'der Gruppe') || ' ist abgelaufen.',
        jsonb_build_object('group', r.group_id, 'url', '/'),
        'group',
        r.group_id,
        'normal',
        'group',
        r.group_id
      );

      -- Notify the group's admins so they can fully accept or remove the person.
      select array_agg(gum2."user")
        into v_admins
      from public.group_user_mapping gum2
      where gum2."group" = r.group_id
        and gum2.role = 'admin'::public."GroupRole";

      if v_admins is not null then
        perform notifications.notify_emit(
          v_admins,
          'group.trial.expired.admin',
          'Probezeit beendet',
          'Die Probezeit eines Nutzers bei ' || coalesce(v_group_name, 'der Gruppe') || ' ist abgelaufen.',
          jsonb_build_object('group', r.group_id, 'url', '/'),
          'group',
          r.group_id,
          'normal',
          'group',
          r.group_id
        );
      end if;

      v_count := v_count + 1;
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

-- Cron runs as the job owner (postgres); no end-user should call the worker directly.
revoke execute on function public.expire_trial_memberships() from public, anon, authenticated;

-- 4) Admin-callable wrapper for manual runs / testing.
create or replace function public.admin_expire_trials()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not coalesce(public.authorize('supabase.admin'), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.expire_trial_memberships();
end;
$function$;

grant execute on function public.admin_expire_trials() to authenticated;

-- 5) Schedule daily at 03:00 UTC (a 4-week window needs no finer cadence).
do $$
begin
  perform cron.unschedule('expire_trial_memberships');
exception when others then
  null;  -- not scheduled yet
end $$;

select cron.schedule(
  'expire_trial_memberships',
  '0 3 * * *',
  $$ select public.expire_trial_memberships(); $$
);

grant select on games.players_public to authenticated;

grant select on games.leaderboard to authenticated;

drop view if exists public.challenge_user_points;

create view public.challenge_user_points with (security_invoker = on) as
 WITH user_totals AS (
         SELECT cs.challenge,
            cs."user",
            sum(cs.count) AS total_points,
            min(cs.created_at) AS first_entry_at,
            max(cs.created_at) AS last_entry_at
           FROM challenge_stats cs
          GROUP BY cs.challenge, cs."user"
        )
 SELECT c.id AS challenge,
    gum."user",
    u."displayName",
    u."avatarUrl",
    COALESCE(t.total_points, 0::numeric) AS total_points
   FROM challenge c
     JOIN group_user_mapping gum ON gum."group" = c."group"
     JOIN "user" u ON u.id = gum."user"
     LEFT JOIN user_totals t ON t.challenge = c.id AND t."user" = gum."user"
  WHERE c.show_all_members OR t.total_points IS NOT NULL;