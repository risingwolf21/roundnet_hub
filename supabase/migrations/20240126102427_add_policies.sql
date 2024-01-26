create policy "Enable access for all users" on "public"."drink" as permissive for all to authenticated using (true) with check (true);

create policy "Enable access for all users" on "public"."event_attendance_user_mapping" as permissive for all to public using (true);

create policy "Enable read access for all users" on "public"."event_comments" as permissive for all to authenticated using (true) with check (true);

create policy "Allow all" on "public"."event_group" as permissive for all to public using (true);

create policy "Enable access for all users" on "public"."events" as permissive for all to public using (true);

create policy "Allow all" on "public"."group_user_mapping" as permissive for all to authenticated using (true);

create policy "Enable access for all users" on "public"."history" as permissive for all to authenticated using (true);

create policy "Allow everything" on "public"."key_holders" as permissive for all to authenticated using (true) with check (true);

create policy "Allow everything" on "public"."keys" as permissive for all to authenticated using (true) with check (true);

create policy "Enable access for all users" on "public"."payments" as permissive for all to public using (true);

create policy "Enable access for all users" on "public"."user" as permissive for all to authenticated,
anon using (true);

alter table
    "public"."drink" enable row level security;

alter table
    "public"."event_attendance_user_mapping" enable row level security;

alter table
    "public"."event_comments" enable row level security;

alter table
    "public"."event_group" enable row level security;

alter table
    "public"."events" enable row level security;

alter table
    "public"."group_user_mapping" enable row level security;

alter table
    "public"."history" enable row level security;

alter table
    "public"."key_holders" enable row level security;

alter table
    "public"."keys" enable row level security;

alter table
    "public"."payments" enable row level security;

alter table
    "public"."user" enable row level security;