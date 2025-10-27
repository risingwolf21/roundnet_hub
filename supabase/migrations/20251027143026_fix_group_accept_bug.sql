drop policy "admin_all" on "audit"."log";

create policy "admin_all"
on "audit"."log"
as permissive
for all
to public
using ((( SELECT is_app_client() AS is_app_client) AND ( SELECT authorize('supabase.admin'::text) AS authorize)))
with check ((( SELECT is_app_client() AS is_app_client) AND ( SELECT authorize('supabase.admin'::text) AS authorize)));

drop policy "Update group user mapping when admin of group" on "public"."group_user_mapping";

create policy "Update group user mapping when admin of group"
on "public"."group_user_mapping"
as permissive
for update
to public
using (is_user_admin_in_group("group"));



