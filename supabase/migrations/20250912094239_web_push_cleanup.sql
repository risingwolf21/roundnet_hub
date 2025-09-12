revoke delete on table "public"."notification_retention" from "authenticated";

revoke insert on table "public"."notification_retention" from "authenticated";

revoke references on table "public"."notification_retention" from "authenticated";

revoke trigger on table "public"."notification_retention" from "authenticated";

revoke truncate on table "public"."notification_retention" from "authenticated";

revoke update on table "public"."notification_retention" from "authenticated";

revoke delete on table "public"."notification_topics" from "authenticated";

revoke insert on table "public"."notification_topics" from "authenticated";

revoke update on table "public"."notification_topics" from "authenticated";

revoke insert on table "public"."notifications" from "authenticated";

alter table "public"."notification_retention" enable row level security;

alter table "public"."notification_topics" enable row level security;

alter table "public"."notifications" enable row level security;

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree ("user", created_at DESC);

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree ("user", read_at);

set check_function_bodies = off;

drop function public.set_notification_pref;

CREATE OR REPLACE FUNCTION public.set_notification_pref(p_topic text, p_enabled boolean, p_channel text DEFAULT 'webpush'::text, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS user_notification_preferences
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_row public.user_notification_preferences;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  insert into public.user_notification_preferences(
    "user", tenant, topic, channel, enabled, scope_type, scope_id
  ) values (
    auth.uid()::text, v_tenant, p_topic, coalesce(p_channel,'webpush'),
    p_enabled, p_scope_type, p_scope_id
  )
  on conflict ("user", tenant, topic, channel, scope_type_norm, scope_id_norm)
  do update set
    enabled    = excluded.enabled,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$function$
;

create policy "notification_retention_select_admin"
on "public"."notification_retention"
as permissive
for select
to authenticated
using (authorize('supabase.admin'::text));


create policy "notification_retention_write_admin"
on "public"."notification_retention"
as permissive
for all
to authenticated
using (authorize('supabase.admin'::text))
with check (authorize('supabase.admin'::text));


create policy "notification_topics_select_all"
on "public"."notification_topics"
as permissive
for select
to authenticated
using (true);


create policy "notifications_delete_own"
on "public"."notifications"
as permissive
for delete
to authenticated
using (("user" = (auth.uid())::text));


create policy "notifications_select_own"
on "public"."notifications"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));


create policy "notifications_update_own"
on "public"."notifications"
as permissive
for update
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));


create policy "unp_delete_own"
on "public"."user_notification_preferences"
as permissive
for delete
to authenticated
using (("user" = (auth.uid())::text));


create policy "unp_insert_self"
on "public"."user_notification_preferences"
as permissive
for insert
to authenticated
with check (("user" = (auth.uid())::text));


create policy "unp_select_own"
on "public"."user_notification_preferences"
as permissive
for select
to authenticated
using (("user" = (auth.uid())::text));


create policy "unp_update_own"
on "public"."user_notification_preferences"
as permissive
for update
to authenticated
using (("user" = (auth.uid())::text))
with check (("user" = (auth.uid())::text));


INSERT INTO "public"."notification_retention" ("tenant", "keep_unread_for", "keep_read_for", "keep_sent_outbox_for", "keep_revoked_sub_for") VALUES ('00000000-0000-0000-0000-000000000000', '180 days', '30 days', '7 days', '30 days') ON CONFLICT DO NOTHING;