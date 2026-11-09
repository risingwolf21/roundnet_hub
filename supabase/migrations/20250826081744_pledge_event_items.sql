create table "public"."event_bring_items" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "event" uuid not null,
    "name" text not null,
    "unit" text not null default 'Stk'::text,
    "required_qty" numeric not null,
    "notes" text,
    "sort_order" integer not null default 0,
    "created_by" text not null default (auth.uid())::text
);


alter table "public"."event_bring_items" enable row level security;

create table "public"."event_bring_pledges" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "event" uuid not null,
    "item" uuid not null,
    "user_id" text not null,
    "qty" numeric not null,
    "status" text not null default 'pledged'::text,
    "notes" text
);


alter table "public"."event_bring_pledges" enable row level security;

alter table "public"."events" add column "items_enabled" boolean not null default false;

CREATE UNIQUE INDEX event_bring_items_event_name_key ON public.event_bring_items USING btree (event, name);

CREATE UNIQUE INDEX event_bring_items_pkey ON public.event_bring_items USING btree (id);

CREATE UNIQUE INDEX event_bring_pledges_item_user_id_key ON public.event_bring_pledges USING btree (item, user_id);

CREATE UNIQUE INDEX event_bring_pledges_pkey ON public.event_bring_pledges USING btree (id);

CREATE INDEX idx_event_bring_items_event ON public.event_bring_items USING btree (event);

CREATE INDEX idx_event_bring_pledges_event ON public.event_bring_pledges USING btree (event);

CREATE INDEX idx_event_bring_pledges_item ON public.event_bring_pledges USING btree (item);

CREATE INDEX idx_event_bring_pledges_user ON public.event_bring_pledges USING btree (user_id);

alter table "public"."event_bring_items" add constraint "event_bring_items_pkey" PRIMARY KEY using index "event_bring_items_pkey";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_pkey" PRIMARY KEY using index "event_bring_pledges_pkey";

alter table "public"."event_bring_items" add constraint "event_bring_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES "user"("userId") ON DELETE SET NULL not valid;

alter table "public"."event_bring_items" validate constraint "event_bring_items_created_by_fkey";

alter table "public"."event_bring_items" add constraint "event_bring_items_event_fkey" FOREIGN KEY (event) REFERENCES events(id) ON DELETE CASCADE not valid;

alter table "public"."event_bring_items" validate constraint "event_bring_items_event_fkey";

alter table "public"."event_bring_items" add constraint "event_bring_items_event_name_key" UNIQUE using index "event_bring_items_event_name_key";

alter table "public"."event_bring_items" add constraint "event_bring_items_required_qty_check" CHECK ((required_qty >= (0)::numeric)) not valid;

alter table "public"."event_bring_items" validate constraint "event_bring_items_required_qty_check";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_event_fkey" FOREIGN KEY (event) REFERENCES events(id) ON DELETE CASCADE not valid;

alter table "public"."event_bring_pledges" validate constraint "event_bring_pledges_event_fkey";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_item_fkey" FOREIGN KEY (item) REFERENCES event_bring_items(id) ON DELETE CASCADE not valid;

alter table "public"."event_bring_pledges" validate constraint "event_bring_pledges_item_fkey";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_item_user_id_key" UNIQUE using index "event_bring_pledges_item_user_id_key";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_qty_check" CHECK ((qty > (0)::numeric)) not valid;

alter table "public"."event_bring_pledges" validate constraint "event_bring_pledges_qty_check";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_status_check" CHECK ((status = ANY (ARRAY['pledged'::text, 'fulfilled'::text, 'cancelled'::text]))) not valid;

alter table "public"."event_bring_pledges" validate constraint "event_bring_pledges_status_check";

alter table "public"."event_bring_pledges" add constraint "event_bring_pledges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "user"("userId") ON DELETE CASCADE not valid;

alter table "public"."event_bring_pledges" validate constraint "event_bring_pledges_user_id_fkey";

set check_function_bodies = off;

create or replace view "public"."event_bring_overview" as  SELECT i.event,
    i.id AS item_id,
    i.name,
    i.unit,
    i.required_qty,
    COALESCE(sum(
        CASE
            WHEN (p.status = ANY (ARRAY['pledged'::text, 'fulfilled'::text])) THEN p.qty
            ELSE (0)::numeric
        END), (0)::numeric) AS pledged_qty,
    (i.required_qty - COALESCE(sum(
        CASE
            WHEN (p.status = ANY (ARRAY['pledged'::text, 'fulfilled'::text])) THEN p.qty
            ELSE (0)::numeric
        END), (0)::numeric)) AS remaining_qty
   FROM (event_bring_items i
     LEFT JOIN event_bring_pledges p ON ((p.item = i.id)))
  GROUP BY i.event, i.id, i.name, i.unit, i.required_qty;


CREATE OR REPLACE FUNCTION public.trg_check_item_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_required numeric;
  v_sum      numeric;
  v_new_qty  numeric;
BEGIN
  SELECT required_qty INTO v_required FROM public.event_bring_items WHERE id = NEW.item;
  IF v_required IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  -- Bestandsaufnahme nur aus pledges, die nicht 'cancelled' sind
  SELECT COALESCE(SUM(qty),0) INTO v_sum
  FROM public.event_bring_pledges
  WHERE item = NEW.item
    AND status IN ('pledged','fulfilled')
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'); -- beim UPDATE die eigene Zeile ausnehmen

  v_new_qty := CASE WHEN NEW.status IN ('pledged','fulfilled') THEN COALESCE(NEW.qty,0) ELSE 0 END;

  IF v_sum + v_new_qty > v_required THEN
    RAISE EXCEPTION 'Capacity exceeded: required=%, current=%, new=%', v_required, v_sum, v_new_qty;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_sync_pledge_event_from_item()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE v_event uuid;
BEGIN
  SELECT i.event INTO v_event FROM public.event_bring_items i WHERE i.id = NEW.item;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Unknown item referenced';
  END IF;
  NEW.event := v_event;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."event_bring_items" to "anon";

grant insert on table "public"."event_bring_items" to "anon";

grant references on table "public"."event_bring_items" to "anon";

grant select on table "public"."event_bring_items" to "anon";

grant trigger on table "public"."event_bring_items" to "anon";

grant truncate on table "public"."event_bring_items" to "anon";

grant update on table "public"."event_bring_items" to "anon";

grant delete on table "public"."event_bring_items" to "authenticated";

grant insert on table "public"."event_bring_items" to "authenticated";

grant references on table "public"."event_bring_items" to "authenticated";

grant select on table "public"."event_bring_items" to "authenticated";

grant trigger on table "public"."event_bring_items" to "authenticated";

grant truncate on table "public"."event_bring_items" to "authenticated";

grant update on table "public"."event_bring_items" to "authenticated";

grant delete on table "public"."event_bring_items" to "service_role";

grant insert on table "public"."event_bring_items" to "service_role";

grant references on table "public"."event_bring_items" to "service_role";

grant select on table "public"."event_bring_items" to "service_role";

grant trigger on table "public"."event_bring_items" to "service_role";

grant truncate on table "public"."event_bring_items" to "service_role";

grant update on table "public"."event_bring_items" to "service_role";

grant delete on table "public"."event_bring_pledges" to "anon";

grant insert on table "public"."event_bring_pledges" to "anon";

grant references on table "public"."event_bring_pledges" to "anon";

grant select on table "public"."event_bring_pledges" to "anon";

grant trigger on table "public"."event_bring_pledges" to "anon";

grant truncate on table "public"."event_bring_pledges" to "anon";

grant update on table "public"."event_bring_pledges" to "anon";

grant delete on table "public"."event_bring_pledges" to "authenticated";

grant insert on table "public"."event_bring_pledges" to "authenticated";

grant references on table "public"."event_bring_pledges" to "authenticated";

grant select on table "public"."event_bring_pledges" to "authenticated";

grant trigger on table "public"."event_bring_pledges" to "authenticated";

grant truncate on table "public"."event_bring_pledges" to "authenticated";

grant update on table "public"."event_bring_pledges" to "authenticated";

grant delete on table "public"."event_bring_pledges" to "service_role";

grant insert on table "public"."event_bring_pledges" to "service_role";

grant references on table "public"."event_bring_pledges" to "service_role";

grant select on table "public"."event_bring_pledges" to "service_role";

grant trigger on table "public"."event_bring_pledges" to "service_role";

grant truncate on table "public"."event_bring_pledges" to "service_role";

grant update on table "public"."event_bring_pledges" to "service_role";

create policy "bring_items_select_if_group_and_enabled"
on "public"."event_bring_items"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_items.event) AND (gum."user" = (auth.uid())::text) AND (e.items_enabled = true)))));


create policy "bring_items_write_if_group_admin_or_role"
on "public"."event_bring_items"
as permissive
for all
to authenticated
using (((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_items.event) AND (gum."user" = (auth.uid())::text)))) AND (EXISTS ( SELECT 1
   FROM "user" u
  WHERE ((u."userId" = (auth.uid())::text) AND (u.role = ANY (ARRAY['admin'::"UserRole", 'trainer'::"UserRole", 'procure'::"UserRole"])))))))
with check ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_items.event) AND (gum."user" = (auth.uid())::text)))));


create policy "bring_pledges_delete_owner_or_admin"
on "public"."event_bring_pledges"
as permissive
for delete
to authenticated
using (((user_id = (auth.uid())::text) OR ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_pledges.event) AND (gum."user" = (auth.uid())::text)))) AND (EXISTS ( SELECT 1
   FROM "user" u
  WHERE ((u."userId" = (auth.uid())::text) AND (u.role = ANY (ARRAY['admin'::"UserRole", 'trainer'::"UserRole", 'procure'::"UserRole"]))))))));


create policy "bring_pledges_insert_self"
on "public"."event_bring_pledges"
as permissive
for insert
to authenticated
with check ((((auth.uid())::text = user_id) AND (EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_pledges.event) AND (gum."user" = (auth.uid())::text) AND (e.items_enabled = true))))));


create policy "bring_pledges_select_if_group_and_enabled"
on "public"."event_bring_pledges"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_pledges.event) AND (gum."user" = (auth.uid())::text) AND (e.items_enabled = true)))));


create policy "bring_pledges_update_delete_owner_or_admin"
on "public"."event_bring_pledges"
as permissive
for update
to authenticated
using (((user_id = (auth.uid())::text) OR ((EXISTS ( SELECT 1
   FROM (events e
     JOIN group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_bring_pledges.event) AND (gum."user" = (auth.uid())::text)))) AND (EXISTS ( SELECT 1
   FROM "user" u
  WHERE ((u."userId" = (auth.uid())::text) AND (u.role = ANY (ARRAY['admin'::"UserRole", 'trainer'::"UserRole", 'procure'::"UserRole"]))))))));


CREATE TRIGGER t_check_capacity_ins BEFORE INSERT ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_check_item_capacity();

CREATE TRIGGER t_check_capacity_upd BEFORE UPDATE OF qty, status ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_check_item_capacity();

CREATE TRIGGER t_set_updated_at BEFORE UPDATE ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER t_sync_event BEFORE INSERT OR UPDATE OF item ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_sync_pledge_event_from_item();

drop trigger if exists "t_check_capacity_ins" on "public"."event_bring_pledges";

drop trigger if exists "t_check_capacity_upd" on "public"."event_bring_pledges";

CREATE TRIGGER t_check_capacity_ins BEFORE INSERT ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_check_item_capacity();
ALTER TABLE "public"."event_bring_pledges" DISABLE TRIGGER "t_check_capacity_ins";

CREATE TRIGGER t_check_capacity_upd BEFORE UPDATE OF qty, status ON public.event_bring_pledges FOR EACH ROW EXECUTE FUNCTION trg_check_item_capacity();
ALTER TABLE "public"."event_bring_pledges" DISABLE TRIGGER "t_check_capacity_upd";

grant select on table games."players_public" to authenticated;

drop view games."user_matches";

create view games."user_matches" as
select
  g.id,
  g.created_at,
  t1.name as team_a_name,
  t1.player_1 as team_a_player_1,
  t1.player_2 as team_a_player_2,
  t2.name as team_b_name,
  t2.player_1 as team_b_player_1,
  t2.player_2 as team_b_player_2,
  g.rated,
  string_agg(
    (s.team_a_score::text || ':'::text) || s.team_b_score::text,
    ', '::text
  ) as set_results
from
  games.match g
  left join games.teams t1 on g.team_a = t1.id
  left join games.teams t2 on g.team_b = t2.id
  left join games.sets s on g.id = s.match
where
  t1.player_1 = auth.uid ()::text
  or t1.player_2 = auth.uid ()::text
  or t2.player_1 = auth.uid ()::text
  or t2.player_2 = auth.uid ()::text
group by
  g.id,
  g.created_at,
  t1.name,
  t1.player_1,
  t1.player_2,
  t2.name,
  t2.player_1,
  t2.player_2;