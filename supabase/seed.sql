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
-- Data for Name: log; Type: TABLE DATA; Schema: audit; Owner: postgres
--
INSERT INTO
  "audit"."log" (
    "id",
    "at",
    "actor_id",
    "schema_name",
    "table_name",
    "op",
    "row_pk",
    "changed_cols",
    "old_data",
    "new_data",
    "txid",
    "request_id"
  )
VALUES
  (
    1,
    '2026-11-10 06:55:00.782853+00',
    'system',
    'public',
    'permissions',
    'INSERT',
    '{"name": "reset_user_password"}',
    '{description,name}',
    NULL,
    '{"name": "reset_user_password", "description": "Passwörter von Nutzern zurücksetzen. Benötigt ebenfalls user.role=\"admin\""}',
    1471,
    NULL
  ),
  (
    2,
    '2026-11-10 06:55:01.321432+00',
    'system',
    'public',
    'permissions',
    'INSERT',
    '{"name": "event.transform"}',
    '{description,name}',
    NULL,
    '{"name": "event.transform", "description": "Erlaubt das Transformieren von Events via Event Transformation Regeln."}',
    1485,
    NULL
  ),
  (
    3,
    '2026-11-10 06:55:01.32763+00',
    'system',
    'public',
    'permissions',
    'INSERT',
    '{"name": "games.admin.view"}',
    '{description,name}',
    NULL,
    '{"name": "games.admin.view", "description": "Zeigt alle Werte aus dem Spiel wie ID und ELO Log"}',
    1486,
    NULL
  ),
  (
    4,
    '2026-11-10 06:55:01.32763+00',
    'system',
    'public',
    'permissions',
    'INSERT',
    '{"name": "games.delete.own"}',
    '{description,name}',
    NULL,
    '{"name": "games.delete.own", "description": "Erlaubt es eigene Spiele zu löschen"}',
    1486,
    NULL
  ),
  (
    5,
    '2026-11-10 06:55:01.424972+00',
    'system',
    'public',
    'permissions',
    'INSERT',
    '{"name": "admin.analytics.view"}',
    '{description,name}',
    NULL,
    '{"name": "admin.analytics.view", "description": "Admin analysen"}',
    1492,
    NULL
  ),
  (
    6,
    '2026-11-10 06:55:01.615081+00',
    'system',
    'public',
    'permissions',
    'INSERT',
    '{"name": "games.admin.merge_accounts"}',
    '{description,name}',
    NULL,
    '{"name": "games.admin.merge_accounts", "description": "Erlaubt das Mergen von Player und User Accounts"}',
    1506,
    NULL
  ),
  (
    7,
    '2026-11-10 06:55:01.731249+00',
    'system',
    'public',
    'features',
    'INSERT',
    '{"name": "costs"}',
    '{description,name}',
    NULL,
    '{"name": "costs", "description": null}',
    1519,
    NULL
  ),
  (
    8,
    '2026-11-10 06:55:01.852516+00',
    'system',
    'public',
    'features',
    'INSERT',
    '{"name": "bundesliga"}',
    '{description,name}',
    NULL,
    '{"name": "bundesliga", "description": null}',
    1533,
    NULL
  ),
  (
    9,
    '2026-11-10 06:55:01.854885+00',
    'system',
    'public',
    'permissions',
    'INSERT',
    '{"name": "bundesliga.admin"}',
    '{description,name}',
    NULL,
    '{"name": "bundesliga.admin", "description": "Erlaubt das harte Neuladen (Re-Scraping) der Bundesliga-Daten."}',
    1534,
    NULL
  ),
  (
    10,
    '2026-11-10 06:55:01.926201+00',
    'system',
    'public',
    'features',
    'INSERT',
    '{"name": "events.trials.guests"}',
    '{description,name}',
    NULL,
    '{"name": "events.trials.guests", "description": "Gäste per Link für Probetrainings"}',
    1549,
    NULL
  ),
  (
    103,
    '2026-11-10 06:55:50.077711+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005"}',
    '{last_seen_at}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-09T10:27:13.750508+00:00"}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T06:55:50.078981+00:00"}',
    1655,
    NULL
  ),
  (
    104,
    '2026-11-10 06:55:59.719967+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'INSERT',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials"}',
    '{feature,group}',
    NULL,
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials"}',
    1660,
    NULL
  ),
  (
    105,
    '2026-11-10 06:55:59.719967+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'INSERT',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials.guests"}',
    '{feature,group}',
    NULL,
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials.guests"}',
    1660,
    NULL
  ),
  (
    106,
    '2026-11-10 06:56:13.969137+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005"}',
    '{last_seen_at}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T06:55:50.078981+00:00"}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T06:56:13.970455+00:00"}',
    1678,
    NULL
  ),
  (
    107,
    '2026-11-10 07:04:02.924565+00',
    'system',
    'public',
    'user',
    'INSERT',
    '{"id": "42d0607e-d32a-4ab9-a137-78edfe142996"}',
    '{avatarUrl,created_at,disabled,displayName,email,id,language,last_seen_at,name,role,verified}',
    NULL,
    '{"id": "42d0607e-d32a-4ab9-a137-78edfe142996", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:04:02.924565+00:00", "displayName": "Karl", "last_seen_at": null}',
    2027,
    NULL
  ),
  (
    108,
    '2026-11-10 07:04:02.924565+00',
    'system',
    'games',
    'players',
    'INSERT',
    '{"player": "d26f5491-6481-49cb-9911-f7b3121bccd6"}',
    '{created_at,display_name,effective_rating_cached,gender,hide_rating,ka_index,linked_user_id,matches_played,player,pro_status,rg_avatar_url,rg_id,rg_index,rg_link}',
    NULL,
    '{"rg_id": null, "gender": "m", "player": "d26f5491-6481-49cb-9911-f7b3121bccd6", "rg_link": null, "ka_index": 1000, "rg_index": null, "created_at": "2026-11-10T07:04:02.924565+00:00", "pro_status": false, "hide_rating": false, "display_name": null, "rg_avatar_url": null, "linked_user_id": "42d0607e-d32a-4ab9-a137-78edfe142996", "matches_played": 0, "effective_rating_cached": 1000}',
    2027,
    NULL
  ),
  (
    109,
    '2026-11-10 07:04:02.924565+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "42d0607e-d32a-4ab9-a137-78edfe142996"}',
    '{last_seen_at}',
    '{"id": "42d0607e-d32a-4ab9-a137-78edfe142996", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:04:02.924565+00:00", "displayName": "Karl", "last_seen_at": null}',
    '{"id": "42d0607e-d32a-4ab9-a137-78edfe142996", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:04:02.924565+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:04:02.937453+00:00"}',
    2027,
    NULL
  ),
  (
    110,
    '2026-11-10 07:04:03.024223+00',
    '42d0607e-d32a-4ab9-a137-78edfe142996',
    'public',
    'group_user_mapping',
    'INSERT',
    '{"user": "42d0607e-d32a-4ab9-a137-78edfe142996", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    NULL,
    '{"role": "trial", "user": "42d0607e-d32a-4ab9-a137-78edfe142996", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:04:03.024223+00:00", "trial_event_limit": 3}',
    2028,
    NULL
  ),
  (
    128,
    '2026-11-10 07:10:02.083829+00',
    '82486af7-d277-4bb0-910b-8d05066aaea1',
    'public',
    'group_user_mapping',
    'INSERT',
    '{"user": "82486af7-d277-4bb0-910b-8d05066aaea1", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    NULL,
    '{"role": "trial", "user": "82486af7-d277-4bb0-910b-8d05066aaea1", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:10:02.083829+00:00", "trial_event_limit": 3}',
    2439,
    NULL
  ),
  (
    111,
    '2026-11-10 07:07:34.088494+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005"}',
    '{last_seen_at}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T06:56:13.970455+00:00"}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:07:34.089958+00:00"}',
    2249,
    NULL
  ),
  (
    112,
    '2026-11-10 07:08:36.772997+00',
    'system',
    'public',
    'user',
    'INSERT',
    '{"id": "2470be5a-a653-49a9-9a88-6f27b0e57a70"}',
    '{avatarUrl,created_at,disabled,displayName,email,id,language,last_seen_at,name,role,verified}',
    NULL,
    '{"id": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:08:36.772997+00:00", "displayName": "Karl", "last_seen_at": null}',
    2325,
    NULL
  ),
  (
    113,
    '2026-11-10 07:08:36.772997+00',
    'system',
    'games',
    'players',
    'INSERT',
    '{"player": "1a823775-247c-462a-8d04-cb6a4106fd4c"}',
    '{created_at,display_name,effective_rating_cached,gender,hide_rating,ka_index,linked_user_id,matches_played,player,pro_status,rg_avatar_url,rg_id,rg_index,rg_link}',
    NULL,
    '{"rg_id": null, "gender": "m", "player": "1a823775-247c-462a-8d04-cb6a4106fd4c", "rg_link": null, "ka_index": 1000, "rg_index": null, "created_at": "2026-11-10T07:08:36.772997+00:00", "pro_status": false, "hide_rating": false, "display_name": null, "rg_avatar_url": null, "linked_user_id": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "matches_played": 0, "effective_rating_cached": 1000}',
    2325,
    NULL
  ),
  (
    114,
    '2026-11-10 07:08:36.772997+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "2470be5a-a653-49a9-9a88-6f27b0e57a70"}',
    '{last_seen_at}',
    '{"id": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:08:36.772997+00:00", "displayName": "Karl", "last_seen_at": null}',
    '{"id": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:08:36.772997+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:08:36.7805+00:00"}',
    2325,
    NULL
  ),
  (
    115,
    '2026-11-10 07:08:36.905753+00',
    '2470be5a-a653-49a9-9a88-6f27b0e57a70',
    'public',
    'group_user_mapping',
    'INSERT',
    '{"user": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    NULL,
    '{"role": "trial", "user": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:08:36.905753+00:00", "trial_event_limit": 3}',
    2326,
    NULL
  ),
  (
    116,
    '2026-11-10 07:09:36.432802+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005"}',
    '{last_seen_at}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:07:34.089958+00:00"}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:09:36.434004+00:00"}',
    2397,
    NULL
  ),
  (
    117,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "3c3ae9fe-72b4-456f-88da-629d9517f729"}',
    '{trials_open}',
    '{"id": "3c3ae9fe-72b4-456f-88da-629d9517f729", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-09T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-11-15T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-11-15T10:32:00+00:00", "occurrence_date": "2026-11-15", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-11-15T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "3c3ae9fe-72b4-456f-88da-629d9517f729", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-09T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-11-15T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-11-15T10:32:00+00:00", "occurrence_date": "2026-11-15", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-11-15T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    118,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "243c6f00-5bc2-4305-a888-41796f19e397"}',
    '{trials_open}',
    '{"id": "243c6f00-5bc2-4305-a888-41796f19e397", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-16T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-11-22T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-11-22T10:32:00+00:00", "occurrence_date": "2026-11-22", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-11-22T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "243c6f00-5bc2-4305-a888-41796f19e397", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-16T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-11-22T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-11-22T10:32:00+00:00", "occurrence_date": "2026-11-22", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-11-22T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    119,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "4dcdd532-7453-49b2-be2b-3df94c998465"}',
    '{trials_open}',
    '{"id": "4dcdd532-7453-49b2-be2b-3df94c998465", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-23T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-11-29T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-11-29T10:32:00+00:00", "occurrence_date": "2026-11-29", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-11-29T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "4dcdd532-7453-49b2-be2b-3df94c998465", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-23T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-11-29T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-11-29T10:32:00+00:00", "occurrence_date": "2026-11-29", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-11-29T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    120,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "a00ce0db-9d38-4ab8-b54b-43b1a3a4c921"}',
    '{trials_open}',
    '{"id": "a00ce0db-9d38-4ab8-b54b-43b1a3a4c921", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-30T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-06T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-06T10:32:00+00:00", "occurrence_date": "2026-12-06", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-06T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "a00ce0db-9d38-4ab8-b54b-43b1a3a4c921", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-11-30T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-06T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-06T10:32:00+00:00", "occurrence_date": "2026-12-06", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-06T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    121,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "6f2a9fe0-314b-4fc4-88cf-a2fa75e9db48"}',
    '{trials_open}',
    '{"id": "6f2a9fe0-314b-4fc4-88cf-a2fa75e9db48", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-07T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-13T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-13T10:32:00+00:00", "occurrence_date": "2026-12-13", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-13T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "6f2a9fe0-314b-4fc4-88cf-a2fa75e9db48", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-07T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-13T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-13T10:32:00+00:00", "occurrence_date": "2026-12-13", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-13T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    122,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "3477d53f-f128-47d2-a115-7413520ed235"}',
    '{trials_open}',
    '{"id": "3477d53f-f128-47d2-a115-7413520ed235", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-14T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-20T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-20T10:32:00+00:00", "occurrence_date": "2026-12-20", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-20T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "3477d53f-f128-47d2-a115-7413520ed235", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-14T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-20T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-20T10:32:00+00:00", "occurrence_date": "2026-12-20", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-20T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    123,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "7d2a1fa1-1027-424b-bdaa-5996d1072624"}',
    '{trials_open}',
    '{"id": "7d2a1fa1-1027-424b-bdaa-5996d1072624", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-21T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-27T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-27T10:32:00+00:00", "occurrence_date": "2026-12-27", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-27T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "7d2a1fa1-1027-424b-bdaa-5996d1072624", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-21T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2026-12-27T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2026-12-27T10:32:00+00:00", "occurrence_date": "2026-12-27", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2026-12-27T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    124,
    '2026-11-10 07:09:44.446154+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'events',
    'UPDATE',
    '{"id": "9655acd1-5801-479a-aff5-472e29eb901c"}',
    '{trials_open}',
    '{"id": "9655acd1-5801-479a-aff5-472e29eb901c", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-28T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2027-01-03T12:32:00+00:00", "isCancelled": false, "trials_open": false, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2027-01-03T10:32:00+00:00", "occurrence_date": "2027-01-03", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2027-01-03T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    '{"id": "9655acd1-5801-479a-aff5-472e29eb901c", "key": "9820c7d7-d5d0-47cb-8852-50b82c1d14b3", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "place": "{\"name\":\"Karoline-Luise-Tunnel\",\"description\":\"Karoline-Luise-Tunnel, 76133 Karlsruhe\",\"lat\":49.00547564596969,\"lon\":8.403553962707521}", "title": "Thursday Training", "detached": false, "series_id": "01de716f-bbdf-427b-843f-99cc7749ff27", "created_at": "2026-11-09T10:33:00.009103+00:00", "recurrence": "Weekly", "answerStart": "2026-12-28T09:32:00+00:00", "description": "Thursday Training", "endDateTime": "2027-01-03T12:32:00+00:00", "isCancelled": false, "trials_open": true, "maxAttendees": null, "items_enabled": false, "recurrenceEnd": null, "required_item": null, "answerDeadline": null, "meetingDateTime": "2027-01-03T10:32:00+00:00", "occurrence_date": "2027-01-03", "reminder_before": null, "reminder_sent_at": null, "startingDateTime": "2027-01-03T10:32:00+00:00", "max_trial_attendees": null, "constellations_enabled": false}',
    2407,
    NULL
  ),
  (
    125,
    '2026-11-10 07:10:01.990803+00',
    'system',
    'public',
    'user',
    'INSERT',
    '{"id": "82486af7-d277-4bb0-910b-8d05066aaea1"}',
    '{avatarUrl,created_at,disabled,displayName,email,id,language,last_seen_at,name,role,verified}',
    NULL,
    '{"id": "82486af7-d277-4bb0-910b-8d05066aaea1", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:10:01.990803+00:00", "displayName": "Karl", "last_seen_at": null}',
    2438,
    NULL
  ),
  (
    126,
    '2026-11-10 07:10:01.990803+00',
    'system',
    'games',
    'players',
    'INSERT',
    '{"player": "a53143bc-f51f-4c25-9686-0c68d4d10c87"}',
    '{created_at,display_name,effective_rating_cached,gender,hide_rating,ka_index,linked_user_id,matches_played,player,pro_status,rg_avatar_url,rg_id,rg_index,rg_link}',
    NULL,
    '{"rg_id": null, "gender": "m", "player": "a53143bc-f51f-4c25-9686-0c68d4d10c87", "rg_link": null, "ka_index": 1000, "rg_index": null, "created_at": "2026-11-10T07:10:01.990803+00:00", "pro_status": false, "hide_rating": false, "display_name": null, "rg_avatar_url": null, "linked_user_id": "82486af7-d277-4bb0-910b-8d05066aaea1", "matches_played": 0, "effective_rating_cached": 1000}',
    2438,
    NULL
  ),
  (
    127,
    '2026-11-10 07:10:01.990803+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "82486af7-d277-4bb0-910b-8d05066aaea1"}',
    '{last_seen_at}',
    '{"id": "82486af7-d277-4bb0-910b-8d05066aaea1", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:10:01.990803+00:00", "displayName": "Karl", "last_seen_at": null}',
    '{"id": "82486af7-d277-4bb0-910b-8d05066aaea1", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:10:01.990803+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:10:01.997001+00:00"}',
    2438,
    NULL
  ),
  (
    129,
    '2026-11-10 07:11:43.085529+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005"}',
    '{last_seen_at}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:09:36.434004+00:00"}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:11:43.086852+00:00"}',
    2544,
    NULL
  ),
  (
    130,
    '2026-11-10 07:11:51.94139+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'INSERT',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events"}',
    '{feature,group}',
    NULL,
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events"}',
    2553,
    NULL
  ),
  (
    131,
    '2026-11-10 07:11:59.602367+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'DELETE',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events"}',
    '{feature,group}',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events"}',
    NULL,
    2563,
    NULL
  ),
  (
    132,
    '2026-11-10 07:11:59.602367+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'DELETE',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials"}',
    '{feature,group}',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials"}',
    NULL,
    2563,
    NULL
  ),
  (
    133,
    '2026-11-10 07:11:59.602367+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_user_mapping',
    'UPDATE',
    '{"user": "42d0607e-d32a-4ab9-a137-78edfe142996", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{role,trial_event_limit,trial_started_at}',
    '{"role": "trial", "user": "42d0607e-d32a-4ab9-a137-78edfe142996", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:04:03.024223+00:00", "trial_event_limit": 3}',
    '{"role": "joinRequested", "user": "42d0607e-d32a-4ab9-a137-78edfe142996", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": null, "trial_event_limit": null}',
    2563,
    NULL
  ),
  (
    134,
    '2026-11-10 07:11:59.602367+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_user_mapping',
    'UPDATE',
    '{"user": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{role,trial_event_limit,trial_started_at}',
    '{"role": "trial", "user": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:08:36.905753+00:00", "trial_event_limit": 3}',
    '{"role": "joinRequested", "user": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": null, "trial_event_limit": null}',
    2563,
    NULL
  ),
  (
    135,
    '2026-11-10 07:11:59.602367+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_user_mapping',
    'UPDATE',
    '{"user": "82486af7-d277-4bb0-910b-8d05066aaea1", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{role,trial_event_limit,trial_started_at}',
    '{"role": "trial", "user": "82486af7-d277-4bb0-910b-8d05066aaea1", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:10:02.083829+00:00", "trial_event_limit": 3}',
    '{"role": "joinRequested", "user": "82486af7-d277-4bb0-910b-8d05066aaea1", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": null, "trial_event_limit": null}',
    2563,
    NULL
  ),
  (
    136,
    '2026-11-10 07:11:59.602367+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'DELETE',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials.guests"}',
    '{feature,group}',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials.guests"}',
    NULL,
    2563,
    NULL
  ),
  (
    137,
    '2026-11-10 07:12:15.049921+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'INSERT',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.transformations"}',
    '{feature,group}',
    NULL,
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.transformations"}',
    2589,
    NULL
  ),
  (
    138,
    '2026-11-10 07:12:15.049921+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'INSERT',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials"}',
    '{feature,group}',
    NULL,
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials"}',
    2589,
    NULL
  ),
  (
    139,
    '2026-11-10 07:12:15.049921+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'INSERT',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials.guests"}',
    '{feature,group}',
    NULL,
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.trials.guests"}',
    2589,
    NULL
  ),
  (
    140,
    '2026-11-10 07:12:36.702002+00',
    'system',
    'public',
    'user',
    'INSERT',
    '{"id": "2d825450-b80e-455b-99a0-fb8f64b3892e"}',
    '{avatarUrl,created_at,disabled,displayName,email,id,language,last_seen_at,name,role,verified}',
    NULL,
    '{"id": "2d825450-b80e-455b-99a0-fb8f64b3892e", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:12:36.702002+00:00", "displayName": "Karl", "last_seen_at": null}',
    2615,
    NULL
  ),
  (
    141,
    '2026-11-10 07:12:36.702002+00',
    'system',
    'games',
    'players',
    'INSERT',
    '{"player": "64928a42-1cbf-4bd0-94b1-c085ffa293dd"}',
    '{created_at,display_name,effective_rating_cached,gender,hide_rating,ka_index,linked_user_id,matches_played,player,pro_status,rg_avatar_url,rg_id,rg_index,rg_link}',
    NULL,
    '{"rg_id": null, "gender": "m", "player": "64928a42-1cbf-4bd0-94b1-c085ffa293dd", "rg_link": null, "ka_index": 1000, "rg_index": null, "created_at": "2026-11-10T07:12:36.702002+00:00", "pro_status": false, "hide_rating": false, "display_name": null, "rg_avatar_url": null, "linked_user_id": "2d825450-b80e-455b-99a0-fb8f64b3892e", "matches_played": 0, "effective_rating_cached": 1000}',
    2615,
    NULL
  ),
  (
    142,
    '2026-11-10 07:12:36.702002+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "2d825450-b80e-455b-99a0-fb8f64b3892e"}',
    '{last_seen_at}',
    '{"id": "2d825450-b80e-455b-99a0-fb8f64b3892e", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:12:36.702002+00:00", "displayName": "Karl", "last_seen_at": null}',
    '{"id": "2d825450-b80e-455b-99a0-fb8f64b3892e", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:12:36.702002+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:12:36.709913+00:00"}',
    2615,
    NULL
  ),
  (
    143,
    '2026-11-10 07:12:36.790265+00',
    '2d825450-b80e-455b-99a0-fb8f64b3892e',
    'public',
    'group_user_mapping',
    'INSERT',
    '{"user": "2d825450-b80e-455b-99a0-fb8f64b3892e", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    NULL,
    '{"role": "trial", "user": "2d825450-b80e-455b-99a0-fb8f64b3892e", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:12:36.790265+00:00", "trial_event_limit": 3}',
    2616,
    NULL
  ),
  (
    144,
    '2026-11-10 07:13:17.973506+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005"}',
    '{last_seen_at}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:11:43.086852+00:00"}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:13:17.974639+00:00"}',
    2671,
    NULL
  ),
  (
    145,
    '2026-11-10 07:13:28.487996+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'INSERT',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events"}',
    '{feature,group}',
    NULL,
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events"}',
    2686,
    NULL
  ),
  (
    146,
    '2026-11-10 07:13:28.50885+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_features',
    'DELETE',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.transformations"}',
    '{feature,group}',
    '{"group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "feature": "events.transformations"}',
    NULL,
    2687,
    NULL
  ),
  (
    147,
    '2026-11-10 07:14:00.238531+00',
    'system',
    'public',
    'user',
    'INSERT',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d"}',
    '{avatarUrl,created_at,disabled,displayName,email,id,language,last_seen_at,name,role,verified}',
    NULL,
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": null}',
    2733,
    NULL
  ),
  (
    148,
    '2026-11-10 07:14:00.238531+00',
    'system',
    'games',
    'players',
    'INSERT',
    '{"player": "fd23d2b0-f56f-4ed3-9c0a-dfac8aa07ec5"}',
    '{created_at,display_name,effective_rating_cached,gender,hide_rating,ka_index,linked_user_id,matches_played,player,pro_status,rg_avatar_url,rg_id,rg_index,rg_link}',
    NULL,
    '{"rg_id": null, "gender": "m", "player": "fd23d2b0-f56f-4ed3-9c0a-dfac8aa07ec5", "rg_link": null, "ka_index": 1000, "rg_index": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "pro_status": false, "hide_rating": false, "display_name": null, "rg_avatar_url": null, "linked_user_id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "matches_played": 0, "effective_rating_cached": 1000}',
    2733,
    NULL
  ),
  (
    149,
    '2026-11-10 07:14:00.238531+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d"}',
    '{last_seen_at}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": null}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:14:00.24636+00:00"}',
    2733,
    NULL
  ),
  (
    150,
    '2026-11-10 07:14:00.339446+00',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    'public',
    'group_user_mapping',
    'INSERT',
    '{"user": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    NULL,
    '{"role": "trial", "user": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:14:00.339446+00:00", "trial_event_limit": 3}',
    2734,
    NULL
  ),
  (
    151,
    '2026-11-10 07:14:05.79386+00',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    'public',
    'event_attendance_user_mapping',
    'INSERT',
    '{"user": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "event": "3c3ae9fe-72b4-456f-88da-629d9517f729"}',
    '{event,lastUpdate,state,user}',
    NULL,
    '{"user": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "event": "3c3ae9fe-72b4-456f-88da-629d9517f729", "state": "AttendingAsTrial", "lastUpdate": "2026-11-10T07:14:05.79386+00:00"}',
    2745,
    NULL
  ),
  (
    152,
    '2026-11-10 07:14:56.153631+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d"}',
    '{email}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:14:00.24636+00:00"}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "karl.wolf@gmail.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:14:00.24636+00:00"}',
    2794,
    NULL
  ),
  (
    153,
    '2026-11-10 07:15:20.138023+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d"}',
    '{last_seen_at}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "karl.wolf@gmail.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:14:00.24636+00:00"}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "karl.wolf@gmail.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:15:20.139339+00:00"}',
    2837,
    NULL
  ),
  (
    154,
    '2026-11-10 07:15:37.002306+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005"}',
    '{last_seen_at}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:13:17.974639+00:00"}',
    '{"id": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-09T10:27:13.731916+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:15:37.003462+00:00"}',
    2857,
    NULL
  ),
  (
    155,
    '2026-11-10 07:15:56.350471+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_user_mapping',
    'DELETE',
    '{"user": "42d0607e-d32a-4ab9-a137-78edfe142996", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    '{"role": "joinRequested", "user": "42d0607e-d32a-4ab9-a137-78edfe142996", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": null, "trial_event_limit": null}',
    NULL,
    2881,
    NULL
  ),
  (
    156,
    '2026-11-10 07:15:58.386809+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_user_mapping',
    'DELETE',
    '{"user": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    '{"role": "joinRequested", "user": "2470be5a-a653-49a9-9a88-6f27b0e57a70", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": null, "trial_event_limit": null}',
    NULL,
    2884,
    NULL
  ),
  (
    157,
    '2026-11-10 07:16:00.253301+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_user_mapping',
    'DELETE',
    '{"user": "82486af7-d277-4bb0-910b-8d05066aaea1", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{group,role,trial_event_limit,trial_started_at,user}',
    '{"role": "joinRequested", "user": "82486af7-d277-4bb0-910b-8d05066aaea1", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": null, "trial_event_limit": null}',
    NULL,
    2893,
    NULL
  ),
  (
    158,
    '2026-11-10 07:16:06.365182+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'public',
    'group_user_mapping',
    'UPDATE',
    '{"user": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    '{role,trial_started_at}',
    '{"role": "trial", "user": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": "2026-11-10T07:14:00.339446+00:00", "trial_event_limit": 3}',
    '{"role": "user", "user": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465", "trial_started_at": null, "trial_event_limit": 3}',
    2903,
    NULL
  ),
  (
    159,
    '2026-11-10 07:16:18.910007+00',
    'system',
    'public',
    'user',
    'UPDATE',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d"}',
    '{last_seen_at}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "karl.wolf@gmail.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:15:20.139339+00:00"}',
    '{"id": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "name": "Karl", "role": "user", "email": "karl.wolf@gmail.com", "disabled": false, "language": "en", "verified": false, "avatarUrl": null, "created_at": "2026-11-10T07:14:00.238531+00:00", "displayName": "Karl", "last_seen_at": "2026-11-10T07:16:18.911224+00:00"}',
    2920,
    NULL
  );

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."audit_log_entries" (
    "instance_id",
    "id",
    "payload",
    "created_at",
    "ip_address"
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '06fa06e9-0723-4e96-8ac7-748cee0adf52',
    '{"action":"user_signedup","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}',
    '2026-11-09 10:27:13.743075+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a7ad1d27-1923-4b1c-a090-e36c1f0c3051',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-09 10:27:13.749739+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '9ec911d3-5fbb-4742-ba7c-f57fde0451c9',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 06:55:50.077906+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '14331e48-badf-4f0c-a416-9e501298e008',
    '{"action":"logout","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 06:56:07.343259+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '628aeea4-3fd4-47dc-aa31-111c4a70c023',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 06:56:13.969357+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '138f80b3-5094-48c0-985c-a58870628a58',
    '{"action":"logout","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 06:56:29.928439+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b54e2705-2b65-4b74-8f97-ae51e7654106',
    '{"action":"logout","actor_id":"42d0607e-d32a-4ab9-a137-78edfe142996","actor_username":"","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:07:28.730592+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '0e615899-0c32-4744-9658-c11cf7b8ce4d',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 07:07:34.088751+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '84818042-af66-4296-91f7-cb2dfde0bd6a',
    '{"action":"logout","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:08:32.282654+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '3fee0a46-553d-44a6-a19f-22b66909486a',
    '{"action":"logout","actor_id":"2470be5a-a653-49a9-9a88-6f27b0e57a70","actor_username":"","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:09:30.960363+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd5dda7ad-daad-4d86-a4a3-f773cfb4febd',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 07:09:36.43302+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '94c2a487-7d5c-42b4-b96f-4372d9f9700b',
    '{"action":"logout","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:09:47.307796+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbd03e0-bb70-4b36-94fd-8e7e3d6436dc',
    '{"action":"logout","actor_id":"82486af7-d277-4bb0-910b-8d05066aaea1","actor_username":"","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:11:37.726601+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e5f2b2e1-2c73-4d57-bcbf-bbcaefcc239f',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 07:11:43.085715+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a5256e38-c5f4-40ea-a5f1-91f3382defe9',
    '{"action":"logout","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:12:31.098638+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '9209708a-2259-4ef3-9761-2b9626e46027',
    '{"action":"logout","actor_id":"2d825450-b80e-455b-99a0-fb8f64b3892e","actor_username":"","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:13:12.406834+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '7652af8b-d1d6-4935-aa7f-e0ebf39f2af6',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 07:13:17.973686+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'caeb616f-df49-4766-ac86-d8324d9b5c3a',
    '{"action":"logout","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:13:55.023939+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '4af20268-0e91-405a-8f23-beca8e59677e',
    '{"action":"user_modified","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"","actor_via_sso":false,"log_type":"user"}',
    '2026-11-10 07:14:56.154159+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '8b8bc7de-cc0d-4f51-a771-2ccdf55c6927',
    '{"action":"user_modified","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"karl.wolf@gmail.com","actor_via_sso":false,"log_type":"user"}',
    '2026-11-10 07:14:56.164276+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '508490c9-ecaa-43c1-895e-1aa30b82126c',
    '{"action":"user_updated_password","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"karl.wolf@gmail.com","actor_via_sso":false,"log_type":"user"}',
    '2026-11-10 07:15:09.538153+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '6b380855-cfd4-4da5-b186-9a7e081d9bb7',
    '{"action":"user_modified","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"karl.wolf@gmail.com","actor_via_sso":false,"log_type":"user"}',
    '2026-11-10 07:15:09.53881+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '5015dd97-376a-4def-920f-ccbec51d18b6',
    '{"action":"logout","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"karl.wolf@gmail.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:15:13.774276+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '4ac05c2b-8ae1-4aee-95e1-1db07df2b9eb',
    '{"action":"login","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"karl.wolf@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 07:15:20.138239+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '6b4de887-f663-4c2b-a0b3-6dab04556408',
    '{"action":"logout","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"karl.wolf@gmail.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:15:31.301716+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '4a59077c-4b53-4feb-ae11-29c6b273447f',
    '{"action":"login","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 07:15:37.002515+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2057713-7158-4b52-aaee-dfd6781ea434',
    '{"action":"logout","actor_id":"479397f0-bb2a-40b9-88a3-f4f485042005","actor_username":"admin@admin.com","actor_via_sso":false,"log_type":"account"}',
    '2026-11-10 07:16:11.763377+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aca174f5-8b7e-4196-bc74-afa5eb64f08e',
    '{"action":"login","actor_id":"d4b31aa1-b5e7-40e9-b479-6de371670a4d","actor_username":"karl.wolf@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}',
    '2026-11-10 07:16:18.910203+00',
    ''
  );

--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."users" (
    "instance_id",
    "id",
    "aud",
    "role",
    "email",
    "encrypted_password",
    "email_confirmed_at",
    "invited_at",
    "confirmation_token",
    "confirmation_sent_at",
    "recovery_token",
    "recovery_sent_at",
    "email_change_token_new",
    "email_change",
    "email_change_sent_at",
    "last_sign_in_at",
    "raw_app_meta_data",
    "raw_user_meta_data",
    "is_super_admin",
    "created_at",
    "updated_at",
    "phone",
    "phone_confirmed_at",
    "phone_change",
    "phone_change_token",
    "phone_change_sent_at",
    "email_change_token_current",
    "email_change_confirm_status",
    "banned_until",
    "reauthentication_token",
    "reauthentication_sent_at",
    "is_sso_user",
    "deleted_at",
    "is_anonymous"
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '42d0607e-d32a-4ab9-a137-78edfe142996',
    'authenticated',
    'authenticated',
    NULL,
    '',
    NULL,
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2026-11-10 07:04:02.937371+00',
    '{}',
    '{"name": "Karl", "language": "en", "displayName": "Karl"}',
    NULL,
    '2026-11-10 07:04:02.925878+00',
    '2026-11-10 07:04:02.94097+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    'authenticated',
    'authenticated',
    'admin@admin.com',
    '$2a$10$4KZAeERQvX0xEz2YcGVrye8KfNn4QkZQpqff5IZ.zOyW/HoGnWXUe',
    '2026-11-09 10:27:13.743722+00',
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2026-11-10 07:15:37.003399+00',
    '{"provider": "email", "providers": ["email"]}',
    '{"sub": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "language": "en", "displayName": "Karl", "email_verified": true, "phone_verified": false}',
    NULL,
    '2026-11-09 10:27:13.732174+00',
    '2026-11-10 07:15:37.008284+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    'authenticated',
    'authenticated',
    'karl.wolf@gmail.com',
    '$2a$10$k7HnihQQ7/1V/NyrN9uGme/lB2COrPbYT6V5G2cQaxuVcDkOY86T2',
    '2026-11-10 07:14:56.162772+00',
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2026-11-10 07:16:18.911177+00',
    '{}',
    '{"name": "Karl", "language": "en", "displayName": "Karl", "email_verified": true}',
    NULL,
    '2026-11-10 07:14:00.238859+00',
    '2026-11-10 07:16:18.915928+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '2470be5a-a653-49a9-9a88-6f27b0e57a70',
    'authenticated',
    'authenticated',
    NULL,
    '',
    NULL,
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2026-11-10 07:08:36.780432+00',
    '{}',
    '{"name": "Karl", "language": "en", "displayName": "Karl"}',
    NULL,
    '2026-11-10 07:08:36.773363+00',
    '2026-11-10 07:08:36.783198+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '82486af7-d277-4bb0-910b-8d05066aaea1',
    'authenticated',
    'authenticated',
    NULL,
    '',
    NULL,
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2026-11-10 07:10:01.996952+00',
    '{}',
    '{"name": "Karl", "language": "en", "displayName": "Karl"}',
    NULL,
    '2026-11-10 07:10:01.991022+00',
    '2026-11-10 07:10:01.999969+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '2d825450-b80e-455b-99a0-fb8f64b3892e',
    'authenticated',
    'authenticated',
    NULL,
    '',
    NULL,
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2026-11-10 07:12:36.709854+00',
    '{}',
    '{"name": "Karl", "language": "en", "displayName": "Karl"}',
    NULL,
    '2026-11-10 07:12:36.702283+00',
    '2026-11-10 07:12:36.712876+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    true
  );

--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."identities" (
    "provider_id",
    "user_id",
    "identity_data",
    "provider",
    "last_sign_in_at",
    "created_at",
    "updated_at",
    "id"
  )
VALUES
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '{"sub": "479397f0-bb2a-40b9-88a3-f4f485042005", "name": "Karl Admin", "role": "user", "email": "admin@admin.com", "language": "en", "displayName": "Karl", "email_verified": false, "phone_verified": false}',
    'email',
    '2026-11-09 10:27:13.741373+00',
    '2026-11-09 10:27:13.741405+00',
    '2026-11-09 10:27:13.741405+00',
    '5d75768f-fb3e-4026-9b27-f44634f405f1'
  ),
  (
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    '{"sub": "d4b31aa1-b5e7-40e9-b479-6de371670a4d", "email": "karl.wolf@gmail.com", "email_verified": true, "phone_verified": false}',
    'email',
    '2026-11-10 07:14:56.156167+00',
    '2026-11-10 07:14:56.156201+00',
    '2026-11-10 07:14:56.163919+00',
    'a8210dff-4cad-467e-ac51-be849286208a'
  );

--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."sessions" (
    "id",
    "user_id",
    "created_at",
    "updated_at",
    "factor_id",
    "aal",
    "not_after",
    "refreshed_at",
    "user_agent",
    "ip",
    "tag",
    "oauth_client_id",
    "refresh_token_hmac_key",
    "refresh_token_counter",
    "scopes"
  )
VALUES
  (
    '50c65db8-afaf-45ac-a001-618d2bf6cca3',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '2026-11-09 10:27:13.750508+00',
    '2026-11-09 10:27:13.750508+00',
    NULL,
    'aal1',
    NULL,
    NULL,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    '192.168.65.1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    '244af684-0b86-401f-9788-8cb2691122bc',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    '2026-11-10 07:16:18.911224+00',
    '2026-11-10 07:16:18.911224+00',
    NULL,
    'aal1',
    NULL,
    NULL,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    '192.168.65.1',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );

--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."mfa_amr_claims" (
    "session_id",
    "created_at",
    "updated_at",
    "authentication_method",
    "id"
  )
VALUES
  (
    '50c65db8-afaf-45ac-a001-618d2bf6cca3',
    '2026-11-09 10:27:13.755853+00',
    '2026-11-09 10:27:13.755853+00',
    'password',
    'e1750f6d-b840-477f-a69e-64ea10b3072f'
  ),
  (
    '244af684-0b86-401f-9788-8cb2691122bc',
    '2026-11-10 07:16:18.916357+00',
    '2026-11-10 07:16:18.916357+00',
    'password',
    '8e73be6e-5858-478f-92cd-48dc13b48e76'
  );

--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
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
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
INSERT INTO
  "auth"."refresh_tokens" (
    "instance_id",
    "id",
    "token",
    "user_id",
    "revoked",
    "created_at",
    "updated_at",
    "parent",
    "session_id"
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    1,
    'zipul7vqmiy7',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    false,
    '2026-11-09 10:27:13.754486+00',
    '2026-11-09 10:27:13.754486+00',
    NULL,
    '50c65db8-afaf-45ac-a001-618d2bf6cca3'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    15,
    'tjzvnkbxn64v',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    false,
    '2026-11-10 07:16:18.915273+00',
    '2026-11-10 07:16:18.915273+00',
    NULL,
    '244af684-0b86-401f-9788-8cb2691122bc'
  );

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
INSERT INTO
  "public"."user" (
    "created_at",
    "displayName",
    "email",
    "verified",
    "role",
    "disabled",
    "avatarUrl",
    "name",
    "id",
    "last_seen_at",
    "language"
  )
VALUES
  (
    '2026-11-10 07:04:02.924565+00',
    'Karl',
    '',
    false,
    'user',
    false,
    NULL,
    'Karl',
    '42d0607e-d32a-4ab9-a137-78edfe142996',
    '2026-11-10 07:04:02.937453+00',
    'en'
  ),
  (
    '2026-11-10 07:08:36.772997+00',
    'Karl',
    '',
    false,
    'user',
    false,
    NULL,
    'Karl',
    '2470be5a-a653-49a9-9a88-6f27b0e57a70',
    '2026-11-10 07:08:36.7805+00',
    'en'
  ),
  (
    '2026-11-10 07:10:01.990803+00',
    'Karl',
    '',
    false,
    'user',
    false,
    NULL,
    'Karl',
    '82486af7-d277-4bb0-910b-8d05066aaea1',
    '2026-11-10 07:10:01.997001+00',
    'en'
  ),
  (
    '2026-11-10 07:12:36.702002+00',
    'Karl',
    '',
    false,
    'user',
    false,
    NULL,
    'Karl',
    '2d825450-b80e-455b-99a0-fb8f64b3892e',
    '2026-11-10 07:12:36.709913+00',
    'en'
  ),
  (
    '2026-11-09 10:27:13.731916+00',
    'Karl',
    'admin@admin.com',
    false,
    'user',
    false,
    NULL,
    'Karl Admin',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '2026-11-10 07:15:37.003462+00',
    'en'
  ),
  (
    '2026-11-10 07:14:00.238531+00',
    'Karl',
    'karl.wolf@gmail.com',
    false,
    'user',
    false,
    NULL,
    'Karl',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    '2026-11-10 07:16:18.911224+00',
    'en'
  );

--
-- Data for Name: players; Type: TABLE DATA; Schema: games; Owner: postgres
--
INSERT INTO
  "games"."players" (
    "player",
    "created_at",
    "ka_index",
    "rg_id",
    "rg_link",
    "rg_index",
    "rg_avatar_url",
    "pro_status",
    "gender",
    "effective_rating_cached",
    "hide_rating",
    "display_name",
    "linked_user_id",
    "matches_played"
  )
VALUES
  (
    'c3958a07-6c24-4bd4-bed5-9c067005546d',
    '2026-11-09 10:27:13.731916+00',
    1000,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    'm',
    1000,
    false,
    NULL,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    0
  ),
  (
    'd26f5491-6481-49cb-9911-f7b3121bccd6',
    '2026-11-10 07:04:02.924565+00',
    1000,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    'm',
    1000,
    false,
    NULL,
    '42d0607e-d32a-4ab9-a137-78edfe142996',
    0
  ),
  (
    '1a823775-247c-462a-8d04-cb6a4106fd4c',
    '2026-11-10 07:08:36.772997+00',
    1000,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    'm',
    1000,
    false,
    NULL,
    '2470be5a-a653-49a9-9a88-6f27b0e57a70',
    0
  ),
  (
    'a53143bc-f51f-4c25-9686-0c68d4d10c87',
    '2026-11-10 07:10:01.990803+00',
    1000,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    'm',
    1000,
    false,
    NULL,
    '82486af7-d277-4bb0-910b-8d05066aaea1',
    0
  ),
  (
    '64928a42-1cbf-4bd0-94b1-c085ffa293dd',
    '2026-11-10 07:12:36.702002+00',
    1000,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    'm',
    1000,
    false,
    NULL,
    '2d825450-b80e-455b-99a0-fb8f64b3892e',
    0
  ),
  (
    'fd23d2b0-f56f-4ed3-9c0a-dfac8aa07ec5',
    '2026-11-10 07:14:00.238531+00',
    1000,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    'm',
    1000,
    false,
    NULL,
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    0
  );

--
-- Data for Name: event_group; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."event_group" (
    "created_at",
    "description",
    "name",
    "color",
    "id",
    "is_public",
    "need_request_to_join",
    "parent_group",
    "visible"
  )
VALUES
  (
    '2026-11-09 10:27:37.93626+00',
    'Main Group',
    'Main Group',
    '#000000',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    true,
    false,
    NULL,
    true
  );

--
-- Data for Name: event_series; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."event_series" (
    "id",
    "key",
    "group",
    "title",
    "description",
    "place",
    "timezone",
    "rrule",
    "recurrence",
    "until",
    "dtstart",
    "duration",
    "meeting_offset",
    "answer_offset",
    "max_attendees",
    "max_trial_attendees",
    "required_item",
    "items_enabled",
    "constellations_enabled",
    "reminder_before",
    "items_template",
    "active",
    "created_at",
    "created_by",
    "answer_start_offset",
    "trials_open"
  )
VALUES
  (
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'Thursday Training',
    'Thursday Training',
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Europe/Berlin',
    'FREQ=WEEKLY;INTERVAL=1;BYDAY=SU',
    'Weekly',
    NULL,
    '2026-11-15 10:32:00+00',
    '02:00:00',
    '00:00:00',
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    false,
    NULL,
    '[]',
    true,
    '2026-11-09 10:32:59.974927+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '-145:00:00',
    true
  );

--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."events" (
    "created_at",
    "description",
    "meetingDateTime",
    "startingDateTime",
    "title",
    "endDateTime",
    "key",
    "isCancelled",
    "place",
    "recurrence",
    "answerDeadline",
    "maxAttendees",
    "recurrenceEnd",
    "required_item",
    "id",
    "group",
    "constellations_enabled",
    "items_enabled",
    "max_trial_attendees",
    "reminder_before",
    "reminder_sent_at",
    "series_id",
    "occurrence_date",
    "detached",
    "answerStart",
    "trials_open"
  )
VALUES
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-11-15 10:32:00+00',
    '2026-11-15 10:32:00+00',
    'Thursday Training',
    '2026-11-15 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '3c3ae9fe-72b4-456f-88da-629d9517f729',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-11-15',
    false,
    '2026-11-09 09:32:00+00',
    true
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-11-22 10:32:00+00',
    '2026-11-22 10:32:00+00',
    'Thursday Training',
    '2026-11-22 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '243c6f00-5bc2-4305-a888-41796f19e397',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-11-22',
    false,
    '2026-11-16 09:32:00+00',
    true
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-11-29 10:32:00+00',
    '2026-11-29 10:32:00+00',
    'Thursday Training',
    '2026-11-29 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '4dcdd532-7453-49b2-be2b-3df94c998465',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-11-29',
    false,
    '2026-11-23 09:32:00+00',
    true
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-06 10:32:00+00',
    '2026-12-06 10:32:00+00',
    'Thursday Training',
    '2026-12-06 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    'a00ce0db-9d38-4ab8-b54b-43b1a3a4c921',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-06',
    false,
    '2026-11-30 09:32:00+00',
    true
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-13 10:32:00+00',
    '2026-12-13 10:32:00+00',
    'Thursday Training',
    '2026-12-13 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '6f2a9fe0-314b-4fc4-88cf-a2fa75e9db48',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-13',
    false,
    '2026-12-07 09:32:00+00',
    true
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-20 10:32:00+00',
    '2026-12-20 10:32:00+00',
    'Thursday Training',
    '2026-12-20 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '3477d53f-f128-47d2-a115-7413520ed235',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-20',
    false,
    '2026-12-14 09:32:00+00',
    true
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2026-12-27 10:32:00+00',
    '2026-12-27 10:32:00+00',
    'Thursday Training',
    '2026-12-27 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '7d2a1fa1-1027-424b-bdaa-5996d1072624',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2026-12-27',
    false,
    '2026-12-21 09:32:00+00',
    true
  ),
  (
    '2026-11-09 10:33:00.009103+00',
    'Thursday Training',
    '2027-01-03 10:32:00+00',
    '2027-01-03 10:32:00+00',
    'Thursday Training',
    '2027-01-03 12:32:00+00',
    '9820c7d7-d5d0-47cb-8852-50b82c1d14b3',
    false,
    '{"name":"Karoline-Luise-Tunnel","description":"Karoline-Luise-Tunnel, 76133 Karlsruhe","lat":49.00547564596969,"lon":8.403553962707521}',
    'Weekly',
    NULL,
    NULL,
    NULL,
    NULL,
    '9655acd1-5801-479a-aff5-472e29eb901c',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    false,
    false,
    NULL,
    NULL,
    NULL,
    '01de716f-bbdf-427b-843f-99cc7749ff27',
    '2027-01-03',
    false,
    '2026-12-28 09:32:00+00',
    true
  );

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
  (1, 0.5, 0.5, 0, 1, 32, 0, 0, 0, 0);

--
-- Data for Name: elo_history; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: sets; Type: TABLE DATA; Schema: games; Owner: postgres
--
--
-- Data for Name: notification_outbox; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
INSERT INTO
  "notifications"."notification_outbox" (
    "id",
    "user",
    "tenant",
    "title",
    "body",
    "data",
    "urgency",
    "ttl_seconds",
    "dedupe_key",
    "status",
    "attempt_count",
    "next_attempt_at",
    "last_error",
    "notification",
    "created_at",
    "sent_at"
  )
VALUES
  (
    1,
    '42d0607e-d32a-4ab9-a137-78edfe142996',
    '00000000-0000-0000-0000-000000000000',
    'Trial period ended',
    'Your trial period at Main Group has ended.',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    'normal',
    NULL,
    NULL,
    'pending',
    0,
    '2026-11-10 07:11:59.602367+00',
    NULL,
    '8e95660d-f1e4-4430-ac63-e81285f5c51d',
    '2026-11-10 07:11:59.602367+00',
    NULL
  ),
  (
    2,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'Trial period ended',
    'A user''s trial period at Main Group has ended.',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    'normal',
    NULL,
    NULL,
    'pending',
    0,
    '2026-11-10 07:11:59.602367+00',
    NULL,
    'ae161f7e-dce9-4300-998c-3cbf9a276221',
    '2026-11-10 07:11:59.602367+00',
    NULL
  ),
  (
    3,
    '2470be5a-a653-49a9-9a88-6f27b0e57a70',
    '00000000-0000-0000-0000-000000000000',
    'Trial period ended',
    'Your trial period at Main Group has ended.',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    'normal',
    NULL,
    NULL,
    'pending',
    0,
    '2026-11-10 07:11:59.602367+00',
    NULL,
    'b416f8b4-9c59-4324-ae60-b9dceed7719e',
    '2026-11-10 07:11:59.602367+00',
    NULL
  ),
  (
    4,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'Trial period ended',
    'A user''s trial period at Main Group has ended.',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    'normal',
    NULL,
    NULL,
    'pending',
    0,
    '2026-11-10 07:11:59.602367+00',
    NULL,
    '85b99283-ea01-4017-8ccd-374c8b2ff22c',
    '2026-11-10 07:11:59.602367+00',
    NULL
  ),
  (
    5,
    '82486af7-d277-4bb0-910b-8d05066aaea1',
    '00000000-0000-0000-0000-000000000000',
    'Trial period ended',
    'Your trial period at Main Group has ended.',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    'normal',
    NULL,
    NULL,
    'pending',
    0,
    '2026-11-10 07:11:59.602367+00',
    NULL,
    'e7e49584-67a6-49ba-bf98-58427efe1b2a',
    '2026-11-10 07:11:59.602367+00',
    NULL
  ),
  (
    6,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'Trial period ended',
    'A user''s trial period at Main Group has ended.',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    'normal',
    NULL,
    NULL,
    'pending',
    0,
    '2026-11-10 07:11:59.602367+00',
    NULL,
    '7b6be61d-9760-4068-972b-00327979ed0c',
    '2026-11-10 07:11:59.602367+00',
    NULL
  );

--
-- Data for Name: web_push_subscriptions; Type: TABLE DATA; Schema: notifications; Owner: postgres
--
--
-- Data for Name: notification_outbox_targets; Type: TABLE DATA; Schema: notifications; Owner: postgres
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
INSERT INTO
  "notifications"."notifications" (
    "id",
    "created_at",
    "body",
    "title",
    "user",
    "data",
    "dismissed_at",
    "expires_at",
    "read_at",
    "source_id",
    "source_type",
    "tenant",
    "topic"
  )
VALUES
  (
    '8e95660d-f1e4-4430-ac63-e81285f5c51d',
    '2026-11-10 07:11:59.602367+00',
    'Your trial period at Main Group has ended.',
    'Trial period ended',
    '42d0607e-d32a-4ab9-a137-78edfe142996',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    NULL,
    NULL,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'group',
    '00000000-0000-0000-0000-000000000000',
    'group.trial.expired'
  ),
  (
    'ae161f7e-dce9-4300-998c-3cbf9a276221',
    '2026-11-10 07:11:59.602367+00',
    'A user''s trial period at Main Group has ended.',
    'Trial period ended',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    NULL,
    NULL,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'group',
    '00000000-0000-0000-0000-000000000000',
    'group.trial.expired.admin'
  ),
  (
    'b416f8b4-9c59-4324-ae60-b9dceed7719e',
    '2026-11-10 07:11:59.602367+00',
    'Your trial period at Main Group has ended.',
    'Trial period ended',
    '2470be5a-a653-49a9-9a88-6f27b0e57a70',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    NULL,
    NULL,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'group',
    '00000000-0000-0000-0000-000000000000',
    'group.trial.expired'
  ),
  (
    '85b99283-ea01-4017-8ccd-374c8b2ff22c',
    '2026-11-10 07:11:59.602367+00',
    'A user''s trial period at Main Group has ended.',
    'Trial period ended',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    NULL,
    NULL,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'group',
    '00000000-0000-0000-0000-000000000000',
    'group.trial.expired.admin'
  ),
  (
    'e7e49584-67a6-49ba-bf98-58427efe1b2a',
    '2026-11-10 07:11:59.602367+00',
    'Your trial period at Main Group has ended.',
    'Trial period ended',
    '82486af7-d277-4bb0-910b-8d05066aaea1',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    NULL,
    NULL,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'group',
    '00000000-0000-0000-0000-000000000000',
    'group.trial.expired'
  ),
  (
    '7b6be61d-9760-4068-972b-00327979ed0c',
    '2026-11-10 07:11:59.602367+00',
    'A user''s trial period at Main Group has ended.',
    'Trial period ended',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '{"url": "/", "group": "68295616-0d6d-4d4b-8b86-fce4599f5465"}',
    NULL,
    NULL,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'group',
    '00000000-0000-0000-0000-000000000000',
    'group.trial.expired.admin'
  );

--
-- Data for Name: user_notification_preferences; Type: TABLE DATA; Schema: notifications; Owner: postgres
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
    '2026-11-10 06:55:01.734011+00'
  ) ON CONFLICT DO NOTHING;

--
-- Data for Name: bundesliga_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: challenge; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."challenge" (
    "created_at",
    "name",
    "description",
    "max_points_per_week",
    "automated",
    "end_date",
    "group",
    "id",
    "max_points_per_day",
    "category_enabled",
    "comments_enabled",
    "show_all_members",
    "category_options",
    "start_date"
  )
VALUES
  (
    '2026-11-09 10:34:04.768555+00',
    'Serve Challenge',
    'Serve Challenge',
    4,
    false,
    NULL,
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'a5c15955-c014-4eb1-a008-69d6f09be7c5',
    1,
    true,
    true,
    false,
    '{"First Category",asdfhasidfbuiasdfb}',
    NULL
  );

--
-- Data for Name: challenge_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."challenge_stats" (
    "id",
    "created_at",
    "user",
    "count",
    "image_url",
    "challenge"
  )
VALUES
  (
    1,
    '2026-11-08 23:00:00+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    1,
    '',
    'a5c15955-c014-4eb1-a008-69d6f09be7c5'
  ),
  (
    2,
    '2026-11-07 23:00:00+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    1,
    '',
    'a5c15955-c014-4eb1-a008-69d6f09be7c5'
  );

--
-- Data for Name: challenge_stats_meta; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."challenge_stats_meta" ("challenge_stat", "category", "comment")
VALUES
  (1, NULL, 'kjasdfag sdfjhags df'),
  (2, 'First Category', 'asfdasdf');

--
-- Data for Name: drink; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."drink" (
    "name",
    "price",
    "stock",
    "imageUrl",
    "active",
    "deleted",
    "type",
    "id"
  )
VALUES
  (
    'Coca Cola',
    1,
    0,
    '',
    true,
    false,
    'Drink',
    '9c29b4d7-081e-4ea7-a749-63f3b9166757'
  );

--
-- Data for Name: event_attendance_user_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."event_attendance_user_mapping" ("lastUpdate", "user", "state", "event")
VALUES
  (
    '2026-11-10 07:14:05.79386+00',
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    'AttendingAsTrial',
    '3c3ae9fe-72b4-456f-88da-629d9517f729'
  );

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
  ),
  ('challenges', 'Challenges verwalten'),
  ('drinks', 'Getränke verwalten'),
  ('events', 'Events verwalten'),
  ('events.transformations', NULL),
  ('events.trials', 'Probenutzer für Events'),
  ('games', 'Spiele verwalten'),
  ('items', 'Gegenstände verwalten') ON CONFLICT DO NOTHING;

--
-- Data for Name: group_features; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."group_features" ("group", "feature")
VALUES
  (
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'events.trials'
  ),
  (
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'events.trials.guests'
  ),
  ('68295616-0d6d-4d4b-8b86-fce4599f5465', 'events');

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
  ),
  (
    'admin.notify_users',
    'Benachrichtigungen an verschiedene Gruppen oder Nutzern schicken können'
  ),
  (
    'challenge.create',
    'Hiermit darf man Challenges erstellen'
  ),
  ('challenge.manage', 'Verwaltung von Challenges'),
  (
    'challenges.create.own-group',
    'Challenge erstellen wenn man Admin in der Zielgruppe ist'
  ),
  (
    'challenges.edit.own-group',
    'Challenge bearbeiten wenn man Admin in der Challenge-Gruppe ist'
  ),
  (
    'challenges.stats.read',
    'Challenge-Punkte anderer Nutzer einsehen'
  ),
  (
    'challenges.stats.write',
    'Selbst Punkte in einer Challenge eintragen'
  ),
  (
    'drinks.confirm.payments',
    'Zahlungen bestätigen und als bezahlt markieren'
  ),
  ('drinks.edit', 'Getränke bearbeiten und löschen'),
  (
    'drinks.history.admin',
    'Die komplette Historie einsehen'
  ),
  (
    'drinks.history.select',
    'Eigene History einsehen'
  ),
  ('drinks.manage', 'Getränke erstellen'),
  (
    'drinks.purchase',
    'Getränke einem aktiven Payment hinzufügen ("kaufen")'
  ),
  ('drinks.select', 'Getränke auswählen'),
  ('drinks.view.own-history', 'Eigene History sehen'),
  (
    'drinks.view.own-payments',
    'Eigene aktive Zahlung'
  ),
  (
    'event.admin.view',
    'Admin Informationen bei einem Event sehen'
  ),
  ('event.cancel', 'Event absagen'),
  ('event.comment', 'Kommentare schreiben'),
  (
    'event.create.constellations',
    'Konstellationen/Teams erstellen'
  ),
  ('event.delete', 'Ein Event löschen'),
  (
    'event.edit',
    'Event bearbeiten (z. B. Titel/Zeit ändern – nur Admins)'
  ),
  (
    'event.manage.attendees',
    'Teilnahme-Anfragen sehen & bestätigen (z. B. für Trainer)'
  ),
  ('event.signup', 'An- und Abmeldung zu Events'),
  (
    'event.signup.trainer',
    'Sich als Trainer zu einem Event anmelden können'
  ),
  ('games.create', 'Neues Spiel erstellen'),
  (
    'games.create.guest-player',
    'Es können Gastspieler beim Eintragen eines Spieles erstellt werden.'
  ),
  (
    'games.create.guest-player.with_index',
    'Beim Erstellen eines Gastspielers kann der Index direkt gesetzt werden'
  ),
  ('games.select', 'Darf Spiele generell ansehen'),
  (
    'games.update.score',
    'Score eines Spiels eintragen oder bearbeiten'
  ),
  ('games.view.own', 'Eigene Spiele sehen'),
  (
    'groups.manage.admin',
    'Gruppen erstellen mit Admin Funktionalität'
  ),
  (
    'items.manage',
    'Items erstellen oder bearbeiten (z. B. durch Schlüsselverantwortliche)'
  ),
  (
    'items.update.holder',
    'Aktuellen Halter eines Items ändern (z. B. Schlüsselübergabe)'
  ),
  ('supabase.admin', 'Admin für Supabase Verwaltung'),
  (
    'testlab.shadcn',
    'Nutze die neue Shadcn Oberfläche'
  ),
  ('users.manage', 'Benutzer verwalten') ON CONFLICT DO NOTHING;

--
-- Data for Name: group_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: group_user_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."group_user_mapping" (
    "user",
    "group",
    "role",
    "trial_started_at",
    "trial_event_limit"
  )
VALUES
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'admin',
    NULL,
    NULL
  ),
  (
    '2d825450-b80e-455b-99a0-fb8f64b3892e',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'trial',
    '2026-11-10 07:12:36.790265+00',
    3
  ),
  (
    'd4b31aa1-b5e7-40e9-b479-6de371670a4d',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'user',
    NULL,
    3
  );

--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."payments" (
    "id",
    "created_at",
    "amountToPay",
    "paymentState",
    "id_uuid",
    "user"
  )
VALUES
  (
    1,
    '2026-11-09 10:36:04.208931+00',
    0,
    'Open',
    'de24e42a-ba24-4bac-bec6-ecacbc0bfb35',
    '479397f0-bb2a-40b9-88a3-f4f485042005'
  );

--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: history; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."history" (
    "id",
    "created_at",
    "user",
    "count",
    "payment",
    "amount",
    "voucher",
    "drink"
  )
VALUES
  (
    1,
    '2026-11-09 10:36:04.208931+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    1,
    1,
    1,
    NULL,
    '9c29b4d7-081e-4ea7-a749-63f3b9166757'
  );

--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."items" (
    "id",
    "created_at",
    "name",
    "color",
    "type",
    "lastUpdate",
    "current_holder",
    "group",
    "id_uuid"
  )
VALUES
  (
    1,
    '2026-11-09 10:33:17.3126+00',
    'Test Schlüssel',
    '#841f1f',
    'mtvStorage',
    '2026-11-09 10:33:19.544704+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL,
    'c1a7014e-1ced-48a0-bf30-9d3150a52511'
  ),
  (
    2,
    '2026-11-09 10:33:33.373413+00',
    'Test2 Schlüssel',
    '#145df0',
    'mtvGymPalazzo',
    '2026-11-09 10:33:38.451396+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'ff7de2ba-acd4-469d-93c6-94e994d1aecf'
  );

--
-- Data for Name: item_history; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."item_history" (
    "id",
    "created_at",
    "key",
    "current_user",
    "past_user"
  )
VALUES
  (
    1,
    '2026-11-09 10:33:19.544704+00',
    1,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  ),
  (
    2,
    '2026-11-09 10:33:19.544704+00',
    1,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  ),
  (
    3,
    '2026-11-09 10:33:38.451396+00',
    2,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  ),
  (
    4,
    '2026-11-09 10:33:38.451396+00',
    2,
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    NULL
  );

--
-- Data for Name: tournament_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--
--
-- Data for Name: trial_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."trial_invites" (
    "id",
    "group",
    "token",
    "event_limit",
    "expires_at",
    "max_uses",
    "uses",
    "active",
    "created_at",
    "created_by"
  )
VALUES
  (
    '73976dec-ab2d-4648-a813-48a61e35c975',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    'cb81e89ae9b34cd4ae854fe31d44d8f5',
    3,
    NULL,
    NULL,
    3,
    false,
    '2026-11-10 06:56:24.143909+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005'
  ),
  (
    'b58b3a8b-9153-43a9-91e5-f7bb39c015e2',
    '68295616-0d6d-4d4b-8b86-fce4599f5465',
    '9ab11616e3cf476ab79ab03f01b18330',
    3,
    NULL,
    NULL,
    2,
    true,
    '2026-11-10 07:12:24.996587+00',
    '479397f0-bb2a-40b9-88a3-f4f485042005'
  );

--
-- Data for Name: user_direct_grants; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO
  "public"."user_direct_grants" (
    "user",
    "tenant",
    "kind",
    "key",
    "created_at",
    "updated_at"
  )
VALUES
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'grants.manage',
    '2026-11-09 10:28:52.283292+00',
    '2026-11-09 10:28:52.283292+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'supabase.admin',
    '2026-11-09 10:29:00.878681+00',
    '2026-11-09 10:29:00.878681+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.admin.view',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.cancel',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.comment',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.create.constellations',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.delete',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.edit',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.manage.attendees',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.signup',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.signup.trainer',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'event.transform',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.confirm.payments',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.edit',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.history.admin',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.history.select',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.purchase',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.select',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.view.own-history',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'drinks.view.own-payments',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.admin.merge_accounts',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.admin.view',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.create',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.create.guest-player',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.create.guest-player.with_index',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.delete.own',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.select',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.update.score',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'games.view.own',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenge.create',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenge.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.create.own-group',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.edit.own-group',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.stats.read',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'challenges.stats.write',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'groups.manage.admin',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'items.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'items.update.holder',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'admin.analytics.view',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'admin.notify_users',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'bundesliga.admin',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'reset_user_password',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'testlab.shadcn',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'perm',
    'users.manage',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'bundesliga',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'challenges',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'costs',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'drinks',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'events',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'events.transformations',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'events.trials',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'games',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  ),
  (
    '479397f0-bb2a-40b9-88a3-f4f485042005',
    '00000000-0000-0000-0000-000000000000',
    'feat',
    'items',
    '2026-11-09 10:29:19.651841+00',
    '2026-11-09 10:29:19.651841+00'
  );

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
-- Name: log_id_seq; Type: SEQUENCE SET; Schema: audit; Owner: postgres
--
SELECT
  pg_catalog.setval ('"audit"."log_id_seq"', 159, true);

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--
SELECT
  pg_catalog.setval ('"auth"."refresh_tokens_id_seq"', 15, true);

--
-- Name: notification_outbox_id_seq; Type: SEQUENCE SET; Schema: notifications; Owner: postgres
--
SELECT
  pg_catalog.setval (
    '"notifications"."notification_outbox_id_seq"',
    6,
    true
  );

--
-- Name: challenge_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."challenge_stats_id_seq"', 2, true);

--
-- Name: history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."history_id_seq"', 1, true);

--
-- Name: key_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."key_history_id_seq"', 4, true);

--
-- Name: keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."keys_id_seq"', 2, true);

--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--
SELECT
  pg_catalog.setval ('"public"."payments_id_seq"', 1, true);

--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--
SELECT
  pg_catalog.setval ('"supabase_functions"."hooks_id_seq"', 1, false);

--
-- PostgreSQL database dump complete
--
RESET ALL;