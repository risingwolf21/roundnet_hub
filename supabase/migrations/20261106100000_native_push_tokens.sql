-- Native (store app) push tokens live next to the web push subscriptions.
-- kind: 'web' = Web Push (endpoint + keys), 'apns' = iOS device token, 'fcm' = Android Firebase token.
alter table notifications.web_push_subscriptions
  add column kind text not null default 'web',
  alter column p256dh drop not null,
  alter column auth drop not null,
  add constraint web_push_subscriptions_kind_check check (kind in ('web', 'apns', 'fcm')),
  add constraint web_push_subscriptions_web_keys_check
    check (kind <> 'web' or (p256dh is not null and auth is not null));

create or replace function notifications.upsert_native_push_token(
  p_token text,
  p_kind text,
  p_device_id text,
  p_platform text
) returns notifications.web_push_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row notifications.web_push_subscriptions;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if p_kind not in ('apns', 'fcm') then
    raise exception 'invalid kind';
  end if;
  if coalesce(p_token, '') = '' then
    raise exception 'token required';
  end if;

  -- One active token per device: a refreshed token replaces the old one.
  if p_device_id is not null then
    update notifications.web_push_subscriptions
       set revoked_at = now()
     where "user" = v_user
       and device_id = p_device_id
       and revoked_at is null
       and endpoint <> p_token;
  end if;

  -- A token that moved to another account (logout/login on the same phone) is taken over.
  insert into notifications.web_push_subscriptions ("user", endpoint, kind, platform, device_id, user_agent, last_seen)
  values (v_user, p_token, p_kind, p_platform, p_device_id, 'native-app', now())
  on conflict (endpoint) do update
     set "user" = excluded."user",
         kind = excluded.kind,
         platform = excluded.platform,
         device_id = excluded.device_id,
         revoked_at = null,
         last_seen = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function notifications.upsert_native_push_token(text, text, text, text) from public, anon;
grant execute on function notifications.upsert_native_push_token(text, text, text, text) to authenticated;
