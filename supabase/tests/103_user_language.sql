-- 103_user_language.sql
-- public.user.language ('de' | 'en'): German by default, only those two values, taken from the
-- sign-up metadata, and changeable by the user themself but not by others.
BEGIN;
SELECT plan(7);

-- Sign-up: the language chosen on the device arrives as auth metadata; anything else becomes German.
-- (auth.users is only writable by the test session itself, so this runs before switching roles.)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'lang_en@test.com', '{"name": "Lang En", "language": "en"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'lang_fr@test.com', '{"name": "Lang Fr", "language": "fr"}');

SELECT tests.authenticate_as_service_role();

SELECT is(
  (SELECT language FROM public."user" WHERE id = tests.get_supabase_uid('user_1a')),
  'de', 'a profile created without a language is German');

SELECT throws_ok(
  $$ UPDATE public."user" SET language = 'fr' WHERE id = tests.get_supabase_uid('user_1a') $$,
  '23514', NULL, 'only de and en are accepted');

SELECT is(
  (SELECT language FROM public."user" WHERE id = '00000000-0000-0000-0000-0000000000a1'),
  'en', 'sign-up with language en creates an English profile');

SELECT is(
  (SELECT language FROM public."user" WHERE id = '00000000-0000-0000-0000-0000000000a2'),
  'de', 'sign-up with an unsupported language falls back to German');

SELECT tests.authenticate_as('user_1a');

SELECT lives_ok(
  $$ UPDATE public."user" SET language = 'en' WHERE id = tests.get_supabase_uid('user_1a') $$,
  'a user can change their own language');

SELECT is(
  (SELECT language FROM public."user" WHERE id = tests.get_supabase_uid('user_1a')),
  'en', 'and it is saved');

-- RLS filters the row out: no error, no change.
UPDATE public."user" SET language = 'en' WHERE id = tests.get_supabase_uid('user_1b');

SELECT tests.authenticate_as_service_role();
SELECT is(
  (SELECT language FROM public."user" WHERE id = tests.get_supabase_uid('user_1b')),
  'de', 'a user cannot change someone else''s language');

SELECT * FROM finish();
ROLLBACK;
