-- 0xx_set_search_path_for_flagged_functions.sql
BEGIN;

DO $$
DECLARE
  r record;
  path text;
BEGIN
  /*
    Zielmenge: genau die von dir gemeldeten (schema, name).
    Wir joinen diese Liste gegen pg_proc, damit ALLE Overloads derselben Funktion
    (unterschiedliche Argumente) erwischt werden.
  */
  FOR r IN
    WITH targets(schema, name) AS (
      VALUES
        ('public','get_public_table_names'),
        ('public','get_enum_types'),
        ('games','compute_effective_player_from_values'),
        ('public','trg_check_item_capacity'),
        ('public','is_user_in_group'),
        ('public','increase_challenge_stats_count'),
        ('public','check_reply_to'),
        ('public','trg_sync_pledge_event_from_item'),
        ('public','trg_items_guard_columns'),
        ('games','effective_rating_for_player'),
        ('public','delete_user_from_subgroups'),
        ('public','add_item_history_entry'),
        ('public','gettingjsonarray'),
        ('public','check_parent_groups'),
        ('public','updatewaitinglistattendance'),
        ('public','update_attendance_on_maxattendees_change'),
        ('public','as_service'),
        ('public','eventcreation'),
        ('public','trg_set_updated_at'),
        ('public','check_version'),
        ('public','test_login'),
        ('games','category_offset'),
        ('games','effective_team_rating_with_category'),
        ('games','is_match_participant'),
        ('public','get_attending_users'),
        ('public','get_or_create_payment_for_user'),
        ('public','notify_users_of_challenge_stat'),
        ('public','is_user_admin_in_group'),
        ('games','preview_elo_for_match'),
        ('public','trg_pledge_sanity'),
        ('games','team_category'),
        ('public','get_column_info'),
        ('public','update_normalized_players'),
        ('games','fetch_all_player_infos_from_pz'),
        ('public','custom_access_token_hook'),
        ('public','update_event_comment'),
        ('public','add_drinks_history'),
        ('public','getattendingusers'),
        ('public','create_group_with_user')
    )
    SELECT
      n.nspname  AS schema_name,
      p.proname  AS routine_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN targets t ON t.schema = n.nspname AND t.name = p.proname
    WHERE p.prokind = 'f'  -- nur FUNCTIONS (keine Prozeduren/Aggregate)
    ORDER BY 1,2,3
  LOOP
    path := CASE
              WHEN r.schema_name = 'public' THEN 'public, pg_temp'
              WHEN r.schema_name = 'games'  THEN 'games, pg_temp'
              ELSE r.schema_name || ', pg_temp'
            END;

    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path TO %s',
      r.schema_name, r.routine_name, r.args, path
    );
    RAISE NOTICE 'Pinned search_path for %.%(%): %', r.schema_name, r.routine_name, r.args, path;
  END LOOP;
END $$;

COMMIT;
