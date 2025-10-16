create schema if not exists "audit";

create sequence "audit"."log_id_seq";

create table "audit"."log" (
    "id" bigint not null default nextval('audit.log_id_seq'::regclass),
    "at" timestamp with time zone not null default now(),
    "actor_id" text not null,
    "schema_name" text not null,
    "table_name" text not null,
    "op" text not null,
    "row_pk" jsonb not null,
    "changed_cols" text[] not null default '{}'::text[],
    "old_data" jsonb,
    "new_data" jsonb,
    "txid" bigint not null default txid_current(),
    "request_id" text
);


alter table "audit"."log" enable row level security;

alter sequence "audit"."log_id_seq" owned by "audit"."log"."id";

CREATE INDEX idx_audit_log_actor ON audit.log USING btree (actor_id);

CREATE INDEX idx_audit_log_changedcols_gin ON audit.log USING gin (changed_cols);

CREATE INDEX idx_audit_log_rowpk_gin ON audit.log USING gin (row_pk jsonb_path_ops);

CREATE INDEX idx_audit_log_table_op ON audit.log USING btree (schema_name, table_name, op);

CREATE INDEX idx_audit_log_when ON audit.log USING btree (at DESC);

CREATE UNIQUE INDEX log_pkey ON audit.log USING btree (id);

alter table "audit"."log" add constraint "log_pkey" PRIMARY KEY using index "log_pkey";

alter table "audit"."log" add constraint "log_op_check" CHECK ((op = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))) not valid;

alter table "audit"."log" validate constraint "log_op_check";

alter table "audit"."log" add constraint "log_row_min" CHECK ((((op = 'INSERT'::text) AND (new_data IS NOT NULL)) OR ((op = 'UPDATE'::text) AND (old_data IS NOT NULL) AND (new_data IS NOT NULL)) OR ((op = 'DELETE'::text) AND (old_data IS NOT NULL)))) not valid;

alter table "audit"."log" validate constraint "log_row_min";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION audit._changed_columns(old_row jsonb, new_row jsonb)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  with keys as (
    select k as key from jsonb_object_keys(coalesce(old_row,'{}'::jsonb) || coalesce(new_row,'{}'::jsonb)) as k
  )
  select coalesce(array_agg(key order by key), '{}')::text[]
  from keys
  where coalesce(old_row,'{}'::jsonb) -> key is distinct from coalesce(new_row,'{}'::jsonb) -> key
$function$
;

CREATE OR REPLACE FUNCTION audit._current_actor()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(
    (auth.uid())::text,
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    'system'
  );
$function$
;

CREATE OR REPLACE FUNCTION audit.attach_trigger_for_table(p_schema text, p_table text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rel regclass;
  v_trg_name text := 'trg_audit_' || p_table;
  v_kind char;
begin
  -- existiert die Relation & ist eine echte Tabelle?
  select c.oid, c.relkind into v_rel, v_kind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = p_schema and c.relname = p_table;

  if v_rel is null then
    return;
  end if;

  -- nur echte Tabellen (r = table, p = partitioned table, f = foreign table optional)
  if v_kind not in ('r','p') then
    return;
  end if;

  -- niemals auf audit.log selbst
  if p_schema = 'audit' then
    return;
  end if;

  -- Trigger existiert schon?
  if exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = v_trg_name and n.nspname = p_schema and c.relname = p_table
      and not t.tgisinternal
  ) then
    return;
  end if;

  -- Trigger anbringen
  execute format($fmt$
    create trigger %I
    after insert or update or delete on %I.%I
    for each row execute function audit.log_change()
  $fmt$, v_trg_name, p_schema, p_table);
end;
$function$
;

CREATE OR REPLACE FUNCTION audit.attach_triggers_for_schema(p_schema text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = p_schema
      and tablename not like 'pg\_%' escape '\'
      and tablename not like 'sql\_%' escape '\'
  loop
    perform audit.attach_trigger_for_table(p_schema, r.tablename);
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION audit.log_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor   text := audit._current_actor();
  v_old     jsonb;
  v_new     jsonb;
  v_changed text[];
  v_pk_cols text[] := null;  -- wird aus PK-Metadaten ermittelt, nicht aus TG_ARGV
  v_row_pk  jsonb := '{}'::jsonb;
  v_req     text := nullif(current_setting('request.jwt.claims', true), '');
begin
  -- niemals Audit-Tabellen selbst loggen
  if TG_TABLE_SCHEMA = 'audit' then
    if TG_OP in ('INSERT','UPDATE') then return NEW; else return OLD; end if;
  end if;

  -- Primärschlüssel-Spalten ermitteln
  select array_agg(a.attname order by a.attnum)
  into v_pk_cols
  from pg_index i
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  where i.indrelid = TG_RELID and i.indisprimary;

  if TG_OP = 'INSERT' then
    v_new := to_jsonb(NEW);

    if v_pk_cols is not null then
      -- PK als JSONB bauen
      select jsonb_object_agg(k, v_new -> k) into v_row_pk
      from unnest(v_pk_cols) as k;
    else
      -- Fallback: alle Spalten als "Composite-PK"
      v_row_pk := '{}'::jsonb;
      select jsonb_object_agg(k, v_new -> k) into v_row_pk
      from jsonb_object_keys(v_new) k;
    end if;

    insert into audit.log(at, actor_id, schema_name, table_name, op, row_pk,
                          changed_cols, old_data, new_data, request_id)
    values (now(), v_actor, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'INSERT', v_row_pk,
            coalesce(audit._changed_columns(null, v_new), '{}'),
            null, v_new,
            case when v_req is not null then (v_req::jsonb ->> 'jti') end);
    return NEW;

  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_changed := audit._changed_columns(v_old, v_new);
    if array_length(v_changed,1) is null then
      return NEW; -- nichts Relevantes geändert
    end if;

    if v_pk_cols is not null then
      select jsonb_object_agg(k, v_new -> k) into v_row_pk
      from unnest(v_pk_cols) as k;
    else
      v_row_pk := '{}'::jsonb;
      select jsonb_object_agg(k, v_new -> k) into v_row_pk
      from jsonb_object_keys(v_new) k;
    end if;

    insert into audit.log(at, actor_id, schema_name, table_name, op, row_pk,
                          changed_cols, old_data, new_data, request_id)
    values (now(), v_actor, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'UPDATE', v_row_pk,
            v_changed, v_old, v_new,
            case when v_req is not null then (v_req::jsonb ->> 'jti') end);
    return NEW;

  elsif TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);

    if v_pk_cols is not null then
      select jsonb_object_agg(k, v_old -> k) into v_row_pk
      from unnest(v_pk_cols) as k;
    else
      v_row_pk := '{}'::jsonb;
      select jsonb_object_agg(k, v_old -> k) into v_row_pk
      from jsonb_object_keys(v_old) k;
    end if;

    insert into audit.log(at, actor_id, schema_name, table_name, op, row_pk,
                          changed_cols, old_data, new_data, request_id)
    values (now(), v_actor, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'DELETE', v_row_pk,
            coalesce(audit._changed_columns(v_old, null), '{}'),
            v_old, null,
            case when v_req is not null then (v_req::jsonb ->> 'jti') end);
    return OLD;
  end if;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION audit.on_ddl_attach_triggers()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
  loop
    -- nur CREATE TABLE / ALTER TABLE ... ADD COLUMN ist uns egal; wir reagieren auf neue Tabellen
    if obj.object_type = 'table' then
      if obj.schema_name in ('public','games') then
        perform audit.attach_trigger_for_table(obj.schema_name, obj.object_name);
      end if;
    end if;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION audit.retention_cleanup(days integer DEFAULT 90)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'audit', 'public', 'pg_temp'
AS $function$
  with del as (
    delete from audit.log
    where at < now() - make_interval(days => days)
    returning 1
  )
  select count(*) from del;
$function$
;

CREATE OR REPLACE FUNCTION audit.run_retention()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'audit', 'public', 'pg_temp'
AS $function$
  select audit.retention_cleanup(90);
$function$
;

create policy "audit_read_admin_only"
on "audit"."log"
as permissive
for select
to authenticated
using (( SELECT authorize('supabase.admin'::text) AS authorize));



CREATE TRIGGER trg_audit_elo_calc_log AFTER INSERT OR DELETE OR UPDATE ON games.elo_calc_log FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_elo_config AFTER INSERT OR DELETE OR UPDATE ON games.elo_config FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_elo_history AFTER INSERT OR DELETE OR UPDATE ON games.elo_history FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_match AFTER INSERT OR DELETE OR UPDATE ON games.match FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_players AFTER INSERT OR DELETE OR UPDATE ON games.players FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_sets AFTER INSERT OR DELETE OR UPDATE ON games.sets FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_teams AFTER INSERT OR DELETE OR UPDATE ON games.teams FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_challenge AFTER INSERT OR DELETE OR UPDATE ON public.challenge FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_challenge_stats AFTER INSERT OR DELETE OR UPDATE ON public.challenge_stats FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_drink AFTER INSERT OR DELETE OR UPDATE ON public.drink FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_event_attendance_user_mapping AFTER INSERT OR DELETE OR UPDATE ON public.event_attendance_user_mapping FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_event_bring_items AFTER INSERT OR DELETE OR UPDATE ON public.event_bring_items FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_event_bring_pledges AFTER INSERT OR DELETE OR UPDATE ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_event_comments AFTER INSERT OR DELETE OR UPDATE ON public.event_comments FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_event_group AFTER INSERT OR DELETE OR UPDATE ON public.event_group FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_events AFTER INSERT OR DELETE OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_features AFTER INSERT OR DELETE OR UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_group_features AFTER INSERT OR DELETE OR UPDATE ON public.group_features FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_group_permissions AFTER INSERT OR DELETE OR UPDATE ON public.group_permissions FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_group_user_mapping AFTER INSERT OR DELETE OR UPDATE ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_history AFTER INSERT OR DELETE OR UPDATE ON public.history FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_item_history AFTER INSERT OR DELETE OR UPDATE ON public.item_history FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_items AFTER INSERT OR DELETE OR UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_notification_outbox AFTER INSERT OR DELETE OR UPDATE ON public.notification_outbox FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_notification_outbox_targets AFTER INSERT OR DELETE OR UPDATE ON public.notification_outbox_targets FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_notification_retention AFTER INSERT OR DELETE OR UPDATE ON public.notification_retention FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_notification_topics AFTER INSERT OR DELETE OR UPDATE ON public.notification_topics FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_notifications AFTER INSERT OR DELETE OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_object_subscriptions AFTER INSERT OR DELETE OR UPDATE ON public.object_subscriptions FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_permissions AFTER INSERT OR DELETE OR UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_user AFTER INSERT OR DELETE OR UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_user_activity AFTER INSERT OR DELETE OR UPDATE ON public.user_activity FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_user_direct_grants AFTER INSERT OR DELETE OR UPDATE ON public.user_direct_grants FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_user_grants AFTER INSERT OR DELETE OR UPDATE ON public.user_grants FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_user_notification_preferences AFTER INSERT OR DELETE OR UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_vouchers AFTER INSERT OR DELETE OR UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_web_push_subscriptions AFTER INSERT OR DELETE OR UPDATE ON public.web_push_subscriptions FOR EACH ROW EXECUTE FUNCTION audit.log_change();


