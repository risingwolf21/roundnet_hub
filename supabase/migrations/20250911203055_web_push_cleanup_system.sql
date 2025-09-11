create extension if not exists pg_cron;

revoke delete on table "public"."notification_outbox" from "authenticated";

revoke insert on table "public"."notification_outbox" from "authenticated";

revoke references on table "public"."notification_outbox" from "authenticated";

revoke select on table "public"."notification_outbox" from "authenticated";

revoke trigger on table "public"."notification_outbox" from "authenticated";

revoke truncate on table "public"."notification_outbox" from "authenticated";

revoke update on table "public"."notification_outbox" from "authenticated";

revoke delete on table "public"."notification_outbox_targets" from "authenticated";

revoke insert on table "public"."notification_outbox_targets" from "authenticated";

revoke references on table "public"."notification_outbox_targets" from "authenticated";

revoke select on table "public"."notification_outbox_targets" from "authenticated";

revoke trigger on table "public"."notification_outbox_targets" from "authenticated";

revoke truncate on table "public"."notification_outbox_targets" from "authenticated";

revoke update on table "public"."notification_outbox_targets" from "authenticated";

create table "public"."notification_retention" (
    "tenant" uuid not null,
    "keep_unread_for" interval not null default '180 days'::interval,
    "keep_read_for" interval not null default '30 days'::interval,
    "keep_sent_outbox_for" interval not null default '7 days'::interval,
    "keep_revoked_sub_for" interval not null default '30 days'::interval
);


CREATE INDEX idx_notif_read_created ON public.notifications USING btree (read_at, created_at) WHERE (read_at IS NOT NULL);

CREATE INDEX idx_outbox_status_attempt ON public.notification_outbox USING btree (status, next_attempt_at);

CREATE INDEX idx_targets_status_attempt ON public.notification_outbox_targets USING btree (status, next_attempt_at);

CREATE INDEX idx_wps_revoked ON public.web_push_subscriptions USING btree (revoked_at) WHERE (revoked_at IS NOT NULL);

CREATE UNIQUE INDEX notification_retention_pkey ON public.notification_retention USING btree (tenant);

alter table "public"."notification_retention" add constraint "notification_retention_pkey" PRIMARY KEY using index "notification_retention_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_all_notifications()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_notif int;
  v_t int; v_o int;
  v_subs int;
begin
  v_notif := public.cleanup_notifications();
  select deleted_targets, deleted_outbox into v_t, v_o from public.cleanup_outbox();
  v_subs  := public.cleanup_revoked_subscriptions();

  return jsonb_build_object(
    'deleted_notifications', v_notif,
    'deleted_targets', v_t,
    'deleted_outbox', v_o,
    'deleted_revoked_subscriptions', v_subs
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_deleted int := 0;
  v_keep_read interval;
begin
  select keep_read_for into v_keep_read
  from public.notification_retention
  where tenant = '00000000-0000-0000-0000-000000000000';

  delete from public.notifications n
   where (n.read_at is not null and n.created_at < now() - coalesce(v_keep_read, interval '30 days'))
      or (n.expires_at is not null and n.expires_at < now());

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_outbox()
 RETURNS TABLE(deleted_targets integer, deleted_outbox integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_keep_sent interval;
  v_del_t int := 0;
  v_del_o int := 0;
begin
  select keep_sent_outbox_for into v_keep_sent
  from public.notification_retention
  where tenant = '00000000-0000-0000-0000-000000000000';

  -- alte erfolgreiche Targets weg
  delete from public.notification_outbox_targets t
   using public.notification_outbox o
   where t.outbox_id = o.id
     and t.status in ('sent','skipped')
     and o.sent_at is not null
     and o.sent_at < now() - coalesce(v_keep_sent, interval '7 days');
  get diagnostics v_del_t = row_count;

  -- alte erfolgreiche Outbox wegräumen (wenn keine Targets mehr)
  delete from public.notification_outbox o
   where o.status in ('sent','dead')
     and o.sent_at is not null
     and o.sent_at < now() - coalesce(v_keep_sent, interval '7 days');
  get diagnostics v_del_o = row_count;

  return query select v_del_t, v_del_o;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_revoked_subscriptions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_keep_rev interval;
  v_deleted int := 0;
begin
  select keep_revoked_sub_for into v_keep_rev
  from public.notification_retention
  where tenant = '00000000-0000-0000-0000-000000000000';

  delete from public.web_push_subscriptions
   where revoked_at is not null
     and revoked_at < now() - coalesce(v_keep_rev, interval '30 days');

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$
;

grant delete on table "public"."notification_retention" to "anon";

grant insert on table "public"."notification_retention" to "anon";

grant references on table "public"."notification_retention" to "anon";

grant select on table "public"."notification_retention" to "anon";

grant trigger on table "public"."notification_retention" to "anon";

grant truncate on table "public"."notification_retention" to "anon";

grant update on table "public"."notification_retention" to "anon";

grant delete on table "public"."notification_retention" to "authenticated";

grant insert on table "public"."notification_retention" to "authenticated";

grant references on table "public"."notification_retention" to "authenticated";

grant select on table "public"."notification_retention" to "authenticated";

grant trigger on table "public"."notification_retention" to "authenticated";

grant truncate on table "public"."notification_retention" to "authenticated";

grant update on table "public"."notification_retention" to "authenticated";

grant delete on table "public"."notification_retention" to "service_role";

grant insert on table "public"."notification_retention" to "service_role";

grant references on table "public"."notification_retention" to "service_role";

grant select on table "public"."notification_retention" to "service_role";

grant trigger on table "public"."notification_retention" to "service_role";

grant truncate on table "public"."notification_retention" to "service_role";

grant update on table "public"."notification_retention" to "service_role";


