set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_attendance_leaderboard(p_from timestamp with time zone, p_to timestamp with time zone, p_group uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(user_id text, user_name text, signups bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    m."user" as user_id,
    u."name" as user_name,
    count(*)::bigint as signups
  from public.event_attendance_user_mapping m
  join public.events e on e.id = m.event
  join public."user" u on u."id" = m."user"
  where public.authorize('admin.analytics.view')
    and e."startingDateTime" >= p_from
    and e."startingDateTime" <  p_to
    and (p_group is null or e."group" = p_group)
    and e."isCancelled" = false
    and m.state = any(array[
      'Attending'::public."EventAttendance",
      'AttendingAsTrial'::public."EventAttendance",
      'AttendingAsTrainer'::public."EventAttendance"
    ])
  group by m."user", u."name"
  order by signups desc
  limit p_limit;
$function$
;

INSERT INTO "public"."permissions"("name", "description") VALUES ('admin.analytics.view', 'Admin analysen');