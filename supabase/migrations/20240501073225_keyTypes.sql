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


drop trigger key_history_trigger on public.key_holders;

drop table public.key_holders;

alter table public.keys
    rename to "items";

alter table public."key_history"
    rename to "item_history";

alter function "add_key_history_entry" rename to "add_item_history_entry";

create or replace function public.add_item_history_entry() returns trigger
    language plpgsql as
$$
begin
    insert into item_history("pastUser", "currentUser", key)
    values (old."current_holder", new."current_holder", new.id);
    return new;
end;
$$;

create or replace trigger "item_history_trigger"
    after update
    on public.items
    for each row
execute function public.add_item_history_entry();

