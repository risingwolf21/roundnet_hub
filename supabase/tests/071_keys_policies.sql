BEGIN;

SET LOCAL TIME ZONE 'UTC';
SELECT plan(10);

-- Seed: Permission 'items.manage'
INSERT INTO public.permissions(name) VALUES ('items.manage') ON CONFLICT DO NOTHING;

-- Gruppe 42 bekommt (zunächst) KEINE items.manage – das fügen wir später zum Test hinzu
DELETE FROM public.group_permissions
WHERE "group" = '00000000-0000-0000-0000-000000000042' AND permission = 'items.manage';

-- Item in Gruppe 42 erzeugen
INSERT INTO public.items(id, name, color, type, "group", current_holder)
VALUES (1000, 'Keller Schlüssel A', '#88AEBF', 'mtvStorage', '00000000-0000-0000-0000-000000000042', NULL);

SELECT ok(
  EXISTS (SELECT 1 FROM public.items WHERE id = 1000),
  'Item wurde angelegt'
);

-- 1) Als a1 einloggen
SELECT tests.authenticate_as('user_1a');

-- 2) Besitzer übernehmen (NULL -> a1) sollte gehen
SELECT results_eq(
  $$ SELECT key_id, holder FROM public.key_handover(1000::bigint, tests.get_supabase_uid('user_2a')) $$,
  $$ VALUES (1000::bigint, tests.get_supabase_uid('user_2a')) $$,
  'Besitzerwechsel (nehmen) durch Member erlaubt'
);

-- 3) Handover-Log geschrieben?
SELECT cmp_ok(
  (SELECT COUNT(*)::bigint
     FROM public.item_history h
    WHERE h.key = 1000),
  '>='::text, 1::bigint,
  'item_history hat mindestens einen Eintrag'
);

SELECT throws_like(
  $$ SELECT key_id, holder FROM public.key_handover(1000::bigint, tests.get_supabase_uid('user_2b')) $$,
  '%not in group%'::text,
  'Darf nicht an user außerhalb der Gruppe übergeben'
);


select tests.authenticate_as_service_role();
-- 6) items.manage an Gruppe 42 vergeben -> a1 darf jetzt ändern
INSERT INTO public.group_permissions("group","permission")
VALUES ('00000000-0000-0000-0000-000000000042','items.manage')
ON CONFLICT DO NOTHING;

SELECT tests.authenticate_as('user_1a');

-- edit_item benutzt RLS+authorize()
SELECT ok(
  (SELECT (public.edit_item(1000, 'Neuer Name', '#112233', NULL)).id IS NOT NULL),
  'Mit items.manage ist Edit erlaubt (edit_item)'
);

-- 7) Änderungen sind sichtbar
SELECT results_eq(
  $$ SELECT name, color FROM public.items WHERE id = 1000 $$,
  $$ VALUES ('Neuer Name','#112233') $$,
  'Name/Color erfolgreich geändert'
);

-- 7b) Gruppe setzen/entfernen über edit_item (p_set_group)
SELECT is(
  (public.edit_item(1000, p_group => NULL, p_set_group => true))."group",
  NULL::uuid,
  'edit_item: Gruppe entfernen macht den Schlüssel für alle sichtbar'
);
SELECT is(
  (public.edit_item(1000, p_group => '00000000-0000-0000-0000-000000000042', p_set_group => true))."group",
  '00000000-0000-0000-0000-000000000042'::uuid,
  'edit_item: Gruppe setzen, in der man Mitglied ist'
);
SELECT throws_ok(
  $$ SELECT public.edit_item(1000, p_group => '00000000-0000-0000-0000-000000000043', p_set_group => true) $$,
  '42501', NULL,
  'edit_item: Gruppe, in der man nicht Mitglied ist, ist verboten'
);

-- 8) item_history weiterhin nur gruppenweit sichtbar
SELECT tests.authenticate_as('user_1a');
SELECT cmp_ok(
  (SELECT COUNT(*)::bigint FROM public.item_history h
   JOIN public.items i ON i.id = h.key
   WHERE i."group"='00000000-0000-0000-0000-000000000042'),
  '>'::text, 0::bigint,
  'item_history für Gruppenmitglieder sichtbar'
);

SELECT * FROM finish();
ROLLBACK;
