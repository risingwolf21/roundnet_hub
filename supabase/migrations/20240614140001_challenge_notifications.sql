ALTER TYPE public."Permissions" ADD VALUE 'edit;challenges';
ALTER TYPE public."NotificationTags" ADD VALUE 'challengeUpdate';

create
or replace function public.challenge_notification() returns trigger
    language plpgsql
    security definer
    set
        search_path = public as
$$
declare
currentChallenge  public.challenge;
currentUser
public.user;
begin

select *
into currentChallenge
from challenge
where id = new.challenge limit 1;
select *
into currentUser
from user
where "userId" = new.user limit 1;

insert into notifications (body, "user", title)
select concat(currentUser."displayName", ' + ', new.count) as body, "userId" as user, currentChallenge.title as title
from public."user"
where 'challengeUpdate' = ANY ("notifications")
  and "fcm_token" is not null
  and "userId" = ANY (array(select group_user_mapping."user"
    from group_user_mapping
    where "group" = currentChallenge.group)::text[]);
return new;
end;
$$;

create trigger on_challenge_stat_inserted
    after insert
    on public.challenge_stats
    for each row
    execute procedure public.challenge_notification();