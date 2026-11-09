-- Key managers can restrict a key to a group or make it visible to everyone again.
-- p_set_group distinguishes "leave the group as it is" from "set it to p_group (NULL = no group)".
-- Like inserting a key, a key can only be given to a group the manager is a full member of.
drop function if exists public.edit_item(bigint, text, text, public."ItemType");

create function public.edit_item(
  p_id bigint,
  p_name text default null,
  p_color text default null,
  p_type public."ItemType" default null,
  p_group uuid default null,
  p_set_group boolean default false
)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.items;
begin
  if not coalesce(public.authorize('items.manage'), false) then
    raise exception 'missing permission items.manage (user=%)', auth.uid()::text
      using errcode = '42501';
  end if;

  if p_set_group and p_group is not null and not public.is_full_member_of_group(p_group) then
    raise exception 'not in group %', p_group
      using errcode = '42501',
            hint    = 'membership in group required';
  end if;

  update public.items
     set name         = coalesce(p_name, name),
         color        = coalesce(p_color, color),
         type         = coalesce(p_type, type),
         "group"      = case when p_set_group then p_group else "group" end,
         "lastUpdate" = now()
   where id = p_id
  returning * into r;

  if not found then
    raise exception 'item % not found', p_id
      using errcode = '23503';
  end if;

  return r;
end;
$$;

revoke all on function public.edit_item(bigint, text, text, public."ItemType", uuid, boolean) from public, anon;
grant execute on function public.edit_item(bigint, text, text, public."ItemType", uuid, boolean) to authenticated, service_role;
