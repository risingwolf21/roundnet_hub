-- 00_test_helpers.sql  (keine Transaktion, kein plan/finish)
SET client_min_messages = WARNING;
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Simulierter Login (RLS)
CREATE OR REPLACE FUNCTION test_login(uid text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
END; $$;

CREATE OR REPLACE FUNCTION as_service() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role','service_role', true);
  -- service_role hat keine sub-Claim – setzen wir leer
  PERFORM set_config('request.jwt.claims','{}', true);
END $$;

-- Zwei Test-User (gültige UUIDs!)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."user" WHERE "userId"='00000000-0000-0000-0000-0000000000a1') THEN
    INSERT INTO public."user"("userId","displayName","email","name")
    VALUES ('00000000-0000-0000-0000-0000000000a1','Test User a1','a1@example.com','User One');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."user" WHERE "userId"='00000000-0000-0000-0000-0000000000b2') THEN
    INSERT INTO public."user"("userId","displayName","email","name")
    VALUES ('00000000-0000-0000-0000-0000000000b2','Test User b2','b2@example.com','User Two');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."user" WHERE "userId"='00000000-0000-0000-0000-0000000000a2') THEN
    INSERT INTO public."user"("userId","displayName","email","name")
    VALUES ('00000000-0000-0000-0000-0000000000a2','Test User a2','a2@example.com','User Two');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."user" WHERE "userId"='00000000-0000-0000-0000-0000000000b1') THEN
    INSERT INTO public."user"("userId","displayName","email","name")
    VALUES ('00000000-0000-0000-0000-0000000000b1','Test User b1','u2@example.com','User Two');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."user" WHERE "userId"='00000000-0000-0000-0000-0000000000c1') THEN
    INSERT INTO public."user"("userId","displayName","email","name")
    VALUES ('00000000-0000-0000-0000-0000000000c1','Test User c1','u2@example.com','User Two');
  END IF;
END $$;

-- Testgruppe (gültige UUID)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.event_group WHERE id='00000000-0000-0000-0000-000000000042') THEN
    INSERT INTO public.event_group(id,name,visible,is_public,need_request_to_join)
    VALUES ('00000000-0000-0000-0000-000000000042','Testgruppe', true, true, false);
  END IF;
END $$;

-- Mitgliedschaft
INSERT INTO public.group_user_mapping("user","group","role")
VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000042','admin'),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000042','user')
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions(name) VALUES ('event.edit') ON CONFLICT DO NOTHING;
INSERT INTO public.features(name) VALUES ('items') ON CONFLICT DO NOTHING;


-- Gruppe bekommt die Permission
INSERT INTO public.group_permissions("group","permission")
VALUES ('00000000-0000-0000-0000-000000000042','event.edit')
       ON CONFLICT DO NOTHING;

INSERT INTO public.group_features("group","feature")
VALUES ('00000000-0000-0000-0000-000000000042','items')
       ON CONFLICT DO NOTHING;


-- Idempotenter Unique-Constraint für Events(key,start)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='uq_events_key_start'
  ) THEN
    BEGIN
      ALTER TABLE public.events
        ADD CONSTRAINT uq_events_key_start UNIQUE ("key","startingDateTime");
    EXCEPTION WHEN unique_violation OR check_violation OR others THEN
      -- Falls vorhandene Duplikate das Anlegen verhindern:
      RAISE NOTICE 'Could not add uq_events_key_start (duplicates exist?)';
    END;
  END IF;
END $$;

-- Gruppenerlaubnis robust seeden (umgeht RLS)
CREATE OR REPLACE FUNCTION public.test_seed_grant_permission(p_group uuid, p_perm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.permissions(name) VALUES (p_perm)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.group_permissions("group","permission")
  VALUES (p_group, p_perm)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.test_seed_grant_permission(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_seed_grant_permission(uuid,text) TO authenticated;

-- Analog für Features, falls du sie in Tests brauchst
CREATE OR REPLACE FUNCTION public.test_seed_grant_feature(p_group uuid, p_feature text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.features(name) VALUES (p_feature)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.group_features("group","feature")
  VALUES (p_group, p_feature)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.test_seed_grant_feature(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_seed_grant_feature(uuid,text) TO authenticated;
