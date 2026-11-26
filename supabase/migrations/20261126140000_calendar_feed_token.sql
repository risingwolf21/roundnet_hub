-- Secret, revocable calendar feed links.
-- The ical edge function used the plain user id as the feed URL, so anyone who knew a user id
-- (visible to every group member through attendance) could read that user's calendar, and a
-- leaked link could never be revoked. The feed is now addressed by a random token that only the
-- owner can read (through the RPC below) and replace.

create table public.calendar_feed_tokens (
  "user" uuid primary key references public."user"(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- No policies: only the RPC (and the service role used by the edge function) touch this table.
alter table public.calendar_feed_tokens enable row level security;
create policy guests_blocked on public.calendar_feed_tokens as restrictive for all to authenticated
  using (not (select public.is_guest())) with check (not (select public.is_guest()));

-- Returns the caller's feed token, creating one on first use. p_reset replaces it, which
-- makes every existing subscription with the old link stop working.
create function public.calendar_feed_token(p_reset boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.calendar_feed_tokens ("user") values (auth.uid())
  on conflict ("user") do update
    set token = case when p_reset then gen_random_uuid() else public.calendar_feed_tokens.token end,
        created_at = case when p_reset then now() else public.calendar_feed_tokens.created_at end
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.calendar_feed_token(boolean) from public, anon;
grant execute on function public.calendar_feed_token(boolean) to authenticated;
