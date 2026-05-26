drop policy "attendance_insert_self_or_manager" on "public"."event_attendance_user_mapping";

drop policy "attendance_update_self_or_manager" on "public"."event_attendance_user_mapping";

alter table "public"."challenge" add column "category_options" text[] not null default '{}'::text[];

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION notifications.notify_emit(p_recipients uuid[], p_topic text, p_title text, p_body text, p_data jsonb, p_source_type text, p_source_id uuid, p_urgency text, p_scope_type text, p_scope_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cnt int := 0;
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
begin
  if coalesce(array_length(p_recipients, 1), 0) = 0 then
    return 0;
  end if;

  with r as (
    select distinct unnest(p_recipients)::uuid as uid
  ),
  allowed as (
    select r.uid
    from r
    where notifications.is_topic_enabled_for_user(
      r.uid,
      v_tenant,
      p_topic,
      p_scope_type,
      p_scope_id
    )
  ),
  ins as (
    insert into notifications.notifications(
      "user", tenant, topic, title, body, data, source_type, source_id
    )
    select a.uid, v_tenant, p_topic, p_title, p_body, p_data, p_source_type, p_source_id
    from allowed a
    returning id, "user"
  ),
  outbox as (
    insert into notifications.notification_outbox(
      "user", tenant, title, body, data, urgency, notification
    )
    select i."user", v_tenant, p_title, p_body, p_data, p_urgency, i.id
    from ins i
    returning id, "user"
  ),
  targets as (
     insert into notifications.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
  from outbox o
  join notifications.web_push_subscriptions s
    on s."user" = o."user"
   and s.revoked_at is null
   returning outbox_id
  )

  -- Achtung: row_count wäre Targets; wir wollen #Empfänger => outbox count
  select count(*) into v_cnt from outbox;
  return v_cnt;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_attendance(p_event uuid, p_user uuid, p_state public."EventAttendance")
 RETURNS SETOF public.event_attendance_user_mapping
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$DECLARE
  v_is_member   boolean;
  v_event_open  boolean;
  v_max         numeric;
  v_max_trial   numeric;
  v_accepted    bigint;
  v_accepted_trial bigint;
  v_final_state public."EventAttendance";
BEGIN
  -- 1) Actor muss Mitglied der Event-Gruppe sein
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'forbidden: not a member of the event''s group' USING ERRCODE = '42501';
  END IF;

  -- 2) Event offen & nicht abgesagt
  SELECT (e."startingDateTime" > now() AND e."isCancelled" = FALSE)
  FROM public.events e
  WHERE e.id = p_event
  INTO v_event_open;

  IF COALESCE(v_event_open, false) = false THEN
    RAISE EXCEPTION 'event closed: cannot change attendance' USING ERRCODE = '22023';
  END IF;

  -- 3) Für andere zu-/absagen nur mit Permission
  IF p_user <> auth.uid() AND NOT public.authorize('event.manage.attendees') THEN
    RAISE EXCEPTION 'forbidden: cannot update other user''s attendance' USING ERRCODE = '42501';
  END IF;

  -- 4) Kapazität (Accepted zählt)
  SELECT e."maxAttendees" INTO v_max FROM public.events e WHERE e.id = p_event;
  SELECT e."max_trial_attendees" INTO v_max_trial FROM public.events e WHERE e.id = p_event;

  SELECT COUNT(*)::bigint
  INTO v_accepted
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'Attending';

  SELECT COUNT(*)::bigint
  INTO v_accepted_trial
  FROM public.event_attendance_user_mapping m
  WHERE m.event = p_event
    AND m.state = 'AttendingAsTrial';

  -- 5) Ziel-State bestimmen
  IF p_state = 'Declined' THEN
    v_final_state := 'Declined';

  ELSIF p_state = 'Attending' AND v_max IS NOT NULL AND v_accepted >= v_max THEN
    -- Kapazität voll -> auf Waiting (außer Declined)
    v_final_state := 'Waiting';

  ELSIF p_state = 'AttendingAsTrial' AND v_max_trial IS NOT NULL AND v_accepted_trial >= v_max_trial THEN
    -- Kapazität bei Trial voll -> auf WaitingAsTrial (außer Declined)
    v_final_state := 'WaitingAsTrial';

  ELSE
    v_final_state := p_state;
  END IF;

  -- Letzte Sicherheit. Als Trial User darf ich nicht Attendning oder Waiting als State haben
  IF (SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.group_user_mapping gum ON gum."group" = e."group"
    WHERE e.id = p_event
      AND gum."user" = auth.uid()
      AND gum."role" = 'trial'
  )) THEN
    IF v_final_state = 'Attending' THEN
      v_final_state = 'AttendingAsTrial';
    ELSIF v_final_state = 'Waiting' THEN
      v_final_state = 'WaitingAsTrial';
    END IF;
  END IF;

  -- 6) Upsert (RLS prüft zusätzlich INSERT/UPDATE-Policies)
  RETURN QUERY
  INSERT INTO public.event_attendance_user_mapping("user","event","state")
  VALUES (p_user, p_event, v_final_state)
  ON CONFLICT ("user","event") DO UPDATE
  SET state = EXCLUDED.state
  RETURNING *;
END;$function$
;


  create policy "attendance_insert_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for insert
  to authenticated
with check (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.manage.attendees'::text)) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.group_user_mapping gum ON ((gum."group" = e."group")))
  WHERE ((e.id = event_attendance_user_mapping.event) AND (gum."user" = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))));



  create policy "attendance_update_self_or_manager"
  on "public"."event_attendance_user_mapping"
  as permissive
  for update
  to authenticated
using (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.manage.attendees'::text)) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))))
with check (((("user" = ( SELECT auth.uid() AS uid)) OR public.authorize('event.manage.attendees'::text)) AND (EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = event_attendance_user_mapping.event) AND (e."startingDateTime" > now()) AND (e."isCancelled" = false))))));
