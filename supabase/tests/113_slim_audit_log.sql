-- 20261110130000_slim_audit_log: only money, keys, memberships and permissions are audited,
-- new tables are not audited automatically, and old entries are cleaned up nightly.
BEGIN;
SELECT plan(6);

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

SELECT is(
  (SELECT array_agg(n.nspname || '.' || c.relname ORDER BY n.nspname || '.' || c.relname)
   FROM pg_trigger t
   JOIN pg_class c ON c.oid = t.tgrelid
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE t.tgfoid = 'audit.log_change()'::regprocedure AND NOT t.tgisinternal),
  ARRAY['public.drink', 'public.features', 'public.group_features', 'public.group_permissions',
        'public.group_user_mapping', 'public.history', 'public.item_history', 'public.items',
        'public.payments', 'public.permissions', 'public.user_direct_grants', 'public.vouchers'],
  'only money, keys, memberships and permissions are audited');

\set grp '00000000-0000-0000-0000-0000000011d1'
INSERT INTO public.event_group(id, name, visible, is_public) VALUES (:'grp', 'AuditGrp', true, true);
SELECT tests.create_supabase_user('au_user', 'au_user@audit.test');

SELECT count(*) AS before FROM audit.log \gset

-- Not audited any more: an event, the user's last visit.
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group")
VALUES ('au-ev','Audit','—', now()+interval '1 day', now()+interval '1 day 2 hours', :'grp');
UPDATE public."user" SET last_seen_at = now() WHERE id = tests.get_supabase_uid('au_user');
SELECT is((SELECT count(*) FROM audit.log)::int, :'before'::int, 'events and last visits are not logged');

-- Still audited: a membership.
INSERT INTO public.group_user_mapping("user","group",role) VALUES (tests.get_supabase_uid('au_user'), :'grp', 'user');
SELECT is((SELECT count(*) FROM audit.log WHERE table_name = 'group_user_mapping')::int > 0, true,
          'a group membership is still logged');

-- A new table is not audited automatically.
CREATE TABLE public.au_new_table (id int primary key);
SELECT is((SELECT count(*)::int FROM pg_trigger WHERE tgrelid = 'public.au_new_table'::regclass AND NOT tgisinternal), 0,
          'a new table gets no audit trigger');

SELECT is((SELECT count(*)::int FROM cron.job WHERE jobname = 'audit_log_retention' AND command LIKE '%audit.run_retention()%'), 1,
          'old entries are cleaned up nightly');

-- Retention keeps 90 days.
INSERT INTO audit.log(at, actor_id, schema_name, table_name, op, row_pk, new_data)
VALUES (now() - interval '100 days', 'system', 'public', 'history', 'INSERT', '{}', '{}');
SELECT audit.run_retention();
SELECT is((SELECT count(*)::int FROM audit.log WHERE at < now() - interval '90 days'), 0, 'entries older than 90 days are removed');

SELECT * FROM finish();
ROLLBACK;
