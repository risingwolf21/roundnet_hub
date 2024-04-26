create
    policy "Delete when edit;training permission granted" on "public"."events" as permissive for delete
    to public using
    (
        (ARRAY ['edit;training'::"Permissions"] && (SELECT "user".permissions
                                                    FROM "user"
                                                    WHERE ("user"."userId" = (auth.uid())::text)))
        );

create
    policy "Insert when edit;training permission granted" on "public"."events" as permissive for insert
    to public with check
    (
        (ARRAY ['edit;training'::"Permissions"] && (SELECT "user".permissions
                                                    FROM "user"
                                                    WHERE ("user"."userId" = (auth.uid())::text)))
        );

create
    policy "Update when edit;training permission granted" on "public"."events" as permissive for update
    to public using
    (
        (ARRAY ['edit;training'::"Permissions"] && (SELECT "user".permissions
                                                    FROM "user"
                                                    WHERE ("user"."userId" = (auth.uid())::text)))
        );

create
    policy "Only select events for users event groups" on "public"."events" as permissive for select
    to public using
    (
        (
            ((SELECT events."group") IN (SELECT group_user_mapping."group"
                                         FROM group_user_mapping
                                         WHERE (group_user_mapping."user" = (auth.uid())::text))
                ) OR
            (ARRAY ['edit;training'::"Permissions"] && (SELECT "user".permissions
                                                        FROM "user"
                                                        WHERE ("user"."userId" = (auth.uid())::text))))
        );