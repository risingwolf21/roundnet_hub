-- 0xx_fix_security_invoker_on_views.sql
BEGIN;

DO $$
DECLARE
  r record;
  view_oid regclass;
BEGIN
  -- exakt deine vier Views
  FOR r IN
    SELECT * FROM (VALUES
      ('public','event_bring_overview'),
      ('public','event_bring_item_status'),
      ('games' ,'players_public'),
      ('games' ,'user_matches')
    ) AS t(schema_name, view_name)
  LOOP
    -- existiert die View?
    SELECT to_regclass(format('%I.%I', r.schema_name, r.view_name)) INTO view_oid;
    IF view_oid IS NULL THEN
      RAISE NOTICE 'skip: %.% existiert nicht', r.schema_name, r.view_name;
      CONTINUE;
    END IF;

    -- sicherstellen, dass es eine "normale" View (relkind = 'v') ist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = r.schema_name
        AND c.relname = r.view_name
        AND c.relkind = 'v'
    ) THEN
      RAISE NOTICE 'skip: %.% ist keine normale View (evtl. materialized?)', r.schema_name, r.view_name;
      CONTINUE;
    END IF;

    -- security_invoker einschalten (PG 15+)
    BEGIN
      EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', r.schema_name, r.view_name);
      RAISE NOTICE 'security_invoker=true gesetzt für %.%', r.schema_name, r.view_name;
    EXCEPTION
      WHEN syntax_error OR invalid_parameter_value THEN
        -- ältere PG-Versionen ohne Option -> nur Hinweis
        RAISE NOTICE 'security_invoker wird von dieser Postgres-Version nicht unterstützt; %.% übersprungen',
                     r.schema_name, r.view_name;
    END;
  END LOOP;
END $$;

COMMIT;


GRANT SELECT ON TABLE
  public.event_bring_overview,
  public.event_bring_item_status,
  games.players_public,
  games.user_matches
TO authenticated;
