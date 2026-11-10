-- Trial members can always use events in a group that is open for trials.
--
-- Trial members only get what their own group grants: the features events / events.trials and
-- the permission event.signup, each only if the group has it. A group with "Probenutzer für
-- Events" (events.trials) but without `events` itself (because members get events through
-- another group or a direct grant) left its trial members, guests included, without the events
-- menu, without event lists and without the attend buttons. Turning trials on for a group now
-- gives its trial members `events` and `event.signup` as well.

-- ---------------------------------------------------------------------
-- 1. user_grants_view (same as 20261002072326_security_hardening, plus the implied grants)
-- ---------------------------------------------------------------------
create or replace view public.user_grants_view
with (security_invoker = on) as
select distinct on ("user", kind, key, tenant)
  "user", kind, key, tenant, granted_by
from (
  select udg."user", udg.kind, udg.key, udg.tenant, 'direct'::text as granted_by
  from public.user_direct_grants udg
  where udg."user" = auth.uid()
  union all
  select gum."user", 'perm'::public.grant_kind, gp.permission,
         '00000000-0000-0000-0000-000000000000'::uuid, 'group'::text
  from public.group_user_mapping gum
  join public.group_permissions gp on gp."group" = gum."group"
  where gum."user" = auth.uid()
    and (
      gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole")
      or (gum.role = 'trial'::public."GroupRole" and gp.permission = 'event.signup')
    )
  union all
  select gum."user", 'feat'::public.grant_kind, gf.feature,
         '00000000-0000-0000-0000-000000000000'::uuid, 'group'::text
  from public.group_user_mapping gum
  join public.group_features gf on gf."group" = gum."group"
  where gum."user" = auth.uid()
    and (
      gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole")
      or (gum.role = 'trial'::public."GroupRole" and gf.feature in ('events', 'events.trials'))
    )
  union all
  -- Implied by trials: a trial member of a group with events.trials may use events and sign up.
  select gum."user", implied.kind, implied.key,
         '00000000-0000-0000-0000-000000000000'::uuid, 'group'::text
  from public.group_user_mapping gum
  join public.group_features gf on gf."group" = gum."group" and gf.feature = 'events.trials'
  cross join (values ('feat'::public.grant_kind, 'events'::text), ('perm'::public.grant_kind, 'event.signup'::text)) as implied(kind, key)
  where gum."user" = auth.uid()
    and gum.role = 'trial'::public."GroupRole"
) s
order by "user", kind, key, tenant,
  case granted_by when 'direct' then 0 else 1 end;

-- ---------------------------------------------------------------------
-- 2. admin_user_effective_grants: show the same to grant managers
-- ---------------------------------------------------------------------
create or replace function public.admin_user_effective_grants(p_user uuid)
returns table (kind public.grant_kind, key text, source text, group_id uuid, group_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (coalesce(public.authorize('supabase.admin'), false) or coalesce(public.authorize('grants.manage'), false)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select udg.kind, udg.key, 'direct'::text, null::uuid, null::text
      from public.user_direct_grants udg
     where udg."user" = p_user
    union all
    select 'perm'::public.grant_kind, gp.permission, 'group'::text, g.id, g.name
      from public.group_user_mapping gum
      join public.group_permissions gp on gp."group" = gum."group"
      join public.event_group g on g.id = gum."group"
     where gum."user" = p_user
       and (gum.role in ('user', 'admin') or (gum.role = 'trial' and gp.permission = 'event.signup'))
    union all
    select 'feat'::public.grant_kind, gf.feature, 'group'::text, g.id, g.name
      from public.group_user_mapping gum
      join public.group_features gf on gf."group" = gum."group"
      join public.event_group g on g.id = gum."group"
     where gum."user" = p_user
       and (gum.role in ('user', 'admin') or (gum.role = 'trial' and gf.feature in ('events', 'events.trials')))
    -- union (not union all): a group that grants event.signup itself lists it once.
    union
    select implied.kind, implied.key, 'group'::text, g.id, g.name
      from public.group_user_mapping gum
      join public.group_features gf on gf."group" = gum."group" and gf.feature = 'events.trials'
      join public.event_group g on g.id = gum."group"
      cross join (values ('feat'::public.grant_kind, 'events'::text), ('perm'::public.grant_kind, 'event.signup'::text)) as implied(kind, key)
     where gum."user" = p_user
       and gum.role = 'trial';
end;
$$;

revoke all on function public.admin_user_effective_grants(uuid) from public, anon;
grant execute on function public.admin_user_effective_grants(uuid) to authenticated;
