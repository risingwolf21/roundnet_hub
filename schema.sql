

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "games";


ALTER SCHEMA "games" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "permissions";


ALTER SCHEMA "permissions" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."EventAttendance" AS ENUM (
    'Declined',
    'Attending',
    'Unanswered',
    'Waiting',
    'AttendingAsTrainer'
);


ALTER TYPE "public"."EventAttendance" OWNER TO "postgres";


CREATE TYPE "public"."EventRecurrence" AS ENUM (
    'Weekly',
    'Fortnightly',
    'Monthly',
    'None'
);


ALTER TYPE "public"."EventRecurrence" OWNER TO "postgres";


CREATE TYPE "public"."ItemType" AS ENUM (
    'mtvStorage',
    'mtvGym',
    'mtvGymPalazzo',
    'goethe'
);


ALTER TYPE "public"."ItemType" OWNER TO "postgres";


CREATE TYPE "public"."NotificationTags" AS ENUM (
    'eventComments',
    'userRegistration',
    'paymentRequest',
    'paymentPending',
    'eventCancelled',
    'eventUpdated',
    'eventAttedanceChanged',
    'challengeUpdate'
);


ALTER TYPE "public"."NotificationTags" OWNER TO "postgres";


CREATE TYPE "public"."PaymentState" AS ENUM (
    'Open',
    'Fulfilled'
);


ALTER TYPE "public"."PaymentState" OWNER TO "postgres";


CREATE TYPE "public"."ProductType" AS ENUM (
    'Drink',
    'Special',
    'None'
);


ALTER TYPE "public"."ProductType" OWNER TO "postgres";


CREATE TYPE "public"."UserRole" AS ENUM (
    'user',
    'admin',
    'procure',
    'finance',
    'trainer'
);


ALTER TYPE "public"."UserRole" OWNER TO "postgres";


CREATE TYPE "public"."app_permission" AS ENUM (
    'event.select',
    'event.update',
    'event.insert',
    'event.delete',
    'drink.select',
    'drink.update',
    'drink.insert',
    'drink.delete',
    'group.select',
    'group.update',
    'group.insert',
    'group.delete',
    'challenge.select',
    'challenge.update',
    'challenge.insert',
    'challenge.delete',
    'payments.select',
    'payments.update',
    'payments.insert',
    'payments.delete',
    'item.select',
    'item.update',
    'item.insert',
    'item.delete'
);


ALTER TYPE "public"."app_permission" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_drink_history"("drink_id" numeric, "payment_id" numeric, "count" numeric, "amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_id text := auth.uid()::text;
    remaining_count numeric := count;
    voucher_record RECORD;
BEGIN
    -- Fetch all available vouchers for the user
    FOR voucher_record IN
        SELECT id, available
        FROM user_vouchers
    LOOP
        -- If the remaining count is fulfilled, exit the loop
        IF remaining_count <= 0 THEN
            EXIT;
        END IF;

        -- Check if the voucher has enough available count
        IF voucher_record.available > 0 THEN
            IF voucher_record.available < remaining_count THEN
                -- Create a history entry with the voucher for the available amount
                INSERT INTO history (drink, "user", payment, count, amount, voucher)
                VALUES (drink_id, user_id, payment_id, voucher_record.available, amount, voucher_record.id);
                
                -- Decrease the remaining count
                remaining_count := remaining_count - voucher_record.available;
            ELSE
                -- Create a history entry with the voucher for the remaining count
                INSERT INTO history (drink, "user", payment, count, amount, voucher)
                VALUES (drink_id, user_id, payment_id, remaining_count, amount, voucher_record.id);
                
                -- Set remaining count to zero as it is fulfilled
                remaining_count := 0;
            END IF;
        END IF;
    END LOOP;

    -- If there is still remaining count, create a history entry without a voucher
    IF remaining_count > 0 THEN
        INSERT INTO history (drink, "user", payment, count, amount)
        VALUES (drink_id, user_id, payment_id, remaining_count, amount);
    END IF;
END;
$$;


ALTER FUNCTION "public"."add_drink_history"("drink_id" numeric, "payment_id" numeric, "count" numeric, "amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_history_to_challenge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
/* Challenge 4 = Drink Challenge */
INSERT INTO challenge_stats ("user", "challenge", "count")
values (new.user, 4, new.count);
return new;
end;
$$;


ALTER FUNCTION "public"."add_history_to_challenge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_item_history_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    insert into item_history("pastUser", "currentUser", key)
    values (old."current_holder", new."current_holder", new.id);
    return new;
end;
$$;


ALTER FUNCTION "public"."add_item_history_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_notificationtags_to_all_users"("notification" "public"."NotificationTags") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
update public.user
set
  notifications = ARRAY(SELECT DISTINCT UNNEST(notifications || notification));
end;
$$;


ALTER FUNCTION "public"."add_notificationtags_to_all_users"("notification" "public"."NotificationTags") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize"("requested_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  bind_permissions int;
  roles text[];
begin
  -- Fetch user role once and store it to reduce number of calls
  select array_agg(elem) into roles from (
    select jsonb_array_elements_text(auth.jwt() -> 'user_roles') as elem
  ) as subquery;

  select count(*)
  into bind_permissions
  from public.role_permissions
  where role_permissions.app_permission = any (Select id from public.app_permissions where name = requested_permission limit 1)
    and role_permissions.app_role::text = any (roles);

  if (bind_permissions = 0) then
   raise exception 'No permission to execute this action: % with roles % from user %', requested_permission, roles, (auth.jwt() -> 'user_roles');
  end if;

  return bind_permissions > 0;
end;
$$;


ALTER FUNCTION "public"."authorize"("requested_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorizewithrole"("requested_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  bind_roles int;
  roles uuid[];
begin
  select array_agg(elem::uuid) into roles from (
    select jsonb_array_elements_text(auth.jwt() -> 'user_roles') as elem
  ) as subquery;

  select count(*)
  into bind_roles
  from public.user_roles
  where app_role = any (roles);

  if (bind_roles = 0) then
   raise exception 'No permission to execute this action with role %', requested_role;
  end if;

  return bind_roles > 0;
end;
$$;


ALTER FUNCTION "public"."authorizewithrole"("requested_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."challenge_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
currentChallenge  public.challenge;
currentUser
public.user;
begin

select *
into currentChallenge
from "challenge"
where id = new.challenge limit 1;
select *
into currentUser
from "user"
where "userId" = new.user limit 1;

if
        currentChallenge is null then
        raise exception 'Could not select given challenge';
    end if;
    if
        currentUser is null then
        raise exception 'Could not select given user';
    end if;

insert into notifications (body, "user", title)
select concat(currentUser."displayName", ' + ', new.count) as body, currentUser."userId" as user, currentChallenge.name as title
from public."user"
where 'challengeUpdate' = ANY ("notifications")
  and "fcm_token" is not null
  and "userId" = ANY (array(select group_user_mapping."user"
    from group_user_mapping
    where "group" = currentChallenge.group)::text[]);
return new;
end;
$$;


ALTER FUNCTION "public"."challenge_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_version"("input_version" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN

IF
'1.6.0'::text = input_version THEN
        RETURN TRUE;
ELSE
        raise exception 'Version mismatch';
END IF;
END;
$$;


ALTER FUNCTION "public"."check_version"("input_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
  declare
    claims jsonb;
    roles text[];
  begin
    -- Fetch the user role in the user_roles table
    Select array(select app_role::text from public.user_roles where user_roles.user = (event->>'user_id')) into roles;

    claims := event->'claims';

    if roles is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_roles}', to_jsonb(roles));
    else
      claims := jsonb_set(claims, '{user_roles}', '[]'::jsonb);
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_cancelled_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    currentEvent  public.events;
    body text;
begin

    if new."isCancelled" then
        body = 'Dieses Event wurde abgesagt';
    else
        body = 'Dieses Event findet wieder statt';
    end if;

    insert into notifications (body, "user", title)
    select body, "userId" as user, new.title as title
    from public."user"
    where 'eventCancelled' = ANY ("notifications")
      and "fcm_token" is not null
      and "userId" = ANY (array(select event_attendance_user_mapping."user"
                                from event_attendance_user_mapping
                                where event = new.id
                                  and state = 'Attending')::text[]);
    return new;
end;
$$;


ALTER FUNCTION "public"."event_cancelled_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_comment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    currentEvent  public.events;
begin

    select * into currentEvent from events where id = new.event limit 1;

    insert into notifications (body, "user", title)
    select concat(new."displayName", ' : ', new.comment) as body, "userId" as user, currentEvent.title as title
    from public."user"
    where 'eventComments' = ANY ("notifications")
      and "fcm_token" is not null
      and "userId" = ANY (array(select event_attendance_user_mapping."user"
                                from event_attendance_user_mapping
                                where event = new.event
                                  and state = 'Attending')::text[]);
    return new;
end;
$$;


ALTER FUNCTION "public"."event_comment_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eventcreation"() RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$declare 
  request_id text;
BEGIN
  select net.http_post(
          url:='https://PROJECT_REF.supabase.co/functions/v1/event-creation',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer REMOVED_KEY"}'::jsonb,
          body:='{"name":"Functions"}'::jsonb
      ) as request_id;
      return request_id;
END;$$;


ALTER FUNCTION "public"."eventcreation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_query"("query_text" "text") RETURNS TABLE("result" "json")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Stelle sicher, dass die Abfrage in JSON umgewandelt wird
  RETURN QUERY EXECUTE FORMAT(
  'SELECT row_to_json(t) AS result FROM (%s) t',
  query_text
);
END;
$$;


ALTER FUNCTION "public"."execute_query"("query_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_sql"("query" "text") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
declare
  result json;
begin
  execute format('SELECT json_agg(row_to_json(t)) FROM (%s) AS t', query) into result;
  return result;
end;
$$;


ALTER FUNCTION "public"."execute_sql"("query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_attending_users"("event_id" bigint) RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
RETURN QUERY
      SELECT userID FROM users WHERE 'eventComments' = any (notificationTags) AND "userId" in (
    SELECT "user" FROM event_attendance_user_mapping WHERE state = 'Attending' AND event = event_id
  );
END;
$$;


ALTER FUNCTION "public"."get_attending_users"("event_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enum_types"() RETURNS TABLE("enum_name" "text", "enum_values" "text"[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_type.typname::text AS enum_name,
        ARRAY_AGG(pg_enum.enumlabel::text) AS enum_values
    FROM 
        pg_enum
    JOIN 
        pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE 
        pg_type.typcategory = 'E'  -- 'E' indicates enum types
        AND pg_type.typname NOT IN ('aal_level', 'action', 'code_challenge_method', 'equality_op','factor_status','factor_type','key_status','key_type','one_time_token_type','request_status')  -- Replace with actual enum names to exclude
    GROUP BY 
        pg_type.typname;
END;
$$;


ALTER FUNCTION "public"."get_enum_types"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
payment_id bigint;
BEGIN
SELECT id
INTO payment_id
FROM payments
WHERE "userId" = user_id
  AND "paymentState" = 'Open';
IF
payment_id IS NULL THEN
        INSERT INTO payments ("userId", "amountToPay", "paymentState")
        VALUES (user_id, 0, 'Open')
        RETURNING id INTO payment_id;
END IF;
RETURN payment_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_table_names"() RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT table_name::text
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
END;
$$;


ALTER FUNCTION "public"."get_public_table_names"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."getattendingusers"("event_id" bigint) RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."getattendingusers"("event_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.user (email, "displayName", "userId", role, permissions)
  values (new.raw_user_meta_data ->> 'email', new.raw_user_meta_data ->> 'displayName', new.id, 'user', '{"use;drink","view;drink","use;training","view;training","view;groups","use;user","view;user","view;keyFinder"}');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$begin
insert into public.notifications (body, "user", title)
select concat(new."displayName", ' hat sich neu registriert!') as body,
       "userId"                                                as "user",
       'Nutzerregistrierung'                                   as title
from public."user"
where 'userRegistration' = ANY ("notifications")
  and fcm_token is not null;
return new;
end;$$;


ALTER FUNCTION "public"."handle_new_user_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" numeric, "amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
currentChallenge public.challenge;
BEGIN
select *
into currentChallenge
from public.challenge
where id = challenge_id
    limit 1;

if
currentChallenge is null then
        raise exception 'Could not select given challenge';
end if;

if currentChallenge.automated then
   raise exception 'This challenge is automated. You can not add any points manually';
end if;

if
((Select count(*)
          from challenge_stats
          where "user" = user_id
            and "challenge" = challenge_id
            and DATE_PART('week', created_at) = DATE_PART('week', now())) >= currentChallenge.max_points_per_week) then
        raise exception 'Maximum points per week already reached';
        return;
end if;
if ((Select count(*)
          from challenge_stats
          where "user" = user_id
            and "challenge" = challenge_id
            and  created_at::date = now()::date) > 0) then 
        raise exception 'Maximum points per day already reached';
        return;
end if;
        
        INSERT INTO challenge_stats ("user", "challenge", "count")
        values (user_id, challenge_id, amount);

END;

$$;


ALTER FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" numeric, "amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_notificationtags_from_all_users"("notification" "public"."NotificationTags") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
update public.user
set
  notifications = array_remove(notifications, notification)
where role != 'admin';
end;
$$;


ALTER FUNCTION "public"."remove_notificationtags_from_all_users"("notification" "public"."NotificationTags") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."event_attendance_user_mapping" (
    "lastUpdate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "state" "public"."EventAttendance" DEFAULT 'Unanswered'::"public"."EventAttendance" NOT NULL,
    "event" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."event_attendance_user_mapping" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") RETURNS SETOF "public"."event_attendance_user_mapping"
    LANGUAGE "plpgsql"
    AS $$declare
currentEvent events;
    newState
public."EventAttendance";
begin
    -- lookup event for eventId
select *
into currentEvent
from events
where id = eventId limit 1;

if
(
Select events."maxAttendees" is not null
from events
where events.id = eventId) and (
(select count (*)
from event_attendance_user_mapping
where event = eventId) >= (
Select events."maxAttendees"
from events
where events.id = eventId LIMIT 1)) then
    --- max attendees reached, new attendance need to be on waiting list
    newState = 'Waiting';
else
      newState = update_attendance.state;
end if;

    if
(update_attendance.state = 'Declined') then
      newState = update_attendance.state;
end if;

return query insert into event_attendance_user_mapping("user", "event", "state")
      values (userId, eventId, newState)
      on conflict("user", "event")
      do
update set state = newState
    returning *;
end;$$;


ALTER FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_attendance_on_maxattendees_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    newEvent public.events;
begin
    select * into newEvent from events where id = new.id limit 1;
    if (new."maxAttendees" < old."maxAttendees") then
        WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                 FROM event_attendance_user_mapping
                                 WHERE event = new.id
                                   AND state = 'Attending'
                                 ORDER BY "lastUpdate"
                                 OFFSET newEvent."maxAttendees")
        UPDATE event_attendance_user_mapping
        SET state = 'Waiting'
        WHERE event_attendance_user_mapping."event" = new.id
          and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
    else
        if (new."maxAttendees" > old."maxAttendees") then
            WITH users_to_update AS (SELECT event_attendance_user_mapping."user"
                                     FROM event_attendance_user_mapping
                                     WHERE event = new.id
                                       AND state = 'Waiting'
                                     ORDER BY "lastUpdate"
                                     LIMIT (new."maxAttendees" - old."maxAttendees"))
            UPDATE event_attendance_user_mapping
            SET state = 'Attending'
            WHERE event_attendance_user_mapping."event" = new.id
              and event_attendance_user_mapping."user" IN (SELECT * FROM users_to_update);
        end if;
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."update_attendance_on_maxattendees_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."updatewaitinglistattendance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  declare
  BEGIN
    if((Select count(*) from event_attendance_user_mapping where event_attendance_user_mapping.event = NEW.event AND event_attendance_user_mapping.state = 'Attending') < (Select events."maxAttendees" from events where events.id = NEW.event LIMIT 1) AND NEW.state = 'Declined') then

    UPDATE event_attendance_user_mapping
    SET state = 'Attending'
    WHERE event_attendance_user_mapping.user = (SELECT event_attendance_user_mapping.user from event_attendance_user_mapping where event_attendance_user_mapping.state = 'Waiting' AND event_attendance_user_mapping.event = NEW.event order by event_attendance_user_mapping."lastUpdate" Limit 1);
    end if;
    return NEW;
  END;
  $$;


ALTER FUNCTION "public"."updatewaitinglistattendance"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."players" (
    "player" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "index" numeric DEFAULT '1000'::numeric NOT NULL
);


ALTER TABLE "games"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."app_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."app_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "group" bigint NOT NULL,
    "max_points_per_week" bigint,
    "automated" boolean DEFAULT false NOT NULL,
    "end_date" timestamp with time zone
);


ALTER TABLE "public"."challenge" OWNER TO "postgres";


ALTER TABLE "public"."challenge" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."challenge_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."challenge_stats" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "count" numeric DEFAULT '0'::numeric NOT NULL,
    "challenge" bigint NOT NULL
);


ALTER TABLE "public"."challenge_stats" OWNER TO "postgres";


ALTER TABLE "public"."challenge_stats" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."challenge_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."events" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "meetingDateTime" timestamp with time zone,
    "startingDateTime" timestamp with time zone NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "endDateTime" timestamp with time zone,
    "key" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "isCancelled" boolean DEFAULT false NOT NULL,
    "place" "text",
    "recurrence" "public"."EventRecurrence" DEFAULT 'None'::"public"."EventRecurrence" NOT NULL,
    "group" bigint,
    "answerDeadline" timestamp with time zone,
    "maxAttendees" numeric,
    "recurrenceEnd" timestamp with time zone,
    "required_item" "public"."ItemType",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."current_distinct_event" AS
 SELECT DISTINCT ON ("events"."key") "events"."id",
    "events"."created_at",
    "events"."description",
    "events"."meetingDateTime",
    "events"."startingDateTime",
    "events"."title",
    "events"."endDateTime",
    "events"."key",
    "events"."isCancelled",
    "events"."place",
    "events"."recurrence",
    "events"."group",
    "events"."answerDeadline",
    "events"."maxAttendees",
    "events"."recurrenceEnd"
   FROM "public"."events"
  WHERE ((("events"."endDateTime" > "now"()) OR ("events"."endDateTime" IS NULL)) AND ("events"."startingDateTime" > "now"()) AND ("events"."recurrence" <> 'None'::"public"."EventRecurrence"))
  ORDER BY "events"."key",
        CASE
            WHEN (("events"."startingDateTime" - "now"()) >= '00:00:00'::interval) THEN ("events"."startingDateTime" - "now"())
            ELSE ("now"() - "events"."startingDateTime")
        END;


ALTER TABLE "public"."current_distinct_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drink" (
    "id" bigint NOT NULL,
    "name" character varying,
    "price" real DEFAULT '0'::real,
    "stock" bigint,
    "imageUrl" "text",
    "active" boolean DEFAULT false NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "previousDrink" bigint,
    "type" "public"."ProductType" DEFAULT 'None'::"public"."ProductType" NOT NULL
);


ALTER TABLE "public"."drink" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."distinct_drinks" AS
 SELECT DISTINCT ON ("drink"."id") "drink"."id",
    "drink"."name",
    "drink"."price",
    "drink"."stock",
    "drink"."type",
    "drink"."active",
    "drink"."deleted",
    "drink"."imageUrl",
    "drink"."previousDrink"
   FROM "public"."drink"
  WHERE ("drink"."active" AND ("drink"."deleted" IS FALSE))
  ORDER BY "drink"."id";


ALTER TABLE "public"."distinct_drinks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."distinct_event" AS
 SELECT DISTINCT ON ("events"."key") "events"."id",
    "events"."created_at",
    "events"."description",
    "events"."meetingDateTime",
    "events"."startingDateTime",
    "events"."title",
    "events"."endDateTime",
    "events"."key",
    "events"."isCancelled",
    "events"."place",
    "events"."recurrence",
    "events"."group",
    "events"."answerDeadline",
    "events"."maxAttendees",
    "events"."recurrenceEnd"
   FROM "public"."events"
  WHERE (("events"."startingDateTime" > "now"()) AND ("events"."recurrence" <> 'None'::"public"."EventRecurrence"))
  ORDER BY "events"."key", "events"."startingDateTime" DESC;


ALTER TABLE "public"."distinct_event" OWNER TO "postgres";


ALTER TABLE "public"."drink" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."drink_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."event_comments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "comment" "text" DEFAULT ''::"text" NOT NULL,
    "displayName" "text" DEFAULT ''::"text" NOT NULL,
    "event" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."event_comments" OWNER TO "postgres";


ALTER TABLE "public"."event_comments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."event_comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."event_group" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "color" "text" DEFAULT '#000000'::"text" NOT NULL
);


ALTER TABLE "public"."event_group" OWNER TO "postgres";


ALTER TABLE "public"."event_group" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."event_group_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."group_user_mapping" (
    "group" bigint NOT NULL,
    "user" "text" NOT NULL
);


ALTER TABLE "public"."group_user_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."history" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "drink" bigint NOT NULL,
    "user" "text" NOT NULL,
    "count" bigint NOT NULL,
    "payment" bigint NOT NULL,
    "amount" numeric DEFAULT '0'::numeric NOT NULL,
    "voucher" "uuid"
);


ALTER TABLE "public"."history" OWNER TO "postgres";


ALTER TABLE "public"."history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."item_history" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pastUser" "text",
    "currentUser" "text",
    "key" bigint
);


ALTER TABLE "public"."item_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "color" "text" DEFAULT '#88AEBF'::"text" NOT NULL,
    "type" "public"."ItemType",
    "lastUpdate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_holder" "text"
);


ALTER TABLE "public"."items" OWNER TO "postgres";


ALTER TABLE "public"."item_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."key_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."keys_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "user" "text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "userId" "text" NOT NULL,
    "amountToPay" numeric DEFAULT '0'::numeric NOT NULL,
    "paymentState" "public"."PaymentState" DEFAULT 'Open'::"public"."PaymentState" NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


ALTER TABLE "public"."payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "displayName" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "userId" "text" DEFAULT ''::"text" NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "role" "public"."UserRole" DEFAULT 'user'::"public"."UserRole" NOT NULL,
    "disabled" boolean DEFAULT false NOT NULL,
    "notifications" "public"."NotificationTags"[],
    "avatarUrl" "text",
    "fcm_token" "text"
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."readable_history" AS
 SELECT "history"."id",
    "to_char"("history"."created_at", 'dd.mm.yyyy'::"text") AS "date",
    "to_char"("history"."created_at", 'HH:MM:SS'::"text") AS "time",
    "user"."displayName",
    "drink"."name",
    "history"."amount",
    "history"."count"
   FROM (("public"."history"
     LEFT JOIN "public"."user" ON (("history"."user" = "user"."userId")))
     LEFT JOIN "public"."drink" ON (("history"."drink" = "drink"."id")))
  ORDER BY "history"."created_at" DESC;


ALTER TABLE "public"."readable_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_role" "uuid" NOT NULL,
    "app_permission" "uuid" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" bigint NOT NULL,
    "user" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_role" "uuid" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE "public"."user_roles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."user_vouchers" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::timestamp with time zone AS "created_at",
    NULL::"text" AS "title",
    NULL::numeric AS "available";


ALTER TABLE "public"."user_vouchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text",
    "total_drinks" numeric DEFAULT '0'::numeric NOT NULL,
    "used_drinks" numeric DEFAULT '0'::numeric NOT NULL,
    "title" "text"
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


ALTER TABLE ONLY "games"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("player");



ALTER TABLE ONLY "public"."app_permissions"
    ADD CONSTRAINT "app_permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."app_permissions"
    ADD CONSTRAINT "app_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge"
    ADD CONSTRAINT "challenge_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drink"
    ADD CONSTRAINT "drinks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_pkey" PRIMARY KEY ("user", "event");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_group"
    ADD CONSTRAINT "event_group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_pkey" PRIMARY KEY ("group", "user");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "key_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userId");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE VIEW "public"."user_vouchers" AS
 SELECT "v"."id",
    "v"."created_at",
    "v"."title",
    ("v"."total_drinks" - ("count"("h"."id"))::numeric) AS "available"
   FROM ("public"."vouchers" "v"
     LEFT JOIN "public"."history" "h" ON (("v"."id" = "h"."voucher")))
  WHERE ("v"."user" = ("auth"."uid"())::"text")
  GROUP BY "v"."id", "v"."title", "v"."total_drinks", "v"."used_drinks"
 HAVING (("count"("h"."id"))::numeric < "v"."total_drinks");



CREATE OR REPLACE TRIGGER "WaitingListAttendanceTrigger" AFTER DELETE OR UPDATE ON "public"."event_attendance_user_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."updatewaitinglistattendance"();



CREATE OR REPLACE TRIGGER "fcm_push" AFTER INSERT OR UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://PROJECT_REF.supabase.co/functions/v1/fcm_push', 'POST', '{"Content-type":"application/json"}', '{}', '1000');



CREATE OR REPLACE TRIGGER "item_history_trigger" AFTER UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."add_item_history_entry"();



CREATE OR REPLACE TRIGGER "maxattendees_change_trigger" AFTER UPDATE ON "public"."events" FOR EACH ROW WHEN (("new"."maxAttendees" <> "old"."maxAttendees")) EXECUTE FUNCTION "public"."update_attendance_on_maxattendees_change"();



CREATE OR REPLACE TRIGGER "on_auth_user_created_notification" AFTER INSERT ON "public"."user" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_notification"();



CREATE OR REPLACE TRIGGER "on_challenge_stat_inserted" AFTER INSERT ON "public"."challenge_stats" FOR EACH ROW EXECUTE FUNCTION "public"."challenge_notification"();



CREATE OR REPLACE TRIGGER "on_event_cancelled" AFTER UPDATE ON "public"."events" FOR EACH ROW WHEN (("new"."isCancelled" <> "old"."isCancelled")) EXECUTE FUNCTION "public"."event_cancelled_notification"();



CREATE OR REPLACE TRIGGER "on_event_comment_inserted" AFTER INSERT ON "public"."event_comments" FOR EACH ROW EXECUTE FUNCTION "public"."event_comment_notification"();



CREATE OR REPLACE TRIGGER "on_history_inserted" AFTER INSERT ON "public"."history" FOR EACH ROW EXECUTE FUNCTION "public"."add_history_to_challenge"();



ALTER TABLE ONLY "games"."players"
    ADD CONSTRAINT "players_player_fkey" FOREIGN KEY ("player") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."challenge"
    ADD CONSTRAINT "challenge_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_challenge_fkey" FOREIGN KEY ("challenge") REFERENCES "public"."challenge"("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_drink_fkey" FOREIGN KEY ("drink") REFERENCES "public"."drink"("id");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_payment_fkey" FOREIGN KEY ("payment") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_voucher_fkey" FOREIGN KEY ("voucher") REFERENCES "public"."vouchers"("id");



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "item_history_key_fkey" FOREIGN KEY ("key") REFERENCES "public"."items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "key_history_currentuser_fkey" FOREIGN KEY ("currentUser") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "key_history_pastuser_fkey" FOREIGN KEY ("pastUser") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "keys_user_fkey" FOREIGN KEY ("current_holder") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_userid_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "public_notifications_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_app_permission_fkey" FOREIGN KEY ("app_permission") REFERENCES "public"."app_permissions"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_app_role_fkey" FOREIGN KEY ("app_role") REFERENCES "public"."app_roles"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_app_role_fkey" FOREIGN KEY ("app_role") REFERENCES "public"."app_roles"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "games"."players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Access to all users" ON "public"."item_history" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all" ON "public"."event_group" USING (true);



CREATE POLICY "Allow all" ON "public"."group_user_mapping" TO "authenticated" USING (true);



CREATE POLICY "Allow all" ON "public"."notifications" USING (true);



CREATE POLICY "Allow auth admin to read user roles" ON "public"."user_roles" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow authorized delete access" ON "public"."challenge" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('challenge.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized delete access" ON "public"."drink" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('drink.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized delete access" ON "public"."event_group" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('group.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized delete access" ON "public"."events" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('event.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized delete access" ON "public"."items" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('item.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized delete access" ON "public"."payments" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('payments.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "public"."challenge" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('challenge.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "public"."drink" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('drink.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "public"."event_group" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('group.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('event.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "public"."items" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('item.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('payments.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "public"."challenge" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('challenge.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "public"."drink" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('drink.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "public"."event_group" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('group.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "public"."events" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('event.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "public"."items" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('item.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "public"."payments" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('payments.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "public"."challenge" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('challenge.update'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "public"."drink" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('drink.update'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "public"."event_group" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('group.update'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "public"."events" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('event.update'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "public"."items" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('item.update'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "public"."payments" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('payments.update'::"text") AS "authorize"));



CREATE POLICY "Allow everything" ON "public"."app_permissions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow everything" ON "public"."app_roles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow everything" ON "public"."items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow select for all users" ON "public"."event_attendance_user_mapping" FOR SELECT USING ((( SELECT "events"."group"
   FROM "public"."events"
  WHERE ("events"."id" = "event_attendance_user_mapping"."event")) IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Allow select for authenticated" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authorize access for admin" ON "public"."role_permissions" USING (( SELECT (EXISTS ( SELECT 1
           FROM "jsonb_array_elements_text"(("auth"."jwt"() -> 'user_roles'::"text")) "roles"("value")
          WHERE ("roles"."value" = ( SELECT ("app_roles"."id")::"text" AS "id"
                   FROM "public"."app_roles"
                  WHERE ("app_roles"."name" = 'admin'::"text")
                 LIMIT 1)))) AS "exists")) WITH CHECK (true);



CREATE POLICY "Delete as admin" ON "public"."history" FOR DELETE USING ((( SELECT "user"."role"
   FROM "public"."user"
  WHERE ((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"."userId")) = 'admin'::"public"."UserRole"));



CREATE POLICY "Enable access for all users" ON "public"."payments" USING (true);



CREATE POLICY "Enable access for all users" ON "public"."user" TO "authenticated", "anon" USING (true);



CREATE POLICY "Enable access for all users" ON "public"."vouchers" USING (true);



CREATE POLICY "Enable delete for users based on user_id" ON "public"."challenge_stats" FOR DELETE USING ((( SELECT ("auth"."uid"())::"text" AS "uid") = "user"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."event_attendance_user_mapping" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = USER));



CREATE POLICY "Enable full access" ON "public"."user_roles" USING (true) WITH CHECK (true);



CREATE POLICY "Enable insert for users based on user_id" ON "public"."challenge_stats" FOR INSERT WITH CHECK ((( SELECT ("auth"."uid"())::"text" AS "uid") = "user"));



CREATE POLICY "Enable read access for all users" ON "public"."event_comments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for users based on user_id" ON "public"."challenge_stats" FOR UPDATE USING ((( SELECT ("auth"."uid"())::"text" AS "uid") = "user"));



CREATE POLICY "Insert for own user" ON "public"."history" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Insert when user in group for given event" ON "public"."event_attendance_user_mapping" FOR INSERT WITH CHECK ((( SELECT "events"."group"
   FROM "public"."events"
  WHERE ("events"."id" = "event_attendance_user_mapping"."event")) IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Select all with permission edit;payments" ON "public"."history" FOR SELECT USING (( SELECT "public"."authorize"('payments.update'::"text") AS "authorize"));



CREATE POLICY "Select challenge stats only if user is in group of challenge" ON "public"."challenge_stats" FOR SELECT USING ((( SELECT "challenge_stats"."challenge") IN ( SELECT "challenge"."id"
   FROM "public"."challenge"
  WHERE ("challenge"."group" IN ( SELECT "group_user_mapping"."group"
           FROM "public"."group_user_mapping"
          WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))))));



CREATE POLICY "Select challenges for user with group" ON "public"."challenge" FOR SELECT USING (( SELECT ("public"."authorize"('challenge.select'::"text") OR (( SELECT "challenge"."group") IN ( SELECT "group_user_mapping"."group"
           FROM "public"."group_user_mapping"
          WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))))));



CREATE POLICY "Select drinks as user" ON "public"."drink" FOR SELECT USING (("active" = true));



CREATE POLICY "Select events for user in group" ON "public"."events" FOR SELECT TO "authenticated" USING ((( SELECT "events"."group") IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Select for own user" ON "public"."history" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Update all as admin" ON "public"."history" FOR UPDATE USING ((( SELECT "user"."role"
   FROM "public"."user"
  WHERE ((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"."userId")) = 'admin'::"public"."UserRole"));



CREATE POLICY "Update attendance for given event when user is in group" ON "public"."event_attendance_user_mapping" FOR UPDATE USING ((( SELECT "events"."group"
   FROM "public"."events"
  WHERE ("events"."id" = "event_attendance_user_mapping"."event")) IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Update for own user" ON "public"."history" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Version check" ON "public"."challenge" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."challenge_stats" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."drink" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."event_attendance_user_mapping" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."event_comments" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."event_group" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."events" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."group_user_mapping" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."history" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."item_history" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."items" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."notifications" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."payments" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



CREATE POLICY "Version check" ON "public"."user" AS RESTRICTIVE USING ("public"."check_version"((("current_setting"('request.headers'::"text", true))::"json" ->> 'app_version'::"text")));



ALTER TABLE "public"."app_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drink" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_attendance_user_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_group" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_user_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."drink";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_comments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";








































































































































































































































































GRANT ALL ON FUNCTION "public"."add_drink_history"("drink_id" numeric, "payment_id" numeric, "count" numeric, "amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_drink_history"("drink_id" numeric, "payment_id" numeric, "count" numeric, "amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_drink_history"("drink_id" numeric, "payment_id" numeric, "count" numeric, "amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_history_to_challenge"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_history_to_challenge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_history_to_challenge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_notificationtags_to_all_users"("notification" "public"."NotificationTags") TO "anon";
GRANT ALL ON FUNCTION "public"."add_notificationtags_to_all_users"("notification" "public"."NotificationTags") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_notificationtags_to_all_users"("notification" "public"."NotificationTags") TO "service_role";



GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."authorizewithrole"("requested_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authorizewithrole"("requested_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorizewithrole"("requested_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."challenge_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."challenge_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."challenge_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."event_cancelled_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_cancelled_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_cancelled_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."event_comment_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_comment_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_comment_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."eventcreation"() TO "anon";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_query"("query_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_query"("query_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_query"("query_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enum_types"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_enum_types"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enum_types"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_payment_for_user"("user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_table_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_table_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_table_names"() TO "service_role";



GRANT ALL ON FUNCTION "public"."getattendingusers"("event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."getattendingusers"("event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."getattendingusers"("event_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" numeric, "amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" numeric, "amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" numeric, "amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_notificationtags_from_all_users"("notification" "public"."NotificationTags") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_notificationtags_from_all_users"("notification" "public"."NotificationTags") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_notificationtags_from_all_users"("notification" "public"."NotificationTags") TO "service_role";



GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") TO "anon";
GRANT ALL ON FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "anon";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "service_role";
























GRANT ALL ON TABLE "public"."app_permissions" TO "anon";
GRANT ALL ON TABLE "public"."app_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."app_roles" TO "anon";
GRANT ALL ON TABLE "public"."app_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."app_roles" TO "service_role";



GRANT ALL ON TABLE "public"."challenge" TO "anon";
GRANT ALL ON TABLE "public"."challenge" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge" TO "service_role";



GRANT ALL ON SEQUENCE "public"."challenge_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."challenge_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."challenge_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."challenge_stats" TO "anon";
GRANT ALL ON TABLE "public"."challenge_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."current_distinct_event" TO "anon";
GRANT ALL ON TABLE "public"."current_distinct_event" TO "authenticated";
GRANT ALL ON TABLE "public"."current_distinct_event" TO "service_role";



GRANT ALL ON TABLE "public"."drink" TO "anon";
GRANT ALL ON TABLE "public"."drink" TO "authenticated";
GRANT ALL ON TABLE "public"."drink" TO "service_role";



GRANT ALL ON TABLE "public"."distinct_drinks" TO "anon";
GRANT ALL ON TABLE "public"."distinct_drinks" TO "authenticated";
GRANT ALL ON TABLE "public"."distinct_drinks" TO "service_role";



GRANT ALL ON TABLE "public"."distinct_event" TO "anon";
GRANT ALL ON TABLE "public"."distinct_event" TO "authenticated";
GRANT ALL ON TABLE "public"."distinct_event" TO "service_role";



GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_comments" TO "anon";
GRANT ALL ON TABLE "public"."event_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_group" TO "anon";
GRANT ALL ON TABLE "public"."event_group" TO "authenticated";
GRANT ALL ON TABLE "public"."event_group" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_group_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_group_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_group_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."group_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."history" TO "anon";
GRANT ALL ON TABLE "public"."history" TO "authenticated";
GRANT ALL ON TABLE "public"."history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."item_history" TO "anon";
GRANT ALL ON TABLE "public"."item_history" TO "authenticated";
GRANT ALL ON TABLE "public"."item_history" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."key_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."key_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."key_history_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON TABLE "public"."readable_history" TO "anon";
GRANT ALL ON TABLE "public"."readable_history" TO "authenticated";
GRANT ALL ON TABLE "public"."readable_history" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "service_role";
GRANT ALL ON TABLE "public"."user_roles" TO "supabase_auth_admin";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_vouchers" TO "anon";
GRANT ALL ON TABLE "public"."user_vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_vouchers" TO "service_role";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
