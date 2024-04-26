create
or replace function public.event_comment_notification () returns trigger language plpgsql security definer
set
  search_path = public as $$
declare
currentEvent events;
user user;
userAttending string[];
begin

select * into currentEvent from events where id = new.event limit 1;
select * into user from user where userId = new.user limit 1;
select * into userAttending from event_attendance_user_mapping where event = new.event;

select concat(new."displayName", ' : ', new.comment) as body,
       "userId"                                                as "user",
       currentEvent."title"                                       as title
from public."user"
where 'eventComments' = ANY ("notifications")
  and fcm_token is not null;

return new;
end;
$$;

create trigger on_event_comment_inserted
    after insert
    on public.event_comments
    for each row execute procedure public.event_comment_notification();