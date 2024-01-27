CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
    INSERT INTO public.user (id, displayName, email, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'displayName',
      NEW.raw_user_meta_data ->> 'email',
      NEW.raw_user_meta_data ->> 'role'
    );
    RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.eventcreation()
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
declare
  request_id bigint;
BEGIN
  select net.http_post(
          url:='https://xibmjvkjkdxdbmreicps.supabase.co/functions/v1/event-creation',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer REMOVED_KEY"}'::jsonb,
          body:='{"name":"Functions"}'::jsonb
      ) into request_id;
  return request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_attending_users(event_id bigint)
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
      SELECT userID FROM users WHERE 'eventComments' = any (notificationTags) AND "userId" in (
    SELECT "user" FROM event_attendance_user_mapping WHERE state = 'Attending' AND event = event_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.getattendingusers(event_id bigint)
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
      select "userId" from "user"
      where
        'edit;user' = any (permissions)
      and
        "userId" in (
          select "user" from event_attendance_user_mapping
            where
              state = 'Attending' and event = event_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.getusersforeventcommentnotifications(event_id bigint)
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
      select "userId" from "user"
      where
        'eventComments' = any (notifications)
      and
        "userId" in (
          select "user" from event_attendance_user_mapping
            where
              state = 'Attending' and event = event_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.getusersfornotificationstag(tag "NotificationTags")
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
      SELECT "userId" FROM "user" WHERE tag = any (notifications);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.getusersforpaymentrequestnotifications()
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
      SELECT "userId" FROM "user" WHERE 'paymentRequest' = any (notifications);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.getusersforuserregistrationnotifications()
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
      SELECT userID FROM users WHERE 'userRegistrations' = any (notifications);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sendnotifications(external_ids text)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
declare
  request_id bigint;
BEGIN
  select net.http_post (
    url := 'https://xibmjvkjkdxdbmreicps.supabase.co/functions/v1/event_notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REMOVED_KEY"}'::jsonb,
    body := format('{"include_aliases": {"external_id": [$s]}, "contents": {"en": "Englisch or Any Language Message"}}', external_ids)::jsonb
  ) as request_id;
  return request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sendnotifications(external_ids text[])
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
declare
  request_id bigint;
  externalIdsForOneSignal text;
BEGIN
  externalIdsForOneSignal := array_to_string(external_ids, ",");
  select net.http_post (
    url := 'https://xibmjvkjkdxdbmreicps.supabase.co/functions/v1/event_notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REMOVED_KEY"}'::jsonb,
    body := '{"include_aliases": {"external_id": ['+externalIdsForOneSignal+']}, "contents": {
    "en": "Englisch or Any Language Message"
  }}'::jsonb
  ) as request_id;
  return request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.updatewaitinglistattendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  declare
  BEGIN
    if((Select count(*) from event_attendance_user_mapping where event_attendance_user_mapping.event = NEW.event AND event_attendance_user_mapping.state = 'Attending') < (Select events."maxAttendees" from events where events.id = NEW.event LIMIT 1) AND NEW.state = 'Declined') then

    UPDATE event_attendance_user_mapping
    SET state = 'Attending'
    WHERE event_attendance_user_mapping.user = (SELECT event_attendance_user_mapping.user from event_attendance_user_mapping where event_attendance_user_mapping.state = 'Waiting' AND event_attendance_user_mapping.event = NEW.event order by event_attendance_user_mapping."lastUpdate" Limit 1);
    end if;
    return NEW;
  END;
  $function$
;

CREATE TRIGGER "WaitingListAttendanceTrigger" AFTER DELETE OR UPDATE ON public.event_attendance_user_mapping FOR EACH ROW EXECUTE FUNCTION updatewaitinglistattendance();