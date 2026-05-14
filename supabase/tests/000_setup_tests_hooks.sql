-- install tests utilities
-- install pgtap extension for testing
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Create tests schema and inline helper functions.
-- This replaces the external basejump-supabase_test_helpers package and eliminates
-- the fragile HTTP dependency on api.database.dev that caused CI failures.
CREATE SCHEMA IF NOT EXISTS tests;

-- Persistent lookup table so test files running in separate DB sessions
-- can resolve user identifiers created by 000_setup_tests_users.sql.
CREATE TABLE IF NOT EXISTS tests.test_users (
    identifier text PRIMARY KEY,
    user_id    uuid NOT NULL
);

-- Insert a row into auth.users and record the identifier→UUID mapping.
CREATE OR REPLACE FUNCTION tests.create_supabase_user(
    identifier text,
    email      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    user_email  text := COALESCE(email, identifier || '@test.com');
BEGIN
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone_change,
        phone_change_token,
        email_change_token_current,
        email_change_confirm_status,
        reauthentication_token,
        is_sso_user,
        is_anonymous
    ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        new_user_id,
        'authenticated',
        'authenticated',
        user_email,
        '',
        NOW(),
        '',
        '',
        '',
        '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('test_identifier', identifier),
        false,
        NOW(),
        NOW(),
        '',
        '',
        '',
        0,
        '',
        false,
        false
    );

    INSERT INTO tests.test_users (identifier, user_id)
    VALUES (identifier, new_user_id);

    RETURN new_user_id;
END;
$$;

-- Resolve a test user's UUID from its identifier.
CREATE OR REPLACE FUNCTION tests.get_supabase_uid(identifier text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_id uuid;
BEGIN
    SELECT t.user_id INTO user_id
    FROM tests.test_users t
    WHERE t.identifier = $1;

    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Test user "%" not found. Call tests.create_supabase_user first.', identifier;
    END IF;

    RETURN user_id;
END;
$$;

-- Set JWT claims and DB role to simulate an authenticated user.
-- Use SET LOCAL so the change is scoped to the current transaction.
CREATE OR REPLACE FUNCTION tests.authenticate_as(identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_id    uuid;
    user_email text;
BEGIN
    SELECT t.user_id, u.email
      INTO user_id, user_email
    FROM tests.test_users t
    JOIN auth.users u ON u.id = t.user_id
    WHERE t.identifier = $1;

    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Test user "%" not found. Call tests.create_supabase_user first.', identifier;
    END IF;

    PERFORM set_config(
        'request.jwt.claims',
        json_build_object(
            'sub',   user_id::text,
            'role',  'authenticated',
            'email', user_email
        )::text,
        true
    );

    SET LOCAL ROLE authenticated;
END;
$$;

-- Set JWT claims and DB role to simulate service_role access.
CREATE OR REPLACE FUNCTION tests.authenticate_as_service_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM set_config(
        'request.jwt.claims',
        '{"role":"service_role"}'::text,
        true
    );

    SET LOCAL ROLE service_role;
END;
$$;

-- Clear JWT claims and reset DB role.
CREATE OR REPLACE FUNCTION tests.clear_authentication()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', '', true);
    SET LOCAL ROLE postgres;
END;
$$;

-- Allow non-superuser roles to resolve and execute tests.* functions.
-- Needed because test files call authenticate_as/get_supabase_uid as the
-- 'authenticated' role (after the first authenticate_as switches the role).
GRANT USAGE ON SCHEMA tests TO authenticated, anon, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated, anon, service_role;

\if :{?TESTDIR}
  \cd :TESTDIR
\endif

SELECT plan(0);
