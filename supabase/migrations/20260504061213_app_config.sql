drop trigger if exists "t_guard_items_columns" on "public"."items";

drop policy "items_select_if_member" on "public"."items";

drop policy "items_update_holder_if_member" on "public"."items";

drop function if exists "public"."trg_items_guard_columns"();


  create table "public"."app_config" (
    "key" text not null,
    "value" text not null,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."app_config" enable row level security;

CREATE UNIQUE INDEX app_config_pkey ON public.app_config USING btree (key);

alter table "public"."app_config" add constraint "app_config_pkey" PRIMARY KEY using index "app_config_pkey";

grant delete on table "public"."app_config" to "anon";

grant insert on table "public"."app_config" to "anon";

grant references on table "public"."app_config" to "anon";

grant select on table "public"."app_config" to "anon";

grant trigger on table "public"."app_config" to "anon";

grant truncate on table "public"."app_config" to "anon";

grant update on table "public"."app_config" to "anon";

grant delete on table "public"."app_config" to "authenticated";

grant insert on table "public"."app_config" to "authenticated";

grant references on table "public"."app_config" to "authenticated";

grant select on table "public"."app_config" to "authenticated";

grant trigger on table "public"."app_config" to "authenticated";

grant truncate on table "public"."app_config" to "authenticated";

grant update on table "public"."app_config" to "authenticated";

grant delete on table "public"."app_config" to "service_role";

grant insert on table "public"."app_config" to "service_role";

grant references on table "public"."app_config" to "service_role";

grant select on table "public"."app_config" to "service_role";

grant trigger on table "public"."app_config" to "service_role";

grant truncate on table "public"."app_config" to "service_role";

grant update on table "public"."app_config" to "service_role";

grant delete on table "public"."items" to "authenticated";

grant insert on table "public"."items" to "authenticated";

grant update on table "public"."items" to "authenticated";


  create policy "Allow public read access"
  on "public"."app_config"
  as permissive
  for select
  to public
using (true);



  create policy "items_select_if_member"
  on "public"."items"
  as permissive
  for select
  to authenticated
using ((("group" IS NULL) OR ("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid))))));



  create policy "items_update_holder_if_member"
  on "public"."items"
  as permissive
  for update
  to authenticated
using ((("group" IS NULL) OR ("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid))))))
with check ((("group" IS NULL) OR ("group" IN ( SELECT gum."group"
   FROM public.group_user_mapping gum
  WHERE (gum."user" = ( SELECT auth.uid() AS uid))))));



