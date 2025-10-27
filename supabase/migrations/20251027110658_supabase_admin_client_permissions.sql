set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_app_client()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(current_setting('request.header.x-app-client', true), '') IN ('1','true','TRUE');
$function$
;

create policy "admin_all"
on "audit"."log"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));



create policy "admin_all"
on "games"."elo_calc_log"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "games"."elo_config"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "games"."elo_history"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "games"."match"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "games"."players"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "games"."sets"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "games"."teams"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."challenge"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."challenge_stats"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."drink"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."event_attendance_user_mapping"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."event_bring_items"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."event_bring_pledges"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."event_comments"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."event_group"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."events"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."features"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."group_features"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."group_permissions"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."group_user_mapping"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."history"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."item_history"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."items"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."notification_outbox"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."notification_outbox_targets"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."notification_retention"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."notification_topics"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."notifications"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."object_subscriptions"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."payments"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."permissions"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."user"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."user_activity"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."user_direct_grants"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."user_grants"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."user_notification_preferences"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."vouchers"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));


create policy "admin_all"
on "public"."web_push_subscriptions"
as permissive
for all
to public
using ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()))
with check ((( SELECT authorize('supabase.admin'::text) AS authorize) AND is_app_client()));



