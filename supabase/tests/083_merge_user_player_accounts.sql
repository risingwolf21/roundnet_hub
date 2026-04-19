BEGIN;

-- Wir planen 8 Tests.
SELECT plan(8);

-------------------------------------------------------------------------------
-- 1. SETUP: TESTDATEN & BENUTZER ANLEGEN
-------------------------------------------------------------------------------

SELECT tests.create_supabase_user('test_admin');
SELECT tests.create_supabase_user('test_main_user');
SELECT tests.create_supabase_user('test_guest_1');
SELECT tests.create_supabase_user('test_guest_2');
SELECT tests.create_supabase_user('test_partner');

INSERT INTO public.user ("id") 
VALUES 
  (tests.get_supabase_uid('test_admin')),
  (tests.get_supabase_uid('test_main_user')),
  (tests.get_supabase_uid('test_guest_1')),
  (tests.get_supabase_uid('test_guest_2')),
  (tests.get_supabase_uid('test_partner'))
ON CONFLICT DO NOTHING;

INSERT INTO games.players (player, gender) VALUES 
  (tests.get_supabase_uid('test_admin'), 'm'), -- WICHTIG: Admin als Spieler registrieren (als 4. Dummy)
  (tests.get_supabase_uid('test_main_user'), 'm'),
  (tests.get_supabase_uid('test_guest_1'), 'm'),
  (tests.get_supabase_uid('test_guest_2'), 'm'),
  (tests.get_supabase_uid('test_partner'), 'm')
ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 2. MOCKING: AUTH & BERECHTIGUNGEN
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.authorize(requested_permission text) RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = tests.get_supabase_uid('test_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-------------------------------------------------------------------------------
-- 3. DIE TESTS
-------------------------------------------------------------------------------

-- TEST 1: Unautorisierter Zugriff
SELECT tests.authenticate_as('test_main_user');
SELECT throws_ok(
  $$ SELECT games.merge_guest_player('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006') $$,
  'Dir fehlt die Berechtigung, Accounts zu mergen!',
  'Ablehnung: Ein normaler Nutzer darf keine Accounts zusammenführen'
);

-- Ab jetzt loggen wir uns als Admin ein, damit die Autorisierung durchgeht
SELECT tests.authenticate_as('test_admin');

-- TEST 2: Identische IDs blockieren
SELECT throws_ok(
  format(
    $$ SELECT games.merge_guest_player('%s', '%s') $$, 
    tests.get_supabase_uid('test_main_user'), 
    tests.get_supabase_uid('test_main_user')
  ),
  'Diese Accounts sind bereits gemerged oder identisch!',
  'Ablehnung: Man kann einen Account nicht mit sich selbst zusammenführen'
);

-- TEST 3: Pre-Check - Selbes Team
SELECT tests.clear_authentication();
RESET ROLE;

-- Wir setzen main_user und guest_1 direkt ins gleiche Team (4 Spieler!)
INSERT INTO games.match (id, a_player_1, a_player_2, b_player_1, b_player_2)
VALUES (
  '11111111-0000-0000-0000-000000000000',
  tests.get_supabase_uid('test_main_user'), 
  tests.get_supabase_uid('test_guest_1'),
  tests.get_supabase_uid('test_partner'), 
  tests.get_supabase_uid('test_guest_2')
);

SELECT tests.authenticate_as('test_admin');

SELECT throws_ok(
  format(
    $$ SELECT games.merge_guest_player('%s', '%s') $$, 
    tests.get_supabase_uid('test_main_user'), 
    tests.get_supabase_uid('test_guest_1')
  ),
  'Merge abgebrochen: Der Gast-Account und der echte Account wurden bereits im selben Team eingesetzt. Bitte korrigiere erst das betroffene Match.',
  'Pre-Check: Verhindert Merge, wenn beide im selben Team gespielt haben'
);

-- TEST 4: Pre-Check - Gegner in einem Match
SELECT tests.clear_authentication();
RESET ROLE;

-- Wir setzen main_user in Team A und guest_2 in Team B (4 Spieler!)
INSERT INTO games.match (id, a_player_1, a_player_2, b_player_1, b_player_2) 
VALUES (
  '22222222-0000-0000-0000-000000000000', 
  tests.get_supabase_uid('test_main_user'), 
  tests.get_supabase_uid('test_partner'),
  tests.get_supabase_uid('test_guest_2'),
  tests.get_supabase_uid('test_admin')
);

INSERT INTO games.elo_calc_log (match, eff_team_a, eff_team_b, expected_a, expected_b, k_base, k_eff, category_a, category_b, upset_levels, upset_multiplier, outcome_a, sets_a, sets_b, points_a, points_b, a1_user, b1_user)
VALUES (
  '22222222-0000-0000-0000-000000000000', 1000, 1000, 0.5, 0.5, 32, 32, 'test', 'test', 0, 1, 1, 2, 0, 21, 10,
  tests.get_supabase_uid('test_main_user'), 
  tests.get_supabase_uid('test_guest_2')    
);

SELECT tests.authenticate_as('test_admin');

SELECT throws_ok(
  format(
    $$ SELECT games.merge_guest_player('%s', '%s') $$, 
    tests.get_supabase_uid('test_main_user'), 
    tests.get_supabase_uid('test_guest_2')
  ),
  'Merge abgebrochen: Die Accounts haben in der Vergangenheit gegeneinander gespielt.',
  'Pre-Check: Verhindert Merge, wenn beide gegeneinander gespielt haben'
);

-- TEST 5: Erfolgreicher Merge (ohne Konflikte)
SELECT tests.clear_authentication();
RESET ROLE;
DELETE FROM games.match;

-- Gast 1 spielt völlig legitim, OHNE den main_user (4 Spieler!)
INSERT INTO games.match (id, a_player_1, a_player_2, b_player_1, b_player_2)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  tests.get_supabase_uid('test_guest_1'), 
  tests.get_supabase_uid('test_partner'), 
  tests.get_supabase_uid('test_admin'),
  tests.get_supabase_uid('test_guest_2') 
);

-- Elo Log für Test 8 vorbereiten
INSERT INTO games.elo_calc_log (
  match, rated, outcome_a, sets_a, sets_b, points_a, points_b, 
  eff_team_a, eff_team_b, expected_a, expected_b, k_base, k_eff, category_a, category_b, upset_levels, upset_multiplier,
  a1_user, a2_user, b1_user, b2_user  -- <--- Alle Spieler-Slots befüllen
)
VALUES (
  '33333333-3333-3333-3333-333333333333', true, 1, 2, 0, 21, 10,
  1000, 1000, 0.5, 0.5, 32, 32, 'test', 'test', 0, 1,
  tests.get_supabase_uid('test_guest_1'), 
  tests.get_supabase_uid('test_partner'), 
  tests.get_supabase_uid('test_admin'),
  tests.get_supabase_uid('test_guest_2')
);

SELECT tests.authenticate_as('test_admin');

-- Jetzt führen wir den Merge durch! Keine Errors erwartet = lives_ok
SELECT lives_ok(
  format(
    $$ SELECT games.merge_guest_player('%s', '%s') $$, 
    tests.get_supabase_uid('test_main_user'), 
    tests.get_supabase_uid('test_guest_1')
  ),
  'Erfolgreicher Merge: Funktion wirft keine Fehler bei sauberen Daten'
);

-- TEST 6: Wurde der Gast-Account wirklich gelöscht?
SELECT is_empty(
  format($$ SELECT 1 FROM games.players WHERE player = '%s' $$, tests.get_supabase_uid('test_guest_1')),
  'Datenkonsistenz: Der Gast-Player Eintrag wurde gelöscht'
);

-- TEST 7: Wurde das Match aktualisiert?
SELECT is(
  (SELECT a_player_1 FROM games.match WHERE id = '33333333-3333-3333-3333-333333333333'),
  tests.get_supabase_uid('test_main_user'),
  'Datenkonsistenz: a_player_1 in games.match wurde erfolgreich auf den Hauptnutzer aktualisiert'
);

-- TEST 8: Wurden die Logs aktualisiert?
SELECT is(
  (SELECT a1_user FROM games.elo_calc_log WHERE match = '33333333-3333-3333-3333-333333333333'),
  tests.get_supabase_uid('test_main_user'),
  'Datenkonsistenz: a1_user im Elo-Log wurde erfolgreich auf den Hauptnutzer aktualisiert'
);

-------------------------------------------------------------------------------
-- 4. ABSCHLUSS
-------------------------------------------------------------------------------
SELECT * FROM finish();
ROLLBACK;