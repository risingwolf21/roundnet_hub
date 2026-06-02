-- Re-apply corrected versions of both trial functions.
--
-- The original migration (20260602120000) may have been applied to a DB
-- before two bug fixes were committed:
--   1. set_trial_started_at: the "still trial -> preserve" else branch
--      prevented admins from manually back-dating trial_started_at.
--   2. expire_trial_memberships: eaum."user" = r.user_id::text caused a
--      uuid/text type error; the exception handler caught it and rolled back
--      the demote UPDATE, so the trial user stayed as trial.
-- CREATE OR REPLACE is safe to re-run on a fresh DB as well.

create or replace function public.set_trial_started_at()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if NEW.role = 'trial'::public."GroupRole" then
    if TG_OP = 'INSERT' or OLD.role is distinct from 'trial'::public."GroupRole" then
      NEW.trial_started_at := now();   -- became trial: start the clock
    end if;
    -- role stays trial: leave NEW.trial_started_at at whatever was set
    -- (allows admins to back-date it; a plain UPDATE without touching the
    -- column naturally preserves the old value via Postgres row assignment)
  else
    NEW.trial_started_at := null;      -- not a trial: clear it
  end if;
  return NEW;
end;
$function$;

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
      update public.group_user_mapping
        set role = 'joinRequested'::public."GroupRole"
        where "user" = r.user_id
          and "group" = r.group_id
          and role = 'trial'::public."GroupRole";

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
      insert into util.background_errors(source, op, ref_id, message, details)
      values ('public.group_user_mapping', 'expire_trial_memberships', r.group_id, sqlerrm,
              jsonb_build_object('user', r.user_id, 'group', r.group_id));
    end;
  end loop;

  return v_count;
end;
$function$;
