SET
  session_replication_role = replica;

--
-- PostgreSQL database dump
--
-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4
SET
  statement_timeout = 0;

SET
  lock_timeout = 0;

SET
  idle_in_transaction_session_timeout = 0;

SET
  transaction_timeout = 0;

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

RESET ALL;