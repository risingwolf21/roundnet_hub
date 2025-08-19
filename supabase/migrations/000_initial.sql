

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


CREATE SCHEMA IF NOT EXISTS "games";


ALTER SCHEMA "games" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


DO $$ BEGIN
CREATE TYPE "public"."EventAttendance" AS ENUM (
    'Declined',
    'Attending',
    'Unanswered',
    'Waiting',
    'AttendingAsTrainer',
    'RequestedAttendance'
);


ALTER TYPE "public"."EventAttendance" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE "public"."EventRecurrence" AS ENUM (
    'Weekly',
    'Fortnightly',
    'Monthly',
    'None'
);


ALTER TYPE "public"."EventRecurrence" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE "public"."Feature" AS ENUM (
    'drinks',
    'events',
    'items',
    'challenges',
    'games',
    'events.constellations'
);


ALTER TYPE "public"."Feature" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE "public"."GroupRole" AS ENUM (
    'user',
    'admin',
    'joinRequested'
);


ALTER TYPE "public"."GroupRole" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE "public"."ItemType" AS ENUM (
    'mtvStorage',
    'mtvGym',
    'mtvGymPalazzo',
    'goethe'
);


ALTER TYPE "public"."ItemType" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE "public"."PaymentState" AS ENUM (
    'Open',
    'Fulfilled'
);


ALTER TYPE "public"."PaymentState" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE "public"."ProductType" AS ENUM (
    'Drink',
    'Special',
    'None'
);


ALTER TYPE "public"."ProductType" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE "public"."UserRole" AS ENUM (
    'user',
    'admin',
    'procure',
    'finance',
    'trainer'
);


ALTER TYPE "public"."UserRole" OWNER TO "postgres";
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


CREATE OR REPLACE FUNCTION "games"."add_match_with_sets"("player_1a" "text", "player_2a" "text", "player_1b" "text", "player_2b" "text", "team_a" "text", "team_b" "text", "match_sets" "json", "event" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  team_a_id uuid;
  team_b_id uuid;
  match_id uuid;
  set_count numeric := 1;
  set_record json;
  team_a_normalized text;
  team_b_normalized text;
BEGIN
  IF jsonb_typeof(match_sets::jsonb) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', match_sets;
  END IF;

  team_a_normalized := 
    CASE 
      WHEN player_1a < player_2a THEN player_1a || ',' || player_2a
      ELSE player_2a || ',' || player_1a
    END;
  
  -- Check if team_a already exists
  SELECT id INTO team_a_id
  FROM games.teams
  WHERE normalized_players = team_a_normalized
  LIMIT 1;

  -- If team_a does not exist, create it
  IF team_a_id IS NULL THEN
    INSERT INTO games.teams (player_1, player_2, name, normalized_players) 
    VALUES (player_1a, player_2a, team_a, team_a_normalized) 
    RETURNING id INTO team_a_id;
  END IF;

  team_b_normalized := 
    CASE 
      WHEN player_1b < player_2b THEN player_1b || ',' || player_2b
      ELSE player_2b || ',' || player_1b
    END;

  -- Check if team_b already exists
  SELECT id INTO team_b_id
  FROM games.teams
  WHERE normalized_players = team_b_normalized
  LIMIT 1;

  -- If team_b does not exist, create it
  IF team_b_id IS NULL THEN
    INSERT INTO games.teams (player_1, player_2, name, normalized_players) 
    VALUES (player_1b, player_2b, team_b, team_b_normalized) 
    RETURNING id INTO team_b_id;
  END IF;

  INSERT INTO games.match (team_a, team_b, event) values (team_a_id, team_b_id, event) returning id into match_id;

  FOR set_record IN SELECT * FROM json_array_elements(match_sets)
  LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score) values(match_id, set_count, (set_record->>'team_a_score')::numeric, (set_record->>'team_b_score')::numeric);
    set_count := set_count + 1;
  END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Match: %', SQLERRM;
END;
$$;


ALTER FUNCTION "games"."add_match_with_sets"("player_1a" "text", "player_2a" "text", "player_1b" "text", "player_2b" "text", "team_a" "text", "team_b" "text", "match_sets" "json", "event" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."fetch_all_player_infos_from_pz"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    player_record RECORD;
BEGIN
    FOR player_record IN SELECT * FROM games.players
    LOOP
        PERFORM net.http_post(
            url := 'https://PROJECT_REF.supabase.co/functions/v1/fetch-player-info',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer REMOVED_KEY"}'::jsonb,
            body := jsonb_build_object(
                'name', 'Functions',
                'rg_link', player_record.rg_link,
                'player', player_record.player
            )
        );
    END LOOP;
END;
$$;


ALTER FUNCTION "games"."fetch_all_player_infos_from_pz"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "games"."fetch_player_info_on_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
PERFORM net.http_post(
            url := 'https://PROJECT_REF.supabase.co/functions/v1/fetch-player-info',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer REMOVED_KEY"}'::jsonb,
            body := jsonb_build_object(
                'name', 'Functions',
                'rg_link', NEW.rg_link,
                'player', NEW.player
            )
        );
        RETURN NEW;
END;
$$;


ALTER FUNCTION "games"."fetch_player_info_on_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_drinks_history"("items" "json") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_id text := auth.uid()::text;
    payment_id bigint;
    drink_record json;
    voucher_record RECORD;
    total_drink_count numeric;
    drink_id bigint;
    drink_count numeric;
    drink_price numeric;
    drink_amount numeric;
BEGIN
    IF jsonb_typeof(items::jsonb) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', items;
    END IF;

    -- get or create payment id
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

    IF payment_id IS NULL THEN
        RAISE EXCEPTION 'Es wurde kein Payment gefunden oder konnte nicht erstellt werden';
    END IF;

    -- Iterate over all drinks that need to be added
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
        drink_id := (drink_record->>'id')::numeric;
        drink_count := (drink_record->>'count')::numeric;
        drink_price := (drink_record->>'price')::numeric;
        raise log 'Adding drink %', drink_record;
        total_drink_count := drink_count; -- Initialize remaining count for this drink
        -- Loop over the vouchers of the user
        FOR voucher_record IN SELECT id, available FROM user_vouchers
        LOOP
            -- If the remaining count is fulfilled, exit the loop
            IF total_drink_count <= 0 THEN
                EXIT;
            END IF;
            -- Check if the voucher has enough available count
            IF voucher_record.available > 0 THEN
                IF voucher_record.available < total_drink_count THEN
                    -- Create a history entry with the voucher for the available amount
                    drink_amount := drink_price * voucher_record.available;
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, voucher_record.available, drink_amount, voucher_record.id);
                    -- Decrease the remaining count
                    total_drink_count := total_drink_count - voucher_record.available;
                ELSE
                    drink_amount := drink_price * total_drink_count;
                    -- Create a history entry with the voucher for the remaining count
                    INSERT INTO history (drink, "user", payment, count, amount, voucher)
                    VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount, voucher_record.id);
                    -- Set remaining count to zero as it is fulfilled
                    total_drink_count := 0;
                END IF;
            END IF;
        END LOOP;
        -- If there is still remaining count, create a history entry without a voucher
        IF total_drink_count > 0 THEN
            drink_amount := drink_price * total_drink_count;
            INSERT INTO history (drink, "user", payment, count, amount)
            VALUES (drink_id, user_id, payment_id, total_drink_count, drink_amount);
        END IF;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Drinks: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."add_drinks_history"("items" "json") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_initial_user_data"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$BEGIN
    INSERT INTO permissions.user_roles ("user", "app_role")
    VALUES (NEW."userId", '432ce004-149a-4e55-8e5d-3055c1a149db'), -- eventUser
      (NEW."userId", '6167cd1d-9c0d-4a8a-92fd-b26aa4063a2c'), -- gameUser
      (NEW."userId", '8596badf-217e-4387-9907-ac0e1af957a9'), -- drinkUser
      (NEW."userId", 'e523799d-cf50-47b6-bd7f-615f68139d04'), --itemUser
      (NEW."userId", '408b7b3c-17a6-45b2-af6e-58145c9fdc88'); --challengeUser
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."add_initial_user_data"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."add_match_with_sets"("player_1a" "text", "player_2a" "text", "player_1b" "text", "player_2b" "text", "team_a" "text", "team_b" "text", "match_sets" "json") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  team_a_id uuid;
  team_b_id uuid;
  match_id uuid;
  set_count numeric := 1;
  set_record record;
BEGIN
  IF jsonb_typeof(match_sets::jsonb) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Eingabe ist kein JSON-Array %', match_sets;
  END IF;

  INSERT INTO games.teams (player_1, player_2, name) values (player_1a, player_2a, team_a) returning id into team_a_id;
  INSERT INTO games.teams (player_1, player_2, name) values (player_1b, player_2b, team_b) returning id into team_b_id;

  INSERT INTO games.match (team_a, team_b) values (team_a_id, team_b_id) returning id into match_id;

  FOR set_record IN SELECT * FROM json_array_elements(match_sets)
  LOOP
    INSERT INTO games.sets(match, set_number, team_a_score, team_b_score) values(match_id, set_count,     set_record->>'team_a_score', set_record->>'team_b_score');
    set_count := set_count + 1;
  END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler beim Hinzufügen von Match: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."add_match_with_sets"("player_1a" "text", "player_2a" "text", "player_1b" "text", "player_2b" "text", "team_a" "text", "team_b" "text", "match_sets" "json") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_to_public"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$BEGIN
  INSERT INTO public.user ("userId", email, "displayName", name, role, created_at, verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'displayName', ''),
        COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'displayName', '')),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public."UserRole", -- Default role if not provided
        NOW(),
        TRUE
    );
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."add_user_to_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize"("requested_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare
  bind_permissions int;
  roles text[];
begin

  return exists(select 1 from public."user_permissions" where permission = requested_permission);

end;$$;


ALTER FUNCTION "public"."authorize"("requested_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_parent_groups"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE current_id uuid;
    BEGIN
    -- Keine Prüfung notwendig, wenn kein parent gesetzt wird
    IF NEW.parent_group IS NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Zyklus-Prüfung: Laufe die Kette der Parents nach oben
    current_id := NEW.parent_group;
    WHILE current_id IS NOT NULL LOOP
        -- Zyklus entdeckt?
        IF current_id = NEW.id THEN
            RAISE EXCEPTION 'Zyklische Gruppenbeziehung nicht erlaubt';
        END IF;

        -- Nächsten Parent holen
        SELECT parent_group INTO current_id
        FROM event_group WHERE id = current_id;
    END LOOP;

    -- 2. Oberste Parent-Gruppe darf selbst keinen Parent haben
    current_id := NEW.parent_group;
    LOOP
        SELECT parent_group INTO current_id
        FROM event_group WHERE id = current_id;

        EXIT WHEN current_id IS NULL;

        -- Wenn wir eine Parent-Gruppe finden, die selbst eine Parent hat, ist es ein Fehler
        IF current_id IS NOT NULL THEN
            -- aktuelle Parent hat eine eigene Parent → nicht erlaubt
            RAISE EXCEPTION 'Die oberste Parent-Gruppe darf keinen Parent haben';
        END IF;
    END LOOP;

    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."check_parent_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_reply_to"("value" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN value IS NULL OR NOT EXISTS (
        SELECT 1 
        FROM event_comments 
        WHERE id = value AND reply_to IS NOT NULL
    );
END;
$$;


ALTER FUNCTION "public"."check_reply_to"("value" "uuid") OWNER TO "postgres";


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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."event_group" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "color" "text" DEFAULT '#000000'::"text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "need_request_to_join" boolean DEFAULT false NOT NULL,
    "parent_group" "uuid",
    "visible" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."event_group" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."event_group"
    LANGUAGE "plpgsql"
    AS $$
declare
  new_group public.event_group;
begin
  -- Neue Gruppe anlegen und vollständiges Objekt in Variable speichern
  insert into public.event_group (
    name, description, color, is_public, need_request_to_join, parent_group
  ) values (
    group_name, group_description, group_color, is_public, need_request, parent
  )
  returning * into new_group;

  -- Mapping mit dem Ersteller anlegen
  insert into public.group_user_mapping ("user", "group", role)
  values (user_id, new_group.id, role);

  -- Ganze Gruppe zurückgeben
  return new_group;

exception
  when others then
    raise exception 'Fehler beim Erstellen der Gruppe: %', sqlerrm;
end;
$$;


ALTER FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
  declare
    claims jsonb;
    permissions text[];
    features text[];
  begin

    Select array(select distinct gp."permission"::text from public."group_permissions" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user" = (event->>'user_id')::text and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into permissions;

    Select array(select distinct gp."feature"::text from public."group_features" gp join public."group_user_mapping" gum on gp."group" = gum."group" where gum."user" = (event->>'user_id')::text and (gum.role = 'admin'::public."GroupRole" or gum.role = 'user'::public."GroupRole")) into features;

    claims := event->'claims';

    if permissions is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_permissions}', to_jsonb(permissions));
    else
      claims := jsonb_set(claims, '{user_permissions}', '[]'::jsonb);
    end if;

    if features is not null then
      -- Set the claim
      claims := jsonb_set(claims, '{user_features}', to_jsonb(features));
    else
      claims := jsonb_set(claims, '{user_features}', '[]'::jsonb);
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_from_subgroups"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  is_root_group BOOLEAN;
BEGIN
  -- Prüfe, ob die gelöschte group_id eine Hauptgruppe ist
  SELECT parent_group IS NULL INTO is_root_group
  FROM event_group
  WHERE id = OLD."group";

  -- Wenn es keine Hauptgruppe ist, mache nichts
  IF NOT is_root_group THEN
    RETURN OLD;
  END IF;

  -- Lösche alle Mappings in Untergruppen rekursiv
  DELETE FROM group_user_mapping
  WHERE "user" = OLD."user"
    AND "group" IN (
      WITH RECURSIVE subgroups AS (
        SELECT id FROM event_group WHERE parent_group = OLD."group"
        UNION ALL
        SELECT g.id
        FROM event_group g
        INNER JOIN subgroups sg ON g.parent_group = sg.id
      )
      SELECT id FROM subgroups
    );

  RETURN OLD;
END;$$;


ALTER FUNCTION "public"."delete_user_from_subgroups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_cancelled_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
    currentEvent  public.events;
    body text;
begin

    if new."isCancelled" then
        body = 'Dieses Event wurde abgesagt';
    else
        body = 'Dieses Event findet wieder statt';
    end if;

    insert into notifications (body, "user", title)
    select body, "user" as user, new.title as title
    from public.user_notification_settings
    where notification_tag = 'eventCancelled'
      and "user" = ANY (array(select event_attendance_user_mapping."user"
                                from event_attendance_user_mapping
                                where event = new.id
                                  and state = 'Attending')::text[]);
    return new;
end;$$;


ALTER FUNCTION "public"."event_cancelled_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_comment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
    currentEvent  public.events;
begin

    select * into currentEvent from events where id = new.event limit 1;

    insert into notifications (body, "user", title)
    select concat(new."displayName", ' : ', new.comment) as body, "userId" as user, currentEvent.title as title
    from public."user"
    where 'eventComments' = ANY (select notification_tag from user_notification_settings where "user" = public."user"."userId")
      and "userId" = ANY (array(select event_attendance_user_mapping."user"
                                from event_attendance_user_mapping
                                where event = new.event
                                  and state = 'Attending')::text[]);
    return new;
end;$$;


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


CREATE OR REPLACE FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") RETURNS TABLE("column_name" "text", "data_type" "text", "is_nullable" boolean, "foreign_key_schema_name" "text", "foreign_key_table_name" "text", "foreign_key_column_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (c.column_name)
    c.column_name::text,
    CASE 
      WHEN c.data_type = 'USER-DEFINED' THEN CONCAT('ENUM,', c.udt_name::text)
      ELSE c.data_type::text
    END AS data_type,
    (c.is_nullable = 'YES') AS is_nullable,
    ccu.table_schema::text AS foreign_key_schema_name,
    ccu.table_name::text AS foreign_key_table_name,
    ccu.column_name::text AS foreign_key_column_name
  FROM
    information_schema.columns AS c
  LEFT JOIN information_schema.key_column_usage AS kcu
    ON c.table_name = kcu.table_name
    AND c.table_schema = kcu.table_schema
    AND c.column_name = kcu.column_name
  LEFT JOIN information_schema.table_constraints AS tc
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.constraint_type = 'FOREIGN KEY'
  LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  LEFT JOIN pg_type t 
    ON t.typname = c.udt_name
  WHERE
    c.table_schema = schema_name
    AND c.table_name = selected_table
  ORDER BY
    c.column_name,
    -- Priorisiere Zeilen mit vorhandener Foreign-Key-Relation (ccu.column_name IS NOT NULL)
    (ccu.column_name IS NOT NULL) DESC;
END;
$$;


ALTER FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_public_table_names"() RETURNS TABLE("table_name" "text", "table_schema" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text, t.table_schema::text
    FROM information_schema.tables AS t
    WHERE (t.table_schema = 'public' OR t.table_schema = 'permissions' OR t.table_schema = 'games' OR t.table_schema = 'logs')
      AND t.table_type = 'BASE TABLE';
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


CREATE OR REPLACE FUNCTION "public"."gettingjsonarray"("items" "json") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    voucher_record RECORD;
    drink_record json;
BEGIN
    FOR drink_record IN SELECT * FROM json_array_elements(items)
    LOOP
       raise log 'logging message: %', drink_record->>'name';
    END LOOP;
    
END;
$$;


ALTER FUNCTION "public"."gettingjsonarray"("items" "json") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge_stats" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "count" numeric DEFAULT '0'::numeric NOT NULL,
    "image_url" "text",
    "challenge" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."challenge_stats" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" "text", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") RETURNS "public"."challenge_stats"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    currentChallenge public.challenge;
    new_stat public.challenge_stats;
BEGIN
    SELECT *
    INTO currentChallenge
    FROM public.challenge
    WHERE id::text = challenge_id
    LIMIT 1;

    IF currentChallenge IS NULL THEN
        RAISE EXCEPTION 'Could not select given challenge';
    END IF;

    IF currentChallenge.automated THEN
        RAISE EXCEPTION 'This challenge is automated. You can not add any points manually';
    END IF;

    IF ((SELECT COUNT(*)
          FROM public.challenge_stats
          WHERE "user" = user_id
            AND challenge_stats.challenge::text = challenge_id
            AND DATE_PART('week', challenge_stats.created_at) = DATE_PART('week', to_create_at)
            AND DATE_PART('year', challenge_stats.created_at) = DATE_PART('year', to_create_at)) >= currentChallenge.max_points_per_week) THEN
        RAISE EXCEPTION 'Maximum points per week already reached';
    END IF;

    IF ((SELECT COUNT(*)
          FROM public.challenge_stats
          WHERE "user" = user_id
            AND challenge_stats.challenge::text = challenge_id
            AND challenge_stats.created_at::date = to_create_at::date) > 0) THEN 
        RAISE EXCEPTION 'Maximum points per day already reached';
    END IF;

    INSERT INTO public.challenge_stats ("user", "challenge", "count", created_at, "image_url")
    VALUES (user_id, challenge_id::uuid, amount, to_create_at, image_url)
    RETURNING * INTO new_stat;

    RETURN new_stat;

END;$$;


ALTER FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" "text", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_user_mapping
    WHERE "group" = group_id AND "user" = auth.uid()::text
    AND "role" = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_in_group"("group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_user_mapping
    WHERE "group" = group_id AND "user" = auth.uid()::text
  );
$$;


ALTER FUNCTION "public"."is_user_in_group"("group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_users_of_challenge_stat"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN
        SELECT gum."user"
        FROM public.group_user_mapping gum
        JOIN public.user_notification_settings uns ON gum."user" = uns."user"
        WHERE gum."group" = (SELECT "group" FROM public.challenge WHERE id = NEW.challenge)
          AND uns.notification_tag = 'challenge_stats_inserted'
    LOOP
        INSERT INTO public.user_notification_settings (body, "user", title)
        VALUES (concat((SELECT "displayName" FROM public.user WHERE "userId" = NEW.user LIMIT 1), ' hat einen Punkt für eine Challenge eingetragen'), user_record."user", 'Challenge Eintrag');
    END LOOP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_users_of_challenge_stat"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_event_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update last_update to the current timestamp and set edited to true
    NEW.last_update := NOW();
    NEW.edited := true;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_normalized_players"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    NEW.normalized_players := 
        CASE 
            WHEN NEW.player_1 < NEW.player_2 THEN NEW.player_1 || ',' || NEW.player_2
            ELSE NEW.player_2 || ',' || NEW.player_1
        END;
    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."update_normalized_players"() OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "games"."match" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_a" "uuid" NOT NULL,
    "team_b" "uuid" NOT NULL,
    "event" "uuid",
    "is_public" boolean DEFAULT false NOT NULL
);


ALTER TABLE "games"."match" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."players" (
    "player" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ka_index" numeric DEFAULT '1000'::numeric NOT NULL,
    "rg_id" "text",
    "rg_link" "text",
    "rg_index" numeric DEFAULT '0'::numeric NOT NULL,
    "rg_avatar_url" "text",
    "pro_status" boolean DEFAULT false NOT NULL,
    "gender" "text" DEFAULT 'm'::"text" NOT NULL
);


ALTER TABLE "games"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "match" "uuid" NOT NULL,
    "set_number" bigint NOT NULL,
    "team_a_score" bigint NOT NULL,
    "team_b_score" bigint NOT NULL
);


ALTER TABLE "games"."sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "games"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "player_1" "text" NOT NULL,
    "player_2" "text" NOT NULL,
    "name" "text" NOT NULL,
    "normalized_players" "text" NOT NULL
);


ALTER TABLE "games"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "games"."user_matches" AS
 SELECT "g"."id",
    "g"."created_at",
    "t1"."name" AS "team_a_name",
    "t1"."player_1" AS "team_a_player_1",
    "t1"."player_2" AS "team_a_player_2",
    "t2"."name" AS "team_b_name",
    "t2"."player_1" AS "team_b_player_1",
    "t2"."player_2" AS "team_b_player_2",
    "string_agg"(((("s"."team_a_score")::"text" || ':'::"text") || ("s"."team_b_score")::"text"), ', '::"text") AS "set_results"
   FROM ((("games"."match" "g"
     LEFT JOIN "games"."teams" "t1" ON (("g"."team_a" = "t1"."id")))
     LEFT JOIN "games"."teams" "t2" ON (("g"."team_b" = "t2"."id")))
     LEFT JOIN "games"."sets" "s" ON (("g"."id" = "s"."match")))
  WHERE (("t1"."player_1" = ("auth"."uid"())::"text") OR ("t1"."player_2" = ("auth"."uid"())::"text") OR ("t2"."player_1" = ("auth"."uid"())::"text") OR ("t2"."player_2" = ("auth"."uid"())::"text"))
  GROUP BY "g"."id", "g"."created_at", "t1"."name", "t1"."player_1", "t1"."player_2", "t2"."name", "t2"."player_1", "t2"."player_2";


ALTER TABLE "games"."user_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenge" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "max_points_per_week" bigint,
    "automated" boolean DEFAULT false NOT NULL,
    "end_date" timestamp with time zone,
    "group" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."challenge" OWNER TO "postgres";

DO $$ BEGIN
ALTER TABLE "public"."challenge_stats" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."challenge_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION WHEN SQLSTATE '42P07' THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS "public"."user" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "displayName" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "userId" "text" DEFAULT ''::"text" NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "role" "public"."UserRole" DEFAULT 'user'::"public"."UserRole" NOT NULL,
    "disabled" boolean DEFAULT false NOT NULL,
    "avatarUrl" "text",
    "name" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."challenge_user_points" WITH ("security_invoker"='on') AS
 SELECT "cs"."challenge",
    "cs"."user",
    "u"."displayName",
    "u"."avatarUrl",
    "sum"("cs"."count") AS "total_points"
   FROM ("public"."challenge_stats" "cs"
     JOIN "public"."user" "u" ON (("cs"."user" = "u"."userId")))
  GROUP BY "cs"."challenge", "cs"."user", "u"."avatarUrl", "u"."displayName";


ALTER TABLE "public"."challenge_user_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "meetingDateTime" timestamp with time zone,
    "startingDateTime" timestamp with time zone NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "endDateTime" timestamp with time zone NOT NULL,
    "key" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "isCancelled" boolean DEFAULT false NOT NULL,
    "place" "text",
    "recurrence" "public"."EventRecurrence" DEFAULT 'None'::"public"."EventRecurrence" NOT NULL,
    "answerDeadline" timestamp with time zone,
    "maxAttendees" numeric,
    "recurrenceEnd" timestamp with time zone,
    "required_item" "public"."ItemType",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group" "uuid" NOT NULL
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."current_distinct_event" WITH ("security_invoker"='on') AS
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


CREATE OR REPLACE VIEW "public"."distinct_drinks" WITH ("security_invoker"='on') AS
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


CREATE OR REPLACE VIEW "public"."distinct_event" WITH ("security_invoker"='on') AS
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

DO $$ BEGIN
ALTER TABLE "public"."drink" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."drink_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION WHEN SQLSTATE '42P07' THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS "public"."event_comments" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "comment" "text" DEFAULT ''::"text" NOT NULL,
    "displayName" "text" DEFAULT ''::"text" NOT NULL,
    "event" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reply_to" "uuid",
    "edited" boolean DEFAULT false NOT NULL,
    "last_update" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_user_mapping" (
    "user" "text" NOT NULL,
    "group" "uuid" NOT NULL,
    "role" "public"."GroupRole" DEFAULT 'user'::"public"."GroupRole" NOT NULL
);


ALTER TABLE "public"."group_user_mapping" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_groups_view" WITH ("security_invoker"='on') AS
 SELECT "eg"."created_at",
    "eg"."description",
    "eg"."name",
    "eg"."color",
    "eg"."id",
    "eg"."is_public",
    "eg"."need_request_to_join",
    "eg"."parent_group",
    "eg"."visible",
    "gum"."role"
   FROM ("public"."event_group" "eg"
     LEFT JOIN "public"."group_user_mapping" "gum" ON ((("eg"."id" = "gum"."group") AND ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text"))));


ALTER TABLE "public"."event_groups_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."events_user_view" WITH ("security_invoker"='on') AS
 SELECT "e"."id",
    "e"."created_at",
    "e"."title",
    "e"."description",
    "e"."meetingDateTime",
    "e"."startingDateTime",
    "e"."endDateTime",
    "e"."key",
    "e"."isCancelled",
    "e"."place",
    "e"."group",
    "e"."recurrence",
    "e"."answerDeadline",
    "e"."recurrenceEnd",
    "e"."maxAttendees",
    "e"."required_item",
    "eaus"."state" AS "user_state",
    ( SELECT "count"(*) AS "count"
           FROM "public"."event_attendance_user_mapping" "ea"
          WHERE (("ea"."event" = "e"."id") AND ("ea"."state" = 'Attending'::"public"."EventAttendance"))) AS "attending_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."event_attendance_user_mapping" "ea"
          WHERE (("ea"."event" = "e"."id") AND ("ea"."state" = 'Declined'::"public"."EventAttendance"))) AS "declined_count"
   FROM ("public"."events" "e"
     LEFT JOIN "public"."event_attendance_user_mapping" "eaus" ON ((("e"."id" = "eaus"."event") AND ("eaus"."user" = ( SELECT ("auth"."uid"())::"text" AS "uid")))));


ALTER TABLE "public"."events_user_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."features" (
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_features" (
    "group" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature" "text" NOT NULL
);


ALTER TABLE "public"."group_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_permissions" (
    "group" "uuid" NOT NULL,
    "permission" "text" NOT NULL
);


ALTER TABLE "public"."group_permissions" OWNER TO "postgres";


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

DO $$ BEGIN
ALTER TABLE "public"."history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION WHEN SQLSTATE '42P07' THEN NULL;
END $$;


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
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#88AEBF'::"text" NOT NULL,
    "type" "public"."ItemType" NOT NULL,
    "lastUpdate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_holder" "text",
    "group" "uuid"
);


ALTER TABLE "public"."items" OWNER TO "postgres";

DO $$ BEGIN
ALTER TABLE "public"."item_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."key_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION WHEN SQLSTATE '42P07' THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "public"."items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."keys_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION WHEN SQLSTATE '42P07' THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS "public"."notification_token" (
    "device_id" "uuid" NOT NULL,
    "fcm_token" "text" NOT NULL,
    "user" "text" DEFAULT ''::"text" NOT NULL,
    "last_used" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_token" OWNER TO "postgres";


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

DO $$ BEGIN
ALTER TABLE "public"."payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION WHEN SQLSTATE '42P07' THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."readable_history" WITH ("security_invoker"='on') AS
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


CREATE TABLE IF NOT EXISTS "public"."user_calendar_event_mapping" (
    "user" "text" NOT NULL,
    "event" "uuid" NOT NULL,
    "calendar_event_id" "text" NOT NULL
);


ALTER TABLE "public"."user_calendar_event_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_calender_settings" (
    "user" "text" NOT NULL,
    "calender_id" "text",
    "minutes_to_remind" numeric
);


ALTER TABLE "public"."user_calender_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_features" WITH ("security_invoker"='on') AS
 SELECT DISTINCT "gf"."feature"
   FROM ("public"."group_user_mapping" "gum"
     JOIN "public"."group_features" "gf" ON (("gf"."group" = "gum"."group")))
  WHERE (("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("gum"."role" = 'admin'::"public"."GroupRole") OR ("gum"."role" = 'user'::"public"."GroupRole")));


ALTER TABLE "public"."user_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_settings" (
    "id" bigint NOT NULL,
    "user" "text" NOT NULL,
    "notification_tag" "text" NOT NULL
);


ALTER TABLE "public"."user_notification_settings" OWNER TO "postgres";

DO $$ BEGIN
ALTER TABLE "public"."user_notification_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_notification_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION WHEN SQLSTATE '42P07' THEN NULL;
END $$;


CREATE OR REPLACE VIEW "public"."user_permissions" WITH ("security_invoker"='on') AS
 SELECT DISTINCT "gp"."permission"
   FROM ("public"."group_user_mapping" "gum"
     JOIN "public"."group_permissions" "gp" ON (("gp"."group" = "gum"."group")))
  WHERE ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text");


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


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
    "title" "text"
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("player");



ALTER TABLE ONLY "games"."sets"
    ADD CONSTRAINT "sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "unique_normalized_players" UNIQUE ("normalized_players");



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "unique_player_combination" UNIQUE ("player_1", "player_2");



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
    ADD CONSTRAINT "event_group_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."event_group"
    ADD CONSTRAINT "event_group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "features_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."group_features"
    ADD CONSTRAINT "group_features_pkey" PRIMARY KEY ("group", "feature");



ALTER TABLE ONLY "public"."group_permissions"
    ADD CONSTRAINT "group_permission_pkey" PRIMARY KEY ("group", "permission");



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_pkey" PRIMARY KEY ("user", "group");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "key_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_token"
    ADD CONSTRAINT "notification_token_pkey" PRIMARY KEY ("device_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."user_calendar_event_mapping"
    ADD CONSTRAINT "user_calendar_event_mapping_pkey" PRIMARY KEY ("user", "event");



ALTER TABLE ONLY "public"."user_calender_settings"
    ADD CONSTRAINT "user_calender_settings_pkey" PRIMARY KEY ("user");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_unique_user_tag" UNIQUE ("user", "notification_tag");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userId");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE VIEW "public"."user_vouchers" WITH ("security_invoker"='on') AS
 SELECT "v"."id",
    "v"."created_at",
    "v"."title",
    ("v"."total_drinks" - COALESCE("sum"("h"."count"), (0)::numeric)) AS "available"
   FROM ("public"."vouchers" "v"
     LEFT JOIN "public"."history" "h" ON (("v"."id" = "h"."voucher")))
  WHERE ("v"."user" = ("auth"."uid"())::"text")
  GROUP BY "v"."id", "v"."title", "v"."total_drinks"
 HAVING (COALESCE("sum"("h"."count"), (0)::numeric) < "v"."total_drinks");



CREATE OR REPLACE TRIGGER "fetch_player_info_after_rglink_change" AFTER UPDATE OF "rg_link" ON "games"."players" FOR EACH ROW EXECUTE FUNCTION "games"."fetch_player_info_on_change"();



CREATE OR REPLACE TRIGGER "set_normalized_players" BEFORE INSERT OR UPDATE ON "games"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_normalized_players"();



-- CREATE OR REPLACE TRIGGER "Send Push Notification" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://PROJECT_REF.supabase.co/functions/v1/fcm_push', 'POST', '{"Content-type":"application/json","Authorization":"Bearer REMOVED_KEY"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "WaitingListAttendanceTrigger" AFTER DELETE OR UPDATE ON "public"."event_attendance_user_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."updatewaitinglistattendance"();



CREATE OR REPLACE TRIGGER "after_user_insert" AFTER INSERT ON "public"."user" FOR EACH ROW EXECUTE FUNCTION "public"."add_initial_user_data"();



CREATE OR REPLACE TRIGGER "challenge_stats_insert_trigger" AFTER INSERT ON "public"."challenge_stats" FOR EACH ROW EXECUTE FUNCTION "public"."notify_users_of_challenge_stat"();



CREATE OR REPLACE TRIGGER "check_group_parent" BEFORE INSERT OR UPDATE ON "public"."event_group" FOR EACH ROW EXECUTE FUNCTION "public"."check_parent_groups"();



CREATE OR REPLACE TRIGGER "delete_user_from_subgroups" AFTER DELETE ON "public"."group_user_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."delete_user_from_subgroups"();



CREATE OR REPLACE TRIGGER "item_history_trigger" AFTER UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."add_item_history_entry"();



CREATE OR REPLACE TRIGGER "maxattendees_change_trigger" AFTER UPDATE ON "public"."events" FOR EACH ROW WHEN (("new"."maxAttendees" <> "old"."maxAttendees")) EXECUTE FUNCTION "public"."update_attendance_on_maxattendees_change"();



CREATE OR REPLACE TRIGGER "on_event_comment_inserted" AFTER INSERT ON "public"."event_comments" FOR EACH ROW EXECUTE FUNCTION "public"."event_comment_notification"();



CREATE OR REPLACE TRIGGER "trg_update_event_comment" BEFORE UPDATE ON "public"."event_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_comment"();



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_team_a_fkey" FOREIGN KEY ("team_a") REFERENCES "games"."teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."match"
    ADD CONSTRAINT "match_team_b_fkey" FOREIGN KEY ("team_b") REFERENCES "games"."teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."players"
    ADD CONSTRAINT "players_player_fkey" FOREIGN KEY ("player") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "games"."sets"
    ADD CONSTRAINT "sets_match_fkey" FOREIGN KEY ("match") REFERENCES "games"."match"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "teams_player_1_fkey" FOREIGN KEY ("player_1") REFERENCES "games"."players"("player") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "games"."teams"
    ADD CONSTRAINT "teams_player_2_fkey" FOREIGN KEY ("player_2") REFERENCES "games"."players"("player") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."challenge"
    ADD CONSTRAINT "challenge_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_challenge_fkey" FOREIGN KEY ("challenge") REFERENCES "public"."challenge"("id");



ALTER TABLE ONLY "public"."challenge_stats"
    ADD CONSTRAINT "challenge_stats_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."event_attendance_user_mapping"
    ADD CONSTRAINT "event_attendance_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "public"."event_comments"("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."event_group"
    ADD CONSTRAINT "event_group_parent_group_fkey" FOREIGN KEY ("parent_group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."group_features"
    ADD CONSTRAINT "group_features_feature_fkey" FOREIGN KEY ("feature") REFERENCES "public"."features"("name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_features"
    ADD CONSTRAINT "group_features_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_permissions"
    ADD CONSTRAINT "group_permission_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_permissions"
    ADD CONSTRAINT "group_permission_permission_fkey" FOREIGN KEY ("permission") REFERENCES "public"."permissions"("name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_user_mapping"
    ADD CONSTRAINT "group_user_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_drink_fkey" FOREIGN KEY ("drink") REFERENCES "public"."drink"("id");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_payment_fkey" FOREIGN KEY ("payment") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."history"
    ADD CONSTRAINT "history_voucher_fkey" FOREIGN KEY ("voucher") REFERENCES "public"."vouchers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "item_history_currentUser_fkey" FOREIGN KEY ("currentUser") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "item_history_key_fkey" FOREIGN KEY ("key") REFERENCES "public"."items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_history"
    ADD CONSTRAINT "item_history_pastUser_fkey" FOREIGN KEY ("pastUser") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_group_fkey" FOREIGN KEY ("group") REFERENCES "public"."event_group"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "keys_user_fkey" FOREIGN KEY ("current_holder") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."notification_token"
    ADD CONSTRAINT "notification_token_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_userid_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "public_notifications_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_calendar_event_mapping"
    ADD CONSTRAINT "user_calendar_event_mapping_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_calendar_event_mapping"
    ADD CONSTRAINT "user_calendar_event_mapping_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_calender_settings"
    ADD CONSTRAINT "user_calender_settings_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("userId") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Allow authorized delete access" ON "games"."match" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('games.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized delete access" ON "games"."players" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('games.delete'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "games"."match" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('games.create'::"text") AS "authorize"));



CREATE POLICY "Allow authorized insert access" ON "games"."players" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('games.insert'::"text") AS "authorize"));



CREATE POLICY "Allow authorized select access" ON "games"."players" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('games.select'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "games"."match" FOR UPDATE TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('games.update'::"text") AS "authorize"));



CREATE POLICY "Allow authorized update access" ON "games"."players" FOR UPDATE TO "authenticated" USING (("player" = (( SELECT "auth"."uid"() AS "uid"))::"text"));



CREATE POLICY "Allow delete when userid in team" ON "games"."teams" FOR DELETE TO "authenticated" USING ((("player_1" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("player_2" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow everything when user has permission games.update.score an" ON "games"."sets" USING ((( SELECT "public"."authorize"('games.update.score'::"text") AS "authorize") AND (EXISTS ( SELECT 1
   FROM (("games"."match" "m"
     JOIN "games"."teams" "ta" ON (("ta"."id" = "m"."team_a")))
     JOIN "games"."teams" "tb" ON (("tb"."id" = "m"."team_b")))
  WHERE (("m"."id" = "sets"."match") AND (("ta"."player_1" = ("auth"."uid"())::"text") OR ("ta"."player_2" = ("auth"."uid"())::"text") OR ("tb"."player_1" = ("auth"."uid"())::"text") OR ("tb"."player_2" = ("auth"."uid"())::"text")))))));



CREATE POLICY "Allow insert when userid in team or games.create permissions gr" ON "games"."teams" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."authorize"('games.create'::"text") AS "authorize") OR ("player_1" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("player_2" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow select when game is public" ON "games"."sets" FOR SELECT USING (( SELECT "match"."is_public"
   FROM "games"."match"
  WHERE ("match"."id" = "sets"."match")));



CREATE POLICY "Allow select when match is public" ON "games"."match" FOR SELECT USING ("is_public");



CREATE POLICY "Allow select when match is public" ON "games"."teams" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "games"."match" "m"
  WHERE ((("m"."team_a" = "teams"."id") OR ("m"."team_b" = "teams"."id")) AND ("m"."is_public" = true)))));



CREATE POLICY "Allow select when userid in team" ON "games"."teams" FOR SELECT TO "authenticated" USING ((("player_1" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("player_2" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow update when userid in team" ON "games"."teams" FOR UPDATE TO "authenticated" WITH CHECK ((("player_1" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR ("player_2" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Enable select for authenticated users only" ON "games"."players" FOR SELECT TO "authenticated" USING (("player" = ("auth"."uid"())::"text"));



CREATE POLICY "Enable select with event.create.constellations permission" ON "games"."players" FOR SELECT USING (( SELECT "public"."authorize"('event.create.constellations'::"text") AS "authorize"));



ALTER TABLE "games"."match" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "games"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "games"."sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "games"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Access to all users" ON "public"."item_history" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all" ON "public"."notifications" USING (true);



CREATE POLICY "Allow auth admin to read" ON "public"."group_features" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow auth admin to read" ON "public"."group_permissions" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow auth admin to read" ON "public"."group_user_mapping" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow delete when admin of group" ON "public"."challenge" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "challenge"."group") AND ("gum"."user" = ("auth"."uid"())::"text") AND ("gum"."role" = 'admin'::"public"."GroupRole")))));



CREATE POLICY "Allow delete when admin of group" ON "public"."event_group" FOR DELETE TO "authenticated" USING ((( SELECT "count"(*) AS "count"
   FROM "public"."group_user_mapping"
  WHERE (("group_user_mapping"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("group_user_mapping"."role" = 'admin'::"public"."GroupRole"))) > 0));



CREATE POLICY "Allow delete with drinks.edit permission" ON "public"."drink" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('drinks.edit'::"text") AS "authorize"));



CREATE POLICY "Allow delete with event.comment permission on own comment" ON "public"."event_comments" FOR DELETE USING ((( SELECT "public"."authorize"('event.comment'::"text") AS "authorize") AND (USER = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow delete with event.delete permission" ON "public"."events" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('event.delete'::"text") AS "authorize"));



CREATE POLICY "Allow delete with items.manage permission" ON "public"."items" FOR DELETE TO "authenticated" USING (( SELECT "public"."authorize"('items.manage'::"text") AS "authorize"));



CREATE POLICY "Allow everything if user is super admin" ON "public"."group_permissions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."group_user_mapping" "gum"
     JOIN "public"."event_group" "eg" ON (("eg"."id" = "gum"."group")))
  WHERE (("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("eg"."name" = 'Super Admins'::"text")))));



CREATE POLICY "Allow insert access to public.user for authenticated users" ON "public"."user" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow insert for all" ON "public"."event_group" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow insert for own" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (("userId" = (( SELECT "auth"."uid"() AS "uid"))::"text"));



CREATE POLICY "Allow insert when admin of group" ON "public"."challenge" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "challenge"."group") AND ("gum"."user" = ("auth"."uid"())::"text") AND ("gum"."role" = 'admin'::"public"."GroupRole")))));



CREATE POLICY "Allow insert with drinks.edit permission" ON "public"."drink" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('drinks.edit'::"text") AS "authorize"));



CREATE POLICY "Allow insert with event.comment permission on own comment" ON "public"."event_comments" FOR INSERT WITH CHECK ((( SELECT "public"."authorize"('event.comment'::"text") AS "authorize") AND ("user" = ( SELECT ("auth"."uid"())::"text" AS "uid")) AND "public"."check_reply_to"("reply_to")));



CREATE POLICY "Allow insert with event.edit permission" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."authorize"('event.edit'::"text") AS "authorize"));



CREATE POLICY "Allow insert with items.manage permission and group" ON "public"."items" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "public"."authorize"('items.manage'::"text") AS "authorize") AND ("group" IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text")))));



CREATE POLICY "Allow no deletions" ON "public"."payments" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "Allow own payment or if drinks.confirm.payments permission is p" ON "public"."payments" FOR SELECT TO "authenticated" USING ((( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize") OR ("userId" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Allow select access to public.user for authenticated users" ON "public"."user" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for all" ON "public"."events" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow select for all users" ON "public"."event_attendance_user_mapping" FOR SELECT USING ((( SELECT "events"."group"
   FROM "public"."events"
  WHERE ("events"."id" = "event_attendance_user_mapping"."event")) IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Allow select with drinks.select permission" ON "public"."drink" FOR SELECT TO "authenticated" USING (( SELECT "public"."authorize"('drinks.select'::"text") AS "authorize"));



CREATE POLICY "Allow select with event.comment permission" ON "public"."event_comments" FOR SELECT USING (( SELECT "public"."authorize"('event.comment'::"text") AS "authorize"));



CREATE POLICY "Allow update for admin in group" ON "public"."event_group" FOR UPDATE TO "authenticated" USING ((( SELECT "count"(*) AS "count"
   FROM "public"."group_user_mapping"
  WHERE (("group_user_mapping"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("group_user_mapping"."role" = 'admin'::"public"."GroupRole"))) > 0));



CREATE POLICY "Allow update when user is admin of challenge group" ON "public"."challenge" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "challenge"."group") AND ("gum"."user" = ("auth"."uid"())::"text") AND ("gum"."role" = 'admin'::"public"."GroupRole")))));



CREATE POLICY "Allow update with drinks.confirm.payments permission" ON "public"."payments" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



CREATE POLICY "Allow update with drinks.edit permission" ON "public"."drink" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('drinks.edit'::"text") AS "authorize"));



CREATE POLICY "Allow update with event.comment permission on own comment" ON "public"."event_comments" FOR UPDATE USING ((( SELECT "public"."authorize"('event.comment'::"text") AS "authorize") AND (USER = ("auth"."uid"())::"text"))) WITH CHECK (true);



CREATE POLICY "Allow update with event.edit permission" ON "public"."events" FOR UPDATE TO "authenticated" USING (( SELECT "public"."authorize"('event.edit'::"text") AS "authorize"));



CREATE POLICY "Allow update with items.manage permission and in group" ON "public"."items" FOR UPDATE TO "authenticated" USING ((( SELECT "public"."authorize"('items.manage'::"text") AS "authorize") AND ("group" IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text")))));



CREATE POLICY "Delete when admin or own user" ON "public"."group_user_mapping" FOR DELETE USING (("public"."is_user_admin_in_group"("group") OR ("user" = (( SELECT "auth"."uid"() AS "uid"))::"text")));



CREATE POLICY "Delete with drinks.edit.payments permission" ON "public"."history" FOR DELETE USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



CREATE POLICY "Enable access for all users" ON "public"."payments" USING (true);



CREATE POLICY "Enable access for all users" ON "public"."user" TO "authenticated", "anon" USING (true);



CREATE POLICY "Enable access for all users" ON "public"."vouchers" USING (true);



CREATE POLICY "Enable all for users based on user_id" ON "public"."user_calendar_event_mapping" TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user")) WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Enable all for users based on user_id" ON "public"."user_notification_settings" USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user")) WITH CHECK (true);



CREATE POLICY "Enable delete for users based on user_id" ON "public"."challenge_stats" FOR DELETE USING ((( SELECT ("auth"."uid"())::"text" AS "uid") = "user"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."event_attendance_user_mapping" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = USER));



CREATE POLICY "Enable everything if user is super admin" ON "public"."group_features" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."group_user_mapping" "gum"
     JOIN "public"."event_group" "eg" ON (("eg"."id" = "gum"."group")))
  WHERE (("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("eg"."name" = 'Super Admins'::"text")))));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."challenge_stats" FOR INSERT WITH CHECK ((( SELECT ("auth"."uid"())::"text" AS "uid") = "user"));



CREATE POLICY "Enable read access for all users" ON "public"."features" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."group_features" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."group_permissions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."notification_token" USING (true) WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."permissions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."user_calender_settings" TO "authenticated" USING (true);



CREATE POLICY "Enable update for users based on user_id" ON "public"."challenge_stats" FOR UPDATE USING ((( SELECT ("auth"."uid"())::"text" AS "uid") = "user"));



CREATE POLICY "Insert as admin if no other user in group" ON "public"."group_user_mapping" FOR INSERT WITH CHECK ((("role" = 'admin'::"public"."GroupRole") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE ("gum"."group" = "group_user_mapping"."group"))))));



CREATE POLICY "Insert as user when group is public and needs no joni request" ON "public"."group_user_mapping" FOR INSERT WITH CHECK ((("role" = 'user'::"public"."GroupRole") AND (EXISTS ( SELECT 1
   FROM "public"."event_group"
  WHERE (("event_group"."id" = "group_user_mapping"."group") AND ("event_group"."need_request_to_join" = false) AND "event_group"."is_public"))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("gum"."group" = "group_user_mapping"."group")))))));



CREATE POLICY "Insert for own user" ON "public"."history" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Insert users when user is admin in group" ON "public"."group_user_mapping" FOR INSERT WITH CHECK ((("role" = 'user'::"public"."GroupRole") AND "public"."is_user_admin_in_group"("group")));



CREATE POLICY "Insert when user in group for given event" ON "public"."event_attendance_user_mapping" FOR INSERT WITH CHECK ((( SELECT "events"."group"
   FROM "public"."events"
  WHERE ("events"."id" = "event_attendance_user_mapping"."event")) IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Insert when user requests to join" ON "public"."group_user_mapping" FOR INSERT WITH CHECK (("role" = 'joinRequested'::"public"."GroupRole"));



CREATE POLICY "Select all with permission edit;payments" ON "public"."history" FOR SELECT USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



CREATE POLICY "Select challenge stats only if user is in group of challenge" ON "public"."challenge_stats" FOR SELECT USING ((( SELECT "challenge_stats"."challenge") IN ( SELECT "challenge"."id"
   FROM "public"."challenge"
  WHERE ("challenge"."group" IN ( SELECT "group_user_mapping"."group"
           FROM "public"."group_user_mapping"
          WHERE (("group_user_mapping"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("group_user_mapping"."role" = 'admin'::"public"."GroupRole") OR ("group_user_mapping"."role" = 'user'::"public"."GroupRole"))))))));



CREATE POLICY "Select challenges for user with group" ON "public"."challenge" FOR SELECT USING ((( SELECT "challenge"."group") IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text"))));



CREATE POLICY "Select drinks as user" ON "public"."drink" FOR SELECT USING (("active" = true));



CREATE POLICY "Select events for user in group" ON "public"."events" FOR SELECT TO "authenticated" USING ((( SELECT "events"."group") IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE (("group_user_mapping"."user" = ("auth"."uid"())::"text") AND (("group_user_mapping"."role" = 'user'::"public"."GroupRole") OR ("group_user_mapping"."role" = 'admin'::"public"."GroupRole"))))));



CREATE POLICY "Select for own user" ON "public"."history" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Select if user is member" ON "public"."event_group" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "event_group"."id") AND ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("gum"."role" = 'admin'::"public"."GroupRole") OR ("gum"."role" = 'user'::"public"."GroupRole"))))));



CREATE POLICY "Select mappings if user is in group" ON "public"."group_user_mapping" FOR SELECT TO "authenticated" USING ("public"."is_user_in_group"("group"));



CREATE POLICY "Select parent groups if visibile" ON "public"."event_group" FOR SELECT USING ((("parent_group" IS NULL) AND "visible"));



CREATE POLICY "Select subgroups only if user is member of parent group" ON "public"."event_group" FOR SELECT USING ((("is_public" = true) AND ("parent_group" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."group_user_mapping" "gum"
  WHERE (("gum"."group" = "event_group"."parent_group") AND ("gum"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (("gum"."role" = 'admin'::"public"."GroupRole") OR ("gum"."role" = 'user'::"public"."GroupRole")))))));



CREATE POLICY "Select when user is in group of item" ON "public"."items" FOR SELECT USING (("group" IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Update attendance for given event when user is in group" ON "public"."event_attendance_user_mapping" FOR UPDATE USING ((( SELECT "events"."group"
   FROM "public"."events"
  WHERE ("events"."id" = "event_attendance_user_mapping"."event")) IN ( SELECT "group_user_mapping"."group"
   FROM "public"."group_user_mapping"
  WHERE ("group_user_mapping"."user" = ("auth"."uid"())::"text"))));



CREATE POLICY "Update for own user" ON "public"."history" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "user"));



CREATE POLICY "Update group user mapping when admin of group" ON "public"."group_user_mapping" FOR UPDATE USING ((( SELECT "count"(*) AS "count"
   FROM "public"."group_user_mapping" "group_user_mapping_1"
  WHERE (("group_user_mapping_1"."user" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("group_user_mapping_1"."role" = 'admin'::"public"."GroupRole"))) > 0));



CREATE POLICY "Update with drinks.confirm.payments permission" ON "public"."history" FOR UPDATE USING (( SELECT "public"."authorize"('drinks.confirm.payments'::"text") AS "authorize"));



ALTER TABLE "public"."challenge" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drink" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_attendance_user_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_group" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_user_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_token" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_calendar_event_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_calender_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "games" TO "service_role";
GRANT ALL ON SCHEMA "games" TO PUBLIC;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."add_drinks_history"("items" "json") TO "anon";
GRANT ALL ON FUNCTION "public"."add_drinks_history"("items" "json") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_drinks_history"("items" "json") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_initial_user_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_initial_user_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_initial_user_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_item_history_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_match_with_sets"("player_1a" "text", "player_2a" "text", "player_1b" "text", "player_2b" "text", "team_a" "text", "team_b" "text", "match_sets" "json") TO "anon";
GRANT ALL ON FUNCTION "public"."add_match_with_sets"("player_1a" "text", "player_2a" "text", "player_1b" "text", "player_2b" "text", "team_a" "text", "team_b" "text", "match_sets" "json") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_match_with_sets"("player_1a" "text", "player_2a" "text", "player_1b" "text", "player_2b" "text", "team_a" "text", "team_b" "text", "match_sets" "json") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_user_to_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_to_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_to_public"() TO "service_role";



GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize"("requested_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_parent_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_parent_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_parent_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_reply_to"("value" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_reply_to"("value" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_reply_to"("value" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_version"("input_version" "text") TO "service_role";



GRANT ALL ON TABLE "public"."event_group" TO "anon";
GRANT ALL ON TABLE "public"."event_group" TO "authenticated";
GRANT ALL ON TABLE "public"."event_group" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group_with_user"("group_name" "text", "group_description" "text", "group_color" "text", "is_public" boolean, "need_request" boolean, "user_id" "text", "role" "public"."GroupRole", "parent" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."delete_user_from_subgroups"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_from_subgroups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_from_subgroups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."event_cancelled_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_cancelled_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_cancelled_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."event_comment_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_comment_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_comment_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."eventcreation"() TO "anon";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."eventcreation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_attending_users"("event_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_column_info"("schema_name" "text", "selected_table" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."gettingjsonarray"("items" "json") TO "anon";
GRANT ALL ON FUNCTION "public"."gettingjsonarray"("items" "json") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gettingjsonarray"("items" "json") TO "service_role";



GRANT ALL ON TABLE "public"."challenge_stats" TO "anon";
GRANT ALL ON TABLE "public"."challenge_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_stats" TO "service_role";



GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" "text", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" "text", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increase_challenge_stats_count"("user_id" "text", "challenge_id" "text", "amount" numeric, "to_create_at" timestamp with time zone, "image_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_admin_in_group"("group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_in_group"("group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_in_group"("group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_in_group"("group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_users_of_challenge_stat"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_users_of_challenge_stat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_users_of_challenge_stat"() TO "service_role";



GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendance_user_mapping" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") TO "anon";
GRANT ALL ON FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_attendance"("eventid" "uuid", "userid" "text", "state" "public"."EventAttendance") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_attendance_on_maxattendees_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_event_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_event_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_event_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_normalized_players"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_normalized_players"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_normalized_players"() TO "service_role";



GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "anon";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."updatewaitinglistattendance"() TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."match" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."match" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."match" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."match" TO "dashboard_user";



GRANT ALL ON TABLE "games"."players" TO "service_role";
GRANT ALL ON TABLE "games"."players" TO PUBLIC;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."players" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."players" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."players" TO "dashboard_user";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."sets" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."sets" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."sets" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."sets" TO "dashboard_user";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."teams" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."teams" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."teams" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "games"."teams" TO "dashboard_user";



GRANT SELECT ON TABLE "games"."user_matches" TO "authenticated";



GRANT ALL ON TABLE "public"."challenge" TO "anon";
GRANT ALL ON TABLE "public"."challenge" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge" TO "service_role";



GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."challenge_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON TABLE "public"."challenge_user_points" TO "anon";
GRANT ALL ON TABLE "public"."challenge_user_points" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_user_points" TO "service_role";



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



GRANT ALL ON TABLE "public"."group_user_mapping" TO "anon";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "service_role";
GRANT ALL ON TABLE "public"."group_user_mapping" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."event_groups_view" TO "anon";
GRANT ALL ON TABLE "public"."event_groups_view" TO "authenticated";
GRANT ALL ON TABLE "public"."event_groups_view" TO "service_role";



GRANT ALL ON TABLE "public"."events_user_view" TO "anon";
GRANT ALL ON TABLE "public"."events_user_view" TO "authenticated";
GRANT ALL ON TABLE "public"."events_user_view" TO "service_role";



GRANT ALL ON TABLE "public"."features" TO "anon";
GRANT ALL ON TABLE "public"."features" TO "authenticated";
GRANT ALL ON TABLE "public"."features" TO "service_role";



GRANT ALL ON TABLE "public"."group_features" TO "anon";
GRANT ALL ON TABLE "public"."group_features" TO "authenticated";
GRANT ALL ON TABLE "public"."group_features" TO "service_role";
GRANT ALL ON TABLE "public"."group_features" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."group_permissions" TO "anon";
GRANT ALL ON TABLE "public"."group_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."group_permissions" TO "service_role";
GRANT ALL ON TABLE "public"."group_permissions" TO "supabase_auth_admin";



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



GRANT ALL ON TABLE "public"."notification_token" TO "anon";
GRANT ALL ON TABLE "public"."notification_token" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_token" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."readable_history" TO "anon";
GRANT ALL ON TABLE "public"."readable_history" TO "authenticated";
GRANT ALL ON TABLE "public"."readable_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_calendar_event_mapping" TO "anon";
GRANT ALL ON TABLE "public"."user_calendar_event_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."user_calendar_event_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."user_calender_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_calender_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_calender_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_features" TO "anon";
GRANT ALL ON TABLE "public"."user_features" TO "authenticated";
GRANT ALL ON TABLE "public"."user_features" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_notification_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_notification_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_notification_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



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
