BEGIN;
SET LOCAL TIME ZONE 'UTC';

-- Helper + Aliase/Logins
\i 000_setup_tests_users.inc

select plan(2);

select tests.create_supabase_user('test_user');

SELECT lives_ok(
  $$
  SELECT * FROM public.user where "userId" = tests.get_supabase_uid('test_user')::text
  $$,
  'Public User wurde angelegt'
); 

SELECT lives_ok(
  $$
  SELECT * FROM games.players where "player" = tests.get_supabase_uid('test_user')::text
  $$,
  'Public User wurde angelegt'
); 


SELECT * FROM finish();
ROLLBACK;