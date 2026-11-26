-- Lets user managers see which users can receive push notifications. RLS on web_push_subscriptions only
-- lets supabase.admin read other users' rows, and the rows hold the push keys, so this returns just the
-- active devices (no endpoint or keys) and runs as SECURITY DEFINER.
create or replace function public.admin_user_push_devices()
returns table ("user" uuid, platform text, last_seen timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (coalesce(public.authorize('supabase.admin'), false) or coalesce(public.authorize('users.manage'), false)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select s."user", s.platform, s.last_seen
      from notifications.web_push_subscriptions s
     where s.revoked_at is null
     order by s.last_seen desc;
end;
$$;

revoke all on function public.admin_user_push_devices() from public, anon;
grant execute on function public.admin_user_push_devices() to authenticated;
