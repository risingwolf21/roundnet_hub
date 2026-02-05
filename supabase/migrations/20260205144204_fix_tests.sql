set check_function_bodies = off;

CREATE OR REPLACE FUNCTION notifications._trg_event_group_updated_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if (old."group" is distinct from new."group") then
    perform notifications.notify_event_group_updated(new.id, old."group", auth.uid()::text);
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_group_updated(p_event uuid, p_old_group uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.group.updated';
  v_cnt    int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title text := '';
  v_body   text := '🆕 Es ist ein neues Event verfügbar';
  v_start text;
  v_event_group uuid;
begin

  select e."title", e."startingDateTime", e."group" into v_title, v_start, v_event_group from public.events as e where e.id = p_event;

  if v_event_group is null then raise exception 'event % not found', p_event; end if;

  v_title := v_title || ' - 🗓️ ' || to_char(DATE(v_start), 'DD.MM.YYYY');

  with g_new as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_event_group
  ),
  recipients as (
    select n.uid
      from g_new n
     where p_actor <> n.uid
       and not exists (
             select 1
               from public.group_user_mapping og
              where og."group" = p_old_group
                and og."user"  = n.uid
           )
  ),
  allowed as (
    select r.uid
      from recipients r
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'event', p_event
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join notifications.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;


  create policy "challenge_stats_meta_insert"
  on "public"."challenge_stats_meta"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "challenge_stats_meta_select"
  on "public"."challenge_stats_meta"
  as permissive
  for select
  to authenticated
using (true);

CREATE OR REPLACE FUNCTION public.increase_challenge_stats_count(challenge_id uuid, amount numeric, to_create_at timestamp with time zone, image_url text DEFAULT NULL::text, comment text DEFAULT NULL::text, category text DEFAULT NULL::text)
 RETURNS public.challenge_stats
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
  c          public.challenge;
  new_stat   public.challenge_stats;
  uid        uuid := auth.uid();
  week_start timestamptz;
  week_end   timestamptz;
  day_start  timestamptz;
  day_end    timestamptz;
  week_sum   numeric;
  day_sum    numeric;
BEGIN
  -- Basic inputs
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  SELECT * INTO c FROM public.challenge WHERE id = challenge_id;
  IF c IS NULL THEN
    RAISE EXCEPTION 'Could not select given challenge';
  END IF;

  IF c.automated THEN
    RAISE EXCEPTION 'This challenge is automated. You can not add any points manually';
  END IF;

  -- Membership check (clear error instead of vague RLS failure)
  IF NOT EXISTS (
    SELECT 1 FROM public.group_user_mapping gum
     WHERE gum."group" = c."group"
       AND gum."user"  = uid
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of the challenge''s group' USING ERRCODE = '42501';
  END IF;

  -- Reject single-call overflow irrespective of prior rows
  IF amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;
  IF amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  -- Windows anchored on the attempted timestamp
  week_start := date_trunc('week', to_create_at);
  week_end   := week_start + interval '7 days';
  day_start  := date_trunc('day', to_create_at);
  day_end    := day_start + interval '1 day';

  -- RLS-immune sums (only for the caller's own uid)
  week_sum := public._sum_challenge_points_for_self(uid, challenge_id, week_start, week_end);
  day_sum  := public._sum_challenge_points_for_self(uid, challenge_id, day_start, day_end);

  -- Cumulative caps
  IF week_sum + amount > c.max_points_per_week THEN
    RAISE EXCEPTION 'Maximum points per week already reached';
  END IF;

  IF day_sum + amount > c.max_points_per_day THEN
    RAISE EXCEPTION 'Maximum points per day already reached';
  END IF;

  -- Insert for the actor (RLS still applies to the INSERT)
  INSERT INTO public.challenge_stats ("user","challenge","count","created_at","image_url")
  VALUES (uid, challenge_id, amount, to_create_at, image_url)
  RETURNING * INTO new_stat;

  INSERT INTO public.challenge_stats_meta ("challenge_stat", "category", "comment")
  VALUES (new_stat.id, category, comment);

  RETURN new_stat;
END;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_group_updated_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
  if (old."group" is distinct from new."group") then
    perform notifications.notify_event_group_updated(new.id, old."group", auth.uid()::text);
  end if;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_event_group_updated(p_event uuid, p_old_group uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.group.updated';
  v_cnt    int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title text := '';
  v_body   text := '🆕 Es ist ein neues Event verfügbar';
  v_start text;
  v_event_group uuid;
begin

  select e."title", e."startingDateTime", e."group" into v_title, v_start, v_event_group from public.events as e where e.id = p_event;

  if v_event_group is null then raise exception 'event % not found', p_event; end if;

  v_title := v_title || ' - 🗓️ ' || to_char(DATE(v_start), 'DD.MM.YYYY');

  with g_new as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_event_group
  ),
  recipients as (
    select n.uid
      from g_new n
     where p_actor <> n.uid
       and not exists (
             select 1
               from public.group_user_mapping og
              where og."group" = p_old_group
                and og."user"  = n.uid
           )
  ),
  allowed as (
    select r.uid
      from recipients r
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'event', p_event)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'event', p_event
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           p_body,
           jsonb_build_object('event', p_event, 'url', v_url),
           'normal',
           i.id
      from ins i
    returning id,"user"
  )
  insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join notifications.web_push_subscriptions s on s."user" = o."user" and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;$function$
;
