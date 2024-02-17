create
    or replace function public.update_attendance_on_maxAttendees_change () returns trigger as $$
declare
    newEvent public.events;
begin
    select * into newEvent from events where id = new.id limit 1;
    if (new."maxAttendees" < old."maxAttendees") then
        update event_attendance_user_mapping set state = 'Waiting'
        where event = new.id and user in (select event_attendance_user_mapping.user from event_attendance_user_mapping
                                          where event = new.id order by event_attendance_user_mapping."lastUpdate" offset newEvent."maxAttendees");
    end if;
    return new;
end;
$$ language plpgsql;

create
    or replace trigger maxAttendees_change_trigger
    after
        update
    on events for each row when (new."maxAttendees" <> old."maxAttendees")
execute
    function public.update_attendance_on_maxAttendees_change ();