-- 01_schema_basics.sql
BEGIN;

SET
  LOCAL TIME ZONE 'UTC';

SELECT
  plan (11);

-- Wichtige Tabellen vorhanden?
SELECT
  has_table ('games', 'players', 'games.players exists');

SELECT
  has_table ('games', 'teams', 'games.teams exists');

SELECT
  has_table ('games', 'match', 'games.match exists');

SELECT
  has_table ('games', 'sets', 'games.sets exists');

SELECT
  has_table (
    'games',
    'elo_history',
    'games.elo_history exists'
  );

SELECT
  has_table (
    'games',
    'elo_calc_log',
    'games.elo_calc_log exists'
  );

-- Wichtige Views vorhanden?
SELECT
  has_view (
    'games',
    'players_public',
    'players_public view exists'
  );

SELECT
  has_view (
    'games',
    'user_matches',
    'user_matches view exists'
  );

-- Wichtige Constraints/Indizes?
SELECT
  has_index (
    'games',
    'elo_history',
    'ix_elo_history_match',
    'ix_elo_history_match index exists'
  );


SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'games.teams'::regclass
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE '%(player_1)%REFERENCES games.players%'
  ),
  'teams.player_1 hat FK auf games.players'
);

-- Trigger Users→Players
SELECT
  has_trigger (
    'public',
    'user',
    'trg_user_to_player',
    'trg_user_to_player exists'
  );

SELECT
  *
FROM
  finish ();

ROLLBACK;