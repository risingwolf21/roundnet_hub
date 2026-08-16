alter table public.drink
add column id_uuid uuid not null default gen_random_uuid ();

alter table public.history
add column drink_uuid uuid;

drop view distinct_drinks;

alter table public.drink
drop column "previousDrink";

update public.history h
set
  drink_uuid = d.id_uuid
from
  public.drink d
where
  h.drink = d.id;

alter table public.history
alter column drink_uuid
set
  not null;

alter table public.history
drop constraint history_drink_fkey;

alter table public.drink
drop constraint drinks_pkey;

alter table public.history
drop column drink;

alter table public.drink
drop column id;

alter table public.history
rename column drink_uuid to drink;

alter table public.drink
rename column id_uuid to id;

alter table public.drink add constraint drinks_pkey primary key (id);

alter table public.history add constraint history_drink_fkey foreign key (drink) references public.drink (id);