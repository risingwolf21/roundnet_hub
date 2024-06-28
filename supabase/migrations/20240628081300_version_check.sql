CREATE
OR REPLACE FUNCTION public.check_version (input_version TEXT) RETURNS BOOLEAN AS $$
BEGIN

IF
'1.5.1'::text = input_version THEN
        RETURN TRUE;
ELSE
        raise exception 'Version mismatch';
END IF;
END;
$$
LANGUAGE plpgsql;

create
policy "Version check" on "public"."challenge" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."challenge_stats" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."drink" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."event_attendance_user_mapping" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."event_comments" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."event_group" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."events" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."group_user_mapping" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."history" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."item_history" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."items" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."notifications" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."payments" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);
create
policy "Version check" on "public"."user" as restrictive for all to public using
(
    check_version(((current_setting('request.headers'::text, true))::json ->> 'app_version'::text))
);