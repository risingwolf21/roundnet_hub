drop function if exists "public"."increase_challenge_stats_count"(challenge_id uuid, amount numeric, to_create_at timestamp with time zone, image_url text);

drop index if exists "public"."group_user_mapping_user_idx";


  create table "public"."challenge_stats_meta" (
    "challenge_stat" bigint not null,
    "category" text,
    "comment" text
      );


alter table "public"."challenge_stats_meta" enable row level security;


  create table "util"."background_errors" (
    "at" timestamp with time zone not null default now(),
    "source" text not null,
    "op" text not null,
    "ref_id" uuid,
    "message" text,
    "details" jsonb,
    "actor_user" uuid default (NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text))::uuid,
    "reported" boolean not null default false,
    "id" uuid not null default gen_random_uuid()
      );


alter table "util"."background_errors" enable row level security;

alter table "public"."challenge" add column "category_enabled" boolean not null default false;

alter table "public"."challenge" add column "comments_enabled" boolean not null default false;

alter table "public"."challenge" add column "show_all_members" boolean not null default false;

CREATE UNIQUE INDEX webpush_unique_active_per_device ON notifications.web_push_subscriptions USING btree ("user", device_id) WHERE ((revoked_at IS NULL) AND (device_id IS NOT NULL));

CREATE UNIQUE INDEX challenge_stats_meta_pkey ON public.challenge_stats_meta USING btree (challenge_stat);

CREATE INDEX group_user_mapping_user_idx1 ON public.group_user_mapping USING btree ("user");

CREATE UNIQUE INDEX background_errors_pkey ON util.background_errors USING btree (id);

alter table "public"."challenge_stats_meta" add constraint "challenge_stats_meta_pkey" PRIMARY KEY using index "challenge_stats_meta_pkey";

alter table "util"."background_errors" add constraint "background_errors_pkey" PRIMARY KEY using index "background_errors_pkey";

alter table "public"."challenge_stats_meta" add constraint "challenge_stats_meta_challenge_stat_fkey" FOREIGN KEY (challenge_stat) REFERENCES public.challenge_stats(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."challenge_stats_meta" validate constraint "challenge_stats_meta_challenge_stat_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.increase_challenge_stats_count(challenge_id uuid, amount numeric, to_create_at timestamp with time zone, image_url text DEFAULT NULL::text, comment text DEFAULT NULL::text, category text DEFAULT NULL::text)
 RETURNS public.challenge_stats
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$DECLARE
  c          public.challenge;
  new_stat   public.challenge_stats;
  uid        text := auth.uid()::text;
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

CREATE OR REPLACE FUNCTION util._trg_background_errors_to_sentry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  begin
    perform public.invoke_edge_function(
      'sentry-report',
      to_jsonb(NEW),  -- komplette Row übertragen
      3000
    );
  exception when others then
    -- niemals die Insert-Transaktion gefährden
    raise warning 'failed to invoke sentry-report edge fn: %', sqlerrm;
  end;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION util.sqlstate_label(p_state text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case p_state
    when '23505' then 'unique_violation'
    when '23503' then 'foreign_key_violation'
    when '23502' then 'not_null_violation'
    when '22001' then 'string_data_right_truncation'
    when '22P02' then 'invalid_text_representation'
    when '42601' then 'syntax_error'
    when '42883' then 'undefined_function'
    when '42703' then 'undefined_column'
    when '42P01' then 'undefined_table'
    when '42501' then 'insufficient_privilege'
    else 'unknown_sqlstate'
  end;
$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_challenge_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
      perform notifications.notify_challenge_added(new.id, auth.uid());
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_challenge_added', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_challenge_entry_added_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
      perform notifications.notify_challenge_entry_added(new."challenge", auth.uid());
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_challenge_entry_added', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_canceled_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
      perform notifications.notify_event_canceled(new.id, auth.uid());
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_event_canceled', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_comment_created_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
      perform notifications.notify_event_comment_created(new."event", new.id, new.comment, new."user");
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_event_comment_created', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_event_updated_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare 
  v_state   text;
  v_msg     text;
  v_detail  text;
  v_hint    text;
  v_context text;
  v_body text := '';
begin
  begin
      if row(new."startingDateTime", new."endDateTime", new.place)
     is not distinct from
     row(old."startingDateTime", old."endDateTime", old.place) then
    return new;
  end if;

  if row(new."startingDateTime") is distinct from row(old."startingDateTime") then
    v_body := 'Die Startzeit hat sich geändert zu: ' || to_char(new."startingDateTime", 'DD.MM.YYYY HH24:MI:SS');
  end if;

  if row(new."endDateTime") is distinct from row(old."endDateTime") then
    v_body := 'Die Endzeit hat sich geändert zu: ' || to_char(new."endDateTime", 'DD.MM.YYYY HH24:MI:SS');
  end if;

  if row(new."place") is distinct from row(old."place") then
    v_body := 'Der Ort des Events hat sich geändert.';
  end if;
  
  perform notifications.notify_event_updated(new.id, v_body, auth.uid());
    exception when others then
      get stacked diagnostics
        v_state   = returned_sqlstate,
        v_msg     = message_text,
        v_detail  = pg_exception_detail,
        v_hint    = pg_exception_hint,
        v_context = pg_exception_context;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_event_comment_created', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'sqlstate', v_state,
        'sqlstate_label', util.sqlstate_label(v_state),
        'detail', v_detail,
        'hint',   v_hint,
        'context', v_context
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_group_join_requested_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
      if (tg_op = 'INSERT' and new."role" = 'joinRequested') then
    perform notifications.notify_group_join_requested(new."group", new."user", auth.uid());
  end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_group_join_requested', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_group_request_confirmed_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
    if old."role" = 'joinRequested' and new."role" in ('user','admin') then
      perform notifications.notify_group_request_confirmed(new."group", new."user", auth.uid());
    end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_group_request_confirmed', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_item_handover_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
    if new."current_holder" is distinct from old."current_holder" then
      perform notifications.notify_item_handover(
        new.id,
        old."current_holder",
        new."current_holder",
        auth.uid()
      );
    end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_item_handover', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications._trg_payment_fulfilled_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_state text;
begin
  begin
    if (old."paymentState" is distinct from new."paymentState")
     and new."paymentState" = 'Fulfilled' then
      perform notifications.notify_drink_payment_fulfilled(new.id);
    end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate;
      insert into util.background_errors(source, op, ref_id, message, details)
      values (format('%s', TG_RELID::regclass), 'notify_drink_payment_fulfilled', new.id, sqlerrm, jsonb_build_object(
        'row',   pg_catalog.to_jsonb(NEW),
        'op', TG_OP,
        'state', v_state
      ));
  end;
  return new;
end;$function$
;

CREATE OR REPLACE FUNCTION notifications.notify_challenge_entry_added(p_challenge uuid, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_group  uuid;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'challenge.entry.added';
  v_cnt    int := 0;
  v_url    text := '/challenges/' || p_challenge::text;
  v_title  text;
  v_body   text := ' hat einen neuen Punkt eingetragen 🔥';
  v_user_display text;
begin
  select c."group", c."name" into v_group, v_title from public.challenge c where c.id = p_challenge;

  select coalesce(u."displayName", u."name")
    into v_user_display
    from public."user" u
   where u."id" = p_actor;

   v_body = v_user_display || v_body;

  if v_group is null then raise exception 'challenge % not found', p_challenge; end if;

  with recipients as (
    select distinct gum."user" as uid
      from public.group_user_mapping gum
     where gum."group" = v_group
       and gum."user" <> p_actor
  ),
  allowed as (
    select r.uid
      from recipients r
     where notifications.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'challenge', p_challenge)
  ),
  ins as (
    insert into notifications.notifications("user", tenant, topic, title, body, data, source_type, source_id)
    select a.uid, v_tenant, v_topic,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
           'challenge', p_challenge
      from allowed a
    returning id,"user"
  ),
  outbox as (
    insert into notifications.notification_outbox("user", tenant, title, body, data, urgency, notification)
    select i."user", v_tenant,
           v_title,
           v_body,
           jsonb_build_object('challenge', p_challenge, 'url', v_url),
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

CREATE OR REPLACE FUNCTION notifications.notify_event_updated(p_event uuid, p_body text, p_actor uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'event.updated';
  v_cnt    int := 0;
  v_url    text := '/training/event/' || p_event::text;
  v_title   text := 'Ein Event wurde aktualisiert';
  v_start text;
begin

  select e."title", e."startingDateTime" into v_title, v_start from public.events as e where e.id = p_event;

  v_title := v_title || ' - 🗓️ ' || to_char(DATE(v_start), 'DD.MM.YYYY');

  with recipients as (
    select distinct eum."user" as uid
      from public.event_attendance_user_mapping eum
     where eum.event = p_event
       and eum.state = 'Attending'
       and eum."user" <> 1
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

CREATE OR REPLACE FUNCTION notifications.upsert_webpush_subscription(p_endpoint text, p_p256dh text, p_auth text, p_device_id text, p_user_agent text, p_platform text)
 RETURNS notifications.web_push_subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_user uuid := auth.uid();
  v_row  notifications.web_push_subscriptions%rowtype;
  v_ep   notifications.web_push_subscriptions%rowtype;
  v_dev  notifications.web_push_subscriptions%rowtype;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if coalesce(p_endpoint,'') = '' then
    raise exception 'endpoint required';
  end if;

  -- 1) Falls endpoint bereits existiert: diese Zeile übernehmen/aktualisieren
  select * into v_ep
    from notifications.web_push_subscriptions
   where endpoint = p_endpoint
   limit 1;

  if found then
    update notifications.web_push_subscriptions
       set "user"     = v_user,
           p256dh     = p_p256dh,
           auth       = p_auth,
           platform   = p_platform,
           device_id  = p_device_id,
           user_agent = p_user_agent,
           revoked_at = null,
           last_seen  = now()
     where id = v_ep.id
     returning * into v_row;

    -- Alle anderen aktiven Zeilen für dasselbe (user, device_id) deaktivieren
    update notifications.web_push_subscriptions
       set revoked_at = now()
     where "user" = v_user
       and coalesce(device_id,'') = coalesce(p_device_id,'')
       and revoked_at is null
       and id <> v_row.id;

    return v_row;
  end if;

  -- 2) Sonst: gibt es bereits eine aktive Zeile für (user, device_id)?
  if p_device_id is not null then
    select * into v_dev
      from notifications.web_push_subscriptions
     where "user" = v_user
       and device_id = p_device_id
       and revoked_at is null
     limit 1;

    if found then
      -- Update IN PLACE (kein Insert, daher kein Unique-Konflikt)
      update notifications.web_push_subscriptions
         set endpoint   = p_endpoint,
             p256dh     = p_p256dh,
             auth       = p_auth,
             platform   = p_platform,
             user_agent = p_user_agent,
             last_seen  = now()
       where id = v_dev.id
       returning * into v_row;

      return v_row;
    end if;
  end if;

  -- 3) Weder endpoint noch device aktiv vorhanden -> Insert / Claim via endpoint
  insert into notifications.web_push_subscriptions
      ("user", endpoint, p256dh, auth, platform, device_id, user_agent, revoked_at, last_seen)
  values (v_user, p_endpoint, p_p256dh, p_auth, p_platform, p_device_id, p_user_agent, null, now())
  on conflict (endpoint) do update
     set "user"     = excluded."user",
         p256dh     = excluded.p256dh,
         auth       = excluded.auth,
         platform   = excluded.platform,
         device_id  = excluded.device_id,
         user_agent = excluded.user_agent,
         revoked_at = null,
         last_seen  = now()
  returning * into v_row;

  -- 4) Sicherheitshalber: andere aktive Zeilen für (user, device_id) deaktivieren
  if p_device_id is not null then
    update notifications.web_push_subscriptions
       set revoked_at = now()
     where "user" = v_user
       and device_id = p_device_id
       and revoked_at is null
       and id <> v_row.id;
  end if;

  return v_row;
end;$function$
;

create or replace view "public"."challenge_user_points" as  WITH user_totals AS (
         SELECT cs.challenge,
            cs."user",
            sum(cs.count) AS total_points,
            min(cs.created_at) AS first_entry_at,
            max(cs.created_at) AS last_entry_at
           FROM public.challenge_stats cs
          GROUP BY cs.challenge, cs."user"
        )
 SELECT c.id AS challenge,
    gum."user",
    u."displayName",
    u."avatarUrl",
    COALESCE(t.total_points, (0)::numeric) AS total_points
   FROM (((public.challenge c
     JOIN public.group_user_mapping gum ON ((gum."group" = c."group")))
     JOIN public."user" u ON ((u.id = gum."user")))
     LEFT JOIN user_totals t ON (((t.challenge = c.id) AND (t."user" = gum."user"))))
  WHERE (c.show_all_members OR (t.total_points IS NOT NULL));


CREATE OR REPLACE FUNCTION public.run_event_transformation_worker_if_needed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_has_work boolean;
  v_result bigint;
BEGIN
  /*
    Es gibt Arbeit, wenn:
    - aktive Transformationen existieren
    - mindestens ein Event existiert, das:
        - im Zeitfenster liegt
        - noch nicht applied wurde
  */
  SELECT EXISTS (
    SELECT 1
    FROM public.event_transformations tr
    JOIN public.events e
      ON e.key = tr.event_key
    WHERE tr.active = true
      AND (e."startingDateTime" - tr.lead_time) <= now()
      AND e."startingDateTime" > now() - interval '2 days'
      AND NOT EXISTS (
        SELECT 1
        FROM public.event_transformation_applications a
        WHERE a.transformation_id = tr.id
          AND a.event_id = e.id
      )
  )
  INTO v_has_work;

  if v_has_work then
    select * from public.invoke_edge_function('event-transformation-worker') into v_result;
    return json_build_object('request_id', v_result);
  else
    return jsonb_build_object('processed', 0, 'skipped', true);
  end if;
END;
$function$
;

grant delete on table "public"."challenge_stats_meta" to "anon";

grant insert on table "public"."challenge_stats_meta" to "anon";

grant references on table "public"."challenge_stats_meta" to "anon";

grant select on table "public"."challenge_stats_meta" to "anon";

grant trigger on table "public"."challenge_stats_meta" to "anon";

grant truncate on table "public"."challenge_stats_meta" to "anon";

grant update on table "public"."challenge_stats_meta" to "anon";

grant delete on table "public"."challenge_stats_meta" to "authenticated";

grant insert on table "public"."challenge_stats_meta" to "authenticated";

grant references on table "public"."challenge_stats_meta" to "authenticated";

grant select on table "public"."challenge_stats_meta" to "authenticated";

grant trigger on table "public"."challenge_stats_meta" to "authenticated";

grant truncate on table "public"."challenge_stats_meta" to "authenticated";

grant update on table "public"."challenge_stats_meta" to "authenticated";

grant delete on table "public"."challenge_stats_meta" to "postgres";

grant insert on table "public"."challenge_stats_meta" to "postgres";

grant references on table "public"."challenge_stats_meta" to "postgres";

grant select on table "public"."challenge_stats_meta" to "postgres";

grant trigger on table "public"."challenge_stats_meta" to "postgres";

grant truncate on table "public"."challenge_stats_meta" to "postgres";

grant update on table "public"."challenge_stats_meta" to "postgres";

grant delete on table "public"."challenge_stats_meta" to "service_role";

grant insert on table "public"."challenge_stats_meta" to "service_role";

grant references on table "public"."challenge_stats_meta" to "service_role";

grant select on table "public"."challenge_stats_meta" to "service_role";

grant trigger on table "public"."challenge_stats_meta" to "service_role";

grant truncate on table "public"."challenge_stats_meta" to "service_role";

grant update on table "public"."challenge_stats_meta" to "service_role";

grant insert on table "util"."background_errors" to "authenticated";

grant select on table "util"."background_errors" to "authenticated";

grant insert on table "util"."background_errors" to "service_role";

grant select on table "util"."background_errors" to "service_role";


  create policy "allow_insert_all"
  on "util"."background_errors"
  as permissive
  for insert
  to authenticated, service_role
with check (true);



  create policy "allow_select_service_role"
  on "util"."background_errors"
  as permissive
  for select
  to service_role
using (true);


CREATE TRIGGER trg_background_errors_to_sentry AFTER INSERT ON util.background_errors FOR EACH ROW EXECUTE FUNCTION util._trg_background_errors_to_sentry();


INSERT INTO "public"."permissions" ("name", "description") VALUES ('games.admin.view','Zeigt alle Werte aus dem Spiel wie ID und ELO Log'), ('games.delete.own','Erlaubt es eigene Spiele zu löschen') ON CONFLICT(name) DO NOTHING;