-- =====================================================================
-- Security hardening
--
-- Fixes found in the security review (2026-10):
--  * internal SECURITY DEFINER functions were executable by anon/authenticated
--  * any user could create a group, become its admin and grant itself any
--    permission (incl. supabase.admin) via grant_group_grants
--  * group admins could update/delete every group
--  * a pending join request ("joinRequested") counted as membership
--  * several legacy permissive policies made the hardened ones ineffective
--  * drinks history / challenge points / items / comments / attendance could be
--    manipulated directly via the REST API
--  * trial members inherited all group permissions
--
-- Policies of the touched tables are consolidated: all existing policies are
-- dropped and recreated, so legacy policies (also ones created via the
-- dashboard) cannot silently widen access again.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- ---------------------------------------------------------------------
-- 1. Membership helpers
--    is_user_in_group         : user/admin/trial (trial = see events + sign up)
--    is_full_member_of_group  : user/admin only
-- ---------------------------------------------------------------------
create or replace function public.is_full_member_of_group(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_user_mapping gum
    where gum."group" = p_group
      and gum."user" = (select auth.uid())
      and gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole")
  );
$$;

create or replace function public.is_member_of_event(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.group_user_mapping gum on gum."group" = e."group"
    where e.id = p_event
      and gum."user" = (select auth.uid())
      and gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole", 'trial'::public."GroupRole")
  );
$$;

create or replace function public.is_full_member_of_event(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.group_user_mapping gum on gum."group" = e."group"
    where e.id = p_event
      and gum."user" = (select auth.uid())
      and gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole")
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Grants: trial members only get event sign-up; only platform admins
--    can grant/revoke group permissions.
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
) s
order by "user", kind, key, tenant,
  case granted_by when 'direct' then 0 else 1 end;

create or replace function public.grant_group_grants(p_group uuid, p_perms text[] default array[]::text[], p_feats text[] default array[]::text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not (coalesce(public.authorize('supabase.admin'), false) or coalesce(public.authorize('grants.manage'), false)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms, 1) is not null then
    insert into public.permissions(name)
    select distinct k from unnest(p_perms) u(k)
    on conflict do nothing;

    insert into public.group_permissions("group", "permission")
    select p_group, k from unnest(p_perms) u(k)
    on conflict do nothing;
  end if;

  if array_length(p_feats, 1) is not null then
    insert into public.features(name)
    select distinct k from unnest(p_feats) u(k)
    on conflict do nothing;

    insert into public.group_features("group", "feature")
    select p_group, k from unnest(p_feats) u(k)
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.revoke_group_grants(p_group uuid, p_perms text[] default array[]::text[], p_feats text[] default array[]::text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not (coalesce(public.authorize('supabase.admin'), false) or coalesce(public.authorize('grants.manage'), false)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if array_length(coalesce(p_perms, array[]::text[]), 1) is not null then
    delete from public.group_permissions
    where "group" = p_group and "permission" = any(p_perms);
  end if;

  if array_length(coalesce(p_feats, array[]::text[]), 1) is not null then
    delete from public.group_features
    where "group" = p_group and "feature" = any(p_feats);
  end if;
end;
$$;

alter table public.user_direct_grants alter column "user" drop default;

-- ---------------------------------------------------------------------
-- 3. Admin-only RPCs: move implementation to private schema and expose a
--    guarded wrapper with the same signature.
-- ---------------------------------------------------------------------
alter function public.admin_analytics_attendance_ranking(timestamptz, timestamptz) set schema private;
alter function public.admin_analytics_drinks_ranking(timestamptz, timestamptz) set schema private;
alter function public.admin_challenge_zero_points_candidates(uuid, timestamptz, timestamptz) set schema private;
alter function public.create_next_occurrences(timestamptz, interval) set schema private;
alter function util.get_table_metadata(text[]) set schema private;

create function util.get_table_metadata(target_schemas text[] default '{public}'::text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.authorize('supabase.admin'), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return private.get_table_metadata(target_schemas);
end;
$$;

create function public.admin_analytics_attendance_ranking(p_start timestamptz, p_end timestamptz)
returns table(user_name text, attendance_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.authorize('admin.analytics.view'), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from private.admin_analytics_attendance_ranking(p_start, p_end);
end;
$$;

create function public.admin_analytics_drinks_ranking(p_start timestamptz, p_end timestamptz)
returns table(user_name text, drinks_count bigint, total_spend numeric)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.authorize('admin.analytics.view'), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from private.admin_analytics_drinks_ranking(p_start, p_end);
end;
$$;

create function public.admin_challenge_zero_points_candidates(p_challenge_id uuid, p_start timestamptz, p_end timestamptz)
returns table(user_name text, attendance_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.authorize('admin.analytics.view'), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from private.admin_challenge_zero_points_candidates(p_challenge_id, p_start, p_end);
end;
$$;

create function public.create_next_occurrences(p_run_at timestamptz, p_horizon interval)
returns setof public.events
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not (coalesce(public.authorize('event.create'), false) or coalesce(public.authorize('event.edit'), false)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from private.create_next_occurrences(p_run_at, p_horizon);
end;
$$;

create or replace function notifications.admin_notify_emit(
  p_recipients uuid[], p_topic text, p_title text, p_body text, p_data jsonb,
  p_source_type text, p_source_id uuid, p_urgency text, p_scope_type text, p_scope_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.authorize('admin.notify_users'), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return notifications.notify_emit(p_recipients, p_topic, p_title, p_body, p_data,
                                   p_source_type, p_source_id, p_urgency, p_scope_type, p_scope_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Functions with membership checks that accepted joinRequested
-- ---------------------------------------------------------------------
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
    raise exception 'item % has no group', p_key_id
      using errcode = '23514',
            detail  = format('key_id=%s new_holder=%s', p_key_id, p_new_holder);
  end if;

  if not public.is_full_member_of_group(v_group) then
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

  if not exists (
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

-- Points are only written through this function (enforces daily/weekly caps),
-- so it now runs as definer and direct inserts by users are no longer allowed.
create or replace function public.increase_challenge_stats_count(
  challenge_id uuid, amount numeric, to_create_at timestamptz,
  image_url text default null, comment text default null, category text default null
)
returns public.challenge_stats
language plpgsql
security definer
set search_path = ''
as $$
declare
  c          public.challenge;
  new_stat   public.challenge_stats;
  uid        uuid := auth.uid();
  week_start timestamptz;
  week_end   timestamptz;
  day_start  timestamptz;
  day_end    timestamptz;
  week_sum   numeric;
  day_sum    numeric;
begin
  if uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  if amount is null or amount <= 0 then
    raise exception 'amount must be > 0';
  end if;

  select * into c from public.challenge ch where ch.id = increase_challenge_stats_count.challenge_id;
  if c is null then
    raise exception 'Could not select given challenge';
  end if;

  if c.automated then
    raise exception 'This challenge is automated. You can not add any points manually';
  end if;

  if not public.is_full_member_of_group(c."group") then
    raise exception 'forbidden: not a member of the challenge''s group' using errcode = '42501';
  end if;

  if amount > c.max_points_per_day then
    raise exception 'Maximum points per day already reached';
  end if;
  if amount > c.max_points_per_week then
    raise exception 'Maximum points per week already reached';
  end if;

  week_start := date_trunc('week', to_create_at);
  week_end   := week_start + interval '7 days';
  day_start  := date_trunc('day', to_create_at);
  day_end    := day_start + interval '1 day';

  week_sum := public._sum_challenge_points_for_self(uid, c.id, week_start, week_end);
  day_sum  := public._sum_challenge_points_for_self(uid, c.id, day_start, day_end);

  if week_sum + amount > c.max_points_per_week then
    raise exception 'Maximum points per week already reached';
  end if;

  if day_sum + amount > c.max_points_per_day then
    raise exception 'Maximum points per day already reached';
  end if;

  insert into public.challenge_stats ("user", "challenge", "count", "created_at", "image_url")
  values (uid, c.id, amount, to_create_at, image_url)
  returning * into new_stat;

  insert into public.challenge_stats_meta ("challenge_stat", "category", "comment")
  values (new_stat.id, category, comment);

  return new_stat;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Column protection triggers
-- ---------------------------------------------------------------------

-- Drinks: users cannot choose their own price or move entries between payments.
create or replace function public.trg_history_enforce_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price numeric;
begin
  if coalesce(auth.role(), '') = 'service_role'
     or auth.uid() is null
     or coalesce(public.authorize('drinks.confirm.payments'), false) then
    return new;
  end if;

  if new.count is null or new.count <= 0 then
    raise exception 'count must be > 0' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' then
    if new."user" is distinct from old."user"
       or new.drink is distinct from old.drink
       or new.payment is distinct from old.payment
       or new.voucher is distinct from old.voucher then
      raise exception 'forbidden: only count can be changed' using errcode = '42501';
    end if;
    if coalesce(old.count, 0) > 0 and old.amount is not null then
      new.amount := round(old.amount / old.count * new.count, 2);
      return new;
    end if;
  end if;

  select d.price::numeric into v_price from public.drink d where d.id = new.drink;
  if v_price is null then
    raise exception 'unknown drink %', new.drink using errcode = '23503';
  end if;
  new.amount := round(v_price * new.count, 2);
  return new;
end;
$$;

drop trigger if exists trg_history_enforce_amount on public.history;
create trigger trg_history_enforce_amount
  before insert or update on public.history
  for each row execute function public.trg_history_enforce_amount();

-- Attendance rows cannot be moved to another event/user.
create or replace function public.trg_attendance_immutable_keys()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.event is distinct from old.event or new."user" is distinct from old."user") then
    raise exception 'forbidden: event and user cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_attendance_immutable_keys on public.event_attendance_user_mapping;
create trigger trg_attendance_immutable_keys
  before update on public.event_attendance_user_mapping
  for each row execute function public.trg_attendance_immutable_keys();

-- Comments cannot be moved to another event.
create or replace function public.trg_event_comment_immutable_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and new.event is distinct from old.event then
    raise exception 'forbidden: event cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_event_comment_immutable_event on public.event_comments;
create trigger trg_event_comment_immutable_event
  before update on public.event_comments
  for each row execute function public.trg_event_comment_immutable_event();

-- Users may edit their own profile, but not role/verified/disabled/email.
create or replace function public.trg_user_protect_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and not (coalesce(public.authorize('users.manage'), false) or coalesce(public.authorize('supabase.admin'), false))
     and (
       new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.verified is distinct from old.verified
       or new.disabled is distinct from old.disabled
       or new.email is distinct from old.email
     ) then
    raise exception 'forbidden: protected user columns' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_protect_columns on public."user";
create trigger trg_user_protect_columns
  before update on public."user"
  for each row execute function public.trg_user_protect_columns();

-- ---------------------------------------------------------------------
-- 6. Consolidate policies
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname, tablename) in (
      ('public', 'events'),
      ('public', 'event_attendance_user_mapping'),
      ('public', 'event_bring_items'),
      ('public', 'event_bring_pledges'),
      ('public', 'event_comments'),
      ('public', 'event_group'),
      ('public', 'group_user_mapping'),
      ('public', 'items'),
      ('public', 'item_history'),
      ('public', 'history'),
      ('public', 'challenge'),
      ('public', 'challenge_stats'),
      ('public', 'challenge_stats_meta'),
      ('public', 'user'),
      ('games', 'players')
    )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- events ---------------------------------------------------------------
create policy events_select_member on public.events
  for select to authenticated
  using (public.is_user_in_group("group"));

create policy events_insert_with_perm on public.events
  for insert to authenticated
  with check (
    (public.authorize('event.create') or public.authorize('event.edit'))
    and public.is_full_member_of_group("group")
  );

create policy events_update_with_perm on public.events
  for update to authenticated
  using (public.authorize('event.edit') and public.is_full_member_of_group("group"))
  with check (public.authorize('event.edit') and public.is_full_member_of_group("group"));

create policy events_delete_with_perm on public.events
  for delete to authenticated
  using (public.authorize('event.delete') and public.is_full_member_of_group("group"));

-- event_attendance_user_mapping ----------------------------------------
create policy attendance_select_member on public.event_attendance_user_mapping
  for select to authenticated
  using (public.is_member_of_event(event));

create policy attendance_insert_self_or_manager on public.event_attendance_user_mapping
  for insert to authenticated
  with check (
    ("user" = (select auth.uid()) or public.authorize('event.manage.attendees'))
    and public.is_member_of_event(event)
    and exists (
      select 1 from public.events e
      where e.id = event and e."startingDateTime" > now() and e."isCancelled" = false
    )
  );

create policy attendance_update_self_or_manager on public.event_attendance_user_mapping
  for update to authenticated
  using (
    ("user" = (select auth.uid()) or public.authorize('event.manage.attendees'))
    and public.is_member_of_event(event)
    and exists (
      select 1 from public.events e
      where e.id = event and e."startingDateTime" > now() and e."isCancelled" = false
    )
  )
  with check (
    ("user" = (select auth.uid()) or public.authorize('event.manage.attendees'))
    and public.is_member_of_event(event)
    and exists (
      select 1 from public.events e
      where e.id = event and e."startingDateTime" > now() and e."isCancelled" = false
    )
  );

create policy attendance_delete_self_or_manager on public.event_attendance_user_mapping
  for delete to authenticated
  using (
    ("user" = (select auth.uid()) or public.authorize('event.manage.attendees'))
    and public.is_member_of_event(event)
  );

-- event_bring_items ----------------------------------------------------
create policy bring_items_select_member on public.event_bring_items
  for select to authenticated
  using (public.is_full_member_of_event(event));

create policy bring_items_insert_editor on public.event_bring_items
  for insert to authenticated
  with check (public.authorize('event.edit') and public.is_full_member_of_event(event));

create policy bring_items_update_editor on public.event_bring_items
  for update to authenticated
  using (public.authorize('event.edit') and public.is_full_member_of_event(event))
  with check (public.authorize('event.edit') and public.is_full_member_of_event(event));

create policy bring_items_delete_editor on public.event_bring_items
  for delete to authenticated
  using (public.authorize('event.edit') and public.is_full_member_of_event(event));

-- event_bring_pledges --------------------------------------------------
create policy pledges_select_member on public.event_bring_pledges
  for select to authenticated
  using (exists (
    select 1 from public.event_bring_items bi
    where bi.id = item and public.is_full_member_of_event(bi.event)
  ));

create policy pledges_insert_self on public.event_bring_pledges
  for insert to authenticated
  with check (
    "user" = (select auth.uid())
    and exists (
      select 1
      from public.event_bring_items bi
      join public.events e on e.id = bi.event
      where bi.id = item
        and e.items_enabled is true
        and public.is_full_member_of_event(bi.event)
    )
  );

create policy pledges_update_self_or_editor on public.event_bring_pledges
  for update to authenticated
  using (
    ("user" = (select auth.uid()) or public.authorize('event.edit'))
    and exists (
      select 1 from public.event_bring_items bi
      where bi.id = item and public.is_full_member_of_event(bi.event)
    )
  )
  with check (
    ("user" = (select auth.uid()) or public.authorize('event.edit'))
    and exists (
      select 1 from public.event_bring_items bi
      where bi.id = item and public.is_full_member_of_event(bi.event)
    )
  );

create policy pledges_delete_self_or_editor on public.event_bring_pledges
  for delete to authenticated
  using (
    ("user" = (select auth.uid()) or public.authorize('event.edit'))
    and exists (
      select 1 from public.event_bring_items bi
      where bi.id = item and public.is_full_member_of_event(bi.event)
    )
  );

-- event_comments -------------------------------------------------------
create policy comments_select_member on public.event_comments
  for select to authenticated
  using (public.authorize('event.comment') and public.is_full_member_of_event(event));

create policy comments_insert_own on public.event_comments
  for insert to authenticated
  with check (
    public.authorize('event.comment')
    and "user" = (select auth.uid())
    and public.is_full_member_of_event(event)
    and public.check_reply_to(reply_to)
  );

create policy comments_update_own on public.event_comments
  for update to authenticated
  using (public.authorize('event.comment') and "user" = (select auth.uid()))
  with check ("user" = (select auth.uid()) and public.is_full_member_of_event(event));

create policy comments_delete_own on public.event_comments
  for delete to authenticated
  using (public.authorize('event.comment') and "user" = (select auth.uid()));

-- event_group ----------------------------------------------------------
create policy groups_select_visible_parent on public.event_group
  for select to public
  using (parent_group is null and visible);

create policy groups_select_public_subgroup on public.event_group
  for select to authenticated
  using (is_public and parent_group is not null and public.is_full_member_of_group(parent_group));

create policy groups_select_member on public.event_group
  for select to authenticated
  using (public.is_user_in_group(id));

create policy groups_select_platform_admin on public.event_group
  for select to authenticated
  using (public.authorize('supabase.admin') or public.authorize('groups.manage.admin'));

create policy groups_insert_platform_admin on public.event_group
  for insert to authenticated
  with check (public.authorize('supabase.admin') or public.authorize('groups.manage.admin'));

create policy groups_update_group_admin on public.event_group
  for update to authenticated
  using (public.is_user_admin_in_group(id) or public.authorize('supabase.admin'))
  with check (public.is_user_admin_in_group(id) or public.authorize('supabase.admin'));

create policy groups_delete_group_admin on public.event_group
  for delete to authenticated
  using (public.is_user_admin_in_group(id) or public.authorize('supabase.admin'));

-- group_user_mapping ---------------------------------------------------
create policy "Allow auth admin to read" on public.group_user_mapping
  for select to supabase_auth_admin
  using (true);

create policy gum_select_self on public.group_user_mapping
  for select to authenticated
  using ("user" = (select auth.uid()));

create policy gum_select_group_member on public.group_user_mapping
  for select to authenticated
  using (public.is_user_in_group("group") or public.authorize('supabase.admin'));

create policy gum_insert_self_public_open on public.group_user_mapping
  for insert to authenticated
  with check (
    "user" = (select auth.uid())
    and role = 'user'::public."GroupRole"
    and public.is_group_public_joinable("group")
  );

create policy gum_insert_join_request on public.group_user_mapping
  for insert to authenticated
  with check ("user" = (select auth.uid()) and role = 'joinRequested'::public."GroupRole");

create policy gum_insert_user_by_group_admin on public.group_user_mapping
  for insert to authenticated
  with check (role = 'user'::public."GroupRole" and public.is_user_admin_in_group("group"));

create policy gum_insert_admin on public.group_user_mapping
  for insert to authenticated
  with check (
    role = 'admin'::public."GroupRole"
    and (
      public.is_user_admin_in_group("group")
      or public.authorize('supabase.admin')
      or (public.authorize('groups.manage.admin') and public.group_has_no_members("group"))
    )
  );

create policy gum_update_group_admin on public.group_user_mapping
  for update to authenticated
  using (public.is_user_admin_in_group("group") or public.authorize('supabase.admin'))
  with check (public.is_user_admin_in_group("group") or public.authorize('supabase.admin'));

create policy gum_delete_admin_or_self on public.group_user_mapping
  for delete to authenticated
  using (
    public.is_user_admin_in_group("group")
    or "user" = (select auth.uid())
    or public.authorize('supabase.admin')
  );

-- items (keys) ---------------------------------------------------------
create policy items_select_member on public.items
  for select to authenticated
  using ("group" is null or public.is_full_member_of_group("group"));

create policy items_insert_manage on public.items
  for insert to authenticated
  with check (
    public.authorize('items.manage')
    and ("group" is null or public.is_full_member_of_group("group"))
  );

create policy items_update_manage on public.items
  for update to authenticated
  using (
    public.authorize('items.manage')
    and ("group" is null or public.is_full_member_of_group("group"))
  )
  with check (
    public.authorize('items.manage')
    and ("group" is null or public.is_full_member_of_group("group"))
  );

-- item_history ---------------------------------------------------------
create policy item_history_select_member on public.item_history
  for select to authenticated
  using (exists (
    select 1 from public.items i
    where i.id = key and (i."group" is null or public.is_full_member_of_group(i."group"))
  ));

create policy item_history_insert_manage on public.item_history
  for insert to authenticated
  with check (
    public.authorize('items.manage')
    and exists (
      select 1 from public.items i
      where i.id = key and (i."group" is null or public.is_full_member_of_group(i."group"))
    )
  );

-- history (drinks) -----------------------------------------------------
create policy history_select_own on public.history
  for select to authenticated
  using ("user" = (select auth.uid()));

create policy history_select_admin on public.history
  for select to authenticated
  using (public.authorize('drinks.confirm.payments') or public.authorize('drinks.history.admin'));

create policy history_insert_own_open_payment on public.history
  for insert to authenticated
  with check (
    "user" = (select auth.uid())
    and exists (
      select 1 from public.payments p
      where p.id = payment
        and p."user" = (select auth.uid())
        and p."paymentState" = 'Open'::public."PaymentState"
    )
    and (voucher is null or exists (
      select 1 from public.vouchers v
      where v.id = voucher and v."user" = (select auth.uid())
    ))
  );

create policy history_update_own_open_payment on public.history
  for update to authenticated
  using (
    "user" = (select auth.uid())
    and exists (
      select 1 from public.payments p
      where p.id = payment
        and p."user" = (select auth.uid())
        and p."paymentState" = 'Open'::public."PaymentState"
    )
  )
  with check (
    "user" = (select auth.uid())
    and exists (
      select 1 from public.payments p
      where p.id = payment
        and p."user" = (select auth.uid())
        and p."paymentState" = 'Open'::public."PaymentState"
    )
  );

create policy history_update_admin on public.history
  for update to authenticated
  using (public.authorize('drinks.confirm.payments'))
  with check (public.authorize('drinks.confirm.payments'));

create policy history_delete_admin on public.history
  for delete to authenticated
  using (public.authorize('drinks.confirm.payments'));

-- payments: users may only open an empty payment for themselves
drop policy if exists "Allow insert for own" on public.payments;
create policy "Allow insert for own" on public.payments
  for insert to authenticated
  with check (
    "user" = (select auth.uid())
    and "paymentState" = 'Open'::public."PaymentState"
    and coalesce("amountToPay", 0) = 0
  );

-- challenge ------------------------------------------------------------
create policy challenge_select_member on public.challenge
  for select to authenticated
  using (public.is_full_member_of_group("group"));

create policy challenge_insert_group_admin on public.challenge
  for insert to authenticated
  with check (public.is_user_admin_in_group("group"));

create policy challenge_update_group_admin on public.challenge
  for update to authenticated
  using (public.is_user_admin_in_group("group"))
  with check (public.is_user_admin_in_group("group"));

create policy challenge_delete_group_admin on public.challenge
  for delete to authenticated
  using (public.is_user_admin_in_group("group"));

-- challenge_stats: users write via increase_challenge_stats_count() ----
create policy challenge_stats_select_member on public.challenge_stats
  for select to authenticated
  using (
    public.authorize('challenge.manage')
    or exists (
      select 1 from public.challenge c
      where c.id = challenge and public.is_full_member_of_group(c."group")
    )
  );

create policy challenge_stats_insert_manager on public.challenge_stats
  for insert to authenticated
  with check (public.authorize('challenge.manage'));

create policy challenge_stats_update_manager on public.challenge_stats
  for update to authenticated
  using (
    public.authorize('challenge.manage')
    and exists (
      select 1 from public.challenge c
      where c.id = challenge and public.is_full_member_of_group(c."group")
    )
  )
  with check (
    public.authorize('challenge.manage')
    and exists (
      select 1 from public.challenge c
      where c.id = challenge and public.is_full_member_of_group(c."group")
    )
  );

create policy challenge_stats_delete_own_or_manager on public.challenge_stats
  for delete to authenticated
  using (
    "user" = (select auth.uid())
    or (
      public.authorize('challenge.manage')
      and exists (
        select 1 from public.challenge c
        where c.id = challenge and public.is_full_member_of_group(c."group")
      )
    )
  );

-- challenge_stats_meta -------------------------------------------------
create policy challenge_stats_meta_select_member on public.challenge_stats_meta
  for select to authenticated
  using (public.authorize('challenge.manage') or exists (
    select 1
    from public.challenge_stats cs
    join public.challenge c on c.id = cs.challenge
    where cs.id = challenge_stat and public.is_full_member_of_group(c."group")
  ));

create policy challenge_stats_meta_insert_manager on public.challenge_stats_meta
  for insert to authenticated
  with check (public.authorize('challenge.manage'));

-- public.user ----------------------------------------------------------
create policy user_select_authenticated on public."user"
  for select to authenticated
  using (true);

create policy user_update_self_or_manager on public."user"
  for update to authenticated
  using (id = (select auth.uid()) or public.authorize('users.manage'))
  with check (id = (select auth.uid()) or public.authorize('users.manage'));

-- games.players: users may only edit profile fields on their own player --
-- Legacy users have player = auth uid (linked_user_id NULL); newer users have
-- linked_user_id = auth uid.
create policy players_select_all on games.players
  for select to authenticated
  using (true);

create policy players_update_self on games.players
  for update to authenticated
  using (coalesce(linked_user_id, player) = (select auth.uid()))
  with check (coalesce(linked_user_id, player) = (select auth.uid()));

-- When a user changes their playerzone link, clear the derived rating data;
-- the fetch-player-info edge function (service_role) refills it.
create or replace function games.trg_players_reset_rg_data()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.rg_link is distinct from old.rg_link then
    new.rg_index := null;
    new.rg_avatar_url := null;
    new.rg_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_players_reset_rg_data on games.players;
create trigger trg_players_reset_rg_data
  before update on games.players
  for each row execute function games.trg_players_reset_rg_data();

-- PUBLIC previously held ALL privileges on games.players (and CREATE on the
-- games schema), which silently overrode any role-specific revokes.
revoke all on games.players from public;
revoke create on schema games from public;
revoke insert, update, delete, truncate, references, trigger on games.players from anon, authenticated;
grant select on games.players to anon, authenticated;
grant update (hide_rating, rg_link, gender) on games.players to authenticated;

-- games.match: creator must not be able to rewrite players/rating flag --
drop policy if exists match_update_rated_by_creator on games.match;

-- ---------------------------------------------------------------------
-- 7. Function EXECUTE privileges
--    Internal SECURITY DEFINER functions are no longer callable through the
--    API. Only the allow-listed ones (each with its own auth check, or used
--    inside RLS policies) stay executable for logged-in users.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  allowed text[] := array[
    -- used in RLS policies
    'public.is_user_in_group',
    'public.is_user_admin_in_group',
    'public.is_full_member_of_group',
    'public.is_member_of_event',
    'public.is_full_member_of_event',
    'public.group_has_no_members',
    'games.is_match_public_or_match_member',
    -- client RPCs with internal authorization checks
    'public.grant_group_grants',
    'public.revoke_group_grants',
    'public.grant_user_grants',
    'public.revoke_user_grants',
    'public.key_handover',
    'public.edit_item',
    'public.admin_expire_trials',
    'public._sum_challenge_points_for_self',
    'public.increase_challenge_stats_count',
    'public.admin_analytics_attendance_ranking',
    'public.admin_analytics_drinks_ranking',
    'public.admin_challenge_zero_points_candidates',
    'public.create_next_occurrences',
    'games.add_match_with_sets',
    'games.merge_guest_player',
    'notifications.upsert_webpush_subscription',
    'notifications.admin_notify_emit',
    'util.get_table_metadata'
  ];
begin
  for r in
    select p.oid::regprocedure as sig, n.nspname || '.' || p.proname as fqn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'games', 'notifications', 'util', 'audit', 'private')
      and p.prokind = 'f'
      and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
    if r.fqn = any(allowed) then
      execute format('grant execute on function %s to authenticated', r.sig);
    else
      execute format('revoke execute on function %s from authenticated', r.sig);
    end if;
  end loop;
end $$;
