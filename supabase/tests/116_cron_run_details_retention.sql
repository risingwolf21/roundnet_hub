-- Tests for 20261123140000_cron_run_details_retention: cron.job_run_details is trimmed to 7 days.
BEGIN;
SELECT plan(2);

SELECT is(
  (SELECT count(*)::int FROM cron.job WHERE jobname = 'cron_run_details_retention' AND schedule = '15 4 * * *'),
  1, 'the retention job is scheduled nightly');

-- Run its command on two fake runs: the old one goes, the recent one stays.
INSERT INTO cron.job_run_details (jobid, runid, command, status, start_time, end_time)
VALUES (0, -1, 'old', 'succeeded', now() - interval '8 days', now() - interval '8 days'),
       (0, -2, 'new', 'succeeded', now() - interval '1 day', now() - interval '1 day');
DO $$ BEGIN EXECUTE (SELECT command FROM cron.job WHERE jobname = 'cron_run_details_retention'); END $$;
SELECT is(
  (SELECT array_agg(command ORDER BY command) FROM cron.job_run_details WHERE jobid = 0),
  ARRAY['new'], 'runs older than 7 days are deleted, recent ones kept');

SELECT * FROM finish();
ROLLBACK;
