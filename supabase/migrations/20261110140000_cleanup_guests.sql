-- Guests (anonymous sign-ins) that never secured their account are deleted once they are no
-- longer in a trial and have not been seen for 7 days. Linking an e-mail ("Konto sichern")
-- clears auth.users.is_anonymous, so converted guests are never touched.

create or replace function public.delete_abandoned_guests()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_count int := 0;
  v_user  uuid;
  fk      record;
begin
  for v_user in
    select u.id
    from auth.users u
    left join public."user" pu on pu.id = u.id
    where u.is_anonymous
      and coalesce(pu.last_seen_at, u.last_sign_in_at, u.created_at) < now() - interval '7 days'
      and not exists (
        select 1 from public.group_user_mapping gum
        where gum."user" = u.id and gum.role = 'trial'::public."GroupRole"
      )
  loop
    begin
      -- Remove the rows pointing at the guest that would block the delete (no ON DELETE
      -- action); auth's own tables cascade.
      for fk in
        select c.conrelid::regclass as tbl, a.attname as col
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        where c.contype = 'f'
          and c.confdeltype in ('a', 'r')
          and c.confrelid in ('public."user"'::regclass, 'auth.users'::regclass)
          and c.conrelid <> 'public."user"'::regclass
          and c.connamespace <> 'auth'::regnamespace
      loop
        execute format('delete from %s where %I = $1', fk.tbl, fk.col) using v_user;
      end loop;

      delete from public."user" where id = v_user;
      delete from auth.users where id = v_user;
      v_count := v_count + 1;
    exception when others then
      -- One bad row must not abort the whole batch (house pattern).
      insert into util.background_errors(source, op, ref_id, message, details)
      values ('auth.users', 'delete_abandoned_guests', v_user, sqlerrm, jsonb_build_object('user', v_user));
    end;
  end loop;

  return v_count;
end;
$function$;

revoke execute on function public.delete_abandoned_guests() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('delete_abandoned_guests');
exception when others then
  null;  -- not scheduled yet
end $$;

select cron.schedule(
  'delete_abandoned_guests',
  '45 3 * * *',
  $$ select public.delete_abandoned_guests(); $$
);
