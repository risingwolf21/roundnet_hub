-- 116_calendar_feed_token.sql
-- public.calendar_feed_token(): every user gets one secret feed token, can reset it,
-- and nobody can read the table directly or call the RPC without signing in.
BEGIN;
SELECT plan(7);

SELECT tests.authenticate_as('user_1a');

CREATE TEMP TABLE t_tokens (label text, token uuid);
GRANT ALL ON t_tokens TO PUBLIC;

INSERT INTO t_tokens SELECT 'first', public.calendar_feed_token();
INSERT INTO t_tokens SELECT 'again', public.calendar_feed_token();

SELECT isnt((SELECT token FROM t_tokens WHERE label = 'first'), NULL, 'a token is created on first use');
SELECT is((SELECT token FROM t_tokens WHERE label = 'again'), (SELECT token FROM t_tokens WHERE label = 'first'),
  'asking again returns the same token');

INSERT INTO t_tokens SELECT 'reset', public.calendar_feed_token(true);
SELECT isnt((SELECT token FROM t_tokens WHERE label = 'reset'), (SELECT token FROM t_tokens WHERE label = 'first'),
  'reset replaces the token');

SELECT is_empty($$ SELECT * FROM public.calendar_feed_tokens $$, 'users cannot read the token table directly');

SELECT tests.authenticate_as('user_1b');
SELECT isnt(public.calendar_feed_token(), (SELECT token FROM t_tokens WHERE label = 'reset'),
  'another user gets their own token');

SELECT tests.authenticate_as_service_role();
SELECT is((SELECT token FROM public.calendar_feed_tokens WHERE "user" = tests.get_supabase_uid('user_1a')),
  (SELECT token FROM t_tokens WHERE label = 'reset'), 'only the reset token is stored');

SELECT tests.clear_authentication();
SELECT throws_ok($$ SELECT public.calendar_feed_token() $$, '42501', NULL, 'anon cannot get a token');

SELECT * FROM finish();
ROLLBACK;
