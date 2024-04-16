create
or replace function public.update_attendance (eventId bigint, userId text, state public."EventAttendance") returns setof event_attendance_user_mapping as $$
  declare
    currentEvent events;
    newState public."EventAttendance";
begin
    -- lookup event for eventId
    select *
    into currentEvent
    from events
    where id = eventId
    limit 1;

if
((Select events."maxAttendees" from events where events.id =  eventId LIMIT 1) is not null &&
       select count(*) from event_attendance_user_mapping where event = eventId) >= (Select events."maxAttendees" from events where events.id =  eventId LIMIT 1) then
      --- max attendees reached, new attendance need to be on waiting list
      newState = 'Waiting';
    else
      newState = 'Attending';
    end if;

    if (update_attendance.state = 'Declined') then
      newState = update_attendance.state;
    end if;

    return query insert into event_attendance_user_mapping("user", "event", "state")
      values (userId, eventId, newState)
      on conflict("user", "event")
      do update set state = newState
      returning *;
end;
$$ language plpgsql;