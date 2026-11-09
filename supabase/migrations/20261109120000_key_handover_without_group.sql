-- Keys no longer need a group.
--  * Without a group a key is visible to everyone (items_select_member already allows this). Anyone with
--    items.update.holder may take it or hand it over to any user.
--  * With a group only full members see it, and only full members may take it or hand it over to another
--    full member (unchanged).
create or replace function public.key_handover(p_key_id bigint, p_new_holder uuid)
returns table(key_id bigint, holder uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old   uuid;
  v_group uuid;
begin
  select i."current_holder", i."group"
    into v_old, v_group
  from public.items as i
  where i.id = p_key_id
  for update;

  if not found then
    raise exception 'item % not found', p_key_id
      using errcode = '23503',
            detail  = format('key_id=%s new_holder=%s', p_key_id, p_new_holder);
  end if;

  if v_group is null then
    -- No membership to check, so the permission the app shows the buttons for is the gate.
    if not coalesce(public.authorize('items.update.holder'), false) then
      raise exception 'missing permission items.update.holder for item %', p_key_id
        using errcode = '42501',
              detail  = format('actor=%s', auth.uid()::text);
    end if;
  elsif not public.is_full_member_of_group(v_group) then
    raise exception 'not in group for item %', p_key_id
      using errcode = '42501',
            detail  = format('actor=%s group=%s', auth.uid()::text, v_group::text),
            hint    = 'membership in group required';
  end if;

  perform 1 from public."user" u where u."id" = p_new_holder;
  if not found then
    raise exception 'new holder % not found', p_new_holder
      using errcode = '23503',
            detail  = format('key_id=%s', p_key_id);
  end if;

  if v_group is not null and not exists (
    select 1
    from public.group_user_mapping gum
    where gum."group" = v_group
      and gum."user" = p_new_holder
      and gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole")
  ) then
    raise exception 'new holder % not in group', p_new_holder
      using errcode = '23503',
            detail  = format('key_id=%s', p_key_id);
  end if;

  if v_old is distinct from p_new_holder then
    update public.items i
       set "current_holder" = p_new_holder,
           "lastUpdate"     = now()
     where i.id = p_key_id;
  end if;

  return query
  select i.id, i."current_holder"
  from public.items i
  where i.id = p_key_id;
end;
$$;
