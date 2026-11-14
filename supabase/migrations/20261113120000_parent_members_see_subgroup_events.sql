-- Members and admins of a parent group see the events of its visible subgroups (visible and
-- is_public, the subgroups they already see in the group list), including attendance and
-- comments, without being a member of the subgroup. Read only: signing up, commenting and
-- editing still need membership of the event's group (existing policies).

create or replace function public.is_parent_member_of_group(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_group g
    join public.group_user_mapping gum on gum."group" = g.parent_group
    where g.id = p_group
      and g.visible
      and g.is_public
      and gum."user" = (select auth.uid())
      and gum.role in ('user'::public."GroupRole", 'admin'::public."GroupRole")
  );
$$;

create or replace function public.is_parent_member_of_event(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event and public.is_parent_member_of_group(e."group")
  );
$$;

revoke all on function public.is_parent_member_of_group(uuid) from public, anon;
revoke all on function public.is_parent_member_of_event(uuid) from public, anon;
grant execute on function public.is_parent_member_of_group(uuid) to authenticated;
grant execute on function public.is_parent_member_of_event(uuid) to authenticated;

drop policy if exists events_select_parent_member on public.events;
create policy events_select_parent_member on public.events
  for select to authenticated
  using (public.is_parent_member_of_group("group"));

drop policy if exists attendance_select_parent_member on public.event_attendance_user_mapping;
create policy attendance_select_parent_member on public.event_attendance_user_mapping
  for select to authenticated
  using (public.is_parent_member_of_event(event));

drop policy if exists comments_select_parent_member on public.event_comments;
create policy comments_select_parent_member on public.event_comments
  for select to authenticated
  using (public.authorize('event.comment') and public.is_parent_member_of_event(event));

-- events_user_view: left join the membership so these events show up too, with
-- user_group_role null (same columns as 20261109150000_guest_trials).
create or replace view public.events_user_view with (security_invoker=on) as
  select e.id,
    e.created_at,
    e.title,
    e.description,
    e."meetingDateTime",
    e."startingDateTime",
    e."endDateTime",
    e.key,
    e."isCancelled",
    e.place,
    e."group",
    e.recurrence,
    e."answerDeadline",
    e."recurrenceEnd",
    e."maxAttendees",
    e.max_trial_attendees,
    e.required_item,
    e.constellations_enabled,
    eaus.state as user_state,
    gus.role as user_group_role,
    (select count(*) from public.event_attendance_user_mapping ea
      where ea.event = e.id and ea.state = 'Attending'::public."EventAttendance") as attending_count,
    (select count(*) from public.event_attendance_user_mapping ea
      where ea.event = e.id and ea.state = 'Declined'::public."EventAttendance") as declined_count,
    e."answerStart",
    e.trials_open
  from public.events e
    left join public.event_attendance_user_mapping eaus
      on e.id = eaus.event and eaus."user" = (select auth.uid())
    left join public.group_user_mapping gus
      on e."group" = gus."group" and gus."user" = (select auth.uid());
