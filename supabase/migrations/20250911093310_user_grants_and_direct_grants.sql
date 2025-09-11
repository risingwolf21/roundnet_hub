create type "public"."grant_kind" as enum ('perm', 'feat');

drop policy "Enable everything if user is super admin" on "public"."group_features";

drop policy "Allow everything if user is super admin" on "public"."group_permissions";

create table "public"."user_direct_grants" (
    "user" text not null,
    "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "kind" grant_kind not null,
    "key" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."user_direct_grants" enable row level security;

create table "public"."user_grants" (
    "user" text not null,
    "tenant" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "kind" grant_kind not null,
    "key" text not null,
    "granted_by" text not null,
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."user_grants" enable row level security;

CREATE INDEX idx_udg_kind_key_tenant ON public.user_direct_grants USING btree (kind, key, tenant);

CREATE INDEX idx_udg_user ON public.user_direct_grants USING btree ("user");

CREATE INDEX idx_user_grants_kind_key ON public.user_grants USING btree (kind, key);

CREATE INDEX idx_user_grants_user ON public.user_grants USING btree ("user");

CREATE UNIQUE INDEX pk_user_direct_grants ON public.user_direct_grants USING btree ("user", tenant, kind, key);

CREATE UNIQUE INDEX uq_group_permissions_group_permission ON public.group_permissions USING btree ("group", permission);

CREATE UNIQUE INDEX user_grants_pkey ON public.user_grants USING btree ("user", kind, key, tenant);

alter table "public"."user_direct_grants" add constraint "pk_user_direct_grants" PRIMARY KEY using index "pk_user_direct_grants";

alter table "public"."user_grants" add constraint "user_grants_pkey" PRIMARY KEY using index "user_grants_pkey";

alter table "public"."user_grants" add constraint "user_grants_granted_by_check" CHECK ((granted_by = ANY (ARRAY['group'::text, 'direct'::text]))) not valid;

alter table "public"."user_grants" validate constraint "user_grants_granted_by_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._trg_refresh_from_udg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- alle betroffenen User in diesem Statement
  PERFORM public.refresh_user_grants(u."user")
  FROM (
    SELECT DISTINCT "user" FROM new_table
    UNION
    SELECT DISTINCT "user" FROM old_table
  ) AS u;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public._trg_refresh_from_udg_stmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  rec record;
  sql text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- nur NEW TABLE existiert
    sql := 'SELECT DISTINCT "user" AS u FROM new_table';
  ELSIF TG_OP = 'DELETE' THEN
    -- nur OLD TABLE existiert
    sql := 'SELECT DISTINCT "user" AS u FROM old_table';
  ELSE
    -- UPDATE: beide vorhanden
    sql := 'SELECT DISTINCT u FROM (
              SELECT "user" AS u FROM new_table
              UNION
              SELECT "user" AS u FROM old_table
            ) s';
  END IF;

  FOR rec IN EXECUTE sql LOOP
    PERFORM public.refresh_user_grants(rec.u);
  END LOOP;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.authorize(requested_permission text, p_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_grants ug
    WHERE ug."user" = auth.uid()::text
      AND ug.kind  = 'perm'
      AND ug.key   = requested_permission
      AND ug.tenant = COALESCE(p_tenant, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_user_grants(p_user text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_global uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'p_user required';
  END IF;

  -- Cache für p_user komplett aus Quellen (group + direct) neu aufbauen
  DELETE FROM public.user_grants ug
   WHERE ug."user" = p_user
     AND ug.granted_by IN ('group','direct');

  -- Gruppen-Permissions → Cache
  IF to_regclass('public.group_user_mapping') IS NOT NULL
     AND to_regclass('public.group_permissions')  IS NOT NULL THEN
    INSERT INTO public.user_grants ("user", tenant, kind, key, granted_by)
    SELECT p_user, v_global, 'perm'::public.grant_kind, q.perm, 'group'
    FROM (
      SELECT DISTINCT gp."permission" AS perm
      FROM public.group_user_mapping gum
      JOIN public.group_permissions  gp ON gp."group" = gum."group"
      WHERE gum."user" = p_user
    ) q
    ON CONFLICT ("user", kind, key, tenant) DO NOTHING;
  END IF;

  -- Gruppen-Features → Cache (falls vorhanden)
  IF to_regclass('public.group_features') IS NOT NULL THEN
    INSERT INTO public.user_grants ("user", tenant, kind, key, granted_by)
    SELECT p_user, v_global, 'feat'::public.grant_kind, q.feat, 'group'
    FROM (
      SELECT DISTINCT gf."feature" AS feat
      FROM public.group_user_mapping gum
      JOIN public.group_features    gf ON gf."group" = gum."group"
      WHERE gum."user" = p_user
    ) q
    ON CONFLICT ("user", kind, key, tenant) DO NOTHING;
  END IF;

  -- ➕ Direkte Grants → Cache  (Tenant aus Quelle übernehmen)
  INSERT INTO public.user_grants ("user", tenant, kind, key, granted_by)
  SELECT p_user, g.tenant, g.kind, g.key, 'direct'
  FROM public.user_direct_grants g
  WHERE g."user" = p_user
  ON CONFLICT ("user", kind, key, tenant) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_refresh_grants_on_group_features()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    BEGIN
      PERFORM public.refresh_user_grants(gum."user")
      FROM public.group_user_mapping gum
      WHERE gum."group" = COALESCE(NEW."group", OLD."group");
      RETURN NULL;
    END;
    $function$
;

CREATE OR REPLACE FUNCTION public.trg_refresh_grants_on_group_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- alle Users der betroffenen Gruppe refreshen
  PERFORM public.refresh_user_grants(gum."user")
  FROM public.group_user_mapping gum
  WHERE gum."group" = COALESCE(NEW."group", OLD."group");
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_refresh_grants_on_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid text;
BEGIN
  uid := COALESCE(NEW."user", OLD."user");
  PERFORM public.refresh_user_grants(uid);
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.authorize(requested_permission text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_grants ug
    WHERE ug."user" = auth.uid()::text
      AND ug.kind  = 'perm'
      AND ug.key   = requested_permission
      AND ug.tenant = '00000000-0000-0000-0000-000000000000'::uuid
  );
$function$
;

CREATE OR REPLACE FUNCTION public.event_comment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
    currentEvent  public.events;
begin

    select * into currentEvent from public.events where id = new.event limit 1;

    insert into public.notifications (body, "user", title)
    select concat(new."displayName", ' : ', new.comment) as body, "userId" as user, currentEvent.title as title
    from public."user"
    where 'eventComments' = ANY (select notification_tag from public.user_notification_settings where "user" = public."user"."userId")
      and "userId" = ANY (array(select event_attendance_user_mapping."user"
                                from public.event_attendance_user_mapping
                                where event = new.event
                                  and state = 'Attending')::text[]);
    return new;
end;$function$
;

grant delete on table "public"."user_direct_grants" to "anon";

grant insert on table "public"."user_direct_grants" to "anon";

grant references on table "public"."user_direct_grants" to "anon";

grant select on table "public"."user_direct_grants" to "anon";

grant trigger on table "public"."user_direct_grants" to "anon";

grant truncate on table "public"."user_direct_grants" to "anon";

grant update on table "public"."user_direct_grants" to "anon";

grant delete on table "public"."user_direct_grants" to "authenticated";

grant insert on table "public"."user_direct_grants" to "authenticated";

grant references on table "public"."user_direct_grants" to "authenticated";

grant select on table "public"."user_direct_grants" to "authenticated";

grant trigger on table "public"."user_direct_grants" to "authenticated";

grant truncate on table "public"."user_direct_grants" to "authenticated";

grant update on table "public"."user_direct_grants" to "authenticated";

grant delete on table "public"."user_direct_grants" to "service_role";

grant insert on table "public"."user_direct_grants" to "service_role";

grant references on table "public"."user_direct_grants" to "service_role";

grant select on table "public"."user_direct_grants" to "service_role";

grant trigger on table "public"."user_direct_grants" to "service_role";

grant truncate on table "public"."user_direct_grants" to "service_role";

grant update on table "public"."user_direct_grants" to "service_role";

grant delete on table "public"."user_grants" to "anon";

grant insert on table "public"."user_grants" to "anon";

grant references on table "public"."user_grants" to "anon";

grant select on table "public"."user_grants" to "anon";

grant trigger on table "public"."user_grants" to "anon";

grant truncate on table "public"."user_grants" to "anon";

grant update on table "public"."user_grants" to "anon";

grant references on table "public"."user_grants" to "authenticated";

grant select on table "public"."user_grants" to "authenticated";

grant trigger on table "public"."user_grants" to "authenticated";

grant truncate on table "public"."user_grants" to "authenticated";

grant delete on table "public"."user_grants" to "service_role";

grant insert on table "public"."user_grants" to "service_role";

grant references on table "public"."user_grants" to "service_role";

grant select on table "public"."user_grants" to "service_role";

grant trigger on table "public"."user_grants" to "service_role";

grant truncate on table "public"."user_grants" to "service_role";

grant update on table "public"."user_grants" to "service_role";

create policy "udg_admin_write"
on "public"."user_direct_grants"
as permissive
for all
to authenticated
using (authorize('supabase.admin'::text))
with check (authorize('supabase.admin'::text));


create policy "udg_self_read"
on "public"."user_direct_grants"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));


create policy "user_grants_self_read"
on "public"."user_grants"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));


create policy "Enable everything if user is super admin"
on "public"."group_features"
as permissive
for all
to authenticated
using (( SELECT authorize('supabase.admin'::text) AS authorize));


create policy "Allow everything if user is super admin"
on "public"."group_permissions"
as permissive
for all
to authenticated
using (( SELECT authorize('supabase.admin'::text) AS authorize));


CREATE TRIGGER trg_refresh_grants_on_group_features AFTER INSERT OR DELETE OR UPDATE ON public.group_features FOR EACH ROW EXECUTE FUNCTION trg_refresh_grants_on_group_features();

CREATE TRIGGER trg_refresh_grants_on_group_permissions AFTER INSERT OR DELETE OR UPDATE ON public.group_permissions FOR EACH ROW EXECUTE FUNCTION trg_refresh_grants_on_group_permissions();

CREATE TRIGGER trg_refresh_grants_on_membership AFTER INSERT OR DELETE OR UPDATE ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION trg_refresh_grants_on_membership();

CREATE TRIGGER trg_refresh_from_udg_del AFTER DELETE ON public.user_direct_grants REFERENCING OLD TABLE AS old_table FOR EACH STATEMENT EXECUTE FUNCTION _trg_refresh_from_udg_stmt();

CREATE TRIGGER trg_refresh_from_udg_ins AFTER INSERT ON public.user_direct_grants REFERENCING NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION _trg_refresh_from_udg_stmt();

CREATE TRIGGER trg_refresh_from_udg_upd AFTER UPDATE ON public.user_direct_grants REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION _trg_refresh_from_udg_stmt();


