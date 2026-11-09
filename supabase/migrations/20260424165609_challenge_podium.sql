create or replace view "public"."challenge_podium" with (security_invoker=true) as  WITH user_scores AS (
         SELECT cs.challenge,
            cs."user" AS user_id,
            sum(cs.count) AS total_points
           FROM public.challenge_stats cs
          GROUP BY cs.challenge, cs."user"
        ), ranked_users AS (
         SELECT us.challenge,
            us.user_id,
            us.total_points,
            rank() OVER (PARTITION BY us.challenge ORDER BY us.total_points DESC) AS rank
           FROM user_scores us
        ), top_3_users AS (
         SELECT ru.challenge,
            ru.rank,
            ru.total_points,
            ru.user_id,
            u.name AS user_name,
            u."avatarUrl" AS profile_image
           FROM (ranked_users ru
             JOIN public."user" u ON ((u.id = ru.user_id)))
          WHERE (ru.rank <= 3)
        ), podium_agg AS (
         SELECT top_3_users.challenge,
            jsonb_agg(jsonb_build_object('rank', top_3_users.rank, 'user_id', top_3_users.user_id, 'name', top_3_users.user_name, 'image_url', top_3_users.profile_image, 'score', top_3_users.total_points) ORDER BY top_3_users.rank) AS podium
           FROM top_3_users
          GROUP BY top_3_users.challenge
        )
 SELECT c.id AS challenge_id,
    c.name AS challenge_name,
    c.end_date,
    COALESCE(p.podium, '[]'::jsonb) AS podium
   FROM (public.challenge c
     LEFT JOIN podium_agg p ON ((c.id = p.challenge)))
  WHERE ((c.end_date IS NOT NULL) AND (c.end_date < now()));



