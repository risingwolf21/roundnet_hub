-- Storage policies for the CI / local e2e stack ONLY (applied by playwright.yml after
-- `supabase start`; never a migration). The repo defines no storage policies — production has
-- them configured in the dashboard — so on a fresh stack every upload is refused (400).
-- These mirror what the app needs: each user manages files in their own folder of the public
-- `user` bucket (avatar upload: <user id>/<file>, see src/tanstack/user.ts).
drop policy if exists "e2e user bucket: own folder read" on storage.objects;
create policy "e2e user bucket: own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'user' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "e2e user bucket: own folder insert" on storage.objects;
create policy "e2e user bucket: own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'user' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "e2e user bucket: own folder update" on storage.objects;
create policy "e2e user bucket: own folder update" on storage.objects for update to authenticated
  using (bucket_id = 'user' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "e2e user bucket: own folder delete" on storage.objects;
create policy "e2e user bucket: own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'user' and (storage.foldername(name))[1] = auth.uid()::text);
