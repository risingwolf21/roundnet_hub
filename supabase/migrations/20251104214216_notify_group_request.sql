set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._trg_group_join_requested_to_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Only act for joinRequested rows; ignore other roles
  if (tg_op = 'INSERT' and new.role = 'joinRequested') then
    perform public.notify_group_join_requested(new."group", new."user", auth.uid()::text);
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_group_join_requested(p_group uuid, p_user text, p_actor text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant uuid := '00000000-0000-0000-0000-000000000000';
  v_topic  text := 'group.request.received';
  v_cnt    int  := 0;
  v_url    text := '/groups/' || p_group::text;
  v_title  text := 'Neue Beitrittsanfrage';
  v_body   text;
  v_group_name text;
  v_user_display text;
begin
  -- group name
  select g.name into v_group_name
  from public.event_group g
  where g.id = p_group;

  -- requester display (best-effort)
  select coalesce(u."displayName", u."name", p_user::text)
    into v_user_display
    from public."user" u
   where u."userId" = p_user;

  v_body := coalesce(v_user_display, p_user::text) || ' möchte der Gruppe "' || coalesce(v_group_name, '') || '" beitreten.';

  with recipients as (
      -- only admins of this group, exclude actor if present
      select distinct gum."user" as uid
        from public.group_user_mapping gum
       where gum."group" = p_group
         and gum.role = 'admin'
         and gum."user" <> coalesce(p_actor, '')
  ),
  allowed as (
      select r.uid
        from recipients r
       where public.is_topic_enabled_for_user(r.uid, v_tenant, v_topic, 'group', p_group)
  ),
  ins as (
      insert into public.notifications("user", tenant, topic, title, body, data, source_type, source_id)
      select a.uid, v_tenant, v_topic,
             v_title,
             v_body,
             jsonb_build_object('group', p_group, 'requester', p_user, 'url', v_url),
             'group', p_group
        from allowed a
      returning id,"user"
  ),
  outbox as (
      insert into public.notification_outbox("user", tenant, title, body, data, urgency, notification)
      select i."user", v_tenant,
             v_title,
             v_body,
             jsonb_build_object('group', p_group, 'requester', p_user, 'url', v_url),
             'normal',
             i.id
        from ins i
      returning id,"user"
  )
  insert into public.notification_outbox_targets(outbox_id, subscription_id)
  select o.id, s.id
    from outbox o
    join public.web_push_subscriptions s
      on s."user" = o."user"
     and s.revoked_at is null;

  get diagnostics v_cnt = row_count;
  return v_cnt;
end;
$function$
;

CREATE TRIGGER trg_group_join_requested_to_notify AFTER INSERT ON public.group_user_mapping FOR EACH ROW EXECUTE FUNCTION _trg_group_join_requested_to_notify();
