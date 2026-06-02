-- Fix HIGH security issues: overly permissive USING (true) RLS policies
-- that expose other users' private data (notifications, payments, vouchers)
-- and allow unauthenticated enumeration of all users.

-- ============================================================
-- notifications: nothing to do here.
-- The old "public"."notifications" table (with its "Allow all" USING(true)
-- policy) was retired in 20251118135526_drop_public_notification_schema.sql.
-- Notifications now live in the dedicated "notifications" schema, whose
-- "notifications"."notifications" table already carries row-scoped policies
-- (notifications_select_own / _update_own / _delete_own). Re-adding policies
-- on the dropped public table would error ("relation does not exist").
-- ============================================================

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
