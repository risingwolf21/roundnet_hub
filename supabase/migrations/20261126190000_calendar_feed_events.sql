-- Events for a calendar feed, selected by the feed's secret token.
-- p_all = false: only events the user attends (also as trainer or trial).
-- p_all = true:  additionally every event, past and future, in the user's groups that the user
--                has not declined (same visibility as the events RLS: member, admin or trial;
--                trial members only see events open for trials).
-- Cancelled events are never included. Only the ical edge function (service role) calls this.
create function public.calendar_feed_events(p_token uuid, p_all boolean default false)
returns table (
  id uuid,
  title text,
  description text,
  "startingDateTime" timestamptz,
  "endDateTime" timestamptz,
  place text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.description, e."startingDateTime", e."endDateTime", e.place
  from public.calendar_feed_tokens t
  join public.events e on not e."isCancelled"
  left join public.event_attendance_user_mapping a on a.event = e.id and a."user" = t."user"
  where t.token = p_token
    and (
      -- Attending: no membership check, like before (an event stays after leaving its group).
      a.state in ('Attending'::public."EventAttendance",
                  'AttendingAsTrainer'::public."EventAttendance",
                  'AttendingAsTrial'::public."EventAttendance")
      or (
        p_all
        and a.state is distinct from 'Declined'::public."EventAttendance"
        and exists (
          select 1 from public.group_user_mapping gum
          where gum."group" = e."group"
            and gum."user" = t."user"
            and (gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole")
                 or (gum.role = 'trial'::public."GroupRole" and e.trials_open))
        )
      )
    )
$$;

revoke all on function public.calendar_feed_events(uuid, boolean) from public, anon, authenticated;
grant execute on function public.calendar_feed_events(uuid, boolean) to service_role;
