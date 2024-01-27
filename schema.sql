
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

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

CREATE SCHEMA IF NOT EXISTS "supabase_migrations";

ALTER SCHEMA "supabase_migrations" OWNER TO "postgres";

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
    'Waiting'
);

ALTER TYPE "public"."EventAttendance" OWNER TO "postgres";

CREATE TYPE "public"."NotificationTags" AS ENUM (
    'eventComments',
    'userRegistration',
    'paymentRequest',
    'paymentPending'
);

ALTER TYPE "public"."NotificationTags" OWNER TO "postgres";

CREATE TYPE "public"."Permissions" AS ENUM (
    'use;drink',
    'edit;drink',
    'delete;drink',
    'view;drink',
    'use;training',
    'edit;training',
    'delete;training',
    'view;training',
    'edit;groups',
    'delete;groups',
    'view;groups',
    'edit;payments',
    'edit;user',
    'view;keyFinder',
    'use;user',
    'view;user',
    'delete;user',
    'edit;keyFinder',
    'delete;keyFinder',
    'view;notifications',
    'edit;notifications',
    'edit;history',
    'edit;edgeFunctions'
);

ALTER TYPE "public"."Permissions" OWNER TO "postgres";

CREATE TYPE "public"."eventrecurrence" AS ENUM (
    'Weekly',
    'Fortnightly',
    'Monthly',
    'None'
);

ALTER TYPE "public"."eventrecurrence" OWNER TO "postgres";

CREATE TYPE "public"."paymentstate" AS ENUM (
    'Open',
    'Fulfilled'
);

ALTER TYPE "public"."paymentstate" OWNER TO "postgres";

CREATE TYPE "public"."producttype" AS ENUM (
    'Drink',
    'Special',
    'None'
);

ALTER TYPE "public"."producttype" OWNER TO "postgres";

CREATE TYPE "public"."userrole" AS ENUM (
    'user',
    'admin',
    'procure',
    'finance',
    'trainer'
);

ALTER TYPE "public"."userrole" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_profile_for_new_user"() RETURNS trigger
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;

ALTER FUNCTION "public"."create_profile_for_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."eventcreation"() RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
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
$$;

ALTER FUNCTION "public"."eventcreation"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_attending_users"(event_id bigint) RETURNS SETOF text
    LANGUAGE "plpgsql"
    AS $$
BEGIN
RETURN QUERY
      SELECT userID FROM users WHERE 'eventComments' = any (notificationTags) AND "userId" in (
    SELECT "user" FROM event_attendance_user_mapping WHERE state = 'Attending' AND event = event_id
  );
END;
$$;

ALTER FUNCTION "public"."get_attending_users"(event_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."getattendingusers"(event_id bigint) RETURNS SETOF text
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

ALTER FUNCTION "public"."getattendingusers"(event_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."getusersforeventcommentnotifications"(event_id bigint) RETURNS SETOF text
    LANGUAGE "plpgsql"
    AS $$
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
$$;

ALTER FUNCTION "public"."getusersforeventcommentnotifications"(event_id bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."getusersfornotificationstag"(tag public."NotificationTags") RETURNS SETOF text
    LANGUAGE "plpgsql"
    AS $$
BEGIN
RETURN QUERY
      SELECT "userId" FROM "user" WHERE tag = any (notifications);
END;
$$;

ALTER FUNCTION "public"."getusersfornotificationstag"(tag public."NotificationTags") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."getusersforpaymentrequestnotifications"() RETURNS SETOF text
    LANGUAGE "plpgsql"
    AS $$
BEGIN
RETURN QUERY
      SELECT "userId" FROM "user" WHERE 'paymentRequest' = any (notifications);
END;
$$;

ALTER FUNCTION "public"."getusersforpaymentrequestnotifications"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."getusersforuserregistrationnotifications"() RETURNS SETOF text
    LANGUAGE "plpgsql"
    AS $$
BEGIN
RETURN QUERY
      SELECT userID FROM users WHERE 'userRegistrations' = any (notifications);
END;
$$;

ALTER FUNCTION "public"."getusersforuserregistrationnotifications"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."sendnotifications"(external_ids text[]) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
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
$$;

ALTER FUNCTION "public"."sendnotifications"(external_ids text[]) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."sendnotifications"(external_ids text) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $_$
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
$_$;

ALTER FUNCTION "public"."sendnotifications"(external_ids text) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."updatewaitinglistattendance"() RETURNS trigger
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

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "description" text DEFAULT ''::text NOT NULL,
    "meetingDateTime" timestamp with time zone,
    "startingDateTime" timestamp with time zone NOT NULL,
    "title" text DEFAULT ''::text NOT NULL,
    "end_at" timestamp with time zone,
    "key" text DEFAULT gen_random_uuid() NOT NULL,
    "isCancelled" boolean DEFAULT false NOT NULL,
    "place" text,
    "recurrence" public.eventrecurrence DEFAULT 'None'::public.eventrecurrence NOT NULL,
    "group" bigint,
    "answerDeadline" timestamp with time zone,
    "maxAttendees" numeric DEFAULT '-1'::numeric NOT NULL
);

ALTER TABLE "public"."events" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."distinct_event" AS
 SELECT DISTINCT ON (events.key) events.id,
    events.created_at,
    events.description,
    events."meetingDateTime",
    events."startingDateTime",
    events.title,
    events.end_at,
    events.key,
    events."isCancelled",
    events.place,
    events.recurrence,
    events."group",
    events."answerDeadline",
    events."maxAttendees"
   FROM public.events
  WHERE (((events.end_at > now()) OR (events.end_at IS NULL)) AND (events.recurrence <> 'None'::public.eventrecurrence))
  ORDER BY events.key, events.created_at DESC;

ALTER TABLE "public"."distinct_event" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."drink" (
    "id" bigint NOT NULL,
    "name" character varying,
    "price" real DEFAULT '0'::real,
    "stock" bigint,
    "imageUrl" text,
    "active" boolean DEFAULT false NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "previousDrink" bigint,
    "type" public.producttype DEFAULT 'None'::public.producttype NOT NULL
);

ALTER TABLE "public"."drink" OWNER TO "postgres";

ALTER TABLE "public"."drink" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."drink_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."event_attendance_user_mapping" (
    "lastUpdate" timestamp with time zone DEFAULT now() NOT NULL,
    "user" text NOT NULL,
    "event" bigint NOT NULL,
    "state" public."EventAttendance" DEFAULT 'Unanswered'::public."EventAttendance" NOT NULL
);

ALTER TABLE "public"."event_attendance_user_mapping" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."event_comments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "user" text NOT NULL,
    "event" bigint NOT NULL,
    "comment" text DEFAULT ''::text NOT NULL,
    "displayName" text DEFAULT ''::text NOT NULL
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
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "description" text DEFAULT ''::text NOT NULL,
    "name" text DEFAULT ''::text NOT NULL,
    "color" text DEFAULT '#000000'::text NOT NULL
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

ALTER TABLE "public"."events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."group_user_mapping" (
    "group" bigint NOT NULL,
    "user" text NOT NULL
);

ALTER TABLE "public"."group_user_mapping" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."history" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "drink" bigint NOT NULL,
    "user" text NOT NULL,
    "count" bigint NOT NULL,
    "payment" bigint NOT NULL,
    "amount" numeric DEFAULT '0'::numeric NOT NULL
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

CREATE TABLE IF NOT EXISTS "public"."key_holders" (
    "user" text NOT NULL,
    "key" bigint NOT NULL,
    "lastUpdate" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."key_holders" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."keys" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text
);

ALTER TABLE "public"."keys" OWNER TO "postgres";

ALTER TABLE "public"."keys" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."keys_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "userId" text NOT NULL,
    "amountToPay" numeric DEFAULT '0'::numeric NOT NULL,
    "paymentState" public.paymentstate DEFAULT 'Open'::public.paymentstate NOT NULL
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
    "created_at" timestamp with time zone DEFAULT now(),
    "displayName" text DEFAULT ''::text NOT NULL,
    "email" text DEFAULT ''::text NOT NULL,
    "userId" text DEFAULT ''::text NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "role" public.userrole DEFAULT 'user'::public.userrole NOT NULL,
    "disabled" boolean DEFAULT false NOT NULL,
    "permissions" public."Permissions"[],
    "notifications" public."NotificationTags"[]
);

ALTER TABLE "public"."user" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "supabase_migrations"."schema_migrations" (
    "version" text NOT NULL,
    "statements" text[],
    "name" text
);

ALTER TABLE "supabase_migrations"."schema_migrations" OWNER TO "postgres";

ALTER TABLE ONLY "public"."drink"
    ADD CONSTRAINT "drinks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_pkey" PRIMARY KEY ("user", "event");

ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_group"
    ADD CONSTRAINT "event_group_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_pkey" PRIMARY KEY ("group", "user");

ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."key_holders"
    ADD CONSTRAINT "key_holders_pkey" PRIMARY KEY ("user", "key");

ALTER TABLE ONLY "public"."keys"
    ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userId");

ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");

CREATE OR REPLACE TRIGGER "WaitingListAttendanceTrigger" AFTER DELETE OR UPDATE ON public.event_attendance_user_mapping FOR EACH ROW EXECUTE FUNCTION public.updatewaitinglistattendance();

ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_event_fkey" FOREIGN KEY (event) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"("userId") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_fkey" FOREIGN KEY (event) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"("userId");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_group_fkey" FOREIGN KEY ("group") REFERENCES public.event_group(id) ON DELETE SET NULL;

ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_group_fkey" FOREIGN KEY ("group") REFERENCES public.event_group(id);

ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"("userId");

ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_drink_fkey" FOREIGN KEY (drink) REFERENCES public.drink(id);

ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_payment_fkey" FOREIGN KEY (payment) REFERENCES public.payments(id);

ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"("userId");

ALTER TABLE ONLY "public"."key_holders"
    ADD CONSTRAINT "key_holders_key_fkey" FOREIGN KEY (key) REFERENCES public.keys(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."key_holders"
    ADD CONSTRAINT "key_holders_user_fkey" FOREIGN KEY ("user") REFERENCES public."user"("userId") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_userid_fkey" FOREIGN KEY ("userId") REFERENCES public."user"("userId");

CREATE POLICY "Allow all" ON "public"."event_group" USING (true);

CREATE POLICY "Allow all" ON "public"."group_user_mapping" TO authenticated USING (true);

CREATE POLICY "Allow everything" ON "public"."key_holders" TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow everything" ON "public"."keys" TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable access for all users" ON "public"."drink" TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable access for all users" ON "public"."event_attendance_user_mapping" USING (true);

CREATE POLICY "Enable access for all users" ON "public"."events" USING (true);

CREATE POLICY "Enable access for all users" ON "public"."history" TO authenticated USING (true);

CREATE POLICY "Enable access for all users" ON "public"."payments" USING (true);

CREATE POLICY "Enable access for all users" ON "public"."user" TO authenticated, anon USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."event_comments" TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."drink" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event_attendance_user_mapping" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event_comments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event_group" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."group_user_mapping" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."history" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."key_holders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."keys" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."eventcreation"() TO "anon";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_attending_users"(event_id bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_attending_users"(event_id bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_attending_users"(event_id bigint) TO "service_role";

GRANT ALL ON FUNCTION "public"."getattendingusers"(event_id bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."getattendingusers"(event_id bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."getattendingusers"(event_id bigint) TO "service_role";

GRANT ALL ON FUNCTION "public"."getusersforeventcommentnotifications"(event_id bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."getusersforeventcommentnotifications"(event_id bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."getusersforeventcommentnotifications"(event_id bigint) TO "service_role";

GRANT ALL ON FUNCTION "public"."getusersfornotificationstag"(tag public."NotificationTags") TO "anon";
GRANT ALL ON FUNCTION "public"."getusersfornotificationstag"(tag public."NotificationTags") TO "authenticated";
GRANT ALL ON FUNCTION "public"."getusersfornotificationstag"(tag public."NotificationTags") TO "service_role";

GRANT ALL ON FUNCTION "public"."getusersforpaymentrequestnotifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."getusersforpaymentrequestnotifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."getusersforpaymentrequestnotifications"() TO "service_role";

GRANT ALL ON FUNCTION "public"."getusersforuserregistrationnotifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."getusersforuserregistrationnotifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."getusersforuserregistrationnotifications"() TO "service_role";

GRANT ALL ON FUNCTION "public"."sendnotifications"(external_ids text[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sendnotifications"(external_ids text[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sendnotifications"(external_ids text[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."sendnotifications"(external_ids text) TO "anon";
GRANT ALL ON FUNCTION "public"."sendnotifications"(external_ids text) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sendnotifications"(external_ids text) TO "service_role";

GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "anon";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "service_role";

GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";

GRANT ALL ON TABLE "public"."distinct_event" TO "anon";
GRANT ALL ON TABLE "public"."distinct_event" TO "authenticated";
GRANT ALL ON TABLE "public"."distinct_event" TO "service_role";

GRANT ALL ON TABLE "public"."drink" TO "anon";
GRANT ALL ON TABLE "public"."drink" TO "authenticated";
GRANT ALL ON TABLE "public"."drink" TO "service_role";

GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."drink_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "service_role";

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

GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."group_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "service_role";

GRANT ALL ON TABLE "public"."history" TO "anon";
GRANT ALL ON TABLE "public"."history" TO "authenticated";
GRANT ALL ON TABLE "public"."history" TO "service_role";

GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."history_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."key_holders" TO "anon";
GRANT ALL ON TABLE "public"."key_holders" TO "authenticated";
GRANT ALL ON TABLE "public"."key_holders" TO "service_role";

GRANT ALL ON TABLE "public"."keys" TO "anon";
GRANT ALL ON TABLE "public"."keys" TO "authenticated";
GRANT ALL ON TABLE "public"."keys" TO "service_role";

GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."keys_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";

GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";

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
