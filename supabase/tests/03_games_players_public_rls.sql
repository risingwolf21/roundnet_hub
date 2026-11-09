BEGIN;

SET LOCAL TIME ZONE 'UTC';
SELECT plan(4);

-- Kurz ein paar User aufsetzen, damit die Foreign Keys in die public.user nicht crashen
SELECT tests.create_supabase_user('user_1a');
SELECT tests.create_supabase_user('user_1b');
SELECT tests.create_supabase_user('user_2a');
SELECT tests.create_supabase_user('user_2b');
SELECT tests.create_supabase_user('user_1c');

INSERT INTO public.user ("id") VALUES 
  (tests.get_supabase_uid('user_1a')), (tests.get_supabase_uid('user_1b')), 
  (tests.get_supabase_uid('user_2a')), (tests.get_supabase_uid('user_2b')), 
  (tests.get_supabase_uid('user_1c'))
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1a');

-- TEST 1: RLS-Test - Darf ich ein Match direkt eintragen, in dem ich nicht spiele?
SELECT throws_like(
  format($$
  INSERT INTO games.match(a_player_1, a_player_2, b_player_1, b_player_2)
  VALUES ('%s', '%s', '%s', '%s');
  $$, 
  tests.get_supabase_uid('user_1b')::text,
  tests.get_supabase_uid('user_2b')::text,
  tests.get_supabase_uid('user_1c')::text,
  tests.get_supabase_uid('user_2a')::text),
  '%row-level security%',
  'cannot insert match directly when not a participant'
);

-- TEST 2: Funktionstest - Match als Teilnehmer erfolgreich erstellen
SELECT lives_ok(
  format($$
  SELECT games.add_match_with_sets(
    '%s', 1000,
    '%s', 1000,
    '%s', 1000,
    '%s', 1000,
    '[{"team_a_score":15,"team_b_score":10}]'::json,
    NULL,
    '%s',
    true
  );
  $$,
  tests.get_supabase_uid('user_1a')::text,
  tests.get_supabase_uid('user_1b')::text,
  tests.get_supabase_uid('user_2b')::text,
  tests.get_supabase_uid('user_1c')::text,
  tests.get_supabase_uid('user_1a')::text),
  'add_match_with_sets works for participant creating vs opponent'
);

-- TEST 3: Funktionstest - Blockieren, wenn man nicht im Match steht
SELECT throws_like(
  format($$
  SELECT games.add_match_with_sets(
    '%s', 1000,
    '%s', 1000,
    '%s', 1000,
    '%s', 1000,
    '[{"team_a_score":15,"team_b_score":10}]'::json,
    NULL,
    '%s',
    true
  );
  $$,
  tests.get_supabase_uid('user_2a')::text,
  tests.get_supabase_uid('user_1b')::text,
  tests.get_supabase_uid('user_2b')::text,
  tests.get_supabase_uid('user_1c')::text,
  tests.get_supabase_uid('user_1a')::text),
  '%Benutzer muss selbst im Match vorkommen%',
  'function blocks when caller is not a participant'
);

-- TEST 4: Sichtbarkeit - Wurde das Match angelegt und ist für Spieler sichtbar?
SELECT cmp_ok(
 (SELECT count(*)::bigint FROM games.match WHERE b_player_1 = tests.get_supabase_uid('user_2b') 
  OR b_player_2 = tests.get_supabase_uid('user_2b')),
 '='::text, 1::bigint, 'spieler sieht das match'
);

SELECT * FROM finish();
ROLLBACK;