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
