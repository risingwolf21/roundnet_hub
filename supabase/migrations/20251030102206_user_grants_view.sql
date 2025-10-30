drop policy "players_self_update" on "games"."players";

drop policy "players_update_self" on "games"."players";

create policy "players_update_self"
on "games"."players"
as permissive
for update
to public
using (((( SELECT auth.uid() AS uid))::text = player));

drop trigger if exists "trg_refresh_grants_on_group_features" on "public"."group_features";

drop trigger if exists "trg_refresh_grants_on_group_permissions" on "public"."group_permissions";

drop trigger if exists "trg_refresh_grants_on_membership" on "public"."group_user_mapping";

drop trigger if exists "trg_refresh_from_udg_del" on "public"."user_direct_grants";

drop trigger if exists "trg_refresh_from_udg_ins" on "public"."user_direct_grants";

drop trigger if exists "trg_refresh_from_udg_upd" on "public"."user_direct_grants";

drop policy "user_grants_self_read" on "public"."user_grants";

revoke delete on table "public"."user_grants" from "anon";

revoke insert on table "public"."user_grants" from "anon";

revoke references on table "public"."user_grants" from "anon";

revoke select on table "public"."user_grants" from "anon";

revoke trigger on table "public"."user_grants" from "anon";

revoke truncate on table "public"."user_grants" from "anon";

revoke update on table "public"."user_grants" from "anon";

revoke references on table "public"."user_grants" from "authenticated";

revoke select on table "public"."user_grants" from "authenticated";

revoke trigger on table "public"."user_grants" from "authenticated";

revoke truncate on table "public"."user_grants" from "authenticated";

revoke delete on table "public"."user_grants" from "service_role";

revoke insert on table "public"."user_grants" from "service_role";

revoke references on table "public"."user_grants" from "service_role";

revoke select on table "public"."user_grants" from "service_role";

revoke trigger on table "public"."user_grants" from "service_role";

revoke truncate on table "public"."user_grants" from "service_role";

revoke update on table "public"."user_grants" from "service_role";

alter table "public"."user_grants" drop constraint "user_grants_granted_by_check";

drop function if exists "public"."trg_refresh_grants_on_group_features"();

drop function if exists "public"."trg_refresh_grants_on_group_permissions"();

drop function if exists "public"."trg_refresh_grants_on_membership"();

drop view if exists "public"."user_features";

drop view if exists "public"."user_permissions";

drop function if exists "public"."authorize"(requested_permission text, p_tenant uuid);

alter table "public"."user_grants" drop constraint "user_grants_pkey";

drop index if exists "public"."idx_user_grants_kind_key";

drop index if exists "public"."idx_user_grants_user";

drop index if exists "public"."user_grants_pkey";

drop table "public"."user_grants";

set check_function_bodies = off;

create or replace view "public"."user_grants_view" as  SELECT DISTINCT ON ("user", kind, key, tenant) "user",
    kind,
    key,
    tenant,
    granted_by
   FROM ( SELECT udg."user",
            udg.kind,
            udg.key,
            udg.tenant,
            'direct'::text AS granted_by
           FROM user_direct_grants udg
          WHERE (udg."user" = (auth.uid())::text)
        UNION ALL
         SELECT gum."user",
            'perm'::grant_kind AS kind,
            gp.permission AS key,
            '00000000-0000-0000-0000-000000000000'::uuid AS tenant,
            'group'::text AS granted_by
           FROM (group_user_mapping gum
             JOIN group_permissions gp ON ((gp."group" = gum."group")))
          WHERE ((gum.role IS NOT NULL) AND (gum.role <> 'joinRequested'::"GroupRole") AND (gum."user" = (auth.uid())::text))
        UNION ALL
         SELECT gum."user",
            'feat'::grant_kind AS kind,
            gf.feature AS key,
            '00000000-0000-0000-0000-000000000000'::uuid AS tenant,
            'group'::text AS granted_by
           FROM (group_user_mapping gum
             JOIN group_features gf ON ((gf."group" = gum."group")))
          WHERE ((gum.role IS NOT NULL) AND (gum.role <> 'joinRequested'::"GroupRole") AND (gum."user" = (auth.uid())::text))) s
  ORDER BY "user", kind, key, tenant,
        CASE granted_by
            WHEN 'direct'::text THEN 0
            ELSE 1
        END;


CREATE OR REPLACE FUNCTION public.authorize(requested_permission text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$SELECT EXISTS (
    SELECT 1
    FROM public.user_grants_view ugv
    WHERE ugv."user" = (select auth.uid())::text
      AND ugv.kind  = 'perm'
      AND ugv.key   = requested_permission
      AND ugv.tenant = '00000000-0000-0000-0000-000000000000'::uuid
  );$function$
;

CREATE OR REPLACE FUNCTION public.authorize(requested_permission text, p_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$SELECT EXISTS (
    SELECT 1
    FROM public.user_grants_view ugv
    WHERE ugv."user" = (select auth.uid())::text
      AND ugv.kind  = 'perm'
      AND ugv.key   = requested_permission
      AND ugv.tenant = COALESCE(p_tenant, '00000000-0000-0000-0000-000000000000'::uuid)
  );$function$
;


