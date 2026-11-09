-- Lets grant managers see what a user can do in total: direct grants plus everything inherited from group
-- memberships. RLS hides other users' memberships from grant managers, so this runs as SECURITY DEFINER.
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
       and (gum.role in ('user', 'admin') or (gum.role = 'trial' and gf.feature in ('events', 'events.trials')));
end;
$$;

revoke all on function public.admin_user_effective_grants(uuid) from public, anon;
grant execute on function public.admin_user_effective_grants(uuid) to authenticated;
