create table public.user (
    created_at timestamp with time zone null default now(),
    displayName text null,
    email text null,
    role text not null default 'user' :: text,
    "userId" text not null default '' :: text
) tablespace pg_default;

alter table
    public.user
add
    constraint users_pkey primary key ("userId");

alter table
    public.user
add
    constraint users_userId_key unique ("userId");