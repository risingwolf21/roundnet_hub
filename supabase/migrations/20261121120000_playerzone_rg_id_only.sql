-- Playerzone: the RG ID ("SAR221") replaces the profile link as the player's input.
-- rg_link stays as a column but is no longer written by users or read by the app.

-- 1. Backfill rg_id from links that carry the name ("/players/221-sarah-kiel" → "SAR221").
--    Runs before the new trigger exists, so it does not call the edge function for every player.
--    Links with only the number give no letters; those players enter their RG ID once.
update games.players
set rg_id = upper(left(substring(rg_link from '/players/[0-9]+-([A-Za-z]+)'), 3))
            || substring(rg_link from '/players/([0-9]+)')
where rg_id is null
  and rg_link ~ '^https://playerzone\.roundnetgermany\.de/players/[0-9]+-[A-Za-z]{3}';

-- 2. Users change rg_id now: normalise it, check its shape, and clear the derived rating data;
--    the fetch-player-info edge function (service_role) refills it.
create or replace function games.trg_players_reset_rg_data()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.rg_id := nullif(upper(btrim(new.rg_id)), '');
    if new.rg_id is distinct from old.rg_id then
      if new.rg_id is not null and new.rg_id !~ '^[A-Z]{3}[0-9]+$' then
        raise exception 'Invalid RG ID: %', new.rg_id using errcode = '22023';
      end if;
      new.rg_index := null;
      new.rg_avatar_url := null;
    end if;
  end if;
  return new;
end;
$$;

-- 3. Fetch on rg_id instead of rg_link. Saving the same RG ID again refetches the rating.
create or replace function games.trg_fetch_player_info_on_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.invoke_edge_function(
    'fetch-player-info',
    jsonb_build_object('rg_id', new.rg_id, 'player', new.player),
    5000
  );
  return new;
end;
$$;

drop trigger if exists fetch_player_info_after_rglink_change on games.players;
drop trigger if exists fetch_player_info_after_rg_id_change on games.players;
create trigger fetch_player_info_after_rg_id_change
  after update of rg_id on games.players
  for each row
  when (new.rg_id is not null)
  execute function games.trg_fetch_player_info_on_change();

-- 4. Column privileges: rg_id instead of rg_link.
revoke update (rg_link) on games.players from authenticated;
grant update (rg_id) on games.players to authenticated;
