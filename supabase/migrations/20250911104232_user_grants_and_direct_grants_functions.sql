revoke delete on table "public"."user_grants" from "authenticated";

revoke insert on table "public"."user_grants" from "authenticated";

revoke update on table "public"."user_grants" from "authenticated";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.grant_group_grants(p_group uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
  v_is_group_admin boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  -- Gruppen-Admin?
  select exists(
           select 1
             from public.group_user_mapping gum
            where gum."group" = p_group
              and gum."user"  = v_uid
              and gum."role"  = 'admin'
         )
    into v_is_group_admin;

  if not (v_is_admin or v_is_group_admin) then
    raise exception 'forbidden (not group admin)' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    insert into public.permissions(name)
    select distinct k from unnest(p_perms) u(k)
    on conflict do nothing;

    insert into public.group_permissions("group","permission")
    select p_group, k from unnest(p_perms) u(k)
    on conflict do nothing;
  end if;

  if array_length(p_feats,1) is not null then
    begin
      insert into public.features(name)
      select distinct k from unnest(p_feats) u(k)
      on conflict do nothing;

      insert into public.group_features("group","feature")
      select p_group, k from unnest(p_feats) u(k)
      on conflict do nothing;
    exception
      when undefined_table then
        -- installations ohne group_features: ignorieren
        raise notice 'group_features table not found – skipping feature grants for group %', p_group;
    end;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.grant_user_grants(p_user text, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not v_is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Normalize: leere Arrays abfangen
  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  -- (optional) fehlende Stammsätze anlegen – falls FK existiert
  if array_length(p_perms,1) is not null then
    insert into public.permissions(name)
    select distinct k from unnest(p_perms) u(k)
    on conflict do nothing;

    insert into public.user_direct_grants("user", tenant, kind, key)
    select p_user, p_tenant, 'perm', k from unnest(p_perms) u(k)
    on conflict do nothing;
  end if;

  if array_length(p_feats,1) is not null then
    insert into public.features(name)
    select distinct k from unnest(p_feats) u(k)
    on conflict do nothing;

    insert into public.user_direct_grants("user", tenant, kind, key)
    select p_user, p_tenant, 'feat', k from unnest(p_feats) u(k)
    on conflict do nothing;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_group_grants(p_group uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
  v_is_group_admin boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;

  select exists(
           select 1
             from public.group_user_mapping gum
            where gum."group" = p_group
              and gum."user"  = v_uid
              and gum."role"  = 'admin'
         )
    into v_is_group_admin;

  if not (v_is_admin or v_is_group_admin) then
    raise exception 'forbidden (not group admin)' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    delete from public.group_permissions
     where "group" = p_group
       and "permission" = any(p_perms);
  end if;

  if array_length(p_feats,1) is not null then
    begin
      delete from public.group_features
       where "group" = p_group
         and "feature" = any(p_feats);
    exception
      when undefined_table then
        raise notice 'group_features table not found – skipping feature revokes for group %', p_group;
    end;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_user_grants(p_user text, p_tenant uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid, p_perms text[] DEFAULT ARRAY[]::text[], p_feats text[] DEFAULT ARRAY[]::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid text := auth.uid()::text;
  v_is_admin boolean := coalesce(public.authorize('supabase.admin'), false)
                     or coalesce(public.authorize('grants.manage'), false);
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28P01';
  end if;
  if not v_is_admin then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  p_perms := coalesce(p_perms, array[]::text[]);
  p_feats := coalesce(p_feats, array[]::text[]);

  if array_length(p_perms,1) is not null then
    delete from public.user_direct_grants
     where "user" = p_user
       and tenant = p_tenant
       and kind   = 'perm'
       and key    = any(p_perms);
  end if;

  if array_length(p_feats,1) is not null then
    delete from public.user_direct_grants
     where "user" = p_user
       and tenant = p_tenant
       and kind   = 'feat'
       and key    = any(p_feats);
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.event_comment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
    currentEvent  public.events;
begin

    select * into currentEvent from public.events where id = new.event limit 1;

    insert into notifications (body, "user", title)
    select concat(new."displayName", ' : ', new.comment) as body, "userId" as user, currentEvent.title as title
    from public."user"
    where 'eventComments' = ANY (select notification_tag from user_notification_settings where "user" = public."user"."userId")
      and "userId" = ANY (array(select event_attendance_user_mapping."user"
                                from event_attendance_user_mapping
                                where event = new.event
                                  and state = 'Attending')::text[]);
    return new;
end;$function$
;

INSERT INTO public.permissions (name) values('grants.manage') ON CONFLICT DO NOTHING;
