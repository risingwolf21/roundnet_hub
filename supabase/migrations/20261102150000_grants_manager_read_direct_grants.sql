-- Rights managers (grants.manage) may write direct grants through grant_user_grants /
-- revoke_user_grants (SECURITY DEFINER, checks supabase.admin OR grants.manage), but RLS only
-- let supabase.admin read other users' rows. So /admin/grants (gated on grants.manage) showed a
-- manager only their own entry, opened every user with no current grants and made revoking
-- impossible. Let grants.manage read all direct grants — the same set it can already change.
drop policy if exists "udg_grants_manager_read" on "public"."user_direct_grants";
create policy "udg_grants_manager_read"
  on "public"."user_direct_grants"
  as permissive
  for select
  to authenticated
  using ((select public.authorize('grants.manage'::text)));
