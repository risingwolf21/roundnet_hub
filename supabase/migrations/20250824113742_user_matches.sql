drop view if exists "games"."user_matches";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.add_match_with_sets(player_1a text, player_2a text, player_1b text, player_2b text, team_a text, team_b text, match_sets json, event uuid DEFAULT NULL::uuid, created_by text DEFAULT NULL::text, rated boolean DEFAULT NULL::boolean)
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

  INSERT INTO games.match (team_a, team_b, event, created_by, rated) values (team_a_id, team_b_id, event, created_by, rated) returning id into match_id;

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

create or replace view "games"."user_matches" as  SELECT g.id,
    g.created_at,
    t1.name AS team_a_name,
    t1.player_1 AS team_a_player_1,
    t1.player_2 AS team_a_player_2,
    t2.name AS team_b_name,
    t2.player_1 AS team_b_player_1,
    t2.player_2 AS team_b_player_2,
    g.rated,
    string_agg((((s.team_a_score)::text || ':'::text) || (s.team_b_score)::text), ', '::text) AS set_results
   FROM (((games.match g
     LEFT JOIN games.teams t1 ON ((g.team_a = t1.id)))
     LEFT JOIN games.teams t2 ON ((g.team_b = t2.id)))
     LEFT JOIN games.sets s ON ((g.id = s.match)))
  WHERE ((t1.player_1 = (auth.uid())::text) OR (t1.player_2 = (auth.uid())::text) OR (t2.player_1 = (auth.uid())::text) OR (t2.player_2 = (auth.uid())::text))
  GROUP BY g.id, g.created_at, t1.name, t1.player_1, t1.player_2, t2.name, t2.player_1, t2.player_2;



GRANT USAGE ON SCHEMA games TO authenticated;
GRANT SELECT ON TABLE games.user_matches TO authenticated;

-- 1) Basistabellen-Grants (RLS entscheidet später trotzdem)
GRANT SELECT ON TABLE games.match TO authenticated;
GRANT SELECT ON TABLE games.teams TO authenticated;
GRANT SELECT ON TABLE games.sets  TO authenticated;