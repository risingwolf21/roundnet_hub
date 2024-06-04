create type public."ItemType" as enum ('mtvStorage', 'mtvGym', 'mtvGymPalazzo');

alter table public.keys
    add column type public."ItemType" null;

alter table public.keys
    add column "lastUpdate" timestamp with time zone not null default now();

alter table public.keys
    add column current_holder text null;

alter table public.keys
    add constraint keys_user_fkey foreign key ("current_holder") references "user" ("userId");

insert into public.keys (current_holder, id)
select "user", "key"
from key_holders
on conflict (id) do update set current_holder = null;

alter table public.events
    add column required_item public."ItemType" null;