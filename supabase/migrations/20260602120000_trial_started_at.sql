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
    else
      NEW.trial_started_at := OLD.trial_started_at;  -- still trial: preserve it
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
