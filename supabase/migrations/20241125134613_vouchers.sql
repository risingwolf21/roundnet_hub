create table
    public.vouchers
(
    id               uuid                     not null default gen_random_uuid(),
    created_at       timestamp with time zone not null default now(),
    "user"           text                     null,
    remaining_drinks numeric                  not null default '0'::numeric,
    constraint vouchers_pkey primary key (id),
    constraint vouchers_id_key unique (id),
    constraint vouchers_user_fkey foreign key ("user") references "user" ("userId") on update cascade on delete cascade
) tablespace pg_default;