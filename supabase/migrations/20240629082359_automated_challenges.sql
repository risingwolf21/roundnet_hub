alter table public.challenge
    add column automated boolean not null default false;

CREATE
OR REPLACE FUNCTION increase_challenge_stats_count(
    user_id TEXT,
    challenge_id numeric,
    amount NUMERIC
) returns void AS
$$
declare
currentChallenge public.challenge;
BEGIN
select *
into currentChallenge
from public.challenge
where id = challenge_id limit 1;

if
currentChallenge is null then
        raise exception 'Could not select given challenge';
end if;

if
currentChallenge.automated then
   raise exception 'This challenge is automated. You can not add any points manually';
end if;

    if
((Select count(*)
          from challenge_stats
          where "user" = user_id
            and "challenge" = challenge_id
            and DATE_PART('week', created_at) = DATE_PART('week', now())) >= currentChallenge.max_points_per_week) then
        raise exception 'Maximum points per week already reached';
else
        INSERT INTO challenge_stats ("user", "challenge", "count")
        values (user_id, challenge_id, amount);
end if;
END;

$$
LANGUAGE plpgsql;

create
or replace function public.add_history_to_challenge() returns trigger
    language plpgsql
    security definer
    set
        search_path = public as
$$
begin
/* Challenge 4 = Drink Challenge */
INSERT INTO challenge_stats ("user", "challenge", "count")
values (new.user, 4, new.count);
return new;
end;
$$;

create
or replace trigger on_history_inserted
    after insert
    on public.history
    for each row
    execute procedure public.add_history_to_challenge();