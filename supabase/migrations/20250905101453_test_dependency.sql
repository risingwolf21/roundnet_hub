-- -- install tests utilities
-- -- install pgtap extension for testing
-- create extension if not exists pgtap with schema extensions;
-- /*
-- ---------------------
-- ---- install dbdev ----
-- ----------------------
-- Requires:
--   - pg_tle: https://github.com/aws/pg_tle
--   - pgsql-http: https://github.com/pramsey/pgsql-http
-- */
-- create extension if not exists http with schema extensions;
-- create extension if not exists pg_tle;
-- drop extension if exists "supabase-dbdev";
-- select pgtle.uninstall_extension_if_exists('supabase-dbdev');
-- select
--     pgtle.install_extension(
--         'supabase-dbdev',
--         resp.contents ->> 'version',
--         'PostgreSQL package manager',
--         resp.contents ->> 'sql'
--     )
-- from http(
--     (
--         'GET',
--         'https://api.database.dev/rest/v1/'
--         || 'package_versions?select=sql,version'
--         || '&package_name=eq.supabase-dbdev'
--         || '&order=version.desc'
--         || '&limit=1',
--         array[
--             ('apiKey', '<SUPABASE_API_KEY>')
--         ],
--         null,
--         null
--     )
-- ) x,
-- lateral (
--     select
--         ((row_to_json(x) -> 'content') #>> '{}')::json -> 0
-- ) resp(contents);
-- create extension "supabase-dbdev";
-- select dbdev.install('supabase-dbdev');
-- drop extension if exists "supabase-dbdev";
-- create extension "supabase-dbdev";
-- -- Install test helpers
-- select dbdev.install('basejump-supabase_test_helpers');
-- create extension if not exists "basejump-supabase_test_helpers" version '0.0.6';
-- -- Verify setup with a no-op test
-- begin;
-- select plan(1);
-- select ok(true, 'Pre-test hook completed successfully');
-- select * from finish();
-- rollback;
grant
select
    on public.features to authenticated;

grant
select
    on public.permissions to authenticated;