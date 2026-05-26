drop view if exists "games"."user_matches";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION games.recompute_all_elo_from_scratch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE 
  rec RECORD;
BEGIN
  -- 1. Alles auf Startzustand setzen
  UPDATE games.players SET 
    ka_index = 1000, 
    matches_played = 0,
    effective_rating_cached = games.calculate_effective_rating(ka_index, rg_index, 0);
    
  DELETE FROM games.elo_history;
  DELETE FROM games.elo_calc_log;

  -- 2. Matches chronologisch durchlaufen
  FOR rec IN SELECT id FROM games.match ORDER BY created_at ASC LOOP
    PERFORM games.apply_elo_for_match(rec.id);
  END LOOP;
END;$function$
;

create or replace view "games"."user_matches" as  WITH match_stats AS (
         SELECT s.match,
            count(*) FILTER (WHERE (s.team_a_score > s.team_b_score)) AS sets_won_a,
            count(*) FILTER (WHERE (s.team_b_score > s.team_a_score)) AS sets_won_b,
            string_agg(((s.team_a_score || ':'::text) || s.team_b_score), ', '::text ORDER BY s.created_at) AS scores_list
           FROM games.sets s
          GROUP BY s.match
        )
 SELECT m.id AS match_id,
    m.created_at,
    m.event,
    m.rated,
    m.team_a AS team_a_id,
    t_a.name AS team_a_name,
    t_a.player_1 AS team_a_p1,
    t_a.player_2 AS team_a_p2,
    m.team_b AS team_b_id,
    t_b.name AS team_b_name,
    t_b.player_1 AS team_b_p1,
    t_b.player_2 AS team_b_p2,
    COALESCE(ms.scores_list, ''::text) AS set_scores,
    COALESCE(ms.sets_won_a, (0)::bigint) AS sets_won_a,
    COALESCE(ms.sets_won_b, (0)::bigint) AS sets_won_b,
        CASE
            WHEN (ms.sets_won_a > ms.sets_won_b) THEN 'team_a'::text
            WHEN (ms.sets_won_b > ms.sets_won_a) THEN 'team_b'::text
            WHEN ((ms.sets_won_a = ms.sets_won_b) AND (ms.match IS NOT NULL)) THEN 'draw'::text
            ELSE 'undetermined'::text
        END AS winner_side,
        CASE
            WHEN (ms.sets_won_a > ms.sets_won_b) THEN m.team_a
            WHEN (ms.sets_won_b > ms.sets_won_a) THEN m.team_b
            ELSE NULL::uuid
        END AS winner_team_id
   FROM (((games.match m
     JOIN games.teams t_a ON ((m.team_a = t_a.id)))
     JOIN games.teams t_b ON ((m.team_b = t_b.id)))
     LEFT JOIN match_stats ms ON ((ms.match = m.id)));



