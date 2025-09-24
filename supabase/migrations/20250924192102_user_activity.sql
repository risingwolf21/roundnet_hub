drop policy "wps_delete_self" on "public"."web_push_subscriptions";

drop policy "wps_insert_self" on "public"."web_push_subscriptions";

drop policy "wps_select_self" on "public"."web_push_subscriptions";

drop policy "wps_update_self" on "public"."web_push_subscriptions";

drop function if exists "public"."as_service"();

drop function if exists "public"."check_version"(input_version text);

drop function if exists "public"."getattendingusers"(event_id bigint);

drop function if exists "public"."test_login"(uid text);

drop function if exists "public"."webpush_compact_duplicates"();

drop function if exists "public"."webpush_mark_hard_bounces"(p_lookback_days integer);

drop function if exists "public"."webpush_prune_subscriptions"(p_revoked_ttl_days integer, p_stale_days integer);

drop function if exists "public"."webpush_sweep"();

create table if not exists "public"."user_activity" (
    "user" text not null,
    "last_activity" timestamp with time zone not null default now(),
    "commit_version" text not null,
    "app_version" text not null
);


alter table "public"."user_activity" enable row level security;

CREATE UNIQUE INDEX payments_id_uuid_key ON public.payments USING btree (id_uuid);

CREATE UNIQUE INDEX user_activity_pkey ON public.user_activity USING btree ("user");

CREATE UNIQUE INDEX webpush_one_active_per_device ON public.web_push_subscriptions USING btree ("user", COALESCE(device_id, ''::text)) WHERE (revoked_at IS NULL);

alter table "public"."user_activity" add constraint "user_activity_pkey" PRIMARY KEY using index "user_activity_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.notify_users(p_users text[], p_topic text, p_scope text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare
v_cnt    int  := 0;
v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin

  with allowed as (
    select distinct "userId" as uid from public.user where "userId" = any (p_users)
    and public.is_topic_enabled_for_user("userId", v_tenant, p_topic, p_scope, null)
  ),
  ins as (
    insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, p_topic,
           p_title,
           p_body,
           p_data,
           p_source_type,
           p_source_id
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           p_title,
           p_body,
           p_data,
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join public.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  return v_cnt;
end;$function$
;

grant delete on table "public"."user_activity" to "anon";

grant insert on table "public"."user_activity" to "anon";

grant references on table "public"."user_activity" to "anon";

grant select on table "public"."user_activity" to "anon";

grant trigger on table "public"."user_activity" to "anon";

grant truncate on table "public"."user_activity" to "anon";

grant update on table "public"."user_activity" to "anon";

grant delete on table "public"."user_activity" to "authenticated";

grant insert on table "public"."user_activity" to "authenticated";

grant references on table "public"."user_activity" to "authenticated";

grant select on table "public"."user_activity" to "authenticated";

grant trigger on table "public"."user_activity" to "authenticated";

grant truncate on table "public"."user_activity" to "authenticated";

grant update on table "public"."user_activity" to "authenticated";

grant delete on table "public"."user_activity" to "service_role";

grant insert on table "public"."user_activity" to "service_role";

grant references on table "public"."user_activity" to "service_role";

grant select on table "public"."user_activity" to "service_role";

grant trigger on table "public"."user_activity" to "service_role";

grant truncate on table "public"."user_activity" to "service_role";

grant update on table "public"."user_activity" to "service_role";

create policy "user_activity_all_self"
on "public"."user_activity"
as permissive
for all
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));


create policy "user_activity_select_admin"
on "public"."user_activity"
as permissive
for select
to authenticated
using (( SELECT authorize('supabase.admin'::text) AS authorize));


create policy "webpush_insert_supabase_admin"
on "public"."web_push_subscriptions"
as permissive
for select
to public
using (( SELECT authorize('supabase.admin'::text) AS authorize));



