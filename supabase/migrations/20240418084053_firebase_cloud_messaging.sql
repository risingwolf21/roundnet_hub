alter table "public"."user"
    add column "fcm_token" text;

create table
    public.notifications
(
    id    uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    body       text                     not null default ''::text,
    title text not null default ''::text,
    "user"     text null,
    constraint notifications_pkey primary key (id),
    constraint public_notifications_user_fkey foreign key ("user") references "user" ("userId") on update cascade on delete cascade
) tablespace pg_default;

create
policy "Allow all" on "public"."notifications" as permissive for all to public using (true);

alter table
    "public"."notifications" enable row level security;

create
or replace function public.handle_new_user_notification () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
insert into public.notifications (body, "user", title)
select concat(new."displayName", ' hat sich neu registriert!') as body,
       "userId"                                                as "user",
       'Roundnet Karlsruhe App'                                as title
from public."user"
where 'userRegistration' = ANY ("notifications")
  and fcm_token is not null;
return new;
end;
$$;
create trigger on_auth_user_created_notification
    after insert
    on public.user
    for each row execute procedure public.handle_new_user_notification();