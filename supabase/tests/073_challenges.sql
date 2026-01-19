-- 073_challenges_policies_test.sql
BEGIN;
SET LOCAL TIME ZONE 'UTC';

SELECT plan(18);

-- Test helpers + users


-- === Groups & permissions setup ===========================================

-- Challenge member group (user_1a = admin)
WITH g AS (
  SELECT public.create_group_with_user(
    'Challenge Test Group',
    'ctg',
    '#ff8800',
    true,
    false,
    tests.get_supabase_uid('user_1a'),
    'admin',
    NULL
  ) AS grp
)
SELECT (g.grp).id AS challenge_group_id FROM g \gset

-- Add user_1b as member
INSERT INTO public.group_user_mapping ("user","group","role")
VALUES (tests.get_supabase_uid('user_1b'), :'challenge_group_id'::uuid, 'user')
ON CONFLICT DO NOTHING;

-- Managers group (admin has challenge.manage), BUT do not add admin to challenge_group yet.
WITH g AS (
  SELECT public.create_group_with_user(
    'Challenge Managers',
    'mgr',
    '#111111',
    true,
    false,
    tests.get_supabase_uid('admin'),
    'admin',
    NULL
  ) AS grp
)
SELECT (g.grp).id AS managers_group_id FROM g \gset

INSERT INTO public.group_permissions("group","permission")VALUES(:'managers_group_id'::uuid, 'challenge.manage')
ON CONFLICT DO NOTHING;
-- A second, unrelated group for negative visibility tests (admin is a member there)
WITH g AS (
  SELECT public.create_group_with_user(
    'Other Group',
    'og',
    '#000000',
    true,
    false,
    tests.get_supabase_uid('admin'),
    'admin',
    NULL
  ) AS grp
)
SELECT (g.grp).id AS other_group_id FROM g \gset

-- === Deterministic timestamps =============================================

SELECT date_trunc('week', now()) + interval '10 hours' AS t0 \gset
SELECT (:'t0'::timestamptz + interval '1 day') AS t1 \gset
SELECT (:'t0'::timestamptz + interval '2 day') AS t2 \gset

-- === Create main challenge with caps ======================================

SELECT gen_random_uuid() AS challenge_id \gset
INSERT INTO public.challenge (id, name, max_points_per_week, max_points_per_day, "group", automated)
VALUES (:'challenge_id'::uuid, 'Test Challenge', 4, 2, :'challenge_group_id'::uuid, FALSE);

-- === DAILY LIMIT (sum-based) ==============================================

SELECT tests.authenticate_as('user_1a');

-- Two inserts same day (1 + 1 = 2): OK
SELECT public.increase_challenge_stats_count(:'challenge_id'::uuid, 1, :'t0'::timestamptz, NULL);
SELECT public.increase_challenge_stats_count(:'challenge_id'::uuid, 1, (:'t0'::timestamptz + interval '1 minute'), NULL);
SELECT ok(TRUE, 'Two stats in the same day are allowed (sum to daily max).');

-- Third on same day (2 + 1 > 2): FAIL
SELECT throws_like(
  format(
    'SELECT public.increase_challenge_stats_count(%L::uuid, 1, (%L)::timestamptz, NULL)',
    :'challenge_id',
    (:'t0'::timestamptz + interval '2 minute')::text
  ),
  '%Maximum points per day%',
  'Third stat in same day rejected by per-day limit'
);

-- === WEEKLY LIMIT (sum-based) =============================================

-- Day 1 (+1) -> total 3
SELECT public.increase_challenge_stats_count(:'challenge_id'::uuid, 1, :'t1'::timestamptz, NULL);
SELECT ok(TRUE, 'One more on day 1 accepted (total 3 for the week).');

-- Day 2 (+1) -> total 4
SELECT public.increase_challenge_stats_count(:'challenge_id'::uuid, 1, :'t2'::timestamptz, NULL);
SELECT ok(TRUE, 'First on day 2 accepted (total 4 for the week).');

-- Another on day 2 -> 5 > 4: FAIL
SELECT throws_like(
  format(
    'SELECT public.increase_challenge_stats_count(%L::uuid, 1, (%L)::timestamptz, NULL)',
    :'challenge_id',
    (:'t2'::timestamptz + interval '1 minute')::text
  ),
  '%Maximum points per week%',
  'Fifth stat in the same week rejected by weekly limit'
);

-- Sanity: weekly sum is exactly 4
SELECT cmp_ok(
  (
    SELECT COALESCE(SUM(cs."count"),0)
    FROM public.challenge_stats cs
    WHERE cs."user" = tests.get_supabase_uid('user_1a')
      AND cs."challenge" = :'challenge_id'::uuid
      AND cs.created_at >= date_trunc('week', :'t0'::timestamptz)
      AND cs.created_at  < date_trunc('week', :'t0'::timestamptz) + interval '7 days'
  ),
  '='::text,
  4::numeric,
  'Weekly sum is exactly the configured limit'
);

-- === RLS: cannot insert for others; manager can ===========================

SELECT tests.authenticate_as('user_1b');
SELECT throws_like(
  format(
    'INSERT INTO public.challenge_stats("challenge","user","count","created_at") VALUES (%L::uuid, %L, 1, (%L)::timestamptz)',
    :'challenge_id',
    tests.get_supabase_uid('user_1a'),
    (:'t0'::timestamptz + interval '15 days')::text
  ),
  '%row-level security%',
  'user_1b cannot insert stats for user_1a'
);

SELECT tests.authenticate_as('admin');
INSERT INTO public.challenge_stats("challenge","user","count","created_at")
VALUES (:'challenge_id'::uuid, tests.get_supabase_uid('user_1a'), 1, (:'t0'::timestamptz + interval '15 days'));
SELECT ok(TRUE, 'admin (challenge.manage) can insert for another user');

-- === RLS-proof: manager-seeded points still block daily cap ===============

SELECT tests.authenticate_as('admin');
INSERT INTO public.challenge_stats("challenge","user","count","created_at")
VALUES (:'challenge_id'::uuid, tests.get_supabase_uid('user_1a'), 2, (:'t0'::timestamptz + interval '20 days'));

SELECT tests.authenticate_as('user_1a');
SELECT throws_like(
  format(
    'SELECT public.increase_challenge_stats_count(%L::uuid, 1, (%L)::timestamptz, NULL)',
    :'challenge_id',
    (:'t0'::timestamptz + interval '20 days 5 minutes')::text
  ),
  '%Maximum points per day%',
  'Function counts manager-seeded points (RLS-proof) and rejects over the daily cap'
);

-- === Seed a user_1b stat for cross-user R/W tests =========================

SELECT tests.authenticate_as('user_1b');
SELECT public.increase_challenge_stats_count(:'challenge_id'::uuid, 1, (:'t0'::timestamptz + interval '21 days'), NULL);
SELECT ok(TRUE, 'user_1b inserted own stat for later RLS tests.');

-- === SELECT visibility tests =============================================

-- (A) Member can read other member’s stats in the same group
SELECT tests.authenticate_as('user_1b');
SELECT cmp_ok(
  (SELECT COUNT(*) FROM public.challenge_stats
    WHERE "challenge" = :'challenge_id'::uuid
      AND "user" = tests.get_supabase_uid('user_1a')),
  '>='::text, 1::bigint,
  'user_1b can see user_1a stats within the same group'
);

-- Create an unrelated challenge in Other Group (admin member there)
SELECT gen_random_uuid() AS challenge_id_2 \gset
SELECT tests.authenticate_as('admin');

INSERT INTO public.challenge (id, name, max_points_per_week, max_points_per_day, "group", automated)
VALUES (:'challenge_id_2'::uuid, 'Other Challenge', 4, 2, :'other_group_id'::uuid, FALSE);


INSERT INTO public.challenge_stats("challenge","user","count","created_at")
VALUES (:'challenge_id_2'::uuid, tests.get_supabase_uid('admin'), 1, :'t0'::timestamptz);

-- (B) Non-member cannot read other group’s stats
SELECT tests.authenticate_as('user_1b');
SELECT cmp_ok(
  (SELECT COUNT(*) FROM public.challenge_stats WHERE "challenge" = :'challenge_id_2'::uuid),
  '='::text, 0::bigint,
  'user_1b cannot see stats of a challenge in another group'
);

-- (C) Manager (not member) can still read (requires updated SELECT policy)
SELECT tests.authenticate_as('admin');
SELECT cmp_ok(
  (SELECT COUNT(*) FROM public.challenge_stats WHERE "challenge" = :'challenge_id'::uuid),
  '>='::text, 1::bigint,
  'admin (challenge.manage) can read stats even without group membership'
);

-- === UPDATE / DELETE interaction tests ====================================

-- user_1a may not update or delete user_1b’s rows
SELECT tests.authenticate_as('user_1a');

WITH upd AS (
  UPDATE public.challenge_stats
     SET "count" = "count" + 1
   WHERE "challenge" = :'challenge_id'::uuid
     AND "user" = tests.get_supabase_uid('user_1b')
   RETURNING 1
)
SELECT cmp_ok((SELECT COUNT(*) FROM upd), '='::text, 0::bigint, 'user_1a cannot update user_1b stats');

WITH del AS (
  DELETE FROM public.challenge_stats
   WHERE "challenge" = :'challenge_id'::uuid
     AND "user" = tests.get_supabase_uid('user_1b')
   RETURNING 1
)
SELECT cmp_ok((SELECT COUNT(*) FROM del), '='::text, 0::bigint, 'user_1a cannot delete user_1b stats');

-- Admin (manager) without membership cannot update/delete either (membership required)
SELECT tests.authenticate_as('admin');

WITH upd AS (
  UPDATE public.challenge_stats
     SET "count" = "count" + 1
   WHERE "challenge" = :'challenge_id'::uuid
     AND "user" = tests.get_supabase_uid('user_1b')
   RETURNING 1
)
SELECT cmp_ok((SELECT COUNT(*) FROM upd), '='::text, 0::bigint, 'admin (no membership) cannot update user_1b stats');

-- Now add admin to the challenge group → update/delete must succeed
INSERT INTO public.group_user_mapping("user","group","role")
VALUES (tests.get_supabase_uid('admin'), :'challenge_group_id'::uuid, 'user')
ON CONFLICT DO NOTHING;

WITH upd2 AS (
  UPDATE public.challenge_stats
     SET "count" = "count" + 1
   WHERE "challenge" = :'challenge_id'::uuid
     AND "user" = tests.get_supabase_uid('user_1b')
   RETURNING 1
)
SELECT cmp_ok((SELECT COUNT(*) FROM upd2), '>='::text, 1::bigint, 'admin (manager + member) can update user_1b stats');

WITH del2 AS (
  DELETE FROM public.challenge_stats
   WHERE "challenge" = :'challenge_id'::uuid
     AND "user" = tests.get_supabase_uid('user_1b')
   RETURNING 1
)
SELECT cmp_ok((SELECT COUNT(*) FROM del2), '>='::text, 1::bigint, 'admin (manager + member) can delete user_1b stats');

SELECT * FROM finish();
ROLLBACK;
