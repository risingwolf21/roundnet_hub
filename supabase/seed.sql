SET
  session_replication_role = replica;

--
-- PostgreSQL database dump
--
-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8
SET
  statement_timeout = 0;

SET
  lock_timeout = 0;

SET
  idle_in_transaction_session_timeout = 0;

SET
  client_encoding = 'UTF8';

SET
  standard_conforming_strings = on;

SELECT
  pg_catalog.set_config ('search_path', '', false);

SET
  check_function_bodies = false;

SET
  xmloption = content;

SET
  client_min_messages = warning;

SET
  row_security = off;

--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: players; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: event_group; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_series; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: match; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: elo_calc_log; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: elo_config; Type: TABLE DATA; Schema: games; Owner: postgres
--
INSERT INTO
  "games"."elo_config" (
    "id",
    "w_rg",
    "w_ka",
    "rg_offset",
    "rg_scale",
    "k_factor",
    "men_offset",
    "mixed_offset",
    "women_offset",
    "upset_bonus_per_level"
  )
VALUES
  (1, 0.5, 0.5, 0, 1, 32, 0, 0, 0, 0) ON CONFLICT DO NOTHING;

--
-- Data for Name: elo_history; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: sets; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: notification_retention; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: notification_topics; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
INSERT INTO
  "notifications"."notification_topics" (
    "topic",
    "description",
    "scope_type",
    "default_enabled"
  )
VALUES
  (
    'event.waitinglist.promoted',
    'Warteliste: Platz freigeworden',
    'event',
    true
  ),
  (
    'event.answer_deadline.reminder',
    'Erinnerung: Anmeldeschluss naht',
    'event',
    true
  ),
  (
    'group.trial.expired',
    'Probezeit beendet',
    'group',
    true
  ),
  (
    'group.trial.expired.admin',
    'Probezeit eines Nutzers beendet',
    'group',
    true
  ),
  ('event.canceled', 'Event abgesagt', 'event', true),
  ('event.updated', 'Event geändert', 'event', true),
  (
    'event.group.updated',
    'Neues Event in deiner Gruppe',
    'event',
    true
  ),
  (
    'event.comment.created',
    'Neuer Kommentar',
    'event',
    true
  ),
  (
    'challenge.added',
    'Neue Challenge',
    'challenge',
    true
  ),
  (
    'challenge.entry.added',
    'Neuer Challenge-Eintrag',
    'challenge',
    true
  ),
  ('game.added', 'Neues Spiel mit dir', 'game', true),
  (
    'group.request.received',
    'Neue Beitrittsanfrage',
    'group',
    true
  ),
  (
    'group.request.confirmed',
    'Beitrittsanfrage bestätigt',
    'group',
    true
  ),
  (
    'item.handover',
    'Schlüsselübergabe',
    'item',
    true
  ),
  (
    'drink.payment.fulfilled',
    'Zahlung bestätigt',
    'payment',
    true
  ) ON CONFLICT DO NOTHING;

--
-- Data for Name: notifications; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: user_notification_preferences; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: web_push_subscriptions; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: app_config; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."app_config" ("key", "value", "updated_at")
VALUES
  (
    'trial_duration_days',
    '28',
    '2026-11-10 08:22:36.481565+00'
  ) ON CONFLICT DO NOTHING;

--
-- Data for Name: bundesliga_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: challenge; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: challenge_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: challenge_stats_meta; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: drink; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_attendance_user_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_bring_items; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_bring_pledges; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_transformations; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: event_transformation_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: features; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."features" ("name", "description")
VALUES
  ('costs', NULL),
  ('bundesliga', NULL),
  (
    'events.trials.guests',
    'Gäste per Link für Probetrainings'
  ) ON CONFLICT DO NOTHING;

--
-- Data for Name: group_features; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."permissions" ("name", "description")
VALUES
  ('grants.manage', NULL),
  (
    'reset_user_password',
    'Passwörter von Nutzern zurücksetzen. Benötigt ebenfalls user.role="admin"'
  ),
  (
    'event.transform',
    'Erlaubt das Transformieren von Events via Event Transformation Regeln.'
  ),
  (
    'games.admin.view',
    'Zeigt alle Werte aus dem Spiel wie ID und ELO Log'
  ),
  (
    'games.delete.own',
    'Erlaubt es eigene Spiele zu löschen'
  ),
  ('admin.analytics.view', 'Admin analysen'),
  (
    'games.admin.merge_accounts',
    'Erlaubt das Mergen von Player und User Accounts'
  ),
  (
    'bundesliga.admin',
    'Erlaubt das harte Neuladen (Re-Scraping) der Bundesliga-Daten.'
  ) ON CONFLICT DO NOTHING;

--
-- Data for Name: group_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: group_user_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: history; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: item_history; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: tournament_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: trial_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: user_direct_grants; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--
--
-- Data for Name: background_errors; Type: TABLE DATA; Schema: util; Owner: postgres
--
--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--
--
-- Name: log_id_seq; Type: SEQUENCE SET; Schema: audit; Owner: postgres
--
SELECT
  pg_catalog.setval ('"audit"."log_id_seq"', 10, true);

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--
SELECT
  pg_catalog.setval ('"auth"."refresh_tokens_id_seq"', 1, false);

--
-- Name: notification_outbox_id_seq; Type: SEQUENCE SET; Schema: notifications; Owner: postgres
--
SELECT
  pg_catalog.setval (
    '"notifications"."notification_outbox_id_seq"',
    1,
    false
  );

--
-- Name: challenge_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."challenge_stats_id_seq"', 1, false);

--
-- Name: history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."history_id_seq"', 1, false);

--
-- Name: key_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."key_history_id_seq"', 1, false);

--
-- Name: keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."keys_id_seq"', 1, false);

--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."payments_id_seq"', 1, false);

--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--
SELECT
  pg_catalog.setval ('"supabase_functions"."hooks_id_seq"', 1, false);

--
-- PostgreSQL database dump complete
--
RESET ALL;