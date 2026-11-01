-- Fix: removing a member from a root group must also remove their subgroup
-- memberships, even when an *admin* performs the removal.
--
-- trg_delete_user_from_subgroups (AFTER DELETE on group_user_mapping) cascades the
-- deletion into every descendant subgroup of the root group. It was SECURITY INVOKER,
-- so the cascade DELETE ran with the acting user's rights and under RLS. When a group
-- admin removed a member from the root group, the member's rows in the *subgroups* were
-- invisible to that admin (being admin of the root group does not grant admin of a
-- subgroup), so the DELETE matched nothing: the subgroup mappings silently survived and
-- the removed user kept access to the subgroup's events. (Self-removal happened to work
-- because a user can see/delete their own rows.)
--
-- Make the trigger SECURITY DEFINER so the cascade always runs with the function owner's
-- rights and bypasses RLS. This is safe and tightly bounded: the function only deletes
-- the *departing user's own* mappings in descendant subgroups of the exact root group the
-- row was removed from — it adds no capability a correct cascade should not have.
CREATE OR REPLACE FUNCTION public.trg_delete_user_from_subgroups()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  is_root_group BOOLEAN;
BEGIN
  -- Only cascade when the removed membership was in a root (parent) group.
  SELECT parent_group IS NULL INTO is_root_group
  FROM public.event_group
  WHERE id = OLD."group";

  IF NOT is_root_group THEN
    RETURN OLD;
  END IF;

  -- Remove the departing user's memberships in every descendant subgroup.
  DELETE FROM public.group_user_mapping
  WHERE "user" = OLD."user"
    AND "group" IN (
      WITH RECURSIVE subgroups AS (
        SELECT id FROM public.event_group WHERE parent_group = OLD."group"
        UNION ALL
        SELECT g.id
        FROM public.event_group g
        INNER JOIN subgroups sg ON g.parent_group = sg.id
      )
      SELECT id FROM subgroups
    );

  RETURN OLD;
END;
$function$;

-- Trigger definition is unchanged (AFTER DELETE ... EXECUTE FUNCTION trg_delete_user_from_subgroups());
-- only the function's security context changed.
