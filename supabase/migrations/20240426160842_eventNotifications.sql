create
    or replace function public.event_comment_notification() returns trigger
    language plpgsql
    security definer
    set
        search_path = public as
$$
declare
    currentEvent  public.events;
begin

    select * into currentEvent from events where id = new.event limit 1;

    insert into notifications (body, "user", title)
    select concat(new."displayName", ' : ', new.comment) as body, "userId" as user, currentEvent.title as title
    from public."user"
    where 'eventComments' = ANY ("notifications")
      and "fcm_token" is not null
      and "userId" = ANY (array(select event_attendance_user_mapping."user"
                                from event_attendance_user_mapping
                                where event = new.event
                                  and state = 'Attending')::text[]);
    return new;
end;
$$;

create trigger on_event_comment_inserted
    after insert
    on public.event_comments
    for each row
execute procedure public.event_comment_notification();

create
    or replace function public.event_cancelled_notification() returns trigger
    language plpgsql
    security definer
    set
        search_path = public as
$$
declare
    currentEvent public.events;
    body         text;
begin

    if new."isCancelled" then
        body = 'Dieses Event wurde abgesagt';
    else
        body = 'Dieses Event findet wieder statt';
    end if;

    insert into notifications (body, "user", title)
    select body, "userId" as user, new.title as title
    from public."user"
    where 'eventCancelled' = ANY ("notifications")
      and "fcm_token" is not null
      and "userId" = ANY (array(select event_attendance_user_mapping."user"
                                from event_attendance_user_mapping
                                where event = new.id
                                  and state = 'Attending')::text[]);
    return new;
end;
$$;

create trigger on_event_cancelled
    after update
    on public.events
    for each row
    when (new."isCancelled" <> old."isCancelled")
execute procedure public.event_cancelled_notification();

