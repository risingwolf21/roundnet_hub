create
    or replace function public.update_attendance_on_maxAttendees_change () returns trigger as $$
declare
    newEvent public.events;
    users text[];
begin
    select * into newEvent from events where id = new.id limit 1;
    insert into public.logs (message) values (newEvent);
    if (new."maxAttendees" < old."maxAttendees") then
        insert into public.logs (message) values ('New MaxAttendees is less than before');
        WITH last_two_entries AS (
            SELECT event_attendance_user_mapping."user"
            FROM event_attendance_user_mapping
            WHERE event = new.id
            ORDER BY "lastUpdate" DESC
            OFFSET newEvent."maxAttendees"
        )
        UPDATE event_attendance_user_mapping
        SET state = 'Waiting'
        WHERE event_attendance_user_mapping."event" = new.id and event_attendance_user_mapping."user" IN (SELECT * FROM last_two_entries);
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