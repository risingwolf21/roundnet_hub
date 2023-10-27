create table public.user_new (
    created_at timestamp with time zone null default now(),
    "displayName" text null,
    email text null,
    role text not null default 'user' :: text,
    "userId" text not null default '' :: text
) tablespace pg_default;

alter table
    public.user_new
add
    constraint users_new_pkey primary key ("userId");

alter table
    public.user_new
add
    constraint users_new_userId_key unique ("userId");