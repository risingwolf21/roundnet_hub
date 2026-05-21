set check_function_bodies = off;

CREATE OR REPLACE FUNCTION util.get_table_metadata(target_schemas text[] DEFAULT '{public}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', t.table_name,
            'schema', t.table_schema,
            'rls_enabled', (
                SELECT relrowsecurity 
                FROM pg_class c 
                JOIN pg_namespace n ON n.oid = c.relnamespace 
                WHERE n.nspname = t.table_schema AND c.relname = t.table_name
            ),
            'columns', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', column_name,
                        'format', udt_name,
                        'is_nullable', (is_nullable = 'YES'),
                        'default_value', column_default,
                        'enums', (
                            SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
                            FROM pg_type ty
                            JOIN pg_enum e ON ty.oid = e.enumtypid
                            JOIN pg_namespace n ON n.oid = ty.typnamespace
                            WHERE ty.typname = udt_name
                              AND n.nspname = t.table_schema
                        )
                    )
                    ORDER BY ordinal_position
                )
                FROM information_schema.columns
                WHERE table_schema = t.table_schema AND table_name = t.table_name
            ),
            'primary_keys', (
                SELECT jsonb_agg(
                    jsonb_build_object('name', kcu.column_name)
                )
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                  ON tc.constraint_name = kcu.constraint_name 
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY' 
                  AND tc.table_name = t.table_name 
                  AND tc.table_schema = t.table_schema
            ),
            'relationships', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'constraint_name', tc.constraint_name,
                        'source_table_name', tc.table_name,
                        'source_column_name', kcu.column_name,
                        'target_table_name', ccu.table_name,
                        'target_column_name', ccu.column_name
                    )
                )
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                  AND tc.table_name = t.table_name 
                  AND tc.table_schema = t.table_schema
            )
        )
    ) INTO result
    FROM information_schema.tables t
    WHERE t.table_schema = ANY(target_schemas)
      AND t.table_type = 'BASE TABLE';

    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION games.trg_user_to_player()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$BEGIN
  -- Minimal: nur die Player-ID anlegen; Defaults (ka_index=1000 etc.) greifen.
  INSERT INTO games.players (linked_user_id)
  VALUES (NEW."id")
  ON CONFLICT (player) DO NOTHING;

  RETURN NEW;
END;$function$
;


