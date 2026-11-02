-- games.sets lost its INSERT policy: 20260319133001 dropped sets_insert_if_participant_or_admin
-- and 20260419134700 dropped the catch-all "Allow everything when user has permission
-- games.update.score …" without a replacement. Since then nobody but the service role could
-- correct a match's sets: "Sätze bearbeiten" saves with an upsert, which needs INSERT rights even
-- for existing rows, and failed with "new row violates row-level security policy".
-- Same rule as the existing UPDATE/DELETE policies: match participant or games.admin.
drop policy if exists "sets_insert_if_participant_or_admin" on "games"."sets";
create policy "sets_insert_if_participant_or_admin"
  on "games"."sets"
  as permissive
  for insert
  to authenticated
  with check ((games.is_match_participant(match) OR authorize('games.admin'::text)));
