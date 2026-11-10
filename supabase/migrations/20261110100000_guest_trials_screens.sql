-- Guest trials, part 2: what the screens need.
--
--   1. trial_invite_info(token): the invite page shows which group invited the newcomer and how
--      many trainings they get, BEFORE anyone signs in. The only SECURITY DEFINER function anon
--      may call; it returns nothing but group name, limit and expiry for a token, and the token
--      is the secret.
--   2. trial_status() also says whether the trial member is a guest (anonymous), for the badge.
--   3. insert_event_with_bring_items stores max_trial_attendees (it accepted the key but dropped
--      the value) and the new trials_open.
--   4. When a guest links an e-mail address (converting to a real account), public.user gets it.

-- ---------------------------------------------------------------------
-- 1. Invite info for the invite page
-- ---------------------------------------------------------------------
create or replace function public.trial_invite_info(p_token text)
returns table (group_id uuid, group_name text, event_limit integer, expires_at timestamptz, valid boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select i."group", g.name, i.event_limit, i.expires_at,
         i.active
         and (i.expires_at is null or i.expires_at >= now())
         and (i.max_uses is null or i.uses < i.max_uses)
         and (select count(*) from public.group_features gf
              where gf."group" = i."group" and gf.feature in ('events.trials', 'events.trials.guests')) = 2
  from public.trial_invites i
  join public.event_group g on g.id = i."group"
  where i.token = p_token;
$$;

revoke all on function public.trial_invite_info(text) from public;
grant execute on function public.trial_invite_info(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. trial_status: plus is_guest
-- ---------------------------------------------------------------------
drop function if exists public.trial_status(uuid, uuid);

create function public.trial_status(p_group uuid, p_user uuid default null)
returns table (event_limit integer, events_used integer, trial_started_at timestamptz, is_guest boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
begin
  if v_user is distinct from auth.uid()
     and not (public.is_user_admin_in_group(p_group) or coalesce(public.authorize('supabase.admin'), false)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select gum.trial_event_limit, public.trial_events_used(v_user, p_group), gum.trial_started_at,
         coalesce(u.is_anonymous, false)
  from public.group_user_mapping gum
  left join auth.users u on u.id = gum."user"
  where gum."user" = v_user and gum."group" = p_group and gum.role = 'trial'::public."GroupRole";
end;
$$;

revoke all on function public.trial_status(uuid, uuid) from public, anon;
grant execute on function public.trial_status(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. insert_event_with_bring_items: store max_trial_attendees and trials_open
-- ---------------------------------------------------------------------
-- Same as 20261106120000_event_answer_start, plus the two columns.
create or replace function public.insert_event_with_bring_items(p_event jsonb, p_items jsonb)
 returns table(event_id uuid, inserted_item_ids uuid[])
 language plpgsql
as $function$DECLARE
  v_event_id uuid;
  v_item_id uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_item jsonb;
  allowed_event_keys text[] := ARRAY[
    'id','title','description','startingDateTime','endDateTime','meetingDateTime','key','group',
    'items_enabled','recurrence','recurrenceEnd','created_at','isCancelled','place','answerDeadline', 'answerStart', 'max_trial_attendees', 'trials_open', 'items_enabled',
    'maxAttendees','required_item','constellations_enabled'
  ];
  allowed_item_keys text[] := ARRAY[
    'name','unit','required_qty','notes','sort_order'
  ];
  key text;
BEGIN
  -- Basic validation: p_event must be an object
  IF p_event IS NULL OR jsonb_typeof(p_event) <> 'object' THEN
    RAISE EXCEPTION 'p_event must be a JSON object';
  END IF;

  -- Validate no unknown keys in p_event
  FOR key IN SELECT jsonb_object_keys(p_event)
  LOOP
    IF NOT (key = ANY (allowed_event_keys)) THEN
      RAISE EXCEPTION 'Unknown event field: %', key;
    END IF;
  END LOOP;

  -- Validate types/casts for some known fields (raise helpful errors)
  IF p_event ? 'id' THEN
    BEGIN
      PERFORM (p_event ->> 'id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid uuid for event.id: %', p_event ->> 'id';
    END;
  END IF;

  IF p_event ? 'startingDateTime' THEN
    BEGIN
      PERFORM (p_event ->> 'startingDateTime')::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.startingDateTime: %', p_event ->> 'startingDateTime';
    END;
  END IF;

  IF p_event ? 'endDateTime' THEN
    BEGIN
      PERFORM (p_event ->> 'endDateTime')::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.endDateTime: %', p_event ->> 'endDateTime';
    END;
  END IF;

  IF p_event ? 'items_enabled' THEN
    BEGIN
      PERFORM (p_event ->> 'items_enabled')::boolean;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid boolean for event.items_enabled: %', p_event ->> 'items_enabled';
    END;
  END IF;

  IF p_event ? 'created_at' THEN
    BEGIN
      PERFORM (p_event ->> 'created_at')::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid timestamptz for event.created_at: %', p_event ->> 'created_at';
    END;
  END IF;

  IF p_event ? 'isCancelled' THEN
    BEGIN
      PERFORM (p_event ->> 'isCancelled')::boolean;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid boolean for event.isCancelled: %', p_event ->> 'isCancelled';
    END;
  END IF;

  IF p_event ? 'maxAttendees' THEN
    BEGIN
      PERFORM (p_event ->> 'maxAttendees')::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid numeric for event.maxAttendees: %', p_event ->> 'maxAttendees';
    END;
  END IF;

  -- Ensure event id
  IF p_event ? 'id' THEN
    v_event_id := (p_event ->> 'id')::uuid;
  ELSE
    v_event_id := gen_random_uuid();
  END IF;

  -- Insert event (explicit columns)
  INSERT INTO public.events (
    id,
    title,
    description,
    "startingDateTime",
    "endDateTime",
    "meetingDateTime",
    "key",
    "group",
    items_enabled,
    recurrence,
    "recurrenceEnd",
    created_at,
    "isCancelled",
    place,
    "answerDeadline",
    "answerStart",
    "maxAttendees",
    max_trial_attendees,
    trials_open,
    required_item,
    constellations_enabled
  )
  VALUES (
    v_event_id,
    NULLIF(p_event ->> 'title', ''),
    NULLIF(p_event ->> 'description', ''),
    CASE WHEN p_event ? 'startingDateTime' THEN (p_event ->> 'startingDateTime')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'endDateTime' THEN (p_event ->> 'endDateTime')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'meetingDateTime' THEN (p_event ->> 'meetingDateTime')::timestamptz ELSE NULL END,
    COALESCE(NULLIF(p_event ->> 'key', ''), gen_random_uuid()::text),
    CASE WHEN p_event ? 'group' THEN (p_event ->> 'group')::uuid ELSE NULL END,
    CASE WHEN p_event ? 'items_enabled' THEN (p_event ->> 'items_enabled')::boolean ELSE FALSE END,
    CASE WHEN p_event ? 'recurrence' THEN (p_event ->> 'recurrence')::"EventRecurrence" ELSE 'None'::"EventRecurrence" END,
    CASE WHEN p_event ? 'recurrenceEnd' THEN (p_event ->> 'recurrenceEnd')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'created_at' THEN (p_event ->> 'created_at')::timestamptz ELSE now()::timestamptz END,
    CASE WHEN p_event ? 'isCancelled' THEN (p_event ->> 'isCancelled')::boolean ELSE FALSE END,
    NULLIF(p_event ->> 'place', ''),
    CASE WHEN p_event ? 'answerDeadline' THEN (p_event ->> 'answerDeadline')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'answerStart' THEN (p_event ->> 'answerStart')::timestamptz ELSE NULL END,
    CASE WHEN p_event ? 'maxAttendees' THEN (p_event ->> 'maxAttendees')::numeric ELSE NULL END,
    CASE WHEN p_event ? 'max_trial_attendees' THEN (p_event ->> 'max_trial_attendees')::numeric ELSE NULL END,
    CASE WHEN p_event ? 'trials_open' THEN (p_event ->> 'trials_open')::boolean ELSE FALSE END,
    CASE WHEN p_event ? 'required_item' THEN (p_event ->> 'required_item')::"ItemType" ELSE NULL END,
    CASE WHEN p_event ? 'constellations_enabled' THEN (p_event ->> 'constellations_enabled')::boolean ELSE FALSE END
  );

  -- Validate and insert items if provided
  IF p_items IS NOT NULL THEN
    IF jsonb_typeof(p_items) <> 'array' THEN
      RAISE EXCEPTION 'p_items must be a JSON array or null';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      -- ensure object
      IF jsonb_typeof(v_item) <> 'object' THEN
        RAISE EXCEPTION 'Each item must be a JSON object';
      END IF;

      -- unknown keys check
      FOR key IN SELECT jsonb_object_keys(v_item)
      LOOP
        IF NOT (key = ANY (allowed_item_keys)) THEN
          RAISE EXCEPTION 'Unknown item field: %', key;
        END IF;
      END LOOP;

      IF v_item ? 'required_qty' THEN
        BEGIN
          PERFORM (p_event ->> 'required_qty')::numeric;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid numeric for item.required_qty: %', p_event ->> 'required_qty';
        END;
      END IF;

      IF v_item ? 'sort_order' THEN
        BEGIN
          PERFORM (p_event ->> 'sort_order')::int;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'Invalid int for item.sort_order: %', p_event ->> 'sort_order';
        END;
      END IF;

      -- perform insert
      INSERT INTO public.event_bring_items (
        event,
        name,
        unit,
        required_qty,
        notes,
        sort_order,
        created_by,
        created_at
      )
      VALUES (
        v_event_id,
        NULLIF(v_item ->> 'name', ''),
        COALESCE(NULLIF(v_item ->> 'unit', ''), 'Stk'),
        CASE WHEN v_item ? 'required_qty' THEN (v_item ->> 'required_qty')::numeric ELSE 0 END,
        NULLIF(v_item ->> 'notes', ''),
        CASE WHEN v_item ? 'sort_order' THEN (v_item ->> 'sort_order')::int ELSE 0 END,
        (select auth.uid()),
        now()
      )
      RETURNING id INTO v_item_id;

      v_ids := array_append(v_ids, v_item_id);
    END LOOP;
  END IF;

  -- Return inserted ids
  event_id := v_event_id;
  inserted_item_ids := v_ids;
  RETURN NEXT;
END;$function$;


-- ---------------------------------------------------------------------
-- 4. A converted guest's e-mail reaches public.user
-- ---------------------------------------------------------------------
create or replace function public.trg_sync_auth_email_to_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public."user" set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end;
$$;

revoke execute on function public.trg_sync_auth_email_to_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.trg_sync_auth_email_to_user();
