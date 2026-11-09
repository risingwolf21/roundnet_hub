drop policy "Allow insert when userid in team or games.create permissions gr" on "games"."teams";

drop policy "Allow select when userid in team" on "games"."teams";

drop policy "Allow update when userid in team" on "games"."teams";

drop policy "Allow authorized insert access" on "games"."match";

CREATE UNIQUE INDEX teams_normalized_players_uidx ON games.teams USING btree (normalized_players);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(player_1a text, player_2a text, player_1b text, player_2b text, team_a text, team_b text, match_sets json, event uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$declare
  team_a_id uuid;
  team_b_id uuid;
  match_id uuid;
  set_count numeric := 1;
  set_record json;
  team_a_normalized text;
  team_b_normalized text;
BEGIN
  IF jsonb_typeof(match_sets::jsonb) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', match_sets;
  END IF;

  IF auth.uid()::text NOT IN (player_1a, player_2a, player_1b, player_2b) THEN
    raise exception 'Benutzer muss selbst in Match vorkommen';
  end if;

  team_a_normalized := 
    CASE 
      WHEN player_1a < player_2a THEN player_1a || ',' || player_2a
      ELSE player_2a || ',' || player_1a
    END;
  
  team_a_id := coalesce((
    select id from games.teams where normalized_players = team_a_normalized), gen_random_uuid());

  INSERT INTO games.teams (id, player_1, player_2, name, normalized_players)
  VALUES (team_a_id, player_1a, player_2a, team_a, team_a_normalized)
  ON CONFLICT (normalized_players) DO NOTHING;  

  team_b_normalized := 
    CASE 
      WHEN player_1b < player_2b THEN player_1b || ',' || player_2b
      ELSE player_2b || ',' || player_1b
    END;

  team_b_id := coalesce((
    select id from games.teams where normalized_players = team_b_normalized), gen_random_uuid());

  INSERT INTO games.teams (id, player_1, player_2, name, normalized_players)
  VALUES (team_b_id, player_1b, player_2b, team_b, team_b_normalized)
  ON CONFLICT (normalized_players) DO NOTHING;  

  INSERT INTO games.match (team_a, team_b, event) values (team_a_id, team_b_id, event) returning id into match_id;

  FOR set_record IN SELECT * FROM json_array_elements(match_sets)
  LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score) values(match_id, set_count, (set_record->>'team_a_score')::numeric, (set_record->>'team_b_score')::numeric);
    set_count := set_count + 1;
  END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Match: %', SQLERRM;
END;$function$
;

create policy "match_select_if_participant"
on "games"."match"
as permissive
for select
to public
using (true);


create policy "match_select_if_participant"
on "games"."sets"
as permissive
for select
to public
using (true);


create policy "teams_insert_all"
on "games"."teams"
as permissive
for insert
to authenticated
with check (true);


create policy "teams_select_self_or_public"
on "games"."teams"
as permissive
for select
to authenticated
using (true);


create policy "teams_update_all"
on "games"."teams"
as permissive
for update
to authenticated
using (true)
with check (true);


create policy "Allow authorized insert access"
on "games"."match"
as permissive
for insert
to public
with check (true);


drop FUNCTION public.add_match_with_sets;
