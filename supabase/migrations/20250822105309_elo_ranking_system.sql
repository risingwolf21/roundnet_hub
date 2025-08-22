drop policy "match_select_if_participant" on "games"."match";

create table "games"."elo_calc_log" (
    "match" uuid not null,
    "calculated_at" timestamp with time zone not null default now(),
    "eff_team_a" numeric not null,
    "eff_team_b" numeric not null,
    "expected_a" numeric not null,
    "expected_b" numeric not null,
    "k_base" integer not null,
    "k_eff" numeric not null,
    "category_a" text not null,
    "category_b" text not null,
    "upset_levels" integer not null,
    "upset_multiplier" numeric not null,
    "outcome_a" numeric not null,
    "sets_a" integer not null,
    "sets_b" integer not null,
    "points_a" integer not null,
    "points_b" integer not null
);


alter table "games"."elo_calc_log" enable row level security;

create table "games"."elo_config" (
    "id" integer not null default 1,
    "w_rg" numeric not null default 0.5,
    "w_ka" numeric not null default 0.5,
    "rg_offset" numeric not null default 0,
    "rg_scale" numeric not null default 1,
    "k_factor" integer not null default 32,
    "men_offset" numeric not null default 0,
    "mixed_offset" numeric not null default '-50'::integer,
    "women_offset" numeric not null default '-100'::integer,
    "upset_bonus_per_level" numeric not null default 0.15
);


create table "games"."elo_history" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "match" uuid not null,
    "user" text not null,
    "old_rating" numeric not null,
    "new_rating" numeric not null,
    "delta" numeric not null
);


alter table "games"."elo_history" enable row level security;

alter table "games"."players" add column "effective_rating_cached" numeric not null default 1000;

alter table "games"."players" alter column "rg_index" drop default;

CREATE UNIQUE INDEX elo_calc_log_pkey ON games.elo_calc_log USING btree (match);

CREATE UNIQUE INDEX elo_config_pkey ON games.elo_config USING btree (id);

CREATE UNIQUE INDEX elo_history_pkey ON games.elo_history USING btree (id);

CREATE INDEX ix_elo_history_match ON games.elo_history USING btree (match);

alter table "games"."elo_calc_log" add constraint "elo_calc_log_pkey" PRIMARY KEY using index "elo_calc_log_pkey";

alter table "games"."elo_config" add constraint "elo_config_pkey" PRIMARY KEY using index "elo_config_pkey";

alter table "games"."elo_history" add constraint "elo_history_pkey" PRIMARY KEY using index "elo_history_pkey";

alter table "games"."elo_calc_log" add constraint "elo_calc_log_match_fkey" FOREIGN KEY (match) REFERENCES games.match(id) ON DELETE CASCADE not valid;

alter table "games"."elo_calc_log" validate constraint "elo_calc_log_match_fkey";

alter table "games"."elo_history" add constraint "elo_history_match_fkey" FOREIGN KEY (match) REFERENCES games.match(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "games"."elo_history" validate constraint "elo_history_match_fkey";

alter table "games"."elo_history" add constraint "elo_history_user_fkey" FOREIGN KEY ("user") REFERENCES "user"("userId") ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "games"."elo_history" validate constraint "elo_history_user_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.apply_elo_for_match(p_match uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$DECLARE
  cfg record;
  m_team_a uuid; m_team_b uuid;
  a1 text; a2 text; b1 text; b2 text;

  -- aktuelle KA-Indizes (nur fürs Logging)
  r_a1 numeric; r_a2 numeric; r_b1 numeric; r_b2 numeric;

  eff_a numeric; eff_b numeric;          -- effektive Teamratings (rg+ka + Kategorie-Offset)
  cat_a text; cat_b text;                 -- 'men' / 'mixed' / 'women'
  rank_a int; rank_b int;                 -- men=3, mixed=2, women=1

  a_sets int; b_sets int; a_pts int; b_pts int;
  outcome_a numeric; exp_a numeric; delta numeric; k_eff numeric;

  hist record;
BEGIN
  SELECT k_factor, upset_bonus_per_level INTO cfg
  FROM games.elo_config WHERE id=1;

  -- Match + Teams
  SELECT team_a, team_b INTO m_team_a, m_team_b
  FROM games."match" WHERE id = p_match FOR UPDATE;

  SELECT t.player_1, t.player_2 INTO a1, a2 FROM games.teams t WHERE t.id = m_team_a;
  SELECT t.player_1, t.player_2 INTO b1, b2 FROM games.teams t WHERE t.id = m_team_b;

  -- idempotent: Deltas zurückrollen & löschen
  FOR hist IN SELECT * FROM games.elo_history WHERE match=p_match LOOP
    UPDATE games.players SET ka_index = ka_index - hist.delta WHERE player = hist."user";
  END LOOP;
  DELETE FROM games.elo_history WHERE match=p_match;

  INSERT INTO games.players(player) VALUES (a1) ON CONFLICT DO NOTHING;
  INSERT INTO games.players(player) VALUES (a2) ON CONFLICT DO NOTHING;
  INSERT INTO games.players(player) VALUES (b1) ON CONFLICT DO NOTHING;
  INSERT INTO games.players(player) VALUES (b2) ON CONFLICT DO NOTHING;

  -- aktueller KA-Wert, NICHT effective rating:
  SELECT COALESCE(ka_index, 1000) INTO r_a1 FROM games.players WHERE player = a1;
  SELECT COALESCE(ka_index, 1000) INTO r_a2 FROM games.players WHERE player = a2;
  SELECT COALESCE(ka_index, 1000) INTO r_b1 FROM games.players WHERE player = b1;
  SELECT COALESCE(ka_index, 1000) INTO r_b2 FROM games.players WHERE player = b2;

  -- Effektive Teamratings inkl. Kategorie
  eff_a := games.effective_team_rating_with_category(a1,a2);
  eff_b := games.effective_team_rating_with_category(b1,b2);

  -- Kategorien & Ränge (men=3, mixed=2, women=1)
  cat_a := games.team_category(a1,a2);
  cat_b := games.team_category(b1,b2);
  rank_a := CASE cat_a WHEN 'men' THEN 3 WHEN 'mixed' THEN 2 ELSE 1 END;
  rank_b := CASE cat_b WHEN 'men' THEN 3 WHEN 'mixed' THEN 2 ELSE 1 END;

  -- Ergebnis aus Sets (Siege, Punkte als Tie-Breaker)
  SELECT
    SUM(CASE WHEN s.team_a_score > s.team_b_score THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN s.team_b_score > s.team_a_score THEN 1 ELSE 0 END)::int,
    COALESCE(SUM(s.team_a_score),0)::int,
    COALESCE(SUM(s.team_b_score),0)::int
  INTO a_sets, b_sets, a_pts, b_pts
  FROM games.sets s WHERE s.match = p_match;

  IF COALESCE(a_sets,0)+COALESCE(b_sets,0)=0 AND COALESCE(a_pts,0)+COALESCE(b_pts,0)=0 THEN
    RETURN;
  END IF;

  IF a_sets > b_sets THEN outcome_a := 1.0;
  ELSIF a_sets < b_sets THEN outcome_a := 0.0;
  ELSE
    IF a_pts > b_pts THEN outcome_a := 1.0;
    ELSIF a_pts < b_pts THEN outcome_a := 0.0;
    ELSE outcome_a := 0.5;
    END IF;
  END IF;

  -- Erwartung mit Kategorie-Offsets
  exp_a := 1.0 / (1.0 + POWER(10.0, (eff_b - eff_a)/400.0));

  -- Optionaler Upset-Bonus, wenn "schwächerer" Kategorie-Rang gewinnt
   k_eff := cfg.k_factor;
  if (rank_a < rank_b and outcome_a = 1.0) then
    k_eff := cfg.k_factor * (1 + cfg.upset_bonus_per_level * (rank_b - rank_a));
  elsif (rank_b < rank_a and outcome_a = 0.0) then
    k_eff := cfg.k_factor * (1 + cfg.upset_bonus_per_level * (rank_a - rank_b));
  end if;

  delta := k_eff * (outcome_a - exp_a);

  insert into games.elo_calc_log(
  match, calculated_at,
  eff_team_a, eff_team_b,
  expected_a, expected_b,
  k_base, k_eff,
  category_a, category_b,
  upset_levels, upset_multiplier,
  outcome_a, sets_a, sets_b, points_a, points_b
)
values (
  p_match, now(),
  eff_a, eff_b,
  exp_a, 1 - exp_a,
  cfg.k_factor, k_eff,
  cat_a, cat_b,
  greatest(abs(rank_a - rank_b), 0),
  case
    when (rank_a < rank_b and outcome_a = 1.0) then k_eff::numeric / nullif(cfg.k_factor,0)
    when (rank_b < rank_a and outcome_a = 0.0) then k_eff::numeric / nullif(cfg.k_factor,0)
    else 1.0
  end,
  outcome_a, a_sets, b_sets, a_pts, b_pts
)
on conflict (match) do update set
  calculated_at = excluded.calculated_at,
  eff_team_a    = excluded.eff_team_a,
  eff_team_b    = excluded.eff_team_b,
  expected_a    = excluded.expected_a,
  expected_b    = excluded.expected_b,
  k_base        = excluded.k_base,
  k_eff         = excluded.k_eff,
  category_a    = excluded.category_a,
  category_b    = excluded.category_b,
  upset_levels  = excluded.upset_levels,
  upset_multiplier = excluded.upset_multiplier,
  outcome_a     = excluded.outcome_a,
  sets_a        = excluded.sets_a,
  sets_b        = excluded.sets_b,
  points_a      = excluded.points_a,
  points_b      = excluded.points_b;

  -- nur KA-Index anpassen + History
  UPDATE games.players SET ka_index = ka_index + delta WHERE player = a1;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta)
    VALUES (p_match, a1, r_a1, r_a1 + delta,  delta);

  UPDATE games.players SET ka_index = ka_index + delta WHERE player = a2;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta)
    VALUES (p_match, a2, r_a2, r_a2 + delta,  delta);

  UPDATE games.players SET ka_index = ka_index - delta WHERE player = b1;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta)
    VALUES (p_match, b1, r_b1, r_b1 - delta, -delta);

  UPDATE games.players SET ka_index = ka_index - delta WHERE player = b2;
  INSERT INTO games.elo_history(match,"user",old_rating,new_rating,delta)
    VALUES (p_match, b2, r_b2, r_b2 - delta, -delta);
END;$function$
;

CREATE OR REPLACE FUNCTION games.category_offset(p_cat text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE p_cat
           WHEN 'men'   THEN (SELECT men_offset   FROM games.elo_config WHERE id=1)
           WHEN 'women' THEN (SELECT women_offset FROM games.elo_config WHERE id=1)
           ELSE              (SELECT mixed_offset FROM games.elo_config WHERE id=1)
         END;
$function$
;

CREATE OR REPLACE FUNCTION games.compute_effective_player_from_values(ka numeric, rg numeric)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  with cfg as (select rg_offset, rg_scale from games.elo_config where id=1)
  select case
    when $1 is not null and $2 is not null then
      -- KA und kalibriertes RG mitteln
      ($1 + (c.rg_scale * ($2 - c.rg_offset))) / 2.0
    when $1 is not null then
      $1
    when $2 is not null then
      c.rg_scale * ($2 - c.rg_offset)
    else
      1000
  end
  from cfg c;
$function$
;

CREATE OR REPLACE FUNCTION games.effective_rating_for_player(p_player text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select games.compute_effective_player_from_values(p.ka_index, p.rg_index)
  from games.players p
  where p.player = p_player;
$function$
;

CREATE OR REPLACE FUNCTION games.effective_team_rating_with_category(p_p1 text, p_p2 text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  SELECT (games.effective_rating_for_player(p_p1)
        + games.effective_rating_for_player(p_p2))/2.0
       + games.category_offset(games.team_category(p_p1,p_p2));
$function$
;

CREATE OR REPLACE FUNCTION games.is_match_participant(p_match uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from games."match" m
    join games.teams ta on ta.id = m.team_a
    join games.teams tb on tb.id = m.team_b
    where m.id = p_match
      and auth.uid()::text in (ta.player_1, ta.player_2, tb.player_1, tb.player_2)
  );
$function$
;

CREATE OR REPLACE FUNCTION games.is_member_of_teams(p_team_a uuid, p_team_b uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1 from games.teams t
    where t.id in (p_team_a, p_team_b)
      and auth.uid()::text in (t.player_1, t.player_2)
  );
$function$
;

CREATE OR REPLACE FUNCTION games.preview_elo_for_match(p_match uuid)
 RETURNS TABLE(eff_team_a numeric, eff_team_b numeric, expected_a numeric, expected_b numeric, k_base integer, k_eff numeric, category_a text, category_b text, upset_levels integer, upset_multiplier numeric)
 LANGUAGE sql
 STABLE
AS $function$
  with cfg as (select * from games.elo_config where id=1),
  m as (select team_a, team_b from games."match" where id = p_match),
  t as (
    select
      (select player_1 from games.teams where id = m.team_a) as a1,
      (select player_2 from games.teams where id = m.team_a) as a2,
      (select player_1 from games.teams where id = m.team_b) as b1,
      (select player_2 from games.teams where id = m.team_b) as b2
    from m
  ),
  cat as (
    select
      games.team_category(t.a1,t.a2) as cat_a,
      games.team_category(t.b1,t.b2) as cat_b
    from t
  ),
  eff as (
    select
      games.effective_team_rating_with_category(t.a1,t.a2) as eff_a,
      games.effective_team_rating_with_category(t.b1,t.b2) as eff_b
    from t
  ),
  exp as (
    select
      1.0 / (1.0 + power(10.0, (eff.eff_b - eff.eff_a)/400.0)) as ea
    from eff
  )
  select
    eff.eff_a, eff.eff_b,
    exp.ea, 1-exp.ea,
    cfg.k_factor as k_base,
    cfg.k_factor::numeric as k_eff,  -- hier ohne Upset-Bonus (der hängt vom tatsächlichen Sieger ab)
    cat.cat_a, cat.cat_b,
    abs( (case cat.cat_a when 'men' then 3 when 'mixed' then 2 else 1 end)
        - (case cat.cat_b when 'men' then 3 when 'mixed' then 2 else 1 end) ) as upset_levels,
    1.0 as upset_multiplier
  from cfg, eff, exp, cat;
$function$
;

CREATE OR REPLACE FUNCTION games.recompute_all_effective_player_ratings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  UPDATE games.players p
  SET effective_rating_cached =
      games.compute_effective_player_from_values(p.ka_index, p.rg_index);
END;
$function$
;

CREATE OR REPLACE FUNCTION games.recompute_all_elo_from_scratch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE rec RECORD;
BEGIN
  -- nur der lokale Index wird zurückgesetzt
  UPDATE games.players SET ka_index = 1000;
  DELETE FROM games.elo_history;

  FOR rec IN
    SELECT m.id
    FROM games."match" m
    LEFT JOIN LATERAL (
      SELECT MIN(s.created_at) AS first_set_at
      FROM games.sets s WHERE s.match = m.id
    ) ss ON TRUE
    ORDER BY COALESCE(ss.first_set_at, m.created_at) NULLS LAST, m.id
  LOOP
    PERFORM games.apply_elo_for_match(rec.id);
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION games.team_category(p_p1 text, p_p2 text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$select case
    when coalesce((select gender from games.players where player=p_p1),'m')='m'
     and coalesce((select gender from games.players where player=p_p2),'m')='m'
      then 'men'
    when coalesce((select gender from games.players where player=p_p1),'w')='w'
     and coalesce((select gender from games.players where player=p_p2),'w')='w'
      then 'women'
    else 'mixed'
  end;$function$
;

CREATE OR REPLACE FUNCTION games.trg_on_elo_config_recompute()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  PERFORM games.recompute_all_effective_player_ratings();
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION games.trg_players_set_effective_cached()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.effective_rating_cached :=
    games.compute_effective_player_from_values(NEW.ka_index, NEW.rg_index);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION games.trg_recalc_match_elo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
begin
  perform games.apply_elo_for_match( case when tg_op = 'DELETE' then old.id else new.id end );
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION games.trg_recalc_sets_elo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  m uuid;
begin
  if tg_op in ('INSERT','UPDATE') then
    m := new.match;
  else
    m := old.match;
  end if;
  perform games.apply_elo_for_match(m);
  return null;
end;
$function$
;

grant select on table "games"."elo_calc_log" to "authenticated";

grant select on table "games"."elo_history" to "authenticated";

create policy "elo_calc_log_select_if_participant"
on "games"."elo_calc_log"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = elo_calc_log.match) AND (((((auth.uid())::text = ta.player_1) OR ((auth.uid())::text = ta.player_2)) OR ((auth.uid())::text = tb.player_1)) OR ((auth.uid())::text = tb.player_2))))));


create policy "el_history_if_participant"
on "games"."elo_history"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM ((games.match m
     JOIN games.teams ta ON ((ta.id = m.team_a)))
     JOIN games.teams tb ON ((tb.id = m.team_b)))
  WHERE ((m.id = elo_history.match) AND (((((auth.uid())::text = ta.player_1) OR ((auth.uid())::text = ta.player_2)) OR ((auth.uid())::text = tb.player_1)) OR ((auth.uid())::text = tb.player_2))))));


create policy "match_select_if_participant"
on "games"."match"
as permissive
for select
to authenticated
using (games.is_member_of_teams(team_a, team_b));


CREATE TRIGGER trg_on_elo_config_recompute AFTER UPDATE OF w_rg, w_ka, rg_offset, rg_scale ON games.elo_config FOR EACH ROW EXECUTE FUNCTION games.trg_on_elo_config_recompute();

CREATE TRIGGER trg_match_recalc_elo AFTER INSERT OR UPDATE OF team_a, team_b ON games.match FOR EACH ROW EXECUTE FUNCTION games.trg_recalc_match_elo();

CREATE TRIGGER trg_players_set_effective_cached BEFORE INSERT OR UPDATE OF ka_index, rg_index ON games.players FOR EACH ROW EXECUTE FUNCTION games.trg_players_set_effective_cached();

CREATE TRIGGER trg_sets_recalc_elo AFTER INSERT OR DELETE OR UPDATE OF team_a_score, team_b_score ON games.sets FOR EACH ROW EXECUTE FUNCTION games.trg_recalc_sets_elo();