-- Slim down the audit log to what someone may need to trace later: money, keys, memberships and
-- permissions. Everything else (last visit, events, attendance, comments, games, ...) wrote a full
-- copy of the row on every change, nothing read it, and nothing ever cleaned it up.
--
--   1. Audit triggers stay only on the tables below. The triggers to drop are looked up in the
--      database, not taken from the migrations: some (e.g. on public.user) were attached outside
--      them by audit.on_ddl_attach_triggers().
--   2. public.user_direct_grants is audited too (who gave whom a permission).
--   3. New tables are no longer audited automatically: on_ddl_attach_triggers() does nothing.
--   4. Log rows of tables that are no longer audited are deleted.
--   5. audit.run_retention() (90 days) runs nightly; it existed but was never scheduled.

-- ---------------------------------------------------------------------
-- 1 + 2. Audit only what matters
-- ---------------------------------------------------------------------
do $$
declare
  v_keep text[] := array[
    'public.history', 'public.payments', 'public.vouchers', 'public.drink',
    'public.items', 'public.item_history',
    'public.group_user_mapping', 'public.group_permissions', 'public.group_features',
    'public.permissions', 'public.features', 'public.user_direct_grants'
  ];
  r record;
begin
  for r in
    select t.tgname, n.nspname, c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgfoid = 'audit.log_change()'::regprocedure
      and not t.tgisinternal
      and not (n.nspname || '.' || c.relname = any (v_keep))
  loop
    execute format('drop trigger if exists %I on %I.%I', r.tgname, r.nspname, r.relname);
  end loop;

  perform audit.attach_trigger_for_table('public', 'user_direct_grants');
end $$;

-- ---------------------------------------------------------------------
-- 3. New tables are not audited automatically any more
-- ---------------------------------------------------------------------
-- Replaced rather than dropped: the event trigger that calls it may be owned by a role this
-- migration cannot drop it as. A table that needs auditing gets audit.attach_trigger_for_table().
CREATE OR REPLACE FUNCTION audit.on_ddl_attach_triggers()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Intentionally empty since 20261110130000_slim_audit_log.
  return;
end;
$function$;

-- ---------------------------------------------------------------------
-- 4. Drop the log rows of tables that are no longer audited
-- ---------------------------------------------------------------------
delete from audit.log
where (schema_name || '.' || table_name) <> all (array[
  'public.history', 'public.payments', 'public.vouchers', 'public.drink',
  'public.items', 'public.item_history',
  'public.group_user_mapping', 'public.group_permissions', 'public.group_features',
  'public.permissions', 'public.features', 'public.user_direct_grants'
]);

-- ---------------------------------------------------------------------
-- 5. Keep 90 days, nightly
-- ---------------------------------------------------------------------
do $$
begin
  perform cron.unschedule('audit_log_retention');
exception when others then
  null;  -- not scheduled yet
end $$;

select cron.schedule(
  'audit_log_retention',
  '30 3 * * *',
  $$ select audit.run_retention(); $$
);
