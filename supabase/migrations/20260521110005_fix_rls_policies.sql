-- Fix HIGH security issues: overly permissive USING (true) RLS policies
-- that expose other users' private data (notifications, payments, vouchers)
-- and allow unauthenticated enumeration of all users.

-- ============================================================
-- notifications: drop the catch-all policy, add user-scoped one
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON "public"."notifications";

CREATE POLICY "Allow select for own notifications"
  ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ("user" = (SELECT auth.uid())::text);

-- ============================================================
-- payments: drop the catch-all USING (true) policy
-- The existing "Allow own payment or if drinks.confirm.payments
-- permission is p" policy already enforces correct row-level
-- access, so no replacement is needed.
-- ============================================================
DROP POLICY IF EXISTS "Enable access for all users" ON "public"."payments";

-- ============================================================
-- vouchers: drop the catch-all policy, add user-scoped one
-- ============================================================
DROP POLICY IF EXISTS "Enable access for all users" ON "public"."vouchers";

CREATE POLICY "Allow select for own vouchers"
  ON "public"."vouchers"
  FOR SELECT
  TO "authenticated"
  USING ("user" = (SELECT auth.uid())::text);

-- ============================================================
-- public.user: drop the policy that grants anon read access
-- Replace with an authenticated-only policy so unauthenticated
-- clients cannot enumerate users, while authenticated users
-- can still see other members' names/avatars for group features.
-- ============================================================
DROP POLICY IF EXISTS "Enable access for all users" ON "public"."user";

-- The existing "Allow select access to public.user for authenticated
-- users" policy already covers authenticated SELECT with USING (true),
-- so no new authenticated policy is required here.
