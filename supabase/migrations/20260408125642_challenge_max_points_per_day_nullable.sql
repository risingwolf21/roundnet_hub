alter table "public"."challenge"
alter column "max_points_per_day"
drop not null;

alter table "public"."challenge" add constraint "challenge_max_points_per_week_check" CHECK ((max_points_per_week >= 0)) not valid;

alter table "public"."challenge" validate constraint "challenge_max_points_per_week_check";